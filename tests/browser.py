from ui_helpers import enter_free, enter_player, open_selected_song, choose
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json
import os
import re

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / 'test-results'
RESULTS.mkdir(exist_ok=True)
errors = []
results = []

def check(name, fn):
    fn()
    results.append(name)
    print('PASS:', name)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', args=[])
    context = browser.new_context(viewport={'width':1440,'height':1000}, accept_downloads=True)
    context.add_init_script('''
      window.decodedSamples=0;
      const decode=AudioContext.prototype.decodeAudioData;
      AudioContext.prototype.decodeAudioData=function(...args){return decode.apply(this,args).then(buffer=>{window.decodedSamples++;return buffer;});};
      const compressor=AudioContext.prototype.createDynamicsCompressor;
      AudioContext.prototype.createDynamicsCompressor=function(){const node=compressor.call(this);window.audioAnalyser=this.createAnalyser();node.connect(window.audioAnalyser);return node;};
    ''')
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(os.environ.get('KEYFALL_URL','http://127.0.0.1:5189'))
    page.wait_for_load_state('networkidle');enter_player(page)
    expect(page.locator('.key')).to_have_count(88)
    expect(page.locator('#song-title')).to_have_text('Ode to Joy')
    results.append('88-key keyboard and included song render')
    page.wait_for_function('window.decodedSamples === 88')
    page.keyboard.down('a')
    page.wait_for_timeout(150)
    energy=page.evaluate('()=>{const data=new Float32Array(audioAnalyser.fftSize);audioAnalyser.getFloatTimeDomainData(data);return Math.max(...data.map(Math.abs));}')
    assert energy > .001
    page.keyboard.up('a')
    results.append('88 offline piano samples decode and pressing a key produces an audio signal')

    page.get_by_role('button', name='Play', exact=True).click()
    page.wait_for_timeout(1550)
    assert float(page.locator('#seek').input_value()) > 1
    page.get_by_role('button', name='Pause', exact=True).click()
    position = float(page.locator('#seek').input_value())
    page.wait_for_timeout(300)
    assert abs(float(page.locator('#seek').input_value())-position)<.05
    results.append('Playback advances and pause stops transport')

    page.get_by_role('button', name='Restart song', exact=True).click()
    page.get_by_role('button', name='Learn notes', exact=True).click()
    choose(page.locator('#hands'),'right')
    page.get_by_role('button', name='Play', exact=True).click()
    expect(page.locator('#practice-cue')).to_have_text('Play E4', timeout=5000)
    pos = float(page.locator('#seek').input_value())
    page.wait_for_timeout(300)
    assert abs(float(page.locator('#seek').input_value())-pos)<.02
    page.keyboard.press('d')
    expect(page.locator('#score-live')).to_contain_text('1 correct')
    page.keyboard.press('q')
    results.append('Wait mode holds timeline and computer keyboard scores the correct note')
    page.get_by_role('button', name='Pause', exact=True).click()

    page.get_by_role('button', name='Settings', exact=True).click()
    choose(page.locator('#key-range'),'compact')
    choose(page.locator('#transpose'),'2')
    page.get_by_role('button', name='Close settings', exact=True).click()
    expect(page.locator('.key')).to_have_count(37)
    page.get_by_role('button', name='Settings', exact=True).click()
    choose(page.locator('#key-range'),'full')
    choose(page.locator('#transpose'),'0')
    page.get_by_role('button', name='Close settings', exact=True).click()
    results.append('Settings change keyboard range and transpose')

    enter_player(page)
    page.get_by_role('button', name='Song library', exact=True).click()
    page.locator('#song-search').fill('Twinkle')
    expect(page.locator('.song-row')).to_have_count(1)
    page.locator('[data-favorite="twinkle"]').click()
    page.locator('[data-song="twinkle"]').click();open_selected_song(page)
    expect(page.locator('#song-title')).to_have_text('Twinkle, Twinkle, Little Star')
    results.append('Library search, favorites and song selection')

    page.get_by_role('button', name='Sheet music', exact=True).click()
    expect(page.locator('#score svg').first).to_be_visible(timeout=20000)
    assert page.locator('#score svg').first.bounding_box()['width'] > 1000
    assert page.locator('#score svg').first.bounding_box()['height'] > 100
    page.screenshot(path=str(RESULTS/'sheet.png'))
    page.get_by_role('button', name='Close sheet music', exact=True).click()
    results.append('MIDI notation engraves to SVG')

    enter_free(page)
    page.get_by_role('button', name='Record', exact=True).click()
    page.keyboard.down('a')
    page.wait_for_timeout(200)
    expect(page.locator('[data-midi="60"]')).to_have_class(re.compile('playing'))
    page.keyboard.up('a')
    page.keyboard.press('d')
    page.keyboard.press('g')
    page.get_by_role('button', name='Stop and save recording', exact=True).click()
    expect(page.locator('#free-recording-status')).to_contain_text('Saved: Recording', timeout=5000)
    recorded = page.locator('#free-recording-status').inner_text().removeprefix('Saved: ')
    with page.expect_download() as download_info:
        page.get_by_role('button', name='Export MIDI', exact=True).click()
    download = download_info.value
    download.save_as(str(RESULTS/'recording.mid'))
    assert (RESULTS/'recording.mid').read_bytes()[:4] == b'MThd'
    page.reload()
    page.wait_for_load_state('networkidle');enter_player(page)
    page.locator('#library-button').click();page.locator('#song-search').fill(recorded);page.locator('[data-song]').click();open_selected_song(page)
    expect(page.locator('#song-title')).to_have_text(recorded)
    results.append('Recording, MIDI export and library persistence after reload')

    page.locator('#file-input').set_input_files(str(RESULTS/'recording.mid'))
    expect(page.locator('#composer')).to_contain_text('MIDI')
    results.append('Exported MIDI can be imported')
    page.locator('#file-input').set_input_files({'name':'broken.mid','mimeType':'audio/midi','buffer':b'not midi'})
    expect(page.locator('#toast')).to_contain_text('not a valid MIDI')
    results.append('Invalid imports display a useful error')

    xml = '''<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>XML test</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction><sound tempo="90"/></direction><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note></measure></part></score-partwise>'''
    page.locator('#file-input').set_input_files({'name':'test.musicxml','mimeType':'application/xml','buffer':xml.encode()})
    expect(page.locator('#song-title')).to_have_text('XML test')
    expect(page.locator('#bpm')).to_have_text('90 BPM')
    page.get_by_role('button', name='Sheet music', exact=True).click()
    expect(page.locator('#score svg').first).to_be_visible(timeout=20000)
    expect(page.locator('#score-message')).to_have_text('Original MusicXML score')
    page.get_by_role('button', name='Close sheet music', exact=True).click()
    results.append('MusicXML parses tempo and renders original notation')

    # Simulate the Web MIDI boundary, while leaving real audio/input handlers intact.
    page.add_init_script('''window.testInput={id:'test',name:'Test piano',onmidimessage:null};window.testOutput={id:'out',name:'Test output',sent:[],send(data){this.sent.push(data)}};Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>({inputs:new Map([['test',window.testInput]]),outputs:new Map([['out',window.testOutput]])})});''')
    page.reload(); page.wait_for_load_state('networkidle');enter_player(page)
    page.get_by_role('button', name='Connect piano', exact=True).click()
    page.get_by_role('button', name='Enable MIDI access', exact=True).click()
    expect(page.locator('#midi-message')).to_contain_text('1 input device connected')
    choose(page.locator('#midi-output'),'out')
    page.evaluate('window.testInput.onmidimessage({data:[144,60,100]})')
    expect(page.locator('#midi-test')).to_contain_text('Received C4')
    page.evaluate('window.testInput.onmidimessage({data:[128,60,0]})')
    page.get_by_role('button', name='Close piano connections', exact=True).click()
    enter_free(page)
    page.evaluate('window.testInput.onmidimessage({data:[144,60,100]})')
    expect(page.locator('[data-midi="60"]')).to_have_class(re.compile('playing'))
    page.wait_for_function('window.testOutput.sent.some(e=>e[0]===144&&e[1]===60)')
    page.evaluate('window.testInput.onmidimessage({data:[128,60,0]})')
    expect(page.locator('[data-midi="60"]')).not_to_have_class(re.compile('playing'))
    sent=page.evaluate('window.testOutput.sent')
    assert any(e[0]==144 and e[1]==60 for e in sent)
    assert any(e[0]==128 and e[1]==60 for e in sent)
    results.append('Simulated Web MIDI note-on/off reaches keyboard and MIDI output')

    enter_player(page)
    page.get_by_role('button', name='Song library', exact=True).click()
    page.locator('#song-search').fill('Ode')
    page.locator('[data-song="ode"]').click();open_selected_song(page)
    page.screenshot(path=str(RESULTS/'desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(RESULTS/'mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    enter_player(page)
    page.get_by_role('button', name='Song library', exact=True).click()
    page.screenshot(path=str(RESULTS/'mobile-library.png'),full_page=True)
    expect(page.locator('#import-button')).to_be_visible()
    results.append('390px mobile layout has no horizontal page overflow')
    assert not errors, errors
    results.append('No uncaught browser errors')
    (RESULTS/'browser-results.json').write_text(json.dumps({'passed':results,'errors':errors},indent=2))
    print(json.dumps({'passed':results,'errors':errors},indent=2))
    browser.close()


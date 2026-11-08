from ui_helpers import enter_free, enter_player, open_selected_song, choose
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, os, re
ROOT=Path(__file__).resolve().parents[1]
checks=[]
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    c=b.new_context(viewport={'width':1440,'height':1000})
    c.add_init_script('''const gain=AudioContext.prototype.createGain;AudioContext.prototype.createGain=function(){window.audioContext=this;return gain.call(this);};const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(target,...rest){if(target===this.context.destination&&!window.finalAnalyser){window.finalAnalyser=this.context.createAnalyser();connect.call(this,window.finalAnalyser);}return connect.call(this,target,...rest);};''')
    page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('KEYFALL_URL','http://127.0.0.1:5189'));page.wait_for_load_state('networkidle');enter_player(page)
    # Long physical clicks cover many animation updates, including clicking on the icon.
    for i in range(12):
        box=page.locator('#play svg').bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.wait_for_timeout(170);page.mouse.up()
        expect(page.locator('#play')).to_have_attribute('aria-label','Pause' if i%2==0 else 'Play')
    checks.append('12 successive slow icon clicks work without first clicking toolbar')
    page.locator('#settings-button').click()
    page.locator('#volume').fill('1');page.locator('#volume').dispatch_event('input')
    choose(page.locator('#volume-boost'),'12')
    expect(page.locator('#volume-value')).to_have_text('100%')
    for tone in ['piano','soft','organ','grand']:
        choose(page.locator('#tone'),tone);page.locator('#sound-test').click();page.wait_for_timeout(100)
        peak=page.evaluate('()=>{const d=new Float32Array(finalAnalyser.fftSize);finalAnalyser.getFloatTimeDomainData(d);return Math.max(...d.map(Math.abs));}')
        assert peak>.003,(tone,peak)
    checks.append('Grand, synthesized piano, soft keys and organ emit audio at final output')
    choose(page.locator('#tone'),'bank')
    expect(page.locator('#soundfont-status')).to_contain_text('GeneralUser',timeout=60000)
    page.get_by_text('SoundFonts and instruments',exact=True).click()
    for program in ['0','40','73']:
        choose(page.locator('#live-instrument'),program);page.locator('#sound-test').click();page.wait_for_timeout(250)
        peak=page.evaluate('()=>{const d=new Float32Array(finalAnalyser.fftSize);finalAnalyser.getFloatTimeDomainData(d);return Math.max(...d.map(Math.abs));}')
        assert peak>.001,(program,peak)
    checks.append('Bundled SoundFont loads offline and piano, violin and flute emit audio')
    page.locator('#soundfont-file').set_input_files({'name':'bad.sf2','mimeType':'application/octet-stream','buffer':b'bad sound bank'})
    expect(page.locator('#soundfont-status')).to_contain_text('not a supported')
    page.locator('#soundfont-file').set_input_files(str(ROOT/'public/general-user.sf2'))
    expect(page.locator('#soundfont-status')).to_have_text('general-user.sf2',timeout=60000)
    checks.append('Custom SoundFont import validates errors and persists a valid soundbank')
    page.locator('[data-settings-category="display"]').click();page.get_by_text('Display and practice options',exact=True).click()
    for option,label in [('notes','C'),('mapping','A'),('solfege','Do'),('numbers','1'),('off',''),('octaves','C4')]:
        choose(page.locator('#key-labels'),option);expect(page.locator('[data-midi="60"] span')).to_have_text(label)
    for option in ['solfege','numbers','mapping','fingers','off','notes']:
        choose(page.locator('#note-labels'),option);expect(page.locator('#labels')).to_have_value(option)
    page.locator('#label-size').fill('18');page.locator('#label-size').dispatch_event('input')
    page.locator('#input-offset').fill('120');page.locator('#input-offset').dispatch_event('change')
    for sel in ['#show-measures','#show-falling','#high-contrast','#play-my-part','#automatic-octave','#focus-mode']:
        page.locator(sel).uncheck();page.locator(sel).check()
    checks.append('Every key/note label mode, label size, timing offset and six display/practice toggles respond')
    role=page.locator('[data-field="role"]').first
    for value in ['left','right','accompaniment','mute','pitch','split']:choose(role,value)
    choose(page.locator('[data-field="instrument"]').first,'40')
    page.locator('[data-field="volume"]').first.fill('0.5');page.locator('[data-field="volume"]').first.dispatch_event('change')
    page.locator('[data-field="color"]').first.fill('#ff8800');page.locator('[data-field="color"]').first.dispatch_event('change')
    page.locator('[data-field="muted"]').first.check();page.locator('[data-field="muted"]').first.uncheck()
    choose(page.locator('#hand-split'),'65');page.locator('#apply-split').click();expect(page.locator('[data-field="role"]').first).to_have_value('pitch')
    page.locator('#auto-colors').click();expect(page.locator('[data-field="role"]').first).to_have_value('split')
    checks.append('All six track roles, instrument, volume, color, mute, manual split and auto colors work')
    page.reload();page.wait_for_load_state('networkidle');enter_player(page);page.locator('#settings-button').click()
    expect(page.locator('#volume')).to_have_value('1');expect(page.locator('#volume-boost')).to_have_value('12');expect(page.locator('#label-size')).to_have_value('18');expect(page.locator('#input-offset')).to_have_value('120');expect(page.locator('[data-field="instrument"]').first).to_have_value('40');expect(page.locator('[data-field="volume"]').first).to_have_value('0.5')
    page.locator('#sound-test').click();expect(page.locator('#soundfont-status')).to_have_text('general-user.sf2',timeout=60000)
    page.get_by_text('SoundFonts and instruments',exact=True).click();page.locator('#reset-soundfont').click();expect(page.locator('#soundfont-status')).to_contain_text('GeneralUser',timeout=60000)
    checks.append('Settings, track edits and custom SoundFont survive reload; reset restores included bank')
    page.locator('[data-settings-category="display"]').click();page.get_by_text('Display and practice options',exact=True).click()
    for sel in ['#play-my-part','#automatic-octave','#focus-mode']:page.locator(sel).uncheck()
    page.locator('#input-offset').fill('0');page.locator('#input-offset').dispatch_event('change')
    choose(page.locator('#tone'),'grand');page.get_by_role('button',name='Close settings',exact=True).click()
    page.locator('[data-mode="recital"]').click();expect(page.locator('#speed-value')).to_have_text('100%')
    for sel in ['#seek','#slower','#faster','#restart','#skip','#loop-button','#loop-a','#loop-b']:expect(page.locator(sel)).to_be_disabled()
    page.locator('#play').click();page.wait_for_timeout(1400);expect(page.locator('#score-live')).to_contain_text(re.compile(r'[1-9]\d* missed'))
    page.locator('#play').click();enter_player(page);page.locator('[data-mode="listen"]').click();expect(page.locator('#seek')).to_be_enabled()
    checks.append('Recital enforces original speed and disabled navigation, scores misses, and exits cleanly')
    page.locator('#restart').click();page.locator('#slower').click();expect(page.locator('#speed-value')).to_have_text('90%');page.locator('#faster').click();expect(page.locator('#speed-value')).to_have_text('100%');page.locator('#speed-reset').click()
    page.locator('#seek').fill('1');page.locator('#seek').dispatch_event('input');page.locator('#loop-a').click()
    page.locator('#seek').fill('2');page.locator('#seek').dispatch_event('input');page.locator('#loop-b').click();page.locator('#loop-button').click();page.locator('#play').click();page.wait_for_timeout(1700);assert 1<=float(page.locator('#seek').input_value())<=2;page.locator('#play').click();page.locator('#loop-button').click()
    page.locator('#bookmark-button').click();assert page.locator('#bookmarks option').count()==2
    page.locator('#skip').click();choose(page.locator('#bookmarks'),'0');assert float(page.locator('#seek').input_value())<2.1
    page.locator('#metronome').check();page.locator('#count-in').check();page.locator('#restart').click();page.locator('#play').click();page.wait_for_timeout(250);expect(page.locator('#practice-cue')).to_contain_text('Ready');page.locator('#play').click();page.locator('#count-in').uncheck();page.locator('#metronome').uncheck()
    checks.append('Speed, restart, skip, loop A/B, bookmark, count-in and metronome controls work')
    page.locator('#help-button').click();expect(page.locator('#help-dialog')).to_be_visible();page.keyboard.press('Escape');expect(page.locator('#help-dialog')).not_to_be_visible()
    page.locator('#fullscreen').click();page.wait_for_function('!!document.fullscreenElement');page.locator('#fullscreen').click();page.wait_for_function('!document.fullscreenElement')
    checks.append('Help dismissal and enter/exit fullscreen work')
    page.screenshot(path=str(ROOT/'test-results/updated-desktop.png'))
    assert not errors,errors
    (ROOT/'test-results/controls-results.json').write_text(json.dumps({'passed':checks,'errors':errors},indent=2))
    print(json.dumps({'passed':checks,'errors':errors},indent=2));b.close()

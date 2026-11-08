from ui_helpers import enter_free, enter_player, open_selected_song, choose
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json,os,re
root=Path(__file__).resolve().parents[1];results=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
 c=b.new_context(viewport={'width':1440,'height':1000});page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('KEYFALL_URL','http://127.0.0.1:5189'));page.wait_for_load_state('networkidle');enter_player(page)
 # Use the real mouse key, move away while held, and release outside its rectangle.
 enter_free(page);box=page.locator('[data-midi="60"]').bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']-30);page.mouse.down();expect(page.locator('[data-midi="60"]')).to_have_class(re.compile('playing'));page.mouse.move(500,250);page.mouse.up();expect(page.locator('[data-midi="60"]')).not_to_have_class(re.compile('playing'))
 page.locator('[data-midi="64"]').focus();page.keyboard.down('Enter');expect(page.locator('[data-midi="64"]')).to_have_class(re.compile('playing'));page.keyboard.up('Enter');expect(page.locator('[data-midi="64"]')).not_to_have_class(re.compile('playing'))
 page.locator('#settings-button').click();page.locator('[data-settings-category="display"]').click();page.get_by_text('Display and practice options',exact=True).click();choose(page.locator('#key-labels'),'mapping');page.get_by_role('button',name='Close settings',exact=True).click();page.keyboard.press('x');expect(page.locator('[data-midi="72"] span')).to_have_text('A');page.keyboard.press('z');expect(page.locator('[data-midi="60"] span')).to_have_text('A')
 results.append('Mouse capture/release outside key, Enter-key piano input and octave mappings work')
 enter_player(page);page.locator('[data-mode="listen"]').click();page.locator('#bookmark-button').click();page.locator('#settings-button').click();page.locator('[data-settings-category="bookmarks"]').click();page.get_by_text('Saved bookmarks',exact=True).click();page.locator('[data-rename-bookmark="0"]').fill('Chorus');page.locator('[data-rename-bookmark="0"]').press('Tab');expect(page.locator('#bookmarks option').nth(1)).to_contain_text('Chorus');page.locator('[data-delete-bookmark="0"]').click();expect(page.locator('#bookmarks option')).to_have_count(1);page.get_by_role('button',name='Close settings',exact=True).click()
 results.append('Bookmarks can be named and removed')
 # Pointer locations come from the rendered canvas, not app internals.
 target=page.evaluate('''()=>{const c=document.querySelector('#roll'),g=c.getContext('2d'),p=g.getImageData(0,0,c.width,c.height),r=c.getBoundingClientRect();for(let y=70;y<c.height-30;y+=4)for(let x=100;x<c.width-100;x+=4){const i=(y*c.width+x)*4;if(p.data[i]===165&&p.data[i+1]===232&&p.data[i+2]===107)return{x:r.left+x*r.width/c.width,y:r.top+y*r.height/c.height};}return null;}''')
 assert target;page.mouse.click(target['x'],target['y']);expect(page.locator('#finger-dialog')).to_be_visible();page.locator('[data-finger="3"]').click();expect(page.locator('#labels')).to_have_value('fingers');page.reload();page.wait_for_load_state('networkidle');enter_player(page);expect(page.locator('#labels')).to_have_value('fingers')
 assert page.evaluate("Object.values(JSON.parse(localStorage.getItem('keyfall:songs')||'{}')).some(s=>Object.values(s.fingers||{}).includes(3))")
 results.append('Clicking a falling note saves a finger hint and survives reload')
 page.locator('#sheet-button').click();expect(page.locator('#score svg').first).to_be_visible(timeout=20000);page.locator('#score-follow').uncheck();page.locator('#score-follow').check();page.locator('#score-expand').click();expect(page.locator('main')).to_have_class(re.compile('score-only'));page.locator('#score-expand').click();page.evaluate('window.print=()=>window.printInvoked=true');page.locator('#score-print').click();assert page.evaluate('window.printInvoked');page.locator('#score-close').click()
 results.append('Sheet follow, score-only toggle and print command work (printer dialog not exercised)')
 page.locator('#library-button').click()
 for sort in ['title','duration','notes','best','recent']:choose(page.locator('#library-sort'),sort);assert page.locator('.song-row').count()==5
 for option,count in [('included',5),('imported',0),('favorites',0),('all',5)]:choose(page.locator('#library-filter'),option);expect(page.locator('.song-row')).to_have_count(count)
 page.get_by_role('button',name='Close song library',exact=True).click()
 folder=root/'test-results/folder-fixture';folder.mkdir(exist_ok=True);(folder/'ignored.txt').write_text('Not a song');(folder/'piece.mid').write_bytes((root/'test-results/recording.mid').read_bytes());page.locator('#folder-input').set_input_files(str(folder));expect(page.locator('#composer')).to_contain_text('MIDI')
 page.locator('#library-button').click();choose(page.locator('#library-filter'),'imported');expect(page.locator('.song-row')).to_have_count(1)
 page.once('dialog',lambda d:d.dismiss());page.locator('[data-delete]').click();expect(page.locator('.song-row')).to_have_count(1)
 page.once('dialog',lambda d:d.accept());page.locator('[data-delete]').click();expect(page.locator('.song-row')).to_have_count(0)
 results.append('All library sorts/filters, folder import and song delete/cancel work')
 page.get_by_role('button',name='Close song library',exact=True).click();page.locator('[data-mode="wait"]').click();choose(page.locator('#hands'),'right');page.locator('#play').click();expect(page.locator('#practice-cue')).to_have_text('Play E4');page.keyboard.press('d');expect(page.locator('#score-live')).to_contain_text('1 correct');page.locator('#play').click();enter_player(page);page.locator('[data-mode="listen"]').click();page.locator('#library-button').click();page.locator('#progress-button').click();expect(page.locator('.history-row').first).to_contain_text('1 correct');page.get_by_role('button',name='Close history',exact=True).click();page.get_by_role('button',name='Close song library',exact=True).click()
 page.locator('[data-mode="rhythm"]').click();page.locator('#seek').fill(str(round(float(page.locator('#seek').get_attribute('max'))-.2,2)));page.locator('#seek').dispatch_event('input');page.locator('#play').click();expect(page.locator('#result-dialog')).to_be_visible();page.locator('#practice-again').click();expect(page.locator('#play')).to_have_attribute('aria-label','Pause');page.keyboard.press('Escape');expect(page.locator('#play')).to_have_attribute('aria-label','Play')
 results.append('Practice history, completion results, practice again and Escape stop work')
 page.locator('#settings-button').click();page.locator('[data-settings-category="display"]').click();page.get_by_text('Display and practice options',exact=True).click();page.locator('#focus-mode').check();page.get_by_role('button',name='Close settings',exact=True).click();enter_player(page);page.locator('[data-mode="listen"]').click();page.locator('#play').click();expect(page.locator('.songbar')).not_to_be_visible();page.locator('#play').click();expect(page.locator('.songbar')).to_be_visible()
 page.locator('#settings-button').click();page.screenshot(path=str(root/'test-results/settings.png'));page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#settings-dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth');page.screenshot(path=str(root/'test-results/settings-mobile.png'))
 results.append('Focus mode restores controls on pause; desktop/mobile settings remain usable')
 assert not errors,errors
 (root/'test-results/remaining-controls-results.json').write_text(json.dumps({'passed':results,'errors':errors},indent=2));print(json.dumps({'passed':results,'errors':errors},indent=2));b.close()



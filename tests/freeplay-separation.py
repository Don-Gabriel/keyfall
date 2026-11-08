from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from ui_helpers import enter_player,enter_free
import os,json,re
ROOT=Path(__file__).resolve().parents[1];passed=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe');page=b.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('KEYFALL_URL','http://127.0.0.1:5189'));page.wait_for_load_state('networkidle');enter_player(page)
 expect(page.locator('.mode-group button:visible')).to_have_count(4);expect(page.locator('[data-mode="free"]')).to_have_count(0);expect(page.locator('#record-button')).not_to_be_visible();expect(page.locator('#overdub-button')).to_be_visible()
 page.locator('#seek').fill('10');page.locator('#seek').dispatch_event('input');song=page.locator('#song-title').inner_text();page.locator('#player-home').click();resume=page.evaluate("JSON.parse(localStorage.getItem('keyfall:resume'))");page.locator('#home-free').click()
 for selector in ['.mode-group','.hand-control','.timeline','.transport','#library-button','#sheet-button','#loop-button','#metronome','#count-in','#overdub-button']:
  expect(page.locator(selector)).not_to_be_visible()
 expect(page.locator('#record-button')).to_be_visible();expect(page.locator('#export-button')).to_be_disabled();expect(page.locator('#free-sound')).to_be_visible()
 for key in ['Space','ArrowLeft','ArrowRight','ArrowUp','F2','F4','Home','b','q','m']:page.keyboard.press(key)
 expect(page.locator('#app')).to_have_attribute('data-view','free');expect(page.locator('#score-panel')).not_to_be_visible();expect(page.locator('#play')).to_have_attribute('aria-label','Play');assert page.evaluate("JSON.parse(localStorage.getItem('keyfall:resume'))")==resume
 passed.append('Four song modes only; Free play hides song controls and rejects song-only shortcuts')
 page.locator('#free-sound').click();expect(page.locator('#settings-sound')).to_be_visible();expect(page.locator('[data-settings-category="parts"]')).not_to_be_visible();expect(page.locator('[data-settings-category="bookmarks"]')).not_to_be_visible();page.locator('#settings-dialog [data-close]').click();expect(page.locator('#app')).to_have_attribute('data-view','free')
 expect(page.locator('#practice-cue')).to_have_text('Your piano. Your pace.');page.keyboard.down('a');expect(page.locator('#practice-cue')).not_to_be_visible();expect(page.locator('[data-midi="60"]')).to_have_class(re.compile('playing'));page.keyboard.up('a');expect(page.locator('[data-midi="60"]')).not_to_have_class(re.compile('playing'));page.wait_for_timeout(300);expect(page.locator('#practice-cue')).not_to_be_visible();page.locator('#free-sound').click();page.locator('#settings-dialog [data-close]').click();expect(page.locator('#practice-cue')).not_to_be_visible()
 page.locator('#record-button').click();page.keyboard.down('a');page.wait_for_timeout(160);page.keyboard.up('a');page.locator('#record-button').click();expect(page.locator('#free-recording-status')).to_contain_text('Saved: Recording');expect(page.locator('#song-title')).to_have_text('Free play');expect(page.locator('#app')).to_have_attribute('data-view','free');expect(page.locator('#export-button')).to_be_enabled();expect(page.locator('#practice-cue')).not_to_be_visible()
 with page.expect_download() as d:page.locator('#export-button').click()
 d.value.save_as(str(ROOT/'test-results/separate-freeplay.mid'));assert d.value.suggested_filename.startswith('Recording');assert (ROOT/'test-results/separate-freeplay.mid').read_bytes()[:4]==b'MThd'
 assert page.evaluate("JSON.parse(localStorage.getItem('keyfall:resume'))")==resume;page.screenshot(path=str(ROOT/'test-results/separate-freeplay.png'))
 passed.append('Free-play sound settings, input, recording and export stay in their own workspace; welcome hint stays dismissed after release, settings and recording')
 enter_player(page);expect(page.locator('#song-title')).to_have_text(song);assert abs(float(page.locator('#seek').input_value())-10)<.05;expect(page.locator('.mode-group button:visible')).to_have_count(4);page.keyboard.press('r');expect(page.locator('#app')).to_have_attribute('data-view','player');expect(page.locator('#record-button')).not_to_be_visible()
 enter_free(page);page.locator('#record-button').click();page.keyboard.press('d');page.locator('#player-home').click();expect(page.locator('#home-screen')).to_be_visible();page.reload();page.wait_for_load_state('networkidle');page.locator('#home-free').click();expect(page.locator('#free-recording-status')).to_contain_text('Saved: Recording');enter_player(page);expect(page.locator('#song-title')).to_have_text(song);assert abs(float(page.locator('#seek').input_value())-10)<.05
 passed.append('Leaving Free play autosaves recording without replacing the selected song or its resume position, including reload')
 enter_free(page);page.set_viewport_size({'width':390,'height':844});expect(page.locator('#record-button')).to_be_visible();expect(page.locator('#free-sound')).to_be_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(ROOT/'test-results/separate-freeplay-mobile.png'));passed.append('Separate Free play remains usable at a 390px viewport')
 assert not errors,errors;(ROOT/'test-results/freeplay-separation-results.json').write_text(json.dumps({'passed':passed,'errors':errors},indent=2));print(json.dumps({'passed':passed,'errors':errors},indent=2));b.close()

from ui_helpers import enter_player, open_selected_song, choose
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json,os
root=Path(__file__).resolve().parents[1]
song=Path(os.environ['KEYFALL_TEST_MIDI'])  # Optional local MIDI fixture; never bundled.
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page=b.new_page(viewport={'width':1920,'height':1080});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('KEYFALL_URL','http://127.0.0.1:5189'));page.wait_for_load_state('networkidle');enter_player(page);page.locator('#file-input').set_input_files(str(song));expect(page.locator('#composer')).to_contain_text('MIDI')
    page.locator('#settings-button').click();summary=page.locator('#hand-summary').inner_text();print(summary)
    assert not summary.startswith('0 left'),summary
    tracks=page.locator('.track-card strong').all_inner_texts();print(tracks)
    page.get_by_role('button',name='Close settings',exact=True).click();page.locator('#seek').fill('20');page.locator('#seek').dispatch_event('input');page.wait_for_timeout(200);page.screenshot(path=str(root/'test-results/imported-song.png'))
    page.locator('#play').click();page.wait_for_timeout(1600);assert float(page.locator('#seek').input_value())>21
    page.locator('#play').click();assert not errors,errors
    (root/'test-results/real-song-results.json').write_text(json.dumps({'file':song.name,'hands':summary,'tracks':tracks,'errors':errors},indent=2));b.close()

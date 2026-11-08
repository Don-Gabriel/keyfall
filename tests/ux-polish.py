from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from ui_helpers import enter_player, enter_free, choose
import os, json

ROOT=Path(__file__).resolve().parents[1]
passed=[]; errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('KEYFALL_URL','http://127.0.0.1:5190'));page.wait_for_load_state('networkidle')
    enter_player(page)
    page.locator('#seek').fill('1');page.locator('#seek').dispatch_event('input');page.locator('#seek').focus()
    page.keyboard.press('Space');expect(page.locator('#play')).to_have_attribute('aria-label','Pause')
    page.wait_for_timeout(700);assert float(page.locator('#seek').input_value())>1.4
    expect(page.locator('#seek')).to_be_focused();page.keyboard.press('Space')
    expect(page.locator('#play')).to_have_attribute('aria-label','Play')
    passed.append('Focused timeline advances during playback; Space starts and pauses without moving focus')

    speed=page.locator('#speed-value').inner_text();page.locator('#labels + button').click()
    page.keyboard.press('ArrowDown');page.keyboard.press('End');page.keyboard.press('Enter')
    expect(page.locator('#labels')).to_have_value('simple');expect(page.locator('#speed-value')).to_have_text(speed)
    page.locator('#labels + button').click();page.keyboard.press('Space')
    expect(page.locator('#play')).to_have_attribute('aria-label','Pause');expect(page.locator(':popover-open')).to_have_count(0)
    page.keyboard.press('Space');expect(page.locator('#play')).to_have_attribute('aria-label','Play')
    passed.append('Toolbar menu arrow keys change the option without changing playback speed; Space remains global')

    page.locator('#settings-button').click();page.locator('[data-settings-category="parts"]').click()
    role=page.locator('[data-field="role"]').first
    choose(role,'left');expect(role.locator('xpath=following-sibling::button[1]')).to_be_focused()
    instrument=page.locator('[data-field="instrument"]').first
    instrument.locator('xpath=following-sibling::button[1]').click()
    search=page.locator(':popover-open input');search.fill('zzzz-no-instrument')
    expect(page.locator(':popover-open .choice-empty')).to_be_visible();page.keyboard.press('Enter')
    expect(page.locator('#settings-dialog')).to_be_visible();expect(search).to_be_visible()
    search.fill('violin');page.keyboard.press('Enter');expect(instrument).to_have_value('40')
    expect(page.locator('#soundfont-status')).to_contain_text('GeneralUser',timeout=60000)
    expect(instrument.locator('xpath=following-sibling::button[1]')).to_be_focused()
    instrument.locator('xpath=following-sibling::button[1]').click();page.locator(':popover-open input').fill('flute');page.keyboard.press('ArrowDown')
    expect(page.locator(':popover-open [data-choice-value="73"]')).to_be_focused();page.keyboard.press('Escape')
    expect(instrument.locator('xpath=following-sibling::button[1]')).to_be_focused()
    passed.append('Search menus report no matches, select with Enter, navigate with arrows, and preserve focus through track updates')

    choose(page.locator('#note-labels'),'movable');expect(page.locator('#labels')).to_have_value('movable')
    page.get_by_role('button',name='Close settings',exact=True).click()
    expect(page.locator('#labels + button')).to_contain_text('Movable Do')
    choose(page.locator('#labels'),'simple');page.reload();page.wait_for_load_state('networkidle');enter_player(page)
    expect(page.locator('#labels')).to_have_value('simple');expect(page.locator('#note-labels')).to_have_value('simple')
    page.locator('#sheet-button').click();expect(page.locator('#score svg').first).to_be_visible(timeout=30000)
    page.locator('#score-expand').click();expect(page.locator('#score-expand')).to_have_attribute('aria-pressed','true')
    page.locator('#sheet-button').click();page.locator('#sheet-button').click()
    expect(page.locator('#score-expand')).to_have_attribute('aria-pressed','false')
    page.locator('#score-close').click()
    passed.append('All label choices synchronize and survive reload; reopening sheet music resets score-only state')

    enter_free(page);page.locator('#record-button').click();page.keyboard.press('a')
    expect(page.locator('#free-recording-status')).to_contain_text('Recording 0:')
    expect(page.locator('#practice-cue')).not_to_be_visible()
    page.evaluate('''() => new Promise(resolve=>{const r=indexedDB.open('keyfall-library',1);r.onsuccess=()=>{window.holdSave=true;const db=r.result;const tx=db.transaction('songs','readwrite');const store=tx.objectStore('songs');tx.oncomplete=()=>db.close();function keep(){const q=store.get('hold-save-test');q.onsuccess=()=>{if(window.holdSave)keep();};}keep();resolve();};})''')
    page.locator('#record-button').click();expect(page.locator('#free-recording-status')).to_have_text('Saving recording…')
    expect(page.locator('#record-button')).to_be_disabled();expect(page.locator('#export-button')).to_be_disabled()
    page.keyboard.press('r');expect(page.locator('#free-recording-status')).to_have_text('Saving recording…')
    page.locator('#player-home').click();expect(page.locator('#app')).to_have_attribute('data-view','free')
    page.evaluate('window.holdSave=false');expect(page.locator('#home-screen')).to_be_visible()
    page.locator('#home-free').click();expect(page.locator('#free-recording-status')).to_contain_text('Saved: Recording')
    expect(page.locator('#record-button')).to_be_enabled();expect(page.locator('#practice-cue')).not_to_be_visible()
    passed.append('Saving locks record/export, blocks shortcut reentry, and completes before navigation; recording status never covers the piano')

    page.locator('#player-home').click();page.locator('#home-songs').click()
    favorite=page.locator('[data-favorite="ode"]');favorite.click();expect(favorite).to_be_focused()
    page.locator('[data-song="ode"]').click();page.locator('#preview-song').click()
    expect(page.locator('#preview-song')).to_have_attribute('aria-pressed','true')
    expect(page.locator('#preview-song')).to_have_text('Preview song',timeout=16000)
    expect(page.locator('#preview-song')).to_have_attribute('aria-pressed','false')
    page.locator('#preview-song').click();expect(page.locator('#preview-song')).to_have_attribute('aria-pressed','true')
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    expect(page.locator('#preview-song')).to_have_text('Preview song');expect(page.locator('#preview-song')).to_have_attribute('aria-pressed','false')
    passed.append('Favorite retains keyboard focus; previews reset after completion and stop on window blur')
    page.screenshot(path=str(ROOT/'test-results/ux-polish.png'))
    assert not errors,errors
    (ROOT/'test-results/ux-polish-results.json').write_text(json.dumps({'passed':passed,'errors':errors},indent=2))
    print(json.dumps({'passed':passed,'errors':errors},indent=2));browser.close()

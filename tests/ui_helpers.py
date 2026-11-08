from playwright.sync_api import expect

def enter_player(page):
    if page.locator('#app').get_attribute('data-view')=='free':
        page.locator('#main-menu').click()
    if page.locator('#home-screen').is_visible():
        page.locator('#home-continue').click()
        expect(page.locator('#app')).to_have_attribute('data-view','player')

def open_selected_song(page):
    if page.locator('#song-screen').is_visible():
        page.locator('[data-setup-mode="listen"]').click()
        page.locator('#setup-start').click()
        expect(page.locator('#play')).to_have_attribute('aria-label','Pause')
        page.locator('#play').click()

def choose(select,value):
    page=select.page
    if select.get_attribute('id')=='hands':
        page.locator(f'[data-hand="{value}"]').click()
        return
    panel=select.locator('xpath=ancestor::section[contains(@class,"settings-page")]')
    if panel.count():
        category=panel.get_attribute('id').removeprefix('settings-')
        page.locator(f'[data-settings-category="{category}"]').click()
    details=select.locator('xpath=ancestor::details')
    if details.count() and details.get_attribute('open') is None:
        details.locator('summary').click()
    select.locator('xpath=following-sibling::button[1]').click()
    option=page.locator(f':popover-open [data-choice-value="{value}"]')
    option.click()

def enter_free(page):
    if page.locator('#app').get_attribute('data-view')!='home':
        page.locator('#player-home').click()
    page.locator('#home-free').click()
    expect(page.locator('#app')).to_have_attribute('data-view','free')

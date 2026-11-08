from playwright.sync_api import sync_playwright
from pathlib import Path
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page=b.new_page()
    page.on('console',lambda msg: print(msg.text[:3000]) if 'Sheet rendering' in msg.text else None)
    page.goto('http://127.0.0.1:5188')
    page.wait_for_load_state('networkidle')
    xml=Path('tests/browser.py').read_text().split("xml = '''")[1].split("'''")[0]
    page.locator('#file-input').set_input_files({'name':'test.musicxml','mimeType':'application/xml','buffer':xml.encode()})
    page.wait_for_timeout(300)
    page.locator('#sheet-button').click()
    page.wait_for_timeout(1500)
    print(page.locator('#score-message').inner_text())
    b.close()

"""Visual verification of the hourglass bridge connector."""
from playwright.sync_api import sync_playwright
import time

PORT = 5176

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto(f'http://localhost:{PORT}')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='/tmp/bridge-0-initial.png', full_page=False)
    print('Initial screenshot saved')

    # Select teeth 43, 44, 45 (lower premolars) for a bridge
    # First click a tooth to see what happens
    # Look for tooth buttons
    buttons = page.locator('[role="button"]').all()
    print(f'Found {len(buttons)} buttons')

    # Print aria-labels to identify tooth buttons
    for btn in buttons[:10]:
        label = btn.get_attribute('aria-label')
        if label:
            print(f'  button: {label}')

    # Find teeth by aria-label containing FDI numbers
    # Try clicking tooth 43 (lower left canine area), 44, 45
    for fdi in ['43', '44', '45']:
        btn = page.locator(f'[aria-label*="{fdi}"]').first
        if btn.count() > 0:
            btn.click()
            time.sleep(0.2)
            print(f'Clicked tooth {fdi}')

    page.screenshot(path='/tmp/bridge-1-teeth-selected.png', full_page=False)
    print('After tooth selection')

    # Now look for Bridge treatment option in the sidebar
    page.wait_for_timeout(500)

    # Look for bridge button
    bridge_btn = page.locator('text=Bridge').first
    if bridge_btn.count() > 0:
        bridge_btn.click()
        print('Clicked Bridge treatment')
        page.wait_for_timeout(500)
        page.screenshot(path='/tmp/bridge-2-bridge-applied.png', full_page=False)
        print('Bridge applied screenshot saved')
    else:
        print('Bridge button not found - listing all visible text')
        all_text = page.locator('button').all_text_contents()
        print('Buttons:', all_text[:20])

    # Also try upper arch: 13, 14, 15, 16
    page.reload()
    page.wait_for_load_state('networkidle')
    for fdi in ['13', '14', '15', '16']:
        btn = page.locator(f'[aria-label*="{fdi}"]').first
        if btn.count() > 0:
            btn.click()
            time.sleep(0.1)
            print(f'Clicked tooth {fdi}')

    page.wait_for_timeout(300)
    bridge_btn = page.locator('text=Bridge').first
    if bridge_btn.count() > 0:
        bridge_btn.click()
        page.wait_for_timeout(500)
        page.screenshot(path='/tmp/bridge-3-upper-bridge.png', full_page=False)
        print('Upper bridge screenshot saved')

    browser.close()
    print('Done')

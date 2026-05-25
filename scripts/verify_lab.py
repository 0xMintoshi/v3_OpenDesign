from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Check lab.html
    page.goto('http://localhost:5173/lab.html')
    page.wait_for_load_state('networkidle')
    errors = []
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    page.screenshot(path='/tmp/lab_verify.png', full_page=True)

    # Check for key elements
    h2 = page.locator('h2').first.inner_text()
    svg = page.locator('svg').count()
    paths = page.locator('path').count()
    circles = page.locator('circle').count()
    print(f"Lab h2: {h2}")
    print(f"SVG elements: {svg}, paths: {paths}, circles: {circles}")

    # Check main app
    page2 = browser.new_page()
    page2.goto('http://localhost:5173/')
    page2.wait_for_load_state('networkidle')
    page2.screenshot(path='/tmp/main_verify.png', full_page=True)
    title = page2.title()
    print(f"Main app title: {title}")

    browser.close()
    print("DONE")

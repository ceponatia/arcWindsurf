import { test, expect } from '@playwright/test';

test.describe('AppShell Responsive State Preservation', () => {
  test('should preserve character studio state when resizing across breakpoints', async ({ page }) => {
    // 1. Start at desktop resolution
    await page.setViewportSize({ width: 1280, height: 800 });

    // 2. Navigate to Character Studio
    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.goto('/#/characters');
    await page.waitForFunction(() => window.location.hash.includes('characters'));
    const loadingView = page.getByText('Loading view…');
    if (await loadingView.isVisible()) {
      await expect(loadingView).not.toBeVisible({ timeout: 15000 });
    }
    await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', { name: '+ New Character' }).click();
    await page.waitForFunction(() => window.location.hash.includes('character-studio'));

    // 3. Wait for the Identity Panel to be visible
    const loadingText = page.getByText('Loading Character Studio...');
    if (await loadingText.isVisible()) {
      await expect(loadingText).not.toBeVisible({ timeout: 15000 });
    }
    const nameInput = page.getByPlaceholder('Character name');
    await expect(nameInput).toBeVisible({ timeout: 15000 });

    // 4. Enter a name to create state
    const testName = 'Responsive Hero';
    await nameInput.fill(testName);
    await expect(nameInput).toHaveValue(testName);

    // 5. Verify we are in desktop view (Sidebar should be visible)
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // 6. Resize to mobile (below 768px)
    await page.setViewportSize({ width: 600, height: 800 });

    // 7. Verify we are now in mobile view
    // In mobile view (ResponsiveShell), the aside should be hidden (hidden md:block)
    await expect(sidebar).not.toBeVisible();

    // 8. Verify the state is PRESERVED
    // The nameInput should still exist and have the same value
    // because MainContent was not unmounted
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue(testName);

    // 9. Resize back to desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // 10. Verify we are back in desktop and state is still there
    await expect(sidebar).toBeVisible();
    await expect(nameInput).toHaveValue(testName);
  });

  test('should preserve view mode in sessionStorage', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.goto('/#/characters');
    await page.waitForFunction(() => window.location.hash.includes('characters'));
    const loadingView = page.getByText('Loading view…');
    if (await loadingView.isVisible()) {
      await expect(loadingView).not.toBeVisible({ timeout: 15000 });
    }
    await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', { name: '+ New Character' }).click();
    await page.waitForFunction(() => window.location.hash.includes('character-studio'));

    // Check if viewMode is saved in sessionStorage
    await page.waitForFunction(() => sessionStorage.getItem('app.viewMode') === 'character-studio');
    const viewMode = await page.evaluate(() => sessionStorage.getItem('app.viewMode'));
    expect(viewMode).toBe('character-studio');

    // Refresh page
    await page.reload();

    // Verify we are still in character-studio
    await expect(page).toHaveURL(/.*character-studio/);
    const nameInput = page.getByPlaceholder('Character name');
    await expect(nameInput).toBeVisible({ timeout: 15000 });
  });
});

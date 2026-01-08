const { test, expect } = require('@playwright/test');
const path = require('path');

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;
const E2E_EMAIL_2 = process.env.E2E_EMAIL_2;
const E2E_PASSWORD_2 = process.env.E2E_PASSWORD_2;

const AUTH_DIR = path.resolve(__dirname, '.auth');
const STORAGE_STATE_A = path.join(AUTH_DIR, 'userA.json');

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function byTestId(page, id) {
  return page.locator(`[data-testid="${id}"]`);
}

async function ensureLoggedInAsAdmin(page) {
  await page.goto('/');
  // Click Admin in side nav; only visible for admin users
  const adminButton = page.getByRole('button', { name: 'Admin' }).first();
  const visible = await adminButton.isVisible().catch(() => false);
  if (!visible) {
    test.skip(true, 'Admin menu is not visible; ensure E2E_EMAIL is an admin');
  }
  await adminButton.click();
  await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 20_000 });
}

async function findUserRowByEmail(page, email) {
  // Find row containing the email text
  const emailLocator = page.getByText(email, { exact: true }).first();
  await expect(emailLocator).toBeVisible({ timeout: 20_000 });
  // Climb to the nearest user row element by testid prefix
  const row = emailLocator.locator('xpath=ancestor::*[@data-testid and starts-with(@data-testid, "admin-user-row-")][1]');
  await expect(row).toBeVisible({ timeout: 10_000 });
  return row;
}

async function getUserIdFromRow(row) {
  const testId = await row.getAttribute('data-testid');
  if (!testId) return null;
  const m = testId.match(/^admin-user-row-(.+)$/);
  return m ? m[1] : null;
}

test.describe('admin ban/unban UI', () => {
  test.skip(
    !isValidEmail(E2E_EMAIL) || !E2E_PASSWORD || !isValidEmail(E2E_EMAIL_2) || !E2E_PASSWORD_2,
    'Set E2E_EMAIL/E2E_PASSWORD (admin) and E2E_EMAIL_2/E2E_PASSWORD_2 (target user) in .env.e2e'
  );

  test.use({ storageState: STORAGE_STATE_A });

  test('can ban and unban a target user and see status update', async ({ page }) => {
    test.setTimeout(120_000);

    await ensureLoggedInAsAdmin(page);

    const row = await findUserRowByEmail(page, E2E_EMAIL_2);
    const userId = await getUserIdFromRow(row);
    if (!userId) throw new Error('Could not determine userId for target user row');

    const status = byTestId(page, `admin-status-${userId}`);
    const banBtn = byTestId(page, `admin-ban-${userId}`);
    const unbanBtn = byTestId(page, `admin-unban-${userId}`);

    // Determine initial state
    const isBannedInitially = await status.getByText('Banned', { exact: true }).isVisible().catch(() => false);

    // Ensure Active state by unbanning if needed
    if (isBannedInitially) {
      if (await unbanBtn.isVisible()) {
        await unbanBtn.click();
      }
      await expect(status.getByText('Updating…')).toBeVisible({ timeout: 10_000 });
      await expect(status.getByText('Active')).toBeVisible({ timeout: 30_000 });
    }

    // Ban flow
    await banBtn.click();
    await expect(status.getByText('Updating…')).toBeVisible({ timeout: 10_000 });
    await expect(status.getByText('Banned')).toBeVisible({ timeout: 45_000 });

    // Unban flow (restore)
    await unbanBtn.click();
    await expect(status.getByText('Updating…')).toBeVisible({ timeout: 10_000 });
    await expect(status.getByText('Active')).toBeVisible({ timeout: 45_000 });
  });
});

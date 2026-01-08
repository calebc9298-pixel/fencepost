const fs = require('fs');
const path = require('path');
const { chromium, expect } = require('@playwright/test');

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function loginAndSaveState({ baseURL, email, password, statePath }) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseURL);

  const feedReady = page
    .locator('[data-testid="feed-compose-open"]')
    .or(page.getByPlaceholder("What's happening on the farm?"));
  const alreadyAuthed = await feedReady.isVisible().catch(() => false);
  if (!alreadyAuthed) {
    // Login screen
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill(password);

    const loginButton = page
      .locator('[data-testid="login-submit"]')
      .or(page.getByRole('button', { name: 'Login', exact: true }))
      .or(page.locator('[tabindex="0"]', { hasText: /^Login$/ }).first());

    await loginButton.first().click({ timeout: 30_000 });
  }

  // Feed screen
  await expect(feedReady).toBeVisible({ timeout: 30_000 });

  await context.storageState({ path: statePath });
  await browser.close();
}

module.exports = async (config) => {
  const baseURL = config.projects?.[0]?.use?.baseURL || config.use?.baseURL;

  const emailA = process.env.E2E_EMAIL;
  const passwordA = process.env.E2E_PASSWORD;
  const emailB = process.env.E2E_EMAIL_2;
  const passwordB = process.env.E2E_PASSWORD_2;

  if (!isValidEmail(emailA) || !passwordA || !isValidEmail(emailB) || !passwordB) {
    // Let tests handle skipping with their existing guard.
    return;
  }

  const outDir = path.resolve(__dirname, '.auth');
  fs.mkdirSync(outDir, { recursive: true });

  await loginAndSaveState({
    baseURL,
    email: emailA,
    password: passwordA,
    statePath: path.join(outDir, 'userA.json'),
  });

  await loginAndSaveState({
    baseURL,
    email: emailB,
    password: passwordB,
    statePath: path.join(outDir, 'userB.json'),
  });
};

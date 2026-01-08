const { test, expect } = require('@playwright/test');
const path = require('path');

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function byTestId(page, id) {
  return page.locator(`[data-testid="${id}"]`);
}

function inputByTestIdOrPlaceholder(page, id, placeholder) {
  return byTestId(page, id).or(page.getByPlaceholder(placeholder));
}

function buttonByTestIdOrText(page, id, text) {
  return byTestId(page, id)
    .or(page.getByRole('button', { name: text, exact: true }))
    .or(page.locator('[tabindex="0"]', { hasText: new RegExp(`^${escapeRegExp(text)}$`) }).first());
}

async function dismissAnyDialogs(page) {
  const messages = [];
  page.on('dialog', async (dialog) => {
    messages.push(dialog.message());
    await dialog.accept();
  });
  return messages;
}

function captureConsoleErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err?.message || String(err)}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  return errors;
}

function captureNetworkFailures(page) {
  const failures = [];

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    failures.push(`requestfailed: ${req.method()} ${req.url()} :: ${failure?.errorText || 'unknown error'}`);
  });

  page.on('response', async (resp) => {
    const status = resp.status();
    if (status < 400) return;

    const url = resp.url();
    const isFirebaseAuth =
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('firebaseapp.com') ||
      url.includes('firebaseio.com');
    const isFirestore = url.includes('firestore.googleapis.com');
    const isStorage = url.includes('firebasestorage.googleapis.com');

    if (!isFirebaseAuth && !isFirestore && !isStorage) return;

    let bodySnippet = '';
    try {
      const text = await resp.text();
      bodySnippet = text ? ` :: ${text.slice(0, 500)}` : '';
    } catch {
      // ignore
    }

    failures.push(`http${status}: ${url}${bodySnippet}`);
  });

  return failures;
}

async function login(page) {
  if (!E2E_EMAIL || !E2E_PASSWORD) {
    throw new Error('Missing E2E_EMAIL/E2E_PASSWORD env vars for authenticated tests.');
  }

  const dialogs = await dismissAnyDialogs(page);
  const consoleErrors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  await page.goto('/');
  await inputByTestIdOrPlaceholder(page, 'login-email', 'Email').fill(E2E_EMAIL);
  await inputByTestIdOrPlaceholder(page, 'login-password', 'Password').fill(E2E_PASSWORD);
  await buttonByTestIdOrText(page, 'login-submit', 'Login').click();

  const feedReady = byTestId(page, 'feed-compose-open').or(
    inputByTestIdOrPlaceholder(page, 'feed-quickpost-input', "What's happening on the farm?")
  );
  try {
    await expect(feedReady).toBeVisible({ timeout: 20_000 });
  } catch (err) {
    const dialogTail = dialogs.slice(-3);
    const consoleTail = consoleErrors.slice(-8);
    const networkTail = networkFailures.slice(-8);
    throw new Error(
      [
        `Login did not reach feed for ${E2E_EMAIL}.`,
        `Recent dialogs: ${dialogTail.length ? dialogTail.join(' | ') : '(none)'}`,
        `Recent console errors: ${consoleTail.length ? consoleTail.join(' || ') : '(none)'}`,
        `Recent network failures: ${networkTail.length ? networkTail.join(' || ') : '(none)'}`,
        `Original error: ${err?.message || err}`,
      ].join('\n')
    );
  }
}

async function openDrawerItem(page, label) {
  const menuButton = page.getByText('☰', { exact: true });
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.click();
  }

  const buttonByRole = page.getByRole('button', { name: label, exact: true }).first();
  const focusableByText = page.locator('[tabindex="0"]', { hasText: new RegExp(`^${escapeRegExp(label)}$`) }).first();
  const textAncestorFocusable = page
    .getByText(label, { exact: true })
    .first()
    .locator('xpath=ancestor::*[@role="button" or @tabindex="0"][1]');

  const target = buttonByRole.or(focusableByText).or(textAncestorFocusable);
  await target.scrollIntoViewIfNeeded();
  await target.click();
}

async function gotoFencePostViaTopNav(page) {
  // Deep links are not fully configured for all routes on web, so direct page.goto('/...')
  // may not land on the intended screen. Clicking the in-app nav (href) is reliable.
  const navTarget = page
    .locator('button[href="/Main/FencePost"], a[href="/Main/FencePost"]')
    .first();
  await expect(navTarget).toBeVisible({ timeout: 30_000 });
  try {
    // In some headless layouts it can be off-viewport even after scroll.
    await navTarget.scrollIntoViewIfNeeded();
    await navTarget.click({ force: true, timeout: 5_000 });
  } catch {
    // Bypass Playwright pointer/viewport heuristics.
    await navTarget.evaluate((el) => el.click());
  }
}

test.describe('uploads (requires E2E_EMAIL/E2E_PASSWORD)', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD to enable authenticated E2E tests.');

  test('1KB Storage debug upload works', async ({ page }) => {
    test.setTimeout(180_000);

    await page.addInitScript(() => {
      localStorage.setItem('FP_UPLOAD_DEBUG', '1');
      // Give resumable uploads extra time to emit first progress in CI/headless.
      localStorage.setItem('FP_UPLOAD_STALL_MS', '60000');
    });

    const consoleLines = [];
    const networkFailures = captureNetworkFailures(page);
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[upload]')) consoleLines.push(text);
    });

    await login(page);

    let result;
    try {
      result = await page.evaluate(async () => {
        if (!window.FP_debugStorageUpload) {
          throw new Error('window.FP_debugStorageUpload is not defined');
        }
        return window.FP_debugStorageUpload();
      });
    } catch (e) {
      const logTail = consoleLines.slice(-25);
      const netTail = networkFailures.slice(-25);
      throw new Error(
        [
          `Debug upload failed: ${e?.message || e}`,
          `Recent [upload] console logs: ${logTail.length ? logTail.join(' || ') : '(none)'}`,
          `Recent network failures: ${netTail.length ? netTail.join(' || ') : '(none)'}`,
        ].join('\n')
      );
    }

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Typical signed URL format. (Avoid overfitting.)
    expect(result).toMatch(/^https?:\/\//);
  });

  test('feed composer: can add photo and post', async ({ page }) => {
    test.setTimeout(180_000);

    await page.addInitScript(() => {
      localStorage.setItem('FP_UPLOAD_DEBUG', '1');
      localStorage.setItem('FP_UPLOAD_STALL_MS', '60000');
    });

    const consoleLines = [];
    const networkFailures = captureNetworkFailures(page);
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[upload]')) consoleLines.push(text);
    });

    await login(page);

    await buttonByTestIdOrText(page, 'feed-compose-open', 'Post').click();
    await expect(page.getByText('New Post', { exact: true })).toBeVisible();

    const postText = `E2E upload ${Date.now()}`;
    await page.getByPlaceholder(/write your post/i).fill(postText);

    const filePath = path.resolve(__dirname, '..', 'assets', 'icon.png');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await byTestId(page, 'feed-compose-addphoto').click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles(filePath);

    await expect(page.getByLabel('Remove photo').first()).toBeVisible({ timeout: 20_000 });

    try {
      await byTestId(page, 'feed-compose-submit').click();

      await expect(page.getByText('New Post', { exact: true })).toBeHidden({ timeout: 120_000 });
      await expect(page.getByText(new RegExp(escapeRegExp(postText)))).toBeVisible({ timeout: 120_000 });
    } catch (e) {
      const logTail = consoleLines.slice(-35);
      const netTail = networkFailures.slice(-25);
      throw new Error(
        [
          `Composer post failed: ${e?.message || e}`,
          `Recent [upload] console logs: ${logTail.length ? logTail.join(' || ') : '(none)'}`,
          `Recent network failures: ${netTail.length ? netTail.join(' || ') : '(none)'}`,
        ].join('\n')
      );
    }
  });

  test('fencepost: can add photo and submit', async ({ page }) => {
    test.setTimeout(180_000);

    await page.addInitScript(() => {
      localStorage.setItem('FP_UPLOAD_DEBUG', '1');
      localStorage.setItem('FP_UPLOAD_STALL_MS', '60000');
    });

    const consoleLines = [];
    const networkFailures = captureNetworkFailures(page);
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[upload]')) consoleLines.push(text);
    });

    await login(page);

    await gotoFencePostViaTopNav(page);
    await expect(page.getByText('Create a FencePost', { exact: true })).toBeVisible({ timeout: 30_000 });

    await byTestId(page, 'createpost-start-fencepost').click();
    await expect(page.getByText('Activity Type', { exact: true })).toBeVisible();

    // Select an activity with minimal required fields.
    const activitySelect = page.locator('select:visible').first();
    await activitySelect.scrollIntoViewIfNeeded();
    await activitySelect.selectOption('maintenance');

    await expect(page.getByText('Activity Details', { exact: true })).toBeVisible();
    const equipmentText = `E2E Tractor ${Date.now()}`;
    await page
      .locator('[data-testid="fencepost-input-equipment"]')
      .or(page.getByPlaceholder('e.g., John Deere 8R'))
      .fill(equipmentText);
    await page
      .locator('[data-testid="fencepost-input-task"]')
      .or(page.getByPlaceholder('e.g., Oil change, tire repair'))
      .fill('Oil change');
    await page
      .locator('[data-testid="fencepost-input-cost"]')
      .or(page.getByPlaceholder('e.g., $500'))
      .fill('123');

    // Add a photo via web file chooser.
    const filePath = path.resolve(__dirname, '..', 'assets', 'icon.png');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await byTestId(page, 'fencepost-addphoto').click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles(filePath);

    // Submit
    try {
      // On web, React Native's Alert may surface as a browser dialog (window.alert)
      // which blocks subsequent navigation until dismissed.
      page.once('dialog', async (dialog) => {
        try {
          await dialog.accept();
        } catch {
          // ignore
        }
      });

      await byTestId(page, 'fencepost-submit').click();
      // After submit, app navigates back to Feed and the new FencePost should appear.
      await expect(
        page
          .locator(':visible')
          .filter({ hasText: new RegExp(escapeRegExp(equipmentText)) })
          .first()
      ).toBeVisible({ timeout: 120_000 });
    } catch (e) {
      const logTail = consoleLines.slice(-35);
      const netTail = networkFailures.slice(-25);
      throw new Error(
        [
          `FencePost submit failed: ${e?.message || e}`,
          `Recent [upload] console logs: ${logTail.length ? logTail.join(' || ') : '(none)'}`,
          `Recent network failures: ${netTail.length ? netTail.join(' || ') : '(none)'}`,
        ].join('\n')
      );
    }
  });
});

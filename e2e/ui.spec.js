const { test, expect } = require('@playwright/test');

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
  // RN-web buttons are not always exposed with a semantic <button> role.
  return byTestId(page, id)
    .or(page.getByRole('button', { name: text, exact: true }))
    // RN-web touchables are often rendered as focusable elements.
    .or(page.locator('[tabindex="0"]', { hasText: new RegExp(`^${escapeRegExp(text)}$`) }).first());
}

async function dismissAnyDialogs(page) {
  const messages = [];
  page.on('dialog', async (dialog) => {
    // Confirm/alert prompts are used in a few flows (e.g., delete post).
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

    if (!isFirebaseAuth && !isFirestore) return;

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

  // Feed quick-post input is our stable post-login indicator.
  const feedInput = inputByTestIdOrPlaceholder(page, 'feed-quickpost-input', "What's happening on the farm?");
  try {
    await expect(feedInput).toBeVisible({ timeout: 20_000 });
  } catch (err) {
    const dialogTail = dialogs.slice(-3);
    const consoleTail = consoleErrors.slice(-8);
    const networkTail = networkFailures.slice(-8);
    if (dialogTail.length || consoleTail.length || networkTail.length) {
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
    throw err;
  }
}

async function openDrawerItem(page, label) {
  // On large screens the drawer is permanent; on small screens we may need to open it.
  const menuButton = page.getByText('☰', { exact: true });
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.click();
  }
  await page.getByText(label, { exact: true }).first().click();
}

function visibleInputByPlaceholder(page, placeholder) {
  return page.locator(`input[placeholder="${placeholder}"]:visible`);
}

test('unauthenticated: loads login and can open register', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('FencePost', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

  await page.getByText("Don't have an account? Register", { exact: true }).click();
  await expect(page.getByText('Create Account', { exact: true })).toBeVisible();
  await expect(page.locator('input[placeholder="Email"]:visible')).toBeVisible();

  await page.getByText('Already have an account? Login', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});

test.describe('authenticated (requires E2E_EMAIL/E2E_PASSWORD)', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD to enable authenticated E2E tests.');

  test('can login and see feed', async ({ page }) => {
    await login(page);
    await expect(buttonByTestIdOrText(page, 'feed-quickpost-submit', 'Post')).toBeVisible();
  });

  test('can create a FencePost (maintenance)', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);

    await openDrawerItem(page, 'FencePost');
    await expect(page.getByText('Create a FencePost', { exact: true })).toBeVisible();

    await buttonByTestIdOrText(page, 'createpost-start-fencepost', 'Start a FencePost')
      .or(page.getByText('Start a FencePost', { exact: true }).first())
      .click();
    await expect(page.getByText('Activity Type', { exact: true })).toBeVisible();

    // Select an activity with minimal required fields.
    // Activity picker is a <select> on web.
    const activitySelect = page.locator('select:visible').first();
    await activitySelect.scrollIntoViewIfNeeded();
    await activitySelect.selectOption('maintenance');

    await expect(page.getByText('Activity Details', { exact: true })).toBeVisible();
    await page
      .locator('[data-testid="fencepost-input-equipment"]')
      .or(page.getByPlaceholder('e.g., John Deere 8R'))
      .fill(`E2E Tractor ${Date.now()}`);
    await page
      .locator('[data-testid="fencepost-input-task"]')
      .or(page.getByPlaceholder('e.g., Oil change, tire repair'))
      .fill('Oil change');
    await page
      .locator('[data-testid="fencepost-input-cost"]')
      .or(page.getByPlaceholder('e.g., $500'))
      .fill('123');

    await page
      .locator('[data-testid="fencepost-submit"]')
      .or(page.getByText('Post FencePost', { exact: true }))
      .click();
    // After submit, app navigates back to Feed.
    await expect(
      page.locator('textarea[placeholder="What\'s happening on the farm?"]:visible').first()
    ).toBeVisible();
  });

  test('can post a Rain Gauge reading', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);

    await openDrawerItem(page, 'Rain Gauge');
    // Avoid strict-mode collision between drawer item and screen header.
    await expect(page.getByPlaceholder('0.00')).toBeVisible();

    await page.locator('[data-testid="raingauge-rainfall"]').or(page.getByPlaceholder('0.00')).fill('0.25');
    await page
      .locator('[data-testid="raingauge-notes"]')
      .or(page.getByPlaceholder('Additional observations (optional)'))
      .fill(`E2E rain ${Date.now()}`);
    await page
      .locator('[data-testid="raingauge-submit"]')
      .or(page.getByText('Post Rain Gauge Reading', { exact: true }))
      .click();

    // RainGauge navigates back to Feed.
    await expect(page.getByPlaceholder("What's happening on the farm?")).toBeVisible();
  });

  test('profile: can add a field', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);

    await openDrawerItem(page, 'Profile');
    await expect(page.getByText('Username:', { exact: true })).toBeVisible();

    // Add field
    await page.locator('[data-testid="profile-add-field-open"]').or(page.getByText('+ Add Field', { exact: true })).click();
    await expect(page.getByText('Add New Field', { exact: true })).toBeVisible();
    const fieldName = `E2E Field ${Date.now()}`;
    const fieldNameInput = page
      .locator('[data-testid="profile-add-field-name"]')
      .or(visibleInputByPlaceholder(page, 'e.g., North 40, Back Forty'));
    await expect(fieldNameInput).toBeVisible();
    await fieldNameInput.fill(fieldName);
    await expect(fieldNameInput).toHaveValue(fieldName, { timeout: 5_000 });

    const acresInput = page.locator('[data-testid="profile-add-field-acres"]').or(visibleInputByPlaceholder(page, '0'));
    await expect(acresInput).toBeVisible();
    await acresInput.fill('10');
    await expect(acresInput).toHaveValue('10', { timeout: 5_000 });

    const modalTitle = page.getByText('Add New Field', { exact: true });
    const submitAddField = page.locator('[data-testid="profile-add-field-save"]').or(page.getByText('Add Field', { exact: true }).first());
    await submitAddField.click();

    // If the modal stays open, validation likely fired (state didn't update). Retry once using real typing.
    if (await modalTitle.isVisible().catch(() => false)) {
      await fieldNameInput.click();
      await fieldNameInput.press('Control+A');
      await fieldNameInput.type(fieldName, { delay: 10 });

      await acresInput.click();
      await acresInput.press('Control+A');
      await acresInput.type('10', { delay: 10 });

      await submitAddField.click();
    }

    // Wait for the modal to close; background content may be hidden while it is open.
    await expect(modalTitle).toBeHidden({ timeout: 30_000 });

    // Assert field appears on the Profile screen (ScrollView may clip off-screen content on web).
    const fieldText = page.getByText(fieldName, { exact: false }).first();
    await expect(fieldText).toHaveCount(1, { timeout: 30_000 });
    await fieldText.scrollIntoViewIfNeeded();
    await expect(fieldText).toBeVisible({ timeout: 30_000 });
  });

  test('can like and dislike a post', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);

    const postText = `E2E like/dislike ${Date.now()}`;
    await page.getByPlaceholder("What's happening on the farm?").fill(postText);
    await buttonByTestIdOrText(page, 'feed-quickpost-submit', 'Post').click();

    const postTextLocator = page.getByText(postText, { exact: true });
    try {
      await expect(postTextLocator).toBeVisible({ timeout: 45_000 });
    } catch {
      await page.reload();
      await expect(postTextLocator).toBeVisible({ timeout: 45_000 });
    }

    const postTestId = await postTextLocator.getAttribute('data-testid');
    if (postTestId && postTestId.startsWith('post-text-')) {
      const postId = postTestId.replace('post-text-', '');
      await page.locator(`[data-testid="post-like-${postId}"]`).click();
      await page.locator(`[data-testid="post-dislike-${postId}"]`).click();
      await page.locator(`[data-testid="post-delete-${postId}"]`).click();
    } else {
      // Fallback for deployed builds without testIDs: click the 👍 / 👎 buttons near the first matching post.
      await page.getByText('👍', { exact: false }).first().click();
      await page.getByText('👎', { exact: false }).first().click();
    }
  });

  test('can create, comment, and delete a quick post', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);

    const postText = `E2E quick post ${Date.now()}`;
    await inputByTestIdOrPlaceholder(page, 'feed-quickpost-input', "What's happening on the farm?").fill(postText);
    await buttonByTestIdOrText(page, 'feed-quickpost-submit', 'Post').click();

    const postTextLocator = page.locator('[data-testid^="post-text-"]', { hasText: postText }).first().or(page.getByText(postText, { exact: true }));
    try {
      await expect(postTextLocator).toBeVisible({ timeout: 45_000 });
    } catch {
      // Occasionally Firestore propagation/UI refresh lags; reload once and retry.
      await page.reload();
      await expect(postTextLocator).toBeVisible({ timeout: 45_000 });
    }

    // Open comments
    await postTextLocator.click();
    await expect(byTestId(page, 'comments-back').or(page.getByText('← Back to Feed', { exact: true }))).toBeVisible();

    const commentText = `E2E comment ${Date.now()}`;
    await inputByTestIdOrPlaceholder(page, 'comments-input', 'Add a comment...').fill(commentText);
    await buttonByTestIdOrText(page, 'comments-send', 'Send').click();
    await expect(page.getByText(commentText, { exact: true })).toBeVisible();

    // Back to feed and delete the post we created.
    await byTestId(page, 'comments-back').or(page.getByText('← Back to Feed', { exact: true })).click();
    await expect(inputByTestIdOrPlaceholder(page, 'feed-quickpost-input', "What's happening on the farm?")).toBeVisible();

    const postTestId = await postTextLocator.getAttribute('data-testid');
    if (postTestId && postTestId.startsWith('post-text-')) {
      const postId = postTestId.replace('post-text-', '');
      await byTestId(page, `post-delete-${postId}`).click();
    } else {
      // Best-effort fallback for pre-deploy runs: delete the first visible delete icon (only shows for posts you own).
      await page.getByText('🗑️', { exact: true }).first().click();
    }

    await expect(page.getByText(postText, { exact: true })).toHaveCount(0);
  });

  test('can open notifications dropdown', async ({ page }) => {
    await login(page);

    await byTestId(page, 'notifications-bell').or(page.getByText('🔔', { exact: true })).click();
    await expect(byTestId(page, 'notifications-dropdown').or(page.getByText('No notifications yet.', { exact: true }))).toBeVisible();
  });

  test('can logout from profile', async ({ page }) => {
    await login(page);

    await page.getByText('Profile', { exact: true }).first().click();
    await expect(byTestId(page, 'profile-logout').or(page.getByText('Logout', { exact: true }))).toBeVisible();
    await byTestId(page, 'profile-logout').or(page.getByText('Logout', { exact: true })).click();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
  });
});

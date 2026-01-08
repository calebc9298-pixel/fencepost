const { test, expect } = require('@playwright/test');
const path = require('path');

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;
const E2E_EMAIL_2 = process.env.E2E_EMAIL_2;
const E2E_PASSWORD_2 = process.env.E2E_PASSWORD_2;
const E2E_FAST = String(process.env.E2E_FAST || '').toLowerCase();
const isFastMode = E2E_FAST === '1' || E2E_FAST === 'true' || E2E_FAST === 'yes';
const E2E_LATEST = String(process.env.E2E_LATEST || '').toLowerCase();
const requiresLatest = E2E_LATEST === '1' || E2E_LATEST === 'true' || E2E_LATEST === 'yes';

const AUTH_DIR = path.resolve(__dirname, '.auth');
const STORAGE_STATE_A = path.join(AUTH_DIR, 'userA.json');
const STORAGE_STATE_B = path.join(AUTH_DIR, 'userB.json');

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function byTestId(page, id) {
  return page.locator(`[data-testid="${id}"]`);
}

async function getNumericCountFromTestId(page, id) {
  const locator = byTestId(page, id).first();
  const text = (await locator.textContent().catch(() => '')) || '';
  const match = text.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

async function getPostIdFromPostTextLocator(postTextLocator) {
  const testId = await postTextLocator.getAttribute('data-testid');
  if (testId && testId.startsWith('post-text-')) return testId.replace('post-text-', '');
  return null;
}

async function getIdSuffixFromTestId(locator, prefix) {
  const testId = await locator.getAttribute('data-testid');
  if (testId && testId.startsWith(prefix)) return testId.slice(prefix.length);
  return null;
}

function inputByTestIdOrPlaceholder(page, id, placeholder) {
  return byTestId(page, id).or(page.getByPlaceholder(placeholder));
}

function buttonByTestIdOrText(page, id, text) {
  return byTestId(page, id)
    .or(page.getByRole('button', { name: text, exact: true }))
    .or(page.locator('[tabindex="0"]', { hasText: new RegExp(`^${escapeRegExp(text)}$`) }).first());
}

async function gotoComments(page, postId) {
  await page.goto(`/comments/${postId}`);
  const input = byTestId(page, 'comments-input')
    .or(page.getByPlaceholder('Add a comment...'))
    .or(page.getByPlaceholder('Write a reply...'));
  await expect(input).toBeVisible({ timeout: isFastMode ? 25_000 : 45_000 });
}

async function ensureFeedReady(page, { email, password, dialogMessages, consoleErrors, networkFailures } = {}) {
  const feedInput = inputByTestIdOrPlaceholder(page, 'feed-quickpost-input', "What's happening on the farm?");
  try {
    await expect(feedInput).toBeVisible({ timeout: 20_000 });
    return;
  } catch {
    // If storageState is missing/stale, fall back to interactive login.
    const onLogin = await inputByTestIdOrPlaceholder(page, 'login-email', 'Email').isVisible().catch(() => false);
    if (onLogin && email && password) {
      await loginWithCreds(page, email, password, dialogMessages, consoleErrors, networkFailures);
      return;
    }
    throw new Error('Feed not ready (and not on login screen)');
  }
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
    const isFirebaseAuth = url.includes('identitytoolkit.googleapis.com') || url.includes('securetoken.googleapis.com');
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

async function loginWithCreds(page, email, password, dialogMessages, consoleErrors, networkFailures) {
  await page.goto('/');
  await inputByTestIdOrPlaceholder(page, 'login-email', 'Email').fill(email);
  await inputByTestIdOrPlaceholder(page, 'login-password', 'Password').fill(password);
  await buttonByTestIdOrText(page, 'login-submit', 'Login').click();

  const feedInput = inputByTestIdOrPlaceholder(page, 'feed-quickpost-input', "What's happening on the farm?");
  try {
    await expect(feedInput).toBeVisible({ timeout: 20_000 });
  } catch (err) {
    const dialogTail = (dialogMessages || []).slice(-3);
    const consoleTail = (consoleErrors || []).slice(-8);
    const networkTail = (networkFailures || []).slice(-8);
    if (dialogTail.length) {
      throw new Error(
        `Login failed for ${email}. Recent dialogs: ${dialogTail.join(' | ')}` +
          (consoleTail.length ? `\nRecent console errors: ${consoleTail.join(' || ')}` : '') +
          (networkTail.length ? `\nRecent network failures: ${networkTail.join(' || ')}` : '')
      );
    }

    const stillOnLogin = await inputByTestIdOrPlaceholder(page, 'login-email', 'Email')
      .isVisible()
      .catch(() => false);
    if (stillOnLogin) {
      // Try to surface any error modal content if Alert.alert is rendered as DOM.
      const visibleErrorText = await page
        .locator('text=/login error|invalid|auth\//i')
        .first()
        .textContent()
        .catch(() => null);
      throw new Error(
        `Login did not reach feed for ${email} (still on Login screen).` +
          (visibleErrorText ? ` Visible error: ${visibleErrorText}` : '') +
          (consoleTail.length ? `\nRecent console errors: ${consoleTail.join(' || ')}` : '') +
          (networkTail.length ? `\nRecent network failures: ${networkTail.join(' || ')}` : '')
      );
    }
    throw err;
  }
}

async function setFeedSortRecent(page) {
  // Feed has 2 <select>s on web: room picker then sort picker.
  // Room defaults to Regional; keep it stable to avoid reload resetting state.
  const selects = page.locator('select:visible');
  const count = await selects.count().catch(() => 0);
  if (count < 2) return;
  const sortSelect = selects.nth(1);
  await expect(sortSelect).toBeVisible();
  try {
    await sortSelect.selectOption('recent');
  } catch {
    await sortSelect.selectOption({ label: 'Recent' });
  }
}

async function setFeedRoom(page, roomId) {
  const selects = page.locator('select:visible');
  const count = await selects.count().catch(() => 0);
  if (count < 1) return;
  const roomSelect = selects.nth(0);
  await expect(roomSelect).toBeVisible();
  try {
    await roomSelect.selectOption(roomId);
  } catch {
    await roomSelect.selectOption({ value: roomId });
  }
}

async function expectPostVisibleWithReload(page, postText, { timeoutMs = 60_000, afterReload, debugLabel, consoleErrors } = {}) {
  const locator = page
    .locator('[data-testid^="post-text-"]', { hasText: postText })
    .first()
    .or(page.getByText(new RegExp(escapeRegExp(postText))).first());

  try {
    await expect(locator).toBeVisible({ timeout: timeoutMs });
  } catch {
    await page.reload();
    if (afterReload) {
      await afterReload();
    }
    try {
      await expect(locator).toBeVisible({ timeout: timeoutMs });
    } catch (err) {
      const selects = page.locator('select:visible');
      const selectedRoom = await selects.nth(0).locator('option:checked').textContent().catch(() => null);
      const selectedSort = await selects.nth(1).locator('option:checked').textContent().catch(() => null);
      const visiblePostTexts = await page
        .locator('[data-testid^="post-text-"]:visible')
        .allTextContents()
        .then((t) => t.slice(0, 10))
        .catch(() => []);
      const consoleTail = (consoleErrors || []).slice(-8);

      throw new Error(
        [
          `Post not visible after reload${debugLabel ? ` (${debugLabel})` : ''}: ${postText}`,
          `Selected room: ${selectedRoom ?? 'unknown'}`,
          `Selected sort: ${selectedSort ?? 'unknown'}`,
          `First visible post texts: ${visiblePostTexts.length ? visiblePostTexts.join(' | ') : '(none found)'}`,
          `Recent console errors: ${consoleTail.length ? consoleTail.join(' || ') : '(none)'}`,
          `Original error: ${err?.message || err}`,
        ].join('\n')
      );
    }
  }

  return locator;
}

function cleanupTimeoutMs() {
  return isFastMode ? 2_000 : 30_000;
}

async function openNotifications(page) {
  const bellByTestId = byTestId(page, 'notifications-bell');
  if ((await bellByTestId.count()) > 0) {
    await bellByTestId.first().click();
  } else {
    await page.getByText('🔔', { exact: true }).first().click();
  }

  const dropdownByTestId = byTestId(page, 'notifications-dropdown');
  if ((await dropdownByTestId.count()) > 0) {
    await expect(dropdownByTestId.first()).toBeVisible();
  } else {
    await expect(page.getByText('No notifications yet.', { exact: true }).first()).toBeVisible();
  }
}

test.describe('social / multi-user (requires two accounts)', () => {
  test.describe.configure({ mode: 'parallel' });

  test.skip(
    !isValidEmail(E2E_EMAIL) ||
      !E2E_PASSWORD ||
      !isValidEmail(E2E_EMAIL_2) ||
      !E2E_PASSWORD_2,
    'Set valid E2E_EMAIL/E2E_PASSWORD and E2E_EMAIL_2/E2E_PASSWORD_2 in .env.e2e to enable social tests.'
  );

  test('User B can comment on User A post; User A sees notification', async ({ browser }) => {
    test.setTimeout(isFastMode ? 150_000 : 240_000);

    if (E2E_EMAIL.trim().toLowerCase() === E2E_EMAIL_2.trim().toLowerCase()) {
      throw new Error('Social test requires two DIFFERENT accounts. E2E_EMAIL and E2E_EMAIL_2 are the same.');
    }

    const ctxA = await browser.newContext({ storageState: STORAGE_STATE_A });
    const ctxB = await browser.newContext({ storageState: STORAGE_STATE_B });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const consoleErrorsA = captureConsoleErrors(pageA);
    const consoleErrorsB = captureConsoleErrors(pageB);

    const networkFailuresA = captureNetworkFailures(pageA);
    const networkFailuresB = captureNetworkFailures(pageB);

    const dialogsA = await dismissAnyDialogs(pageA);
    const dialogsB = await dismissAnyDialogs(pageB);

    // With globalSetup storageState, users should already be authenticated.
    await pageA.goto('/');
    await pageB.goto('/');
    await ensureFeedReady(pageA, {
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      dialogMessages: dialogsA,
      consoleErrors: consoleErrorsA,
      networkFailures: networkFailuresA,
    });
    await ensureFeedReady(pageB, {
      email: E2E_EMAIL_2,
      password: E2E_PASSWORD_2,
      dialogMessages: dialogsB,
      consoleErrors: consoleErrorsB,
      networkFailures: networkFailuresB,
    });

    // Force both users into the same sort order for determinism.
    await setFeedSortRecent(pageA);
    await setFeedSortRecent(pageB);

    // User A creates a post
    const postText = `E2E social post ${Date.now()}`;
    await inputByTestIdOrPlaceholder(pageA, 'feed-quickpost-input', "What's happening on the farm?").fill(postText);
    await buttonByTestIdOrText(pageA, 'feed-quickpost-submit', 'Post').click();

    const postTextA = await expectPostVisibleWithReload(pageA, postText, {
      timeoutMs: isFastMode ? 35_000 : 60_000,
      afterReload: async () => {
        await setFeedSortRecent(pageA);
      },
      debugLabel: 'User A feed',
      consoleErrors: consoleErrorsA,
    });

    const postId = await getPostIdFromPostTextLocator(postTextA);
    if (!postId) throw new Error('Could not determine postId for comment notification test');

    // User B comments via deep link (avoid waiting for feed propagation)
    await gotoComments(pageB, postId);

    const commentText = `E2E social comment ${Date.now()}`;
    await inputByTestIdOrPlaceholder(pageB, 'comments-input', 'Add a comment...').fill(commentText);
    await buttonByTestIdOrText(pageB, 'comments-send', 'Send').click();
    await expect(pageB.getByText(commentText, { exact: true })).toBeVisible({ timeout: isFastMode ? 35_000 : 60_000 });

    // User A should receive a notification for the comment
    const notificationText = pageA.getByText(new RegExp(escapeRegExp(commentText)));
    for (let attempt = 0; attempt < (isFastMode ? 2 : 3); attempt += 1) {
      await openNotifications(pageA);
      try {
        await expect(notificationText).toBeVisible({ timeout: isFastMode ? 25_000 : 45_000 });
        break;
      } catch {
        if (attempt === (isFastMode ? 1 : 2)) throw new Error('Notification did not appear in time');
        await pageA.reload();
      }
    }

    // Cleanup: delete the post (best-effort; skip in fast mode)
    if (!isFastMode) {
      try {
        await byTestId(pageA, `post-delete-${postId}`).first().click({ timeout: 10_000 });
        await expect(pageA.getByText(postText, { exact: true })).toHaveCount(0, { timeout: cleanupTimeoutMs() });
      } catch (err) {
        // Ignore cleanup failures; the test is about notifications.
        // eslint-disable-next-line no-console
        console.warn(`Cleanup failed (ignored): ${err?.message || err}`);
      }
    }

    await ctxA.close();
    await ctxB.close();
  });

  test('User B can like User A post; counts sync for both', async ({ browser }) => {
    test.setTimeout(isFastMode ? 150_000 : 240_000);

    const ctxA = await browser.newContext({ storageState: STORAGE_STATE_A });
    const ctxB = await browser.newContext({ storageState: STORAGE_STATE_B });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const consoleErrorsA = captureConsoleErrors(pageA);
    const consoleErrorsB = captureConsoleErrors(pageB);
    const networkFailuresA = captureNetworkFailures(pageA);
    const networkFailuresB = captureNetworkFailures(pageB);
    const dialogsA = await dismissAnyDialogs(pageA);
    const dialogsB = await dismissAnyDialogs(pageB);

    await pageA.goto('/');
    await pageB.goto('/');
    await ensureFeedReady(pageA, {
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      dialogMessages: dialogsA,
      consoleErrors: consoleErrorsA,
      networkFailures: networkFailuresA,
    });
    await ensureFeedReady(pageB, {
      email: E2E_EMAIL_2,
      password: E2E_PASSWORD_2,
      dialogMessages: dialogsB,
      consoleErrors: consoleErrorsB,
      networkFailures: networkFailuresB,
    });
    await setFeedSortRecent(pageA);
    await setFeedSortRecent(pageB);

    const postText = `E2E social post like/dislike ${Date.now()}`;
    await inputByTestIdOrPlaceholder(pageA, 'feed-quickpost-input', "What's happening on the farm?").fill(postText);
    await buttonByTestIdOrText(pageA, 'feed-quickpost-submit', 'Post').click();

    const postTextA = await expectPostVisibleWithReload(pageA, postText, {
      timeoutMs: isFastMode ? 35_000 : 60_000,
      afterReload: async () => {
        await setFeedSortRecent(pageA);
      },
      debugLabel: 'User A feed (like/dislike)',
      consoleErrors: consoleErrorsA,
    });

    const postTextB = await expectPostVisibleWithReload(pageB, postText, {
      timeoutMs: isFastMode ? 55_000 : 90_000,
      afterReload: async () => {
        await setFeedSortRecent(pageB);
      },
      debugLabel: 'User B feed (like/dislike)',
      consoleErrors: consoleErrorsB,
    });

    const postId = (await getPostIdFromPostTextLocator(postTextA)) || (await getPostIdFromPostTextLocator(postTextB));
    if (!postId) throw new Error('Could not determine postId from post text testID');

    const likeId = `post-like-${postId}`;

    const initialLikesB = await getNumericCountFromTestId(pageB, likeId);
    if (initialLikesB == null) {
      throw new Error('Could not read initial like count');
    }

    await byTestId(pageB, likeId).click();
    await expect
      .poll(async () => await getNumericCountFromTestId(pageB, likeId), { timeout: isFastMode ? 25_000 : 45_000 })
      .toBe(initialLikesB + 1);

    // Verify User A sees the updated counts after reload.
    await pageA.reload();
    await setFeedSortRecent(pageA);
    await expectPostVisibleWithReload(pageA, postText, {
      timeoutMs: 60_000,
      afterReload: async () => {
        await setFeedSortRecent(pageA);
      },
      debugLabel: 'User A feed after votes',
      consoleErrors: consoleErrorsA,
    });

    await expect
      .poll(async () => await getNumericCountFromTestId(pageA, likeId), { timeout: isFastMode ? 35_000 : 60_000 })
      .toBe(initialLikesB + 1);

    // Cleanup: delete the post (best-effort; do not fail the test)
    try {
      await byTestId(pageA, `post-delete-${postId}`).first().click({ timeout: 10_000 });
      await expect(pageA.getByText(postText, { exact: true })).toHaveCount(0, { timeout: cleanupTimeoutMs() });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`Cleanup failed (ignored): ${err?.message || err}`);
    }

    await ctxA.close();
    await ctxB.close();
  });

  test('Non-owner cannot delete User A post; owner can delete', async ({ browser }) => {
    test.setTimeout(isFastMode ? 150_000 : 240_000);

    const ctxA = await browser.newContext({ storageState: STORAGE_STATE_A });
    const ctxB = await browser.newContext({ storageState: STORAGE_STATE_B });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const consoleErrorsA = captureConsoleErrors(pageA);
    const consoleErrorsB = captureConsoleErrors(pageB);
    const networkFailuresA = captureNetworkFailures(pageA);
    const networkFailuresB = captureNetworkFailures(pageB);
    const dialogsA = await dismissAnyDialogs(pageA);
    const dialogsB = await dismissAnyDialogs(pageB);

    await pageA.goto('/');
    await pageB.goto('/');
    await ensureFeedReady(pageA, {
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      dialogMessages: dialogsA,
      consoleErrors: consoleErrorsA,
      networkFailures: networkFailuresA,
    });
    await ensureFeedReady(pageB, {
      email: E2E_EMAIL_2,
      password: E2E_PASSWORD_2,
      dialogMessages: dialogsB,
      consoleErrors: consoleErrorsB,
      networkFailures: networkFailuresB,
    });
    await setFeedSortRecent(pageA);
    await setFeedSortRecent(pageB);

    const postText = `E2E social post delete ${Date.now()}`;
    await inputByTestIdOrPlaceholder(pageA, 'feed-quickpost-input', "What's happening on the farm?").fill(postText);
    await buttonByTestIdOrText(pageA, 'feed-quickpost-submit', 'Post').click();

    const postTextA = await expectPostVisibleWithReload(pageA, postText, {
      timeoutMs: isFastMode ? 35_000 : 60_000,
      afterReload: async () => {
        await setFeedSortRecent(pageA);
      },
      debugLabel: 'User A feed (delete)',
      consoleErrors: consoleErrorsA,
    });

    const postId = await getPostIdFromPostTextLocator(postTextA);
    if (!postId) throw new Error('Could not determine postId for delete test');

    await expectPostVisibleWithReload(pageB, postText, {
      timeoutMs: isFastMode ? 55_000 : 90_000,
      afterReload: async () => {
        await setFeedSortRecent(pageB);
      },
      debugLabel: 'User B feed (delete)',
      consoleErrors: consoleErrorsB,
    });

    // User B should not see delete button for User A's post.
    await expect(byTestId(pageB, `post-delete-${postId}`)).toHaveCount(0);

    // User A should see delete button and can delete.
    await expect(byTestId(pageA, `post-delete-${postId}`).first()).toBeVisible();
    await byTestId(pageA, `post-delete-${postId}`).first().click();

    // Confirm deletion reflected for both users.
    await expect(pageA.getByText(postText, { exact: true })).toHaveCount(0, { timeout: isFastMode ? 35_000 : 60_000 });
    await pageB.reload();
    await setFeedSortRecent(pageB);
    await expect(pageB.getByText(postText, { exact: true })).toHaveCount(0, { timeout: isFastMode ? 35_000 : 60_000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('User A can reply to User B comment; User B sees reply notification', async ({ browser }) => {
    test.setTimeout(isFastMode ? 150_000 : 240_000);

    const ctxA = await browser.newContext({ storageState: STORAGE_STATE_A });
    const ctxB = await browser.newContext({ storageState: STORAGE_STATE_B });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const consoleErrorsA = captureConsoleErrors(pageA);
    const consoleErrorsB = captureConsoleErrors(pageB);
    const networkFailuresA = captureNetworkFailures(pageA);
    const networkFailuresB = captureNetworkFailures(pageB);
    const dialogsA = await dismissAnyDialogs(pageA);
    const dialogsB = await dismissAnyDialogs(pageB);

    await pageA.goto('/');
    await pageB.goto('/');
    await ensureFeedReady(pageA, {
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      dialogMessages: dialogsA,
      consoleErrors: consoleErrorsA,
      networkFailures: networkFailuresA,
    });
    await ensureFeedReady(pageB, {
      email: E2E_EMAIL_2,
      password: E2E_PASSWORD_2,
      dialogMessages: dialogsB,
      consoleErrors: consoleErrorsB,
      networkFailures: networkFailuresB,
    });
    await setFeedSortRecent(pageA);
    await setFeedSortRecent(pageB);

    // User A creates a post
    const postText = `E2E social post reply ${Date.now()}`;
    await inputByTestIdOrPlaceholder(pageA, 'feed-quickpost-input', "What's happening on the farm?").fill(postText);
    await buttonByTestIdOrText(pageA, 'feed-quickpost-submit', 'Post').click();

    const postTextA = await expectPostVisibleWithReload(pageA, postText, {
      timeoutMs: isFastMode ? 35_000 : 60_000,
      afterReload: async () => {
        await setFeedSortRecent(pageA);
      },
      debugLabel: 'User A feed (reply)',
      consoleErrors: consoleErrorsA,
    });
    const postId = await getPostIdFromPostTextLocator(postTextA);
    if (!postId) throw new Error('Could not determine postId for reply test');

    // User B comments via deep link (avoid waiting for feed propagation)
    await gotoComments(pageB, postId);
    const commentText = `E2E social comment for reply ${Date.now()}`;
    await inputByTestIdOrPlaceholder(pageB, 'comments-input', 'Add a comment...').fill(commentText);
    await buttonByTestIdOrText(pageB, 'comments-send', 'Send').click();
    await expect(pageB.getByText(commentText, { exact: true })).toBeVisible({ timeout: isFastMode ? 35_000 : 60_000 });

    // User A opens the dedicated Comments screen via deep link and replies to the comment.
    await gotoComments(pageA, postId);
    await expect(pageA.getByText(commentText, { exact: true })).toBeVisible({ timeout: isFastMode ? 35_000 : 60_000 });

    await pageA.getByText('💬 Reply', { exact: true }).first().click();
    const replyText = `E2E social reply ${Date.now()}`;
    await inputByTestIdOrPlaceholder(pageA, 'comments-input', 'Write a reply...').fill(replyText);
    await buttonByTestIdOrText(pageA, 'comments-send', 'Send').click();
    await expect(pageA.getByText(replyText, { exact: true })).toBeVisible({ timeout: isFastMode ? 35_000 : 60_000 });

    // User B should receive a notification for the reply.
    await pageB.goto('/');
    await ensureFeedReady(pageB, {
      email: E2E_EMAIL_2,
      password: E2E_PASSWORD_2,
      dialogMessages: dialogsB,
      consoleErrors: consoleErrorsB,
      networkFailures: networkFailuresB,
    });
    const notificationText = pageB.getByText(new RegExp(escapeRegExp(replyText)));
    for (let attempt = 0; attempt < (isFastMode ? 2 : 3); attempt += 1) {
      await openNotifications(pageB);
      try {
        await expect(notificationText).toBeVisible({ timeout: isFastMode ? 25_000 : 45_000 });
        break;
      } catch {
        if (attempt === (isFastMode ? 1 : 2)) throw new Error('Reply notification did not appear in time');
        await pageB.reload();
        await setFeedSortRecent(pageB);
      }
    }

    // Cleanup: delete the post (best-effort; skip in fast mode)
    if (!isFastMode) {
      try {
        await pageA.goto('/');
        await setFeedSortRecent(pageA);
        await expectPostVisibleWithReload(pageA, postText, {
          timeoutMs: 60_000,
          afterReload: async () => {
            await setFeedSortRecent(pageA);
          },
          debugLabel: 'User A feed for cleanup (reply)',
          consoleErrors: consoleErrorsA,
        });
        await byTestId(pageA, `post-delete-${postId}`).first().click({ timeout: 10_000 });
        await expect(pageA.getByText(postText, { exact: true })).toHaveCount(0, { timeout: cleanupTimeoutMs() });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`Cleanup failed (ignored): ${err?.message || err}`);
      }
    }

    await ctxA.close();
    await ctxB.close();
  });

  test('User A can like User B comment; counts sync for both', async ({ browser }) => {
    test.skip(!requiresLatest, 'Requires deployed CommentsScreen vote testIDs (set E2E_LATEST=1 after deploy).');
    test.setTimeout(isFastMode ? 150_000 : 240_000);

    const ctxA = await browser.newContext({ storageState: STORAGE_STATE_A });
    const ctxB = await browser.newContext({ storageState: STORAGE_STATE_B });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const consoleErrorsA = captureConsoleErrors(pageA);
    const consoleErrorsB = captureConsoleErrors(pageB);
    const networkFailuresA = captureNetworkFailures(pageA);
    const networkFailuresB = captureNetworkFailures(pageB);
    const dialogsA = await dismissAnyDialogs(pageA);
    const dialogsB = await dismissAnyDialogs(pageB);

    await pageA.goto('/');
    await pageB.goto('/');
    await ensureFeedReady(pageA, {
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      dialogMessages: dialogsA,
      consoleErrors: consoleErrorsA,
      networkFailures: networkFailuresA,
    });
    await ensureFeedReady(pageB, {
      email: E2E_EMAIL_2,
      password: E2E_PASSWORD_2,
      dialogMessages: dialogsB,
      consoleErrors: consoleErrorsB,
      networkFailures: networkFailuresB,
    });

    await setFeedSortRecent(pageA);
    await setFeedSortRecent(pageB);

    // User A creates a post
    const postText = `E2E social post comment votes ${Date.now()}`;
    await inputByTestIdOrPlaceholder(pageA, 'feed-quickpost-input', "What's happening on the farm?").fill(postText);
    await buttonByTestIdOrText(pageA, 'feed-quickpost-submit', 'Post').click();

    const postTextA = await expectPostVisibleWithReload(pageA, postText, {
      timeoutMs: isFastMode ? 35_000 : 60_000,
      afterReload: async () => {
        await setFeedSortRecent(pageA);
      },
      debugLabel: 'User A feed (comment votes)',
      consoleErrors: consoleErrorsA,
    });
    const postId = await getPostIdFromPostTextLocator(postTextA);
    if (!postId) throw new Error('Could not determine postId for comment-vote test');

    // User B comments via deep link (avoid waiting for feed propagation)
    await gotoComments(pageB, postId);
    const commentText = `E2E social comment votes ${Date.now()}`;
    await inputByTestIdOrPlaceholder(pageB, 'comments-input', 'Add a comment...').fill(commentText);
    await buttonByTestIdOrText(pageB, 'comments-send', 'Send').click();
    await expect(pageB.getByText(commentText, { exact: true })).toBeVisible({ timeout: isFastMode ? 35_000 : 60_000 });

    // User A opens Comments screen and votes on that comment
    await gotoComments(pageA, postId);

    const commentTextNodeA = pageA.locator('[data-testid^="comment-text-"]', { hasText: commentText }).first();
    await expect(commentTextNodeA).toBeVisible({ timeout: isFastMode ? 35_000 : 60_000 });
    const commentId = await getIdSuffixFromTestId(commentTextNodeA, 'comment-text-');
    if (!commentId) throw new Error('Could not determine commentId from comment testID');

    const likeId = `comment-like-${commentId}`;
    const initialLikesA = (await getNumericCountFromTestId(pageA, likeId)) ?? 0;

    await byTestId(pageA, likeId).click();
    await expect
      .poll(async () => await getNumericCountFromTestId(pageA, likeId), { timeout: isFastMode ? 25_000 : 45_000 })
      .toBe(initialLikesA + 1);

    // User B verifies counts in Comments screen
    await pageB.goto(`/comments/${postId}`);
    await expect(pageB.getByText(/^Comments \(\d+\)$/).first()).toBeVisible({ timeout: 30_000 });
    await expect(pageB.getByText(commentText, { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => await getNumericCountFromTestId(pageB, likeId), { timeout: isFastMode ? 35_000 : 60_000 })
      .toBe(initialLikesA + 1);

    // Cleanup: delete the post (best-effort; skip in fast mode)
    if (!isFastMode) {
      try {
        await pageA.goto('/');
        await setFeedSortRecent(pageA);
        await expectPostVisibleWithReload(pageA, postText, {
          timeoutMs: 60_000,
          afterReload: async () => {
            await setFeedSortRecent(pageA);
          },
          debugLabel: 'User A feed for cleanup (comment votes)',
          consoleErrors: consoleErrorsA,
        });
        await byTestId(pageA, `post-delete-${postId}`).first().click({ timeout: 10_000 });
        await expect(pageA.getByText(postText, { exact: true })).toHaveCount(0, { timeout: cleanupTimeoutMs() });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`Cleanup failed (ignored): ${err?.message || err}`);
      }
    }

    await ctxA.close();
    await ctxB.close();
  });

  test('Notifications: clicking marks read and navigates to comments', async ({ browser }) => {
    test.skip(!requiresLatest, 'Requires deployed notification item click/read behavior + testIDs (set E2E_LATEST=1 after deploy).');
    test.setTimeout(isFastMode ? 150_000 : 240_000);

    const ctxA = await browser.newContext({ storageState: STORAGE_STATE_A });
    const ctxB = await browser.newContext({ storageState: STORAGE_STATE_B });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const consoleErrorsA = captureConsoleErrors(pageA);
    const consoleErrorsB = captureConsoleErrors(pageB);
    const networkFailuresA = captureNetworkFailures(pageA);
    const networkFailuresB = captureNetworkFailures(pageB);
    const dialogsA = await dismissAnyDialogs(pageA);
    const dialogsB = await dismissAnyDialogs(pageB);

    await pageA.goto('/');
    await pageB.goto('/');
    await ensureFeedReady(pageA, {
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      dialogMessages: dialogsA,
      consoleErrors: consoleErrorsA,
      networkFailures: networkFailuresA,
    });
    await ensureFeedReady(pageB, {
      email: E2E_EMAIL_2,
      password: E2E_PASSWORD_2,
      dialogMessages: dialogsB,
      consoleErrors: consoleErrorsB,
      networkFailures: networkFailuresB,
    });

    await setFeedSortRecent(pageA);
    await setFeedSortRecent(pageB);

    // User A creates post
    const postText = `E2E social post notif read ${Date.now()}`;
    await inputByTestIdOrPlaceholder(pageA, 'feed-quickpost-input', "What's happening on the farm?").fill(postText);
    await buttonByTestIdOrText(pageA, 'feed-quickpost-submit', 'Post').click();
    const postTextA = await expectPostVisibleWithReload(pageA, postText, {
      timeoutMs: isFastMode ? 35_000 : 60_000,
      afterReload: async () => {
        await setFeedSortRecent(pageA);
      },
      debugLabel: 'User A feed (notif read)',
      consoleErrors: consoleErrorsA,
    });
    const postId = await getPostIdFromPostTextLocator(postTextA);
    if (!postId) throw new Error('Could not determine postId for notif-read test');

    // User B comments via deep link (avoid waiting for feed propagation)
    await gotoComments(pageB, postId);
    const commentText = `E2E social notif read ${Date.now()}`;
    await inputByTestIdOrPlaceholder(pageB, 'comments-input', 'Add a comment...').fill(commentText);
    await buttonByTestIdOrText(pageB, 'comments-send', 'Send').click();
    await expect(pageB.getByText(commentText, { exact: true })).toBeVisible({ timeout: isFastMode ? 35_000 : 60_000 });

    // User A opens notifications, verifies unread marker, clicks it
    await openNotifications(pageA);
    const notifItem = pageA.locator('[data-testid^="notification-item-"]', { hasText: commentText }).first();
    await expect(notifItem).toBeVisible({ timeout: isFastMode ? 25_000 : 45_000 });
    await expect(notifItem).toContainText('•');
    await notifItem.click();
    await expect(pageA).toHaveURL(new RegExp(`/comments/${postId}(?:$|\\?)`));

    // Back to feed, reopen notifications, unread marker should be gone
    await pageA.goto('/');
    await ensureFeedReady(pageA, {
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      dialogMessages: dialogsA,
      consoleErrors: consoleErrorsA,
      networkFailures: networkFailuresA,
    });
    await openNotifications(pageA);
    const notifItemAfter = pageA.locator('[data-testid^="notification-item-"]', { hasText: commentText }).first();
    await expect(notifItemAfter).toBeVisible({ timeout: 30_000 });
    await expect(notifItemAfter).not.toContainText('•');

    // Cleanup best-effort (skip in fast mode)
    if (!isFastMode) {
      try {
        await byTestId(pageA, `post-delete-${postId}`).first().click({ timeout: 10_000 });
        await expect(pageA.getByText(postText, { exact: true })).toHaveCount(0, { timeout: cleanupTimeoutMs() });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`Cleanup failed (ignored): ${err?.message || err}`);
      }
    }

    await ctxA.close();
    await ctxB.close();
  });

  test('Feed rooms: post only appears in its room', async ({ browser }) => {
    test.setTimeout(isFastMode ? 150_000 : 240_000);

    const ctxA = await browser.newContext({ storageState: STORAGE_STATE_A });
    const pageA = await ctxA.newPage();
    const dialogsA = await dismissAnyDialogs(pageA);
    const consoleErrorsA = captureConsoleErrors(pageA);
    const networkFailuresA = captureNetworkFailures(pageA);

    await pageA.goto('/');
    await ensureFeedReady(pageA, {
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      dialogMessages: dialogsA,
      consoleErrors: consoleErrorsA,
      networkFailures: networkFailuresA,
    });

    await setFeedRoom(pageA, 'regional');
    await setFeedSortRecent(pageA);

    const postText = `E2E social room regional ${Date.now()}`;
    await inputByTestIdOrPlaceholder(pageA, 'feed-quickpost-input', "What's happening on the farm?").fill(postText);
    await buttonByTestIdOrText(pageA, 'feed-quickpost-submit', 'Post').click();

    const postTextA = await expectPostVisibleWithReload(pageA, postText, {
      timeoutMs: isFastMode ? 35_000 : 60_000,
      afterReload: async () => {
        await setFeedRoom(pageA, 'regional');
        await setFeedSortRecent(pageA);
      },
      debugLabel: 'User A feed (regional)',
      consoleErrors: consoleErrorsA,
    });
    const postId = await getPostIdFromPostTextLocator(postTextA);
    if (!postId) throw new Error('Could not determine postId for room test');

    // Switch rooms; post should not be visible
    await setFeedRoom(pageA, 'statewide');
    await setFeedSortRecent(pageA);
    await expect(pageA.getByText(postText, { exact: true })).toHaveCount(0, { timeout: 10_000 });

    // Switch back; post should be visible
    await setFeedRoom(pageA, 'regional');
    await setFeedSortRecent(pageA);
    await expect(pageA.getByText(postText, { exact: true })).toBeVisible({ timeout: 30_000 });

    // Cleanup best-effort
    try {
      await byTestId(pageA, `post-delete-${postId}`).first().click({ timeout: 10_000 });
      await expect(pageA.getByText(postText, { exact: true })).toHaveCount(0, { timeout: cleanupTimeoutMs() });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`Cleanup failed (ignored): ${err?.message || err}`);
    }

    await ctxA.close();
  });
});

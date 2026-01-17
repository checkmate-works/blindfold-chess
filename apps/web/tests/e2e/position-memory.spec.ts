import { expect, test } from '@playwright/test';

// LocalStorage key for tutorial skip
const TUTORIAL_SKIPPED_KEY = 'positionMemoryTutorialSkipped';

test.describe('Position Memory Practice', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.goto('/en');
    await page.evaluate(() => localStorage.clear());
  });

  test.describe('Setup Page', () => {
    test('should display setup page with preset problems selected by default', async ({ page }) => {
      // Skip tutorial by setting localStorage
      await page.evaluate((key) => {
        localStorage.setItem(key, 'true');
      }, TUTORIAL_SKIPPED_KEY);

      await page.goto('/en/practice/position-memory');

      // Verify page title
      await expect(page.getByRole('heading', { name: /position memory/i })).toBeVisible();

      // Verify preset problems tab is visible
      await expect(page.getByText('Preset Problems')).toBeVisible();

      // Verify start button is visible
      await expect(page.getByRole('button', { name: /start practice/i })).toBeVisible();
    });

    test('should allow switching to custom FEN input', async ({ page }) => {
      await page.evaluate((key) => {
        localStorage.setItem(key, 'true');
      }, TUTORIAL_SKIPPED_KEY);

      await page.goto('/en/practice/position-memory');

      // Click on custom FEN tab
      await page.getByText('Enter FEN').click();

      // Verify textarea is visible
      await expect(page.locator('textarea')).toBeVisible();

      // Start button should be disabled without FEN input
      await expect(page.getByRole('button', { name: /start practice/i })).toBeDisabled();
    });

    test('should validate custom FEN input', async ({ page }) => {
      await page.evaluate((key) => {
        localStorage.setItem(key, 'true');
      }, TUTORIAL_SKIPPED_KEY);

      await page.goto('/en/practice/position-memory');

      // Switch to custom FEN
      await page.getByText('Enter FEN').click();

      // Enter invalid FEN
      await page.locator('textarea').fill('invalid fen string');

      // Should show error message
      await expect(page.getByText(/invalid fen on line/i)).toBeVisible();

      // Start button should be disabled
      await expect(page.getByRole('button', { name: /start practice/i })).toBeDisabled();
    });

    test('should enable start button with valid FEN', async ({ page }) => {
      await page.evaluate((key) => {
        localStorage.setItem(key, 'true');
      }, TUTORIAL_SKIPPED_KEY);

      await page.goto('/en/practice/position-memory');

      // Switch to custom FEN
      await page.getByText('Enter FEN').click();

      // Enter valid FEN
      const validFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      await page.locator('textarea').fill(validFen);

      // Start button should be enabled
      await expect(page.getByRole('button', { name: /start practice/i })).toBeEnabled();
    });
  });

  test.describe('Session Flow', () => {
    test('should complete a single problem session with preset', async ({ page }) => {
      await page.evaluate((key) => {
        localStorage.setItem(key, 'true');
      }, TUTORIAL_SKIPPED_KEY);

      await page.goto('/en/practice/position-memory');

      // Set problem count to 1 using the slider
      // Use fill() which works better with React controlled inputs
      await page.locator('input#problemCount').fill('1');

      // Start the session
      await page.getByRole('button', { name: /start practice/i }).click();

      // Should navigate to session page
      await expect(page).toHaveURL(/.*session/);

      // Memorize phase: wait for memorized button to be available
      await expect(page.getByRole('button', { name: /i've memorized/i })).toBeVisible({
        timeout: 10000,
      });

      // Click "I've memorized" button
      await page.getByRole('button', { name: /i've memorized/i }).click();

      // Recreate phase: should see submit button
      await expect(page.getByRole('button', { name: /submit/i })).toBeVisible();

      // Submit without placing pieces (will get low accuracy)
      await page.getByRole('button', { name: /submit/i }).click();

      // Result phase: wait for accuracy text to appear (e.g., "Accuracy: 0.0%")
      await expect(page.getByText(/accuracy/i)).toBeVisible({ timeout: 5000 });

      // Click "View Results" to see final results
      await page.getByRole('button', { name: /view results/i }).click();

      // Should see the final results screen with try again button
      await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
    });

    test('should allow skipping a problem', async ({ page }) => {
      await page.evaluate((key) => {
        localStorage.setItem(key, 'true');
      }, TUTORIAL_SKIPPED_KEY);

      await page.goto('/en/practice/position-memory');

      // Set problem count to 2
      await page.locator('input#problemCount').fill('2');

      // Start the session
      await page.getByRole('button', { name: /start practice/i }).click();

      // Wait for session page
      await expect(page).toHaveURL(/.*session/);

      // Click "I've memorized" button
      await page.getByRole('button', { name: /i've memorized/i }).click();

      // Wait for recreate phase (submit button visible)
      await expect(page.getByRole('button', { name: /submit/i })).toBeVisible();

      // In recreate phase, click skip - goes directly to next problem's memorize phase
      await page.getByText('Skip This Problem').click();

      // Should be in memorize phase for problem 2 (skip goes directly to next problem)
      await expect(page.getByRole('button', { name: /i've memorized/i })).toBeVisible({
        timeout: 5000,
      });
    });

    test('should handle quit confirmation', async ({ page }) => {
      await page.evaluate((key) => {
        localStorage.setItem(key, 'true');
      }, TUTORIAL_SKIPPED_KEY);

      await page.goto('/en/practice/position-memory');

      // Start the session
      await page.getByRole('button', { name: /start practice/i }).click();

      // Wait for session page
      await expect(page).toHaveURL(/.*session/);

      // Click quit button
      await page.getByRole('button', { name: /quit/i }).click();

      // Should show confirmation modal
      await expect(page.getByRole('heading', { name: /quit practice/i })).toBeVisible();

      // Cancel quit (button text is "Continue")
      await page.getByRole('button', { name: /continue/i }).click();

      // Should still be in session
      await expect(page).toHaveURL(/.*session/);

      // Click quit again and confirm
      await page.getByText('Quit Practice').click();

      // Click the confirm button in the modal (there are now two "Quit" buttons - one in modal)
      // Get the button inside the modal (the one with destructive styling)
      await page.locator('.fixed').getByRole('button', { name: /quit/i }).click();

      // Should show results
      await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
    });
  });

  test.describe('Tutorial Flow', () => {
    test('should redirect to tutorial on first visit', async ({ page }) => {
      // Don't set tutorial skipped flag
      await page.goto('/en/practice/position-memory');

      // Should redirect to tutorial page
      await expect(page).toHaveURL(/.*tutorial/);

      // Should see tutorial content
      await expect(page.getByRole('heading', { name: /tutorial/i })).toBeVisible();
    });

    test('should allow skipping tutorial', async ({ page }) => {
      await page.goto('/en/practice/position-memory/tutorial');

      // Click skip button (it's a button, not a link)
      await page.getByRole('button', { name: /skip tutorial/i }).click();

      // Should go to main setup page
      await expect(page).toHaveURL(/.*position-memory$/);
      await expect(page).not.toHaveURL(/.*tutorial/);
    });
  });

  test.describe('Share Link', () => {
    test('should load settings from share link', async ({ page }) => {
      // Share link bypasses tutorial check
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const encoded = Buffer.from(fen).toString('base64');

      await page.goto(`/en/practice/position-memory?problems=${encoded}&timeLimit=30&shuffle=0`);

      // Should show setup page with Enter FEN tab visible
      await expect(page.getByText('Enter FEN')).toBeVisible();

      // The FEN should be loaded in textarea
      const textarea = page.locator('textarea');
      await expect(textarea).toHaveValue(fen);

      // Start button should be enabled
      await expect(page.getByRole('button', { name: /start practice/i })).toBeEnabled();
    });

    test('should not overwrite user settings when using share link', async ({ page }) => {
      // First, save some user settings
      await page.goto('/en');
      await page.evaluate((key) => {
        localStorage.setItem(key, 'true');
        localStorage.setItem(
          'positionMemorySettings',
          JSON.stringify({
            timeLimit: 45,
            problemCount: 3,
            shuffleProblems: true,
            useCustomFen: false,
            customFenInput: '',
          })
        );
      }, TUTORIAL_SKIPPED_KEY);

      // Access via share link
      const fen = '8/8/8/4k3/8/8/8/4K3 w - - 0 1';
      const encoded = Buffer.from(fen).toString('base64');
      await page.goto(`/en/practice/position-memory?problems=${encoded}&timeLimit=10&shuffle=1`);

      // Start the session (this should NOT save settings)
      await page.getByRole('button', { name: /start practice/i }).click();
      await expect(page).toHaveURL(/.*session/);

      // Go back to setup page
      await page.goto('/en/practice/position-memory');

      // Verify original settings are preserved
      const savedSettings = await page.evaluate(() => {
        return localStorage.getItem('positionMemorySettings');
      });

      const settings = JSON.parse(savedSettings || '{}');
      expect(settings.timeLimit).toBe(45);
      expect(settings.problemCount).toBe(3);
    });
  });

  test.describe('Results', () => {
    test('should display accuracy percentage after submission', async ({ page }) => {
      await page.evaluate((key) => {
        localStorage.setItem(key, 'true');
      }, TUTORIAL_SKIPPED_KEY);

      await page.goto('/en/practice/position-memory');

      // Set to 1 problem for quick test
      await page.locator('input#problemCount').fill('1');

      await page.getByRole('button', { name: /start practice/i }).click();
      await expect(page).toHaveURL(/.*session/);

      // Memorize
      await page.getByRole('button', { name: /i've memorized/i }).click();

      // Submit without placing any pieces
      await page.getByRole('button', { name: /submit/i }).click();

      // Should show accuracy percentage
      await expect(page.getByText(/\d+%/)).toBeVisible();
    });

    test('should allow viewing position again after result', async ({ page }) => {
      await page.evaluate((key) => {
        localStorage.setItem(key, 'true');
      }, TUTORIAL_SKIPPED_KEY);

      await page.goto('/en/practice/position-memory');

      await page.locator('input#problemCount').fill('1');

      await page.getByRole('button', { name: /start practice/i }).click();
      await page.getByRole('button', { name: /i've memorized/i }).click();
      await page.getByRole('button', { name: /submit/i }).click();

      // Click "View Again" button if visible
      const viewAgainButton = page.getByRole('button', { name: /view again/i });
      if (await viewAgainButton.isVisible()) {
        await viewAgainButton.click();

        // Should go back to memorize phase
        await expect(page.getByRole('button', { name: /i've memorized/i })).toBeVisible();
      }
    });
  });
});

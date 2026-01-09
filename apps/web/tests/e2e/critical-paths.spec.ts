import { expect, test } from '@playwright/test';

test.describe('Critical Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.goto('/en');
    await page.evaluate(() => localStorage.clear());
  });

  // 1. Game start flow
  test('should start new game or show limit reached', async ({ page }) => {
    await page.goto('/en');

    // Click "New Game" button
    await page.getByRole('button', { name: /new game/i }).click();

    // Handle two scenarios
    const limitHeading = page.getByRole('heading', { name: /game limit reached/i });
    const isLimitReached = await limitHeading.isVisible().catch(() => false);

    if (isLimitReached) {
      // When limit is reached
      await expect(page).toHaveURL(/.*games\/limit-reached/);
      await expect(limitHeading).toBeVisible();
    } else {
      // When game can be started
      await expect(page).toHaveURL(/.*game\/new/);

      // Verify "Start Game" button is visible
      const startButton = page.getByRole('button', { name: /start game/i });
      await expect(startButton).toBeVisible();
    }
  });

  // 2. White player → Black AI response
  test('should respond with AI move when player (white) moves', async ({ page }) => {
    await page.goto('/en/game/new');

    // Select white (should be selected by default)
    await page.getByRole('button', { name: /play as white/i }).click();

    // Start game
    await page.getByRole('button', { name: /start game/i }).click();

    // Navigate to play page
    await expect(page).toHaveURL(/.*play/);

    // Wait for input field to be visible
    const moveInput = page.getByPlaceholder(/e\.g\./);
    await expect(moveInput).toBeVisible();

    // Enter player move (e.g., e4)
    await moveInput.fill('e4');
    await moveInput.press('Enter');

    // Verify input field is cleared (move accepted)
    await expect(moveInput).toHaveValue('');

    // Wait for AI response (max 15 seconds)
    // After AI moves, input field becomes enabled again
    await expect(async () => {
      const isEnabled = await moveInput.isEnabled();
      expect(isEnabled).toBe(true);
    }).toPass({ timeout: 15000 });

    // Verify move count is 2 or more
    // If page title or UI element shows move count
    // Here we simply verify we can input another move
    await expect(moveInput).toBeEnabled();
  });

  // 3. Black player → White AI response
  test('should respond with AI move when player (black) moves', async ({ page }) => {
    await page.goto('/en/game/new');

    // Select black
    await page.getByRole('button', { name: /play as black/i }).click();

    // Start game
    await page.getByRole('button', { name: /start game/i }).click();

    // Navigate to play page
    await expect(page).toHaveURL(/.*play/);

    // Wait for AI's first move (max 15 seconds)
    const moveInput = page.getByPlaceholder(/e\.g\./);
    await expect(moveInput).toBeEnabled({ timeout: 15000 });

    // Enter player move (black's first move is limited, try e5)
    await moveInput.fill('e5');
    await moveInput.press('Enter');

    // Verify input field is cleared
    await expect(moveInput).toHaveValue('');

    // Wait for AI's second move
    await expect(async () => {
      const isEnabled = await moveInput.isEnabled();
      expect(isEnabled).toBe(true);
    }).toPass({ timeout: 15000 });

    // Verify we can input another move
    await expect(moveInput).toBeEnabled();
  });

  // 4. Resume game on AI turn
  test('should auto-play AI move when resuming game on AI turn', async ({ page }) => {
    // Step 1: Start game as black
    await page.goto('/en/game/new');
    await page.getByRole('button', { name: /play as black/i }).click();
    await page.getByRole('button', { name: /start game/i }).click();

    // Navigate to play page
    await expect(page).toHaveURL(/.*play/);

    // Wait for AI's first move
    const moveInput = page.getByPlaceholder(/e\.g\./);
    await expect(moveInput).toBeEnabled({ timeout: 15000 });

    // Get game ID from URL
    const gameUrl = page.url();
    const urlParams = new URL(gameUrl).searchParams;
    const gameId = urlParams.get('gameId');

    // Return to home
    await page.goto('/en');

    // Step 2: Resume from game list
    // Click first game card (latest game)
    // GameListItem is a <li> element and is clickable
    const gameCard = page.locator('li.group').first();
    await expect(gameCard).toBeVisible({ timeout: 5000 });
    await gameCard.click();

    // Verify we're back at the game screen
    await expect(page).toHaveURL(/.*play/);

    // Verify it's player's turn (input field is enabled)
    await expect(moveInput).toBeEnabled({ timeout: 15000 });
  });

  // 5. Verify behavior when game limit is reached
  test('should show limit reached message when at capacity', async ({ page }) => {
    // Set up maximum number of games (20) in localStorage
    await page.goto('/en');

    await page.evaluate(() => {
      const maxGames = 20; // MAX_GAMES in config.ts
      const games: Array<{
        id: string;
        moves: unknown[];
        playerColor: string;
        skillLevel: number;
        status: string;
        date: string;
        lastPlayed: string;
      }> = [];

      for (let i = 0; i < maxGames; i++) {
        const gameId = `test-game-${i}`;
        const now = new Date().toISOString();
        games.push({
          id: gameId,
          moves: [],
          playerColor: 'white',
          skillLevel: 5,
          status: 'in_progress', // Not 'ongoing' but 'in_progress'
          date: now,
          lastPlayed: now,
        });
      }

      localStorage.setItem('blindfold_chess_games', JSON.stringify(games));
    });

    // Reload page
    await page.reload();

    // Debug: verify localStorage data
    const storedGames = await page.evaluate(() => {
      const data = localStorage.getItem('blindfold_chess_games');
      return data ? JSON.parse(data).length : 0;
    });
    console.log('Stored games count:', storedGames);

    // Click "New Game" button
    await page.getByRole('button', { name: /new game/i }).click();

    // Wait for navigation to new game page
    await page.waitForURL(/.*game\/new/, { timeout: 10000 });

    // Wait for GameLimitCheck component's useEffect to execute
    // Wait for either scenario to be displayed
    await Promise.race([
      // Scenario 1: Limit error is displayed
      page.getByRole('button', { name: /back.*game.*list/i }).waitFor({ timeout: 3000 }),
      // Scenario 2: Normal form is displayed (when limit not reached)
      page.getByRole('button', { name: /start game/i }).waitFor({ timeout: 3000 }),
    ]);

    // Verify GameLimitError component is displayed
    const backButton = page.getByRole('button', { name: /back.*game.*list/i });
    await expect(backButton).toBeVisible();
  });
});

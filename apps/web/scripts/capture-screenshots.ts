import { webkit } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = join(__dirname, '..', 'public', 'images', 'practice');

const iPhoneAir = {
  viewport: { width: 420, height: 912 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

type Target = {
  path: string;
  filename: string;
  hasCountdown: boolean;
};

const targets: Target[] = [
  {
    path: '/en/practice/square-colors/challenge?timeLimit=30#square-colors-challenge',
    filename: 'square-colors.png',
    hasCountdown: true,
  },
  {
    path: '/en/practice/legal-moves/challenge?timeLimit=30&pieces=king#legal-moves-session',
    filename: 'legal-moves.png',
    hasCountdown: true,
  },
  {
    path: '/en/practice/coordinate-quiz/challenge?timeLimit=30&boardOrientation=random&feedbackSpeed=slow#quiz-session',
    filename: 'coordinate-quiz.png',
    hasCountdown: true,
  },
  {
    path: '/en/practice/board-symmetry/session?timeLimit=60#board-symmetry-session',
    filename: 'board-symmetry.png',
    hasCountdown: true,
  },
  {
    path: '/en/practice/route-planner/challenge?count=5&pieces=NB#route-planner-session',
    filename: 'route-planner.png',
    hasCountdown: false,
  },
  {
    path: '/en/practice/diagonal-quiz/challenge?timeLimit=60#diagonal-quiz-session',
    filename: 'diagonal-quiz.png',
    hasCountdown: true,
  },
  {
    path: '/en/practice/position-memory/session?timeLimit=30&shuffle=0&problems=MUsxazQvMVA2LzgvOC84LzgvcjcvNFIzIHcgLSAtIDAgMQo4LzgvOC80azMvUjcvNEszL3I3LzggdyAtIC0gMCAxCjgvOC84LzRrMy84LzgvOC80S1EyIHcgLSAtIDAgMQo4LzgvOC80azMvOC84LzgvNEtSMiB3IC0gLSAwIDEKOC84LzRrMy84LzRLMy84LzRQMy84IHcgLSAtIDAgMQ%3D%3D&count=5&source=preset#position-memory-session',
    filename: 'position-memory.png',
    hasCountdown: true,
  },
  {
    path: '/en/practice/knight-tour/session?startingSquare=f1#knight-tour-session',
    filename: 'knight-tour.png',
    hasCountdown: false,
  },
  {
    path: '/en/practice/move-sequence/session?data=cm5icWtibnIvcHBwcHBwcHAvOC84LzgvOC9QUFBQUFBQUC9STkJRS0JOUiB3IEtRa3EgLSAwIDEAMS4gZTQgZTUgMi4gTmYzIE5jNiAzLiBCYzQ%3D#move-sequence-session',
    filename: 'move-sequence.png',
    hasCountdown: false,
  },
  {
    path: '/en/practice/algebraic-notation/session#algebraic-notation-session',
    filename: 'algebraic-notation.png',
    hasCountdown: false,
  },
  {
    path: '/en/practice/fen/session?shuffle=1&problems=cm5icWtibnIvcHBwcHBwcHAvOC84LzgvOC9QUFBQUFBQUC9STkJRS0JOUiB3IEtRa3EgLSAwIDEKNGszLzgvOC84LzgvOC80cDMvSzcgdyAtIC0gMCAxCjgvM1I0LzgvOC8yazJRMi9QNy84LzdLIGIgLSAtIDQgNDkKMVI2L1A0cHBrLzRwMnAvM3BQMy8xUDYvNVAxUC8ycjJyMi9SNEsyIHcgLSAtIDYgMzYKcjFicWsxbnIvcHBwMWJwcHAvMm41LzFQMlAzLzJQcDQvUDROMi8zQlBQUFAvUk4xUUtCMVIgYiBLUWtxIC0gMCA4&count=5&source=preset#fen-session',
    filename: 'fen.png',
    hasCountdown: false,
  },
  {
    path: '/en/practice/quadrants/challenge?count=10&orientation=white#quadrant-session',
    filename: 'quadrants.png',
    hasCountdown: false,
  },
];

function getHashId(path: string): string | null {
  const hashIndex = path.indexOf('#');
  return hashIndex !== -1 ? path.slice(hashIndex + 1) : null;
}

async function captureScreenshots() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await webkit.launch();
  const context = await browser.newContext({
    ...iPhoneAir,
    colorScheme: 'light',
  });

  try {
    for (const target of targets) {
      const hashId = getHashId(target.path);
      const url = `${BASE_URL}${target.path}`;
      const page = await context.newPage();

      console.log(`Capturing: ${target.filename}`);

      await page.goto(url, { waitUntil: 'networkidle' });

      if (hashId) {
        await page.waitForSelector(`#${hashId}`, {
          state: 'visible',
          timeout: 15000,
        });
      }

      if (target.hasCountdown) {
        // Wait for countdown overlay (3→2→1→START!) to finish and be removed from DOM.
        // The countdown takes ~4 seconds. Wait up to 10 seconds for it to disappear.
        await page.waitForFunction(
          () => !document.querySelector('[data-testid="countdown-overlay"]'),
          { timeout: 10000 }
        );
        // Brief additional wait for any post-countdown animations
        await page.waitForTimeout(500);
      } else {
        // Brief wait for rendering to settle
        await page.waitForTimeout(500);
      }

      if (hashId) {
        await page.locator(`#${hashId}`).scrollIntoViewIfNeeded();
      }

      const outputPath = join(OUTPUT_DIR, target.filename);
      const clipHeight = Math.round(iPhoneAir.viewport.height * 0.5);
      await page.screenshot({
        path: outputPath,
        clip: { x: 0, y: 0, width: iPhoneAir.viewport.width, height: clipHeight },
      });
      console.log(`  Saved: ${outputPath}`);

      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone! ${targets.length} screenshots captured.`);
}

captureScreenshots().catch((error) => {
  console.error('Failed to capture screenshots:', error);
  process.exit(1);
});

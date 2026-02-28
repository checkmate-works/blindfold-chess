/**
 * Seed script for practice_sessions table.
 *
 * Usage:
 *   npx tsx apps/web/src/lib/db/seed-practice-sessions.ts
 */
import { db } from './index';
import { practiceSessions } from './schema';

const USER_ID = '34a767ae-be7b-4c85-8503-7a8c62a944bd';
const MENU_TYPE = 'square_colors';

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

async function seed() {
  const now = new Date();
  const rows: {
    userId: string;
    menuType: string;
    startedAt: Date;
    settings: Record<string, unknown>;
    result: Record<string, unknown>;
  }[] = [];

  // Generate 3 weeks of data (21 days back from today)
  for (let dayOffset = 20; dayOffset >= 0; dayOffset--) {
    const sessionsPerDay = randomInt(1, 3);

    for (let s = 0; s < sessionsPerDay; s++) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(randomInt(8, 22), randomInt(0, 59), randomInt(0, 59), 0);

      // Throughput improves gradually over time (growth trend)
      const dayProgress = (20 - dayOffset) / 20; // 0.0 -> 1.0
      const baseThroughput = 12 + dayProgress * 10; // 12 -> 22
      const throughput = baseThroughput + randomBetween(-3, 3);

      const durationMs = randomInt(30000, 60000);
      const durationSec = durationMs / 1000;
      const totalQuestions = Math.round((throughput * durationSec) / 60);
      const accuracy = randomBetween(70, 100);
      const correctAnswers = Math.round(totalQuestions * (accuracy / 100));
      const incorrectAnswers = totalQuestions - correctAnswers;
      const timeTaken = durationSec;
      const averageTime = totalQuestions > 0 ? timeTaken / totalQuestions : 0;

      rows.push({
        userId: USER_ID,
        menuType: MENU_TYPE,
        startedAt: date,
        settings: {
          timeLimit: durationSec,
          mode: 'timed' as const,
        },
        result: {
          correctAnswers,
          totalQuestions,
          accuracy: Math.round(accuracy * 10) / 10,
          timeTaken: Math.round(timeTaken * 10) / 10,
          averageTime: Math.round(averageTime * 100) / 100,
          durationMs,
          incorrectAnswers,
        },
      });
    }
  }

  await db.insert(practiceSessions).values(rows);

  console.log(`Inserted ${rows.length} practice sessions for user ${USER_ID}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

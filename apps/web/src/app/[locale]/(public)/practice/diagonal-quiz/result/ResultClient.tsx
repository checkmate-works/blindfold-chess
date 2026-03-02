'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizProblemList } from '../_components/DiagonalQuizProblemList';
import type { QuestionResult } from '../_components/DiagonalQuizProblemList';

type Props = {
  locale: Locale;
};

export function ResultClient({ locale }: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '0', 10);
  const timeLimit = searchParams.get('timeLimit');
  const timeElapsed = parseInt(searchParams.get('time') || '0', 10);
  const dataParam = searchParams.get('data');

  const questionResults = useMemo(() => {
    if (!dataParam) return [];
    try {
      // Decode and parse minified JSON
      // Minified keys: s=square, c=isCorrect, dc=isDiagonalCorrect, ac=isAntiDiagonalCorrect
      // cd=correctDiagonal, ca=correctAntiDiagonal, ud=userDiagonal, ua=userAntiDiagonal
      type SerializedResult = {
        s: string;
        c: number;
        dc: number;
        ac: number;
        cd: string;
        ca: string;
        ud?: string;
        ua?: string;
      };
      const parsed = JSON.parse(decodeURIComponent(dataParam));
      return parsed.map((item: SerializedResult) => ({
        square: item.s,
        isCorrect: item.c === 1,
        isDiagonalCorrect: item.dc === 1,
        isAntiDiagonalCorrect: item.ac === 1,
        correctDiagonal: item.cd,
        correctAntiDiagonal: item.ca,
        userDiagonal: item.ud,
        userAntiDiagonal: item.ua,
      })) as QuestionResult[];
    } catch (e) {
      console.error('Failed to parse result data', e);
      return [];
    }
  }, [dataParam]);

  const averageTime =
    questionResults.length > 0 ? (timeElapsed / questionResults.length).toFixed(1) : '0.0';

  return (
    <PracticeResultPage
      locale={locale}
      title={t('title')}
      breadcrumbItems={[
        { label: tPractice('title'), href: '/practice' },
        { label: t('title'), href: '/practice/diagonal-quiz' },
        { label: tPractice('result') },
      ]}
    >
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() =>
          router.push(
            `/${locale}/practice/diagonal-quiz/challenge?timeLimit=${timeLimit || '60'}#diagonal-quiz-session`
          )
        }
        onExit={() => router.push(`/${locale}/practice/diagonal-quiz`)}
        locale={locale}
        labels={{
          practiceComplete: tPractice('practiceComplete'),
          score: tPractice('score'),
          tryAgain: tPractice('tryAgain'),
          morePractice: tPractice('changeSettings'),
          averageTime: tPractice('averageTime'),
          relatedLearning: tPractice('relatedLearning'),
        }}
        averageTimeText={tPractice('secondsFormat', { seconds: averageTime })}
        relatedModule={{
          href: '/learn/moves/bishop-movement',
          icon: '♗',
          title: tPractice('relatedArticles.bishopMovement.title'),
          description: tPractice('relatedArticles.bishopMovement.description'),
        }}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
      >
        <div className="mt-8">
          <DiagonalQuizProblemList results={questionResults} />
        </div>
      </PracticeComplete>
    </PracticeResultPage>
  );
}

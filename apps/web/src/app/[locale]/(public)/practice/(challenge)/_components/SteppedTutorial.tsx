'use client';

import { type ReactNode, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowLeft, FaArrowRight, FaInfinity, FaPlay } from 'react-icons/fa';

import { Divider } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props<TStep extends string> = {
  locale: Locale;
  /** URL segment under `/practice` — targets the challenge / training links. */
  moduleSlug: string;
  /**
   * The steps in order. The first hides the Back button; the last swaps the
   * Back / Next pair for the challenge + training call to action.
   */
  steps: readonly TStep[];
  /**
   * i18n namespace holding this tutorial's copy. Each step reads
   * `steps.<step>.title` / `steps.<step>.description`; the shell also reads
   * `previous`, `next` and `startChallenge` from it.
   */
  namespace: string;
  /** Extra classes for the description paragraph (alignment, pre-wrap). */
  descriptionClassName?: string;
  /** The step's own illustration / interaction, between description and footer. */
  renderStep: (step: TStep) => ReactNode;
};

/**
 * The shell every stepped practice tutorial is built from: progress dots, the
 * current step's title and description, the caller's body, and a footer that
 * walks Back / Next until the last step, where it offers the challenge and
 * training modes instead.
 *
 * It is deliberately unframed. The steps used to sit in a bordered card, but
 * the tutorial already renders inside the page panel, so the reader saw two
 * frames around one thing.
 *
 * Board-symmetry, route-planner and diagonal-quiz each carried their own copy
 * of this (dots, heading, board panel, footer, and the two `router.push`
 * handlers) and differed only in their step list, i18n namespace, module slug
 * and per-step illustration. Those four are now the props; the rest lives here.
 *
 * The step body is a render prop rather than plain children because every
 * tutorial's illustration depends on which step is showing, and the step is
 * this component's own state.
 */
export function SteppedTutorial<TStep extends string>({
  locale,
  moduleSlug,
  steps,
  namespace,
  descriptionClassName = '',
  renderStep,
}: Props<TStep>) {
  // next-intl derives its key types from a LITERAL namespace; this shell takes
  // the namespace as a prop, so its keys cannot be checked at compile time here.
  // The cast is confined to this line — each tutorial's remaining copy (legends,
  // result labels) is read at the tutorial itself and stays fully typed.
  const t = useTranslations(namespace) as unknown as (key: string) => string;
  const tp = useTranslations('practice');
  const router = useRouter();
  const [step, setStep] = useState<TStep>(steps[0]);

  const currentIndex = steps.indexOf(step);
  const isLastStep = currentIndex === steps.length - 1;

  const handleNext = () => {
    if (currentIndex < steps.length - 1) setStep(steps[currentIndex + 1]);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setStep(steps[currentIndex - 1]);
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Progress Dots */}
      <div className="flex justify-center gap-2 mb-6">
        {steps.map((s, idx) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx === currentIndex
                ? 'bg-primary'
                : idx < currentIndex
                  ? 'bg-primary/50'
                  : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <h3 className="text-xl font-bold text-center mb-4">{t(`steps.${step}.title`)}</h3>
      <p className={`text-muted-foreground mb-6 min-h-[4.5rem] ${descriptionClassName}`}>
        {t(`steps.${step}.description`)}
      </p>

      {renderStep(step)}

      {isLastStep ? (
        <div>
          <Button
            onClick={() => router.push(`/${locale}/practice/${moduleSlug}/challenge`)}
            variant="primary"
            size="lg"
            className="w-full"
          >
            <FaPlay className="mr-2 h-4 w-4" />
            {t('startChallenge')}
          </Button>

          <div className="my-6 mx-auto flex w-4/5 items-center gap-4">
            <Divider className="flex-1" />
            <span className="text-sm text-muted-foreground">{tp('orDivider')}</span>
            <Divider className="flex-1" />
          </div>

          <Button
            onClick={() => router.push(`/${locale}/practice/${moduleSlug}/training`)}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <FaInfinity className="mr-2 h-4 w-4" />
            {tp('startTraining')}
          </Button>
        </div>
      ) : (
        <div className="flex gap-4">
          {currentIndex > 0 && (
            <Button variant="outline" size="lg" onClick={handlePrevious} className="flex-1">
              <FaArrowLeft className="mr-2 h-4 w-4" />
              {t('previous')}
            </Button>
          )}
          <Button onClick={handleNext} variant="primary" size="lg" className="flex-1">
            {t('next')}
            <FaArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

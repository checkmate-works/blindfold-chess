'use client';

import { useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { FaQuestionCircle } from 'react-icons/fa';

export type HelpStep = {
  /** Value of the `data-tour-id` attribute on the target element. */
  targetId: string;
  title?: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
};

type Props = {
  steps: HelpStep[];
  /** aria-label for the trigger button. */
  label: string;
};

export function HelpTourButton({ steps, label }: Props) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const pathname = usePathname();

  // Driver renders its overlay/popover into <body>, outside the React tree, so
  // a route change leaves them stranded if the highlighted element was a link
  // the user clicked through. Destroy on pathname change (and on unmount).
  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, [pathname]);

  const startTour = () => {
    driverRef.current?.destroy();
    const d = driver({
      showProgress: steps.length > 1,
      steps: steps.map((step) => {
        // Resolve the target now: when it's on screen we highlight it; when it
        // isn't (e.g. a control that only appears in a particular view), omit
        // the element so driver.js shows a centered popover that still explains
        // the feature instead of pointing at nothing.
        const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
        return {
          ...(el ? { element: el } : {}),
          popover: {
            title: step.title,
            description: step.description,
            side: step.side ?? 'bottom',
            align: step.align ?? 'start',
          },
        };
      }),
    });
    driverRef.current = d;
    d.drive();
  };

  if (steps.length === 0) return null;

  return (
    <button
      type="button"
      onClick={startTour}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label={label}
    >
      <FaQuestionCircle className="h-5 w-5" />
    </button>
  );
}

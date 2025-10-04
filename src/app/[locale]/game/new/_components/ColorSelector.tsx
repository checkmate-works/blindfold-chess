'use client';

import { useTranslations } from 'next-intl';

import type { Side } from '@/lib/types';

type Props = {
  value: Side;
  onChange: (value: Side) => void;
  disabled?: boolean;
};

export function ColorSelector({ value, onChange, disabled = false }: Props) {
  const t = useTranslations('newGame');
  return (
    <div className={`grid grid-cols-2 gap-4 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <button
        onClick={() => onChange('white')}
        disabled={disabled}
        className={`p-6 rounded-lg border-2 transition-all ${
          value === 'white'
            ? 'border-foreground bg-foreground/10'
            : 'border-border hover:border-muted-foreground'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 mb-3 flex items-center justify-center">
            {/* White King SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="60" height="60">
              <g
                fill="none"
                fillRule="evenodd"
                stroke="#000"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              >
                <path strokeLinejoin="miter" d="M22.5 11.63V6M20 8h5" />
                <path
                  fill="#fff"
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
                />
                <path
                  fill="#fff"
                  d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"
                />
                <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
              </g>
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">{t('playAsWhite')}</h3>
          <p className="text-sm text-muted-foreground text-center">{t('whiteDescription')}</p>
        </div>
      </button>

      <button
        onClick={() => onChange('black')}
        disabled={disabled}
        className={`p-6 rounded-lg border-2 transition-all ${
          value === 'black'
            ? 'border-foreground bg-foreground/10'
            : 'border-border hover:border-muted-foreground'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 mb-3 flex items-center justify-center">
            {/* Black King SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="60" height="60">
              <g
                fill="none"
                fillRule="evenodd"
                stroke="#000"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              >
                <path strokeLinejoin="miter" d="M22.5 11.6V6" />
                <path
                  fill="#000"
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
                />
                <path
                  fill="#000"
                  d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"
                />
                <path fill="none" d="M20 8h5" />
                <path
                  stroke="#ececec"
                  d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 9.906 14 6.997 19.85c-2.497 5.65 4.853 9 4.853 9"
                />
                <path
                  stroke="#ececec"
                  d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"
                />
              </g>
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">{t('playAsBlack')}</h3>
          <p className="text-sm text-muted-foreground text-center">{t('blackDescription')}</p>
        </div>
      </button>
    </div>
  );
}

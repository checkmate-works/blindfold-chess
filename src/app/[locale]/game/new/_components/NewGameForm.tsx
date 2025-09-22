'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageTitle } from '../../../_components/PageTitle';
import type { Side, SkillLevel } from '../../../play/_lib/types';

interface NewGameFormProps {
  locale: 'en' | 'ja';
  translations: {
    title: string;
    selectColor: string;
    playAsWhite: string;
    playAsBlack: string;
    selectLevel: string;
    beginner: string;
    intermediate: string;
    advanced: string;
    startGame: string;
    whiteDescription: string;
    blackDescription: string;
  };
}

export function NewGameForm({ locale, translations }: NewGameFormProps) {
  const router = useRouter();
  const [color, setColor] = useState<Side>('white');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);

  const handleStartGame = () => {
    // Navigate to play page with selected parameters
    const params = new URLSearchParams({
      color,
      skillLevel: skillLevel.toString(),
    });
    router.push(`/${locale}/play?${params.toString()}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <PageTitle>{translations.title}</PageTitle>
      </div>

      <div className="space-y-8">
        {/* Color Selection */}
        <div>
          <h2 className="text-lg font-semibold mb-4">{translations.selectColor}</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setColor('white')}
              className={`p-6 rounded-lg border-2 transition-all ${
                color === 'white'
                  ? 'border-foreground bg-foreground/10'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 mb-3 flex items-center justify-center">
                  {/* White King SVG */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 45 45"
                    width="60"
                    height="60"
                  >
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
                <h3 className="font-semibold text-lg mb-2">{translations.playAsWhite}</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {translations.whiteDescription}
                </p>
              </div>
            </button>

            <button
              onClick={() => setColor('black')}
              className={`p-6 rounded-lg border-2 transition-all ${
                color === 'black'
                  ? 'border-foreground bg-foreground/10'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 mb-3 flex items-center justify-center">
                  {/* Black King SVG */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 45 45"
                    width="60"
                    height="60"
                  >
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
                <h3 className="font-semibold text-lg mb-2">{translations.playAsBlack}</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {translations.blackDescription}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Skill Level Selection */}
        <div>
          <h2 className="text-lg font-semibold mb-4">{translations.selectLevel}</h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setSkillLevel(1)}
              className={`p-4 rounded-lg border-2 transition-all ${
                skillLevel === 1
                  ? 'border-foreground bg-foreground/10'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <h3 className="font-semibold">{translations.beginner}</h3>
              <p className="text-sm text-muted-foreground mt-1">ELO ~1000</p>
            </button>

            <button
              onClick={() => setSkillLevel(5)}
              className={`p-4 rounded-lg border-2 transition-all ${
                skillLevel === 5
                  ? 'border-foreground bg-foreground/10'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <h3 className="font-semibold">{translations.intermediate}</h3>
              <p className="text-sm text-muted-foreground mt-1">ELO ~1500</p>
            </button>

            <button
              onClick={() => setSkillLevel(10)}
              className={`p-4 rounded-lg border-2 transition-all ${
                skillLevel === 10
                  ? 'border-foreground bg-foreground/10'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <h3 className="font-semibold">{translations.advanced}</h3>
              <p className="text-sm text-muted-foreground mt-1">ELO ~2000</p>
            </button>
          </div>
        </div>

        {/* Start Game Button */}
        <button
          onClick={handleStartGame}
          className="w-full py-3 px-6 bg-foreground text-background rounded-lg font-semibold hover:bg-foreground/90 transition-colors"
        >
          {translations.startGame}
        </button>
      </div>
    </div>
  );
}

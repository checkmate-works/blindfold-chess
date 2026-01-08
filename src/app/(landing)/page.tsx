import Image from 'next/image';

import { SITE_DOMAIN, SITE_NAME } from '@/config';
import { FaBrain, FaChessKnight, FaGraduationCap, FaRobot } from 'react-icons/fa';

import { LanguageButton } from './_components/LanguageButton';

// Language configuration
type LanguageOption = {
  code: 'en' | 'ja';
  label: string;
  flag: string;
  subtitle: string;
};

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    flag: '🇬🇧',
    subtitle: 'Continue in English',
  },
  {
    code: 'ja',
    label: '日本語',
    flag: '🇯🇵',
    subtitle: '日本語で続ける',
  },
] as const;

export default function RootPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-secondary via-background to-secondary">
        <div className="text-center w-full max-w-4xl mx-auto space-y-12">
          {/* Logo & Title */}
          <div className="space-y-6">
            <div className="flex justify-center">
              <Image
                src="/logo.png"
                alt={`${SITE_NAME} Logo`}
                width={120}
                height={120}
                className="w-32 h-32 md:w-40 md:h-40 drop-shadow-2xl"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
              {SITE_NAME}
            </h1>
          </div>

          {/* Language Selection */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-lg mx-auto w-full">
            {LANGUAGE_OPTIONS.map((locale) => (
              <LanguageButton
                key={locale.code}
                href={`/${locale.code}`}
                flag={locale.flag}
                language={locale.label}
                subtitle={locale.subtitle}
              />
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </section>

      {/* Feature 1: AI Battle */}
      <section className="py-24 px-6 bg-card border-y border-border/50">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl">
            <FaRobot />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Play against AI</h2>
            <h3 className="text-xl text-muted-foreground">AIと目隠しチェスで対戦</h3>
          </div>
          <p className="text-lg leading-relaxed text-muted-foreground max-w-2xl">
            Play blindfold chess against the standard chess engine, Stockfish.
            <br />
            <span className="text-sm opacity-80 mt-2 block">
              定番のチェスエンジン Stockfish と目隠しチェスで対戦できます。
            </span>
          </p>
        </div>
      </section>

      {/* Feature 2: Training Modes */}
      <section className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Extensive Training Modes</h2>
            <h3 className="text-xl text-muted-foreground">目隠しチェスのトレーニングが満載</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Position Memory */}
            <div className="bg-card p-8 rounded-2xl border border-border hover:border-primary/50 transition-colors shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-2xl mb-6">
                <FaBrain />
              </div>
              <h4 className="text-xl font-bold mb-1">Position Memory</h4>
              <h5 className="text-sm text-muted-foreground mb-4">ポジションの記憶</h5>
              <p className="text-muted-foreground">
                Practice memorizing board positions and recreating them on an empty board. Develops
                crucial pattern recognition skills for blindfold chess.
                <br />
                <span className="text-xs opacity-70 mt-2 block">
                  盤面を記憶して、空のボード上に再現する練習メニューがあります。目隠しチェスをする上で重要となるパターン認識能力を養うことができます。
                </span>
              </p>
            </div>

            {/* Knight's Tour */}
            <div className="bg-card p-8 rounded-2xl border border-border hover:border-primary/50 transition-colors shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-2xl mb-6">
                <FaChessKnight />
              </div>
              <h4 className="text-xl font-bold mb-1">Knight's Tour</h4>
              <h5 className="text-sm text-muted-foreground mb-4">ナイトツアー</h5>
              <p className="text-muted-foreground">
                Knight's Tour is a classic puzzle where you visit every square on the board exactly
                once. Use it to train your board visualization.
                <br />
                <span className="text-xs opacity-70 mt-2 block">
                  ナイトツアーはナイトを使って盤上の全てのマスを一度ずつ訪れる古典的なパズルです。目隠しチェスのトレーニングとして活用できます。
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Learn */}
      <section className="py-24 px-6 bg-gradient-to-b from-secondary/30 to-background border-t border-border/50">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center text-green-600 text-3xl">
            <FaGraduationCap />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Tips for Visualization Skills</h2>
            <h3 className="text-xl text-muted-foreground">
              ビジュアライゼーションスキルアップのヒントが満載
            </h3>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Gain insights into blindfold chess, including introduction to famous research results
            like the de Groot experiment.
            <br />
            <span className="text-sm opacity-80 mt-2 block">
              有名なデ・グロートのチェスに関する実験結果の紹介など、目隠しチェスのヒントとなる知識が収集できます。
            </span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-secondary/30 border-t border-border space-y-8 text-center">
        {/* Language Selection */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-lg mx-auto w-full px-6">
          {LANGUAGE_OPTIONS.map((locale) => (
            <LanguageButton
              key={locale.code}
              href={`/${locale.code}`}
              flag={locale.flag}
              language={locale.label}
              subtitle={locale.subtitle}
            />
          ))}
        </div>

        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {SITE_DOMAIN}
        </div>
      </footer>
    </div>
  );
}

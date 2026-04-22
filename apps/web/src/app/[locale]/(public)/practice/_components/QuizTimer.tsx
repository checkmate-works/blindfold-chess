import React from 'react';

import { formatTime } from '@blindfold-chess/features/coordinate-quiz';

type QuizTimerProps = {
  timeRemaining: number;
  progress: number; // 0 to 1
  size?: number;
  fontSize?: string;
  strokeWidth?: number;
};

export function QuizTimer({
  timeRemaining,
  progress,
  size = 80,
  fontSize = 'text-lg',
  strokeWidth = 6,
}: QuizTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (1 - progress));

  // Color based on remaining time (matching mobile theme)
  const getTimerColor = () => {
    // These hex codes match the mobile app's theme colors
    // error: #ef4444, warning: #f59e0b, primary: #2563eb
    if (progress > 0.8) return '#ef4444';
    if (progress > 0.6) return '#f59e0b';
    return '#2563eb';
  };

  const color = getTimerColor();

  return (
    <div
      className="relative flex items-center justify-center bg-card rounded-full"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90 absolute top-0 left-0">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-100 ease-linear"
        />
      </svg>
      <div className="flex items-center justify-center relative z-10">
        <span className={`${fontSize} font-bold`} style={{ color }}>
          {formatTime(timeRemaining)}
        </span>
      </div>
    </div>
  );
}

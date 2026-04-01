import type { ReactNode } from 'react';

type Props = {
  label: string;
  backgroundImage?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function GameSectionCard({
  label,
  backgroundImage = '/images/chessboard.webp',
  footer,
  children,
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-6 w-full sm:w-auto sm:min-w-[28rem] max-w-full">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.6] pointer-events-none dark:opacity-[0.4]"
        style={{
          backgroundImage: `url("${backgroundImage}")`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right bottom',
          maskImage:
            'linear-gradient(to bottom right, transparent 30%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,1) 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom right, transparent 30%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,1) 100%)',
        }}
      />
      <div className="relative">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">{label}</h3>
        <div className="flex flex-row flex-wrap items-center justify-center gap-4">{children}</div>
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </div>
  );
}

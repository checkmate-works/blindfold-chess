import Image from 'next/image';

type Props = {
  children: React.ReactNode;
  className?: string;
  /**
   * Whether to mark the underlying frame image as a high-priority preload.
   * Defaults to true because both current callers (`/games/play` victory and
   * `/thanks` award) render the frame above the fold as the page's hero.
   */
  priority?: boolean;
};

/**
 * Shared gold-bordered certificate layout. Renders the frame image and
 * centers `children` inside the safe inner area.
 *
 * Used by:
 *   - `VictoryCertificate` — AI defeat result on `/games/play`
 *   - `/thanks` page — automated grant award
 *
 * The percentage padding (`px-[18%] py-[22%]`) matches the engraved inner
 * margin of `certificate-frame.webp`; do not tighten it without re-checking
 * the artwork or text will overflow the engraved area.
 */
export function CertificateFrame({ children, className = '', priority = true }: Props) {
  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio: '3 / 2' }}>
      <Image
        src="/images/certificate-frame.webp"
        alt=""
        width={768}
        height={512}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        priority={priority}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-[18%] py-[22%]">
        {children}
      </div>
    </div>
  );
}

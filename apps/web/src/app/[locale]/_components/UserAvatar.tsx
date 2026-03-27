import Image from 'next/image';

type UserAvatarProps = {
  src: string | null | undefined;
  alt: string;
  size?: number;
};

export function UserAvatar({ src, alt, size = 64 }: UserAvatarProps) {
  const iconSize = Math.round(size / 2);

  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ width: iconSize, height: iconSize }}
      >
        <path
          fillRule="evenodd"
          d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

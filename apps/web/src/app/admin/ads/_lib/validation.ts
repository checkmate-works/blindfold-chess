export type CreateAdBannerData = {
  slot: string;
  href: string;
  imagePath: string;
  alt: string;
  width: number;
  height: number;
  isActive: boolean;
  sortOrder: number;
  startAt: string | null;
  endAt: string | null;
};

export type UpdateAdBannerData = {
  href: string;
  imagePath: string;
  alt: string;
  isActive: boolean;
};

function validateHref(href: string): string | null {
  if (!href || href.length > 2048) {
    return 'invalid href';
  }
  try {
    const url = new URL(href);
    if (!['https:', 'http:'].includes(url.protocol)) {
      return 'invalid href';
    }
  } catch {
    return 'invalid href';
  }
  return null;
}

function validateImagePath(imagePath: string): string | null {
  if (!imagePath || imagePath.length > 1024) {
    return 'invalid imagePath';
  }
  return null;
}

export function validateCreateAdBanner(data: CreateAdBannerData): string | null {
  if (!data.slot || data.slot.length > 50) {
    return 'invalid slot';
  }
  const hrefError = validateHref(data.href);
  if (hrefError) return hrefError;
  const imagePathError = validateImagePath(data.imagePath);
  if (imagePathError) return imagePathError;
  if (!data.width || data.width <= 0) {
    return 'invalid width';
  }
  if (!data.height || data.height <= 0) {
    return 'invalid height';
  }
  return null;
}

export function validateUpdateAdBanner(data: UpdateAdBannerData): string | null {
  const hrefError = validateHref(data.href);
  if (hrefError) return hrefError;
  return validateImagePath(data.imagePath);
}

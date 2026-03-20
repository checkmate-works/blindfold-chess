'use client';

import { useEffect } from 'react';

export function HashScrollTarget() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const timer = setTimeout(() => {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return null;
}

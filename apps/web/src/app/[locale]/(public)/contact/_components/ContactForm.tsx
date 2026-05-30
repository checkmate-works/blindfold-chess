'use client';

import { useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { buildContactParams } from '../_lib/contact-params';

type Props = {
  locale: string;
};

export function ContactForm({ locale }: Props) {
  const t = useTranslations('contact');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill form from URL params (when coming back from confirm page)
  const [formData] = useState(() => ({
    name: searchParams.get('name') || '',
    email: searchParams.get('email') || '',
    subject: searchParams.get('subject') || '',
    message: searchParams.get('message') || '',
  }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formElement = e.currentTarget;
    const data = new FormData(formElement);

    const params = buildContactParams({
      name: data.get('name') as string,
      email: data.get('email') as string,
      subject: data.get('subject') as string,
      message: data.get('message') as string,
    });

    router.push(`/${locale}/contact/confirm?${params}`);
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
            {t('form.name')} <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            defaultValue={formData.name}
            className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            {t('form.email')} <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            defaultValue={formData.email}
            className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
            {t('form.subject')} <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            required
            defaultValue={formData.subject}
            className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
            {t('form.message')} <span className="text-destructive">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            minLength={10}
            rows={6}
            defaultValue={formData.message}
            className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
          />
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth>
          {t('form.submit')}
        </Button>
      </form>
    </div>
  );
}

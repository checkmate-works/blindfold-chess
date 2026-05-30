'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { submitContactForm } from '../_lib/contact-action';
import { buildContactParams } from '../_lib/contact-params';
import type { ContactFormData } from '../_lib/contact-schema';

type Props = {
  formData: ContactFormData;
  locale: string;
};

export function ContactConfirm({ formData, locale }: Props) {
  const t = useTranslations('contact');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleBack = () => {
    router.push(`/${locale}/contact?${buildContactParams(formData)}`);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const result = await submitContactForm(formData);

      if (result.success) {
        router.push(`/${locale}/contact/success`);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {submitStatus === 'success' && (
        <div className="mb-6 rounded-md bg-success/10 p-4 border border-success/30">
          <h3 className="font-semibold text-success mb-2">{t('success.title')}</h3>
          <p className="text-success">{t('success.message')}</p>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="mb-6 rounded-md bg-destructive/10 p-4 border border-destructive/30">
          <h3 className="font-semibold text-destructive mb-2">{t('error.title')}</h3>
          <p className="text-destructive">{t('error.message')}</p>
        </div>
      )}

      <div className="space-y-6 bg-card p-6 rounded-md border border-border">
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">{t('form.name')}</div>
          <div className="text-base text-foreground">{formData.name}</div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">{t('form.email')}</div>
          <div className="text-base text-foreground">{formData.email}</div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">{t('form.subject')}</div>
          <div className="text-base text-foreground">{formData.subject}</div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">{t('form.message')}</div>
          <div className="text-base text-foreground whitespace-pre-wrap">{formData.message}</div>
        </div>
      </div>

      <div className="mt-8 flex flex-col-reverse sm:flex-row gap-4">
        <Button
          type="button"
          onClick={handleBack}
          disabled={isSubmitting}
          variant="secondary"
          size="lg"
          fullWidth
          className="border-0 hover:bg-secondary/80"
        >
          {t('form.backToForm')}
        </Button>

        <Button
          type="button"
          onClick={handleSubmit}
          loading={isSubmitting}
          variant="primary"
          size="lg"
          fullWidth
        >
          {t('form.sendEmail')}
        </Button>
      </div>
    </div>
  );
}

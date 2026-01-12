'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { PrimaryButton } from '../../_components/PrimaryButton';
import { submitContactForm } from '../_lib/contact-action';
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
    const params = new URLSearchParams();
    params.set('name', formData.name);
    params.set('email', formData.email);
    params.set('subject', formData.subject);
    params.set('message', formData.message);
    router.push(`/${locale}/contact?${params.toString()}`);
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
        <div className="mb-6 rounded-md bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
          <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
            {t('success.title')}
          </h3>
          <p className="text-green-800 dark:text-green-200">{t('success.message')}</p>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">{t('error.title')}</h3>
          <p className="text-red-800 dark:text-red-200">{t('error.message')}</p>
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
        <PrimaryButton
          type="button"
          onClick={handleBack}
          disabled={isSubmitting}
          variant="secondary"
        >
          {t('form.backToForm')}
        </PrimaryButton>

        <PrimaryButton type="button" onClick={handleSubmit} loading={isSubmitting}>
          {t('form.sendEmail')}
        </PrimaryButton>
      </div>
    </div>
  );
}

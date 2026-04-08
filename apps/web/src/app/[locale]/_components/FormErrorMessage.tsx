'use client';

import { FormErrorBanner } from '@/app/_components/FormErrorBanner';

export function FormErrorMessage({ message }: { message: string }) {
  return <FormErrorBanner message={message} variant="bordered" />;
}

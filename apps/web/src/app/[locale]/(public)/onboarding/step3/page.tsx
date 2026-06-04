import { createOnboardingStepPage } from '../_lib/create-onboarding-step-page';
import { Step3Client } from './_components/Step3Client';

const { generateStaticParams, generateMetadata, Page } = createOnboardingStepPage({
  step: 3,
  Client: Step3Client,
});

export { generateStaticParams, generateMetadata };
export default Page;

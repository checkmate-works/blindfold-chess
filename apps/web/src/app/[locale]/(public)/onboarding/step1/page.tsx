import { createOnboardingStepPage } from '../_lib/create-onboarding-step-page';
import { Step1Client } from './_components/Step1Client';

const { generateStaticParams, generateMetadata, Page } = createOnboardingStepPage({
  step: 1,
  Client: Step1Client,
});

export { generateStaticParams, generateMetadata };
export default Page;

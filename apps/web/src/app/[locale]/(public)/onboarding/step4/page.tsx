import { createOnboardingStepPage } from '../_lib/create-onboarding-step-page';
import { Step4Client } from './_components/Step4Client';

const { generateStaticParams, generateMetadata, Page } = createOnboardingStepPage({
  step: 4,
  Client: Step4Client,
});

export { generateStaticParams, generateMetadata };
export default Page;

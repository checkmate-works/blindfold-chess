import { createOnboardingStepPage } from '../_lib/create-onboarding-step-page';
import { Step2Client } from './_components/Step2Client';

const { generateStaticParams, generateMetadata, Page } = createOnboardingStepPage({
  step: 2,
  Client: Step2Client,
});

export { generateStaticParams, generateMetadata };
export default Page;

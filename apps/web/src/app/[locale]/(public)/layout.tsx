import { GoogleScripts } from '@/app/_components/GoogleScripts';
import { ADSENSE_PUBLISHER_ID } from '@/config';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        AdSense loader is injected via `GoogleScripts`, which reads from the
        `StorageAvailabilityProvider` mounted once in the parent
        `[locale]/layout.tsx`. The probe therefore runs exactly once per
        page load — this nested `GoogleScripts` instance consumes the same
        context as the one mounted in the root layout, so adding more
        `GoogleScripts` nests never duplicates the storage probe.

        The parent layout's `GoogleScripts` carries only `privacyMessagingId` +
        `gaMeasurementId`; this one carries only `adsensePublisherId`.
        Because each instance renders only the scripts whose IDs it was
        given, there are no duplicate script tags.
      */}
      <GoogleScripts adsensePublisherId={ADSENSE_PUBLISHER_ID} />
      {children}
    </>
  );
}

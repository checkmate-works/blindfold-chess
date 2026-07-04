export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // The parent `[locale]/layout.tsx` already mounts `GoogleScripts` with
  // `adsensePublisherId` sitewide (needed so AdSense's Privacy & messaging
  // consent message covers every page, not just this route group — see the
  // TSDoc on `GoogleScripts`). A second nested instance here would only
  // re-render the identical `<Script id="adsbygoogle-loader">`, which
  // `next/script` would dedupe anyway, so there is nothing left for this
  // layout to inject.
  return <>{children}</>;
}

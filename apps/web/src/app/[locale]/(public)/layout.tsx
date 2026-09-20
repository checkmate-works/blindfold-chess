export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // The parent `[locale]/layout.tsx` mounts `GoogleScripts` and the consent
  // banner for the whole tree, so this route group has nothing of its own to
  // inject. It stays as a segment boundary: the ad-bearing pages live under
  // it, and a future group-wide wrapper would go here.
  return <>{children}</>;
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

import { AppearanceSettings } from './AppearanceSettings';
import { GameSettings } from './GameSettings';
import { NotificationSettings } from './NotificationSettings';
import { PrivacySettings } from './PrivacySettings';

type Props = {
  locale: string;
};

/**
 * Every pane id this component can render, independent of the auth-gated tab
 * buttons below — a signed-out visitor deep-linking to ?tab=notifications
 * still mounts that pane (see the comment on the pane itself).
 *
 * Used to fall back to 'game' for unrecognised values, which is what a
 * bookmark or external link to the retired ?tab=controls now hits (move-input
 * settings moved into the Game tab). Without the fallback such a URL renders
 * a tab bar over an empty pane.
 */
const PANE_IDS = ['game', 'appearance', 'privacy', 'notifications'] as const;

export function PreferencesTabs({ locale }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const t = useTranslations('Preferences');
  const { user, isLoading } = useAuth();
  // Only known false while auth state is still resolving — treat that as
  // "not authenticated yet" so the tab never flashes in then disappears.
  const isAuthenticated = !isLoading && !!user;

  // Use URL parameter directly, falling back to 'game' when absent or unknown
  const activeTab = PANE_IDS.find((id) => id === tabParam) ?? 'game';

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tabId);
    router.push(`/${locale}/preferences?${params.toString()}`, { scroll: false });
  };

  const tabs = [
    { id: 'game', label: t('tabs.board') },
    { id: 'appearance', label: t('tabs.appearance') },
    // Account-level tabs, only for signed-in users — these configure
    // per-account settings, not local/device preferences like the others.
    // Notifications stays rightmost by design.
    ...(isAuthenticated
      ? [
          { id: 'privacy', label: t('tabs.privacy') },
          { id: 'notifications', label: t('tabs.notifications') },
        ]
      : []),
  ];

  return (
    <div>
      {/* Tab Navigation. overflow-x-auto: the es/pt-BR labels
          (Partida … Notificações) can exceed narrow-phone widths. */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === 'game' && <GameSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
        {/* Like notifications below: not gated on isAuthenticated — the pane
            must mount so its skeleton shows while client auth resolves; the
            server actions it calls enforce auth themselves. */}
        {activeTab === 'privacy' && <PrivacySettings />}
        {/*
          Deliberately NOT gated on isAuthenticated (only the tab button
          above is): while auth is still resolving client-side — notably on
          a hard reload landing straight on ?tab=notifications, before
          useAuth()'s isLoading flips false — gating here left this pane
          blank with no skeleton at all. The real auth check already
          happens server-side in getNotificationMutes/setNotificationMute
          (getAuthenticatedUser() redirects to sign-in on its own), so
          mounting unconditionally is safe and lets NotificationSettings'
          own skeleton show immediately regardless of client auth state.
        */}
        {activeTab === 'notifications' && <NotificationSettings />}
      </div>
    </div>
  );
}

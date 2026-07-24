import { useEffect, useState } from 'react';
import { useApp, type TabId } from './store/appStore';
import { useThemeEffect, useOnlineEffect } from './hooks/useTheme';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { MenuDrawer, type MenuRoute } from './components/MenuDrawer';
import { UpdateToast } from './components/UpdateToast';
import { NowScreen } from './screens/NowScreen';
import { BandsScreen } from './screens/BandsScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { GroupScreen } from './screens/GroupScreen';
import { MapScreen } from './screens/MapScreen';
import { MenuScreen } from './screens/menu/MenuScreen';
import { WarpedWordmark } from './components/WarpedWordmark';
import { OnboardingFlow } from './screens/onboarding/OnboardingFlow';
import { FestivalScreen } from './screens/FestivalScreen';
import { LineupNoticeBanner } from './components/LineupNoticeBanner';

export function App() {
  useThemeEffect();
  useOnlineEffect();
  const hydrated = useApp((s) => s.hydrate);
  const isHydrated = useApp((s) => s.hydrated);
  const activeTab = useApp((s) => s.activeTab);
  const setTab = useApp((s) => s.setTab);
  const mode = useApp((s) => s.mode);
  const onboardingComplete = useApp((s) => s.settings.onboardingComplete);
  const festivalMode = useApp((s) => s.settings.festivalMode);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRoute, setMenuRoute] = useState<MenuRoute | null>(null);

  useEffect(() => {
    void hydrated();
  }, [hydrated]);

  const openMenuRoute = (r: MenuRoute) => {
    setMenuRoute(r);
    setMenuOpen(false);
  };

  const goTab = (t: TabId) => {
    setMenuRoute(null);
    setTab(t);
  };

  if (!isHydrated) {
    return (
      <div className="surface-app flex h-full flex-col items-center justify-center gap-6">
        <WarpedWordmark className="h-14 scale-150" />
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-warp-pink" />
        </div>
        <p className="text-sm text-secondary">Loading your festival plan…</p>
      </div>
    );
  }

  // First run: a short setup flow, not a splash screen. Demo mode keeps its
  // own settings record, so it never replays production's onboarding.
  if (mode === 'prod' && !onboardingComplete) {
    return (
      <OnboardingFlow
        onFinish={({ tab, menu }) => {
          if (menu) openMenuRoute(menu);
          else goTab(tab ?? 'now');
        }}
      />
    );
  }

  // Festival Lock Screen: one-handed, answers-in-seconds mode for the day
  // itself. The full app is one tap away and the menu still works.
  if (festivalMode && !menuRoute) {
    return (
      <div className="surface-app relative flex h-full flex-col">
        <FestivalScreen onOpenMenu={openMenuRoute} onGoTab={goTab} />
        <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={openMenuRoute} />
        <UpdateToast />
      </div>
    );
  }

  return (
    <div className="surface-app relative flex h-full flex-col">
      <TopBar onMenu={() => setMenuOpen(true)} />
      {/* Below TopBar so it clears the iOS status bar in the installed PWA. */}
      {mode === 'demo' && (
        <div className="bg-warp-yellow px-3 py-1 text-center text-[12px] font-bold text-warp-ink">
          DEMO MODE — sample set times, not the real schedule
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <LineupNoticeBanner />
        {menuRoute ? (
          <MenuScreen route={menuRoute} onBack={() => setMenuRoute(null)} onNavigate={setMenuRoute} />
        ) : (
          <>
            {activeTab === 'now' && <NowScreen onOpenMenu={openMenuRoute} onGoTab={goTab} />}
            {activeTab === 'bands' && <BandsScreen />}
            {activeTab === 'schedule' && <ScheduleScreen onOpenMenu={openMenuRoute} />}
            {activeTab === 'group' && <GroupScreen onGoTab={goTab} onOpenMenu={openMenuRoute} />}
            {activeTab === 'map' && <MapScreen onOpenMenu={openMenuRoute} />}
          </>
        )}
      </main>

      <BottomNav active={menuRoute ? null : activeTab} onChange={goTab} />

      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={openMenuRoute}
      />
      <UpdateToast />
    </div>
  );
}

import { Outlet, useLocation } from 'react-router-dom';
import { FloatingChat, ChatUiProvider } from './FloatingChat';
import { Header } from './Header';

export function AppShell() {
  // The landing hero is full-bleed and dark, flush against the header —
  // main's usual top padding would show the light page background as a
  // seam between them, so it's dropped only on that route.
  const isLanding = useLocation().pathname === '/';

  return (
    <ChatUiProvider>
      <div className="min-h-screen overflow-x-clip bg-page text-ink-900">
        <Header />
        <main
          className={`mx-auto max-w-container px-[22px] pb-3xl md:pb-4xl ${
            isLanding ? '' : 'pt-sm'
          }`}
        >
          <Outlet />
        </main>
        <FloatingChat />
      </div>
    </ChatUiProvider>
  );
}

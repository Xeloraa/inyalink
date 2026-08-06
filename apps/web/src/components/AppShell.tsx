import { Outlet, useLocation } from 'react-router-dom';
import { FloatingChat, ChatUiProvider } from './FloatingChat';
import { Header } from './Header';

export function AppShell() {
  const { pathname } = useLocation();
  // The landing page keeps a single AI entry point (the hero input) and the
  // directory uses its slim "describe your goal" bar, so neither renders the
  // floating bubble.
  const showFloatingChat = pathname !== '/' && pathname !== '/browse';

  return (
    <ChatUiProvider>
      <div className="min-h-screen bg-paper text-ink-900">
        <Header />
        <main className="mx-auto max-w-container px-5 pb-3xl pt-sm md:px-8 md:pb-4xl lg:px-6">
          <Outlet />
        </main>
        {showFloatingChat ? <FloatingChat /> : null}
      </div>
    </ChatUiProvider>
  );
}

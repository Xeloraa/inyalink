import { Outlet } from 'react-router-dom';
import { FloatingChat, ChatUiProvider } from './FloatingChat';
import { Header } from './Header';

export function AppShell() {
  return (
    <ChatUiProvider>
      <div className="min-h-screen overflow-x-clip bg-page text-ink-900">
        <Header />
        <main className="mx-auto max-w-container px-[22px] pb-3xl pt-sm md:pb-4xl">
          <Outlet />
        </main>
        <FloatingChat />
      </div>
    </ChatUiProvider>
  );
}

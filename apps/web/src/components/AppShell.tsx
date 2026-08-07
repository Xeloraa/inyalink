import { Outlet } from 'react-router-dom';
import { FloatingChat, ChatUiProvider } from './FloatingChat';
import { Header } from './Header';

export function AppShell() {
  return (
    <ChatUiProvider>
      <div className="min-h-screen overflow-x-clip bg-paper text-ink-900">
        <Header />
        <main className="mx-auto max-w-container px-5 pb-3xl pt-sm md:px-8 md:pb-4xl lg:px-6">
          <Outlet />
        </main>
        <FloatingChat />
      </div>
    </ChatUiProvider>
  );
}

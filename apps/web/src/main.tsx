import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { DemoFlowProvider } from './lib/demoFlow';
import { I18nProvider } from './lib/i18n';
import { queryClient } from './lib/queryClient';
import './index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

document.documentElement.lang =
  localStorage.getItem('inyalink.locale') === 'my' ? 'my' : 'en';

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <DemoFlowProvider>
          <App />
        </DemoFlowProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);

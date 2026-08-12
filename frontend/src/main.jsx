import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import AppProviders from './app/providers/AppProviders.jsx';
import { emitFrontendEvent, installFrontendFetchLogging } from './utils/logger';

installFrontendFetchLogging();
emitFrontendEvent('info', {
  eventType: 'startup',
  module: 'app',
  action: 'started',
  status: 'success',
  route: window.location.pathname,
}, 'Application started');

createRoot(document.getElementById('root')).render(
  <AppProviders>
    <App />
  </AppProviders>,
);

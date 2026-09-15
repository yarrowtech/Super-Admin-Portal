import AppRoutes from './routes/AppRoutes';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import OfflineBanner from './components/common/OfflineBanner';
import ScrollToTopButton from './components/common/ScrollToTopButton';
import PolicyGate from './components/policy/PolicyGate';

export default function App() {
  return (
    <AppErrorBoundary>
      <OfflineBanner />
      <PolicyGate><AppRoutes /></PolicyGate>
      <ScrollToTopButton />
    </AppErrorBoundary>
  );
}

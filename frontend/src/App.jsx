import AppRoutes from './routes/AppRoutes';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import OfflineBanner from './components/common/OfflineBanner';
import ScrollToTopButton from './components/common/ScrollToTopButton';

export default function App() {
  return (
    <AppErrorBoundary>
      <OfflineBanner />
      <AppRoutes />
      <ScrollToTopButton />
    </AppErrorBoundary>
  );
}

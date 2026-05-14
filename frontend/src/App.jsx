import AppRoutes from './routes/AppRoutes';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import ScrollToTopButton from './components/common/ScrollToTopButton';

export default function App() {
  return (
    <AppErrorBoundary>
      <AppRoutes />
      <ScrollToTopButton />
    </AppErrorBoundary>
  );
}

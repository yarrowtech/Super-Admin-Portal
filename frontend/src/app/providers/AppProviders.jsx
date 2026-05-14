import { AuthProvider } from '../../context/AuthContext';
import { ConfirmDialogProvider } from '../../context/ConfirmDialogContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { ToastProvider } from '../../context/ToastContext';
import QueryProvider from './QueryProvider';

const AppProviders = ({ children }) => (
  <QueryProvider>
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryProvider>
);

export default AppProviders;

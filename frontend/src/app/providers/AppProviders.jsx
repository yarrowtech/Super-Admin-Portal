import { AuthProvider } from '../../context/AuthContext';
import { ConfirmDialogProvider } from '../../context/ConfirmDialogContext';
import { SidebarProvider } from '../../context/SidebarContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { ToastProvider } from '../../context/ToastContext';
import GlobalFetchIndicator from '../../components/common/GlobalFetchIndicator';
import QueryProvider from './QueryProvider';

const AppProviders = ({ children }) => (
  <QueryProvider>
    <GlobalFetchIndicator />
    <AuthProvider>
      <ThemeProvider>
        <SidebarProvider>
          <ToastProvider>
            <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
          </ToastProvider>
        </SidebarProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryProvider>
);

export default AppProviders;

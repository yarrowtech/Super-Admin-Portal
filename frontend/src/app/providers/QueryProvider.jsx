import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryCache';

const QueryProvider = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

export default QueryProvider;

import { RouterProvider } from 'react-router';
import { ThemeProvider } from 'next-themes';
import { router } from './routes';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="bengo-theme" disableTransitionOnChange>
      <ErrorBoundary>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors offset="80px" />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

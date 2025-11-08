import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import DrumMachine from './pages/DrumMachine';
import { Toaster } from '@/components/ui/sonner';

const queryClient = new QueryClient();

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background">
          <DrumMachine />
          <Toaster />
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

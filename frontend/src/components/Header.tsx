import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { LogIn, LogOut, Music } from 'lucide-react';

export default function Header() {
  const { identity, login, clear, isLoggingIn } = useInternetIdentity();

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Music className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Drum Machine</h1>
              <p className="text-xs text-muted-foreground">Step Sequencer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {identity ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {identity.getPrincipal().toString().slice(0, 8)}...
                </span>
                <Button onClick={clear} variant="outline" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Button onClick={login} disabled={isLoggingIn} size="sm">
                <LogIn className="mr-2 h-4 w-4" />
                {isLoggingIn ? 'Connecting...' : 'Login'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

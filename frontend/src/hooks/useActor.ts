import { useState, useEffect } from 'react';

// Minimal actor stub for local dev. Replace with real canister actor wiring when available.
export function useActor() {
  const [actor, setActor] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    // noop for now; in a real setup you'd initialize the actor (e.g., via @dfinity/agent or generated bindings)
  }, []);

  return { actor, isFetching };
}

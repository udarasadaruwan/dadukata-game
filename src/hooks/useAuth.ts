import { useState, useEffect } from "react";
import { signInAnonymous } from "../lib/firebase/auth";

/** Triggers Firebase anonymous auth on mount, returns the user's uid. */
export function useAuth(): { uid: string | null; loading: boolean } {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    signInAnonymous()
      .then((id) => {
        if (!cancelled) setUid(id);
      })
      .catch(() => {
        /* Auth failed — uid stays null */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { uid, loading };
}

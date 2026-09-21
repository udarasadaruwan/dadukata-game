import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "./config";

/**
 * Signs in the current browser session anonymously.
 * Resolves with the user's uid — no login UI needed.
 */
export function signInAnonymous(): Promise<string> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user.uid);
      }
    });

    signInAnonymously(auth).catch((err) => {
      unsubscribe();
      reject(err);
    });
  });
}

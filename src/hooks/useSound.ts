import { useSyncExternalStore, useCallback } from "react";
import { soundEngine } from "../lib/sound/engine";
import type { SoundName } from "../lib/sound/engine";

/**
 * Provides mute state as a reactive value (via useSyncExternalStore)
 * so components re-render when mute toggles.
 */
let listeners: Array<() => void> = [];

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): boolean {
  return soundEngine.isMuted;
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function useSound() {
  const muted = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const play = useCallback((name: SoundName) => {
    soundEngine.play(name);
  }, []);

  const toggleMute = useCallback(() => {
    soundEngine.toggleMute();
    emitChange();
  }, []);

  return { play, muted, toggleMute };
}

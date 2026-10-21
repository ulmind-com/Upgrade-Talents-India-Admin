"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  loadSoundPreference, play, setSoundEnabled, type SoundName,
} from "@/lib/sound";

type SoundState = { enabled: boolean; toggle: () => void; play: (name: SoundName) => void };

const SoundCtx = createContext<SoundState>({ enabled: true, toggle: () => {}, play: () => {} });
export const useSound = () => useContext(SoundCtx);

/**
 * Decides which sound a clicked element deserves. Returning `null` keeps it
 * silent. An element can opt out or pick its own voice with `data-sound`.
 */
function voiceFor(target: EventTarget | null): SoundName | null {
  if (!(target instanceof Element)) return null;

  const tagged = target.closest<HTMLElement>("[data-sound]");
  if (tagged) {
    const v = tagged.dataset.sound;
    return !v || v === "off" ? null : (v as SoundName);
  }

  const hit = target.closest<HTMLElement>(
    'a[href], button, [role="button"], [role="tab"], [role="switch"], summary'
  );
  if (!hit) return null;
  if (hit.hasAttribute("disabled") || hit.getAttribute("aria-disabled") === "true") return null;

  // A switch reports the state it is in, so the sound is for where it is going.
  if (hit.getAttribute("role") === "switch") {
    return hit.getAttribute("aria-checked") === "true" ? "toggle-off" : "toggle-on";
  }

  // Section links in the sidebar and the in-page tab bars (which mark the
  // selected pill with aria-pressed) are the "tabs" — they get the full pop.
  const isTab =
    hit.getAttribute("role") === "tab" ||
    hit.hasAttribute("aria-pressed") ||
    (hit.tagName === "A" && !!hit.closest("nav"));

  return isTab ? "tab" : "click";
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => { setEnabled(loadSoundPreference()); }, []);

  useEffect(() => {
    // pointerdown rather than click: the sound lands with the press, which is
    // what makes it feel attached to the tap instead of trailing it.
    const onDown = (e: PointerEvent) => {
      const name = voiceFor(e.target);
      if (name) play(name);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((p) => { setSoundEnabled(!p); return !p; });
  }, []);

  return (
    <SoundCtx.Provider value={{ enabled, toggle, play }}>{children}</SoundCtx.Provider>
  );
}

import { useCallback, useState } from 'react';

const SAVED_KEY = 'inyalink.savedPros';

function readSaved(): Set<string> {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((v): v is string => typeof v === 'string')
        : [],
    );
  } catch {
    return new Set();
  }
}

/** Heart-save state for directory rows, persisted locally per device. */
export function useSavedPros(): {
  saved: Set<string>;
  toggleSaved: (id: string) => void;
} {
  const [saved, setSaved] = useState<Set<string>>(readSaved);

  const toggleSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
      } catch {
        /* storage full or blocked — state still updates for this session */
      }
      return next;
    });
  }, []);

  return { saved, toggleSaved };
}

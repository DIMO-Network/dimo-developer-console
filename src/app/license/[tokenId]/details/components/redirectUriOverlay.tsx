'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { OVERLAY_MS, applyToggles, type ValueToggle } from '@/utils/identityOverlay';

interface Overlay {
  toggles: ValueToggle[];
  recordUriChange: (uri: string, enabled: boolean) => void;
}

const RedirectUriOverlayContext = createContext<Overlay | null>(null);

// Identity lists redirect URIs seconds after the chain, so a URI this page just
// added or removed stays that way for a minute whatever a refetch returns.
export const RedirectUriOverlayProvider = ({
  refetch,
  children,
}: PropsWithChildren<{ refetch: () => Promise<void> }>) => {
  const [toggles, setToggles] = useState<ValueToggle[]>([]);

  const recordUriChange = useCallback(
    (uri: string, enabled: boolean) => {
      setToggles((prev) => [...prev, { value: uri, enabled, at: Date.now() }]);
      void refetch().catch(() => {});
    },
    [refetch],
  );

  // Re-render when the oldest live change expires so it stops applying.
  useEffect(() => {
    if (!toggles.length) return;
    const oldest = Math.min(...toggles.map((t) => t.at));
    const timer = setTimeout(
      () => {
        const now = Date.now();
        setToggles((prev) => prev.filter((t) => now - t.at < OVERLAY_MS));
      },
      Math.max(0, oldest + OVERLAY_MS - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [toggles]);

  const value = useMemo(() => ({ toggles, recordUriChange }), [toggles, recordUriChange]);

  return (
    <RedirectUriOverlayContext.Provider value={value}>
      {children}
    </RedirectUriOverlayContext.Provider>
  );
};

const noop = () => {};

export const useRedirectUris = (indexed: { uri: string }[]) => {
  const overlay = useContext(RedirectUriOverlayContext);
  const toggles = overlay?.toggles;
  const uris = useMemo(() => {
    if (!toggles?.length) return indexed;
    const merged = applyToggles(
      indexed.map((n) => n.uri),
      toggles,
      Date.now(),
    );
    return merged.map((uri) => ({ uri }));
  }, [indexed, toggles]);
  return { uris, recordUriChange: overlay?.recordUriChange ?? noop };
};

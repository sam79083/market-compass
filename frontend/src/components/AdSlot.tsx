import { useEffect, useRef } from "react";

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const client = clean(import.meta.env.VITE_ADSENSE_CLIENT);
// Each placement can use its own ad unit; VITE_ADSENSE_SLOT is the shared fallback.
const fallbackSlot = clean(import.meta.env.VITE_ADSENSE_SLOT);
const slots = {
  mid: clean(import.meta.env.VITE_ADSENSE_SLOT_MID) || fallbackSlot,
  bottom: clean(import.meta.env.VITE_ADSENSE_SLOT_BOTTOM) || fallbackSlot,
};

export type AdPlacement = keyof typeof slots;

const SCRIPT_ID = "market-compass-adsense";

function ensureAdSenseScript(publisherId: string) {
  if (document.getElementById(SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
  document.head.appendChild(script);
}

/**
 * An in-flow ad block. It sits between page sections and takes its own space,
 * so it never overlays content. It renders nothing until AdSense is configured.
 */
export function AdSlot({ placement = "bottom" }: { placement?: AdPlacement }) {
  const pushed = useRef(false);
  const slot = slots[placement];
  const configured = /^ca-pub-\d+$/.test(client) && /^\d+$/.test(slot);

  useEffect(() => {
    if (!configured || pushed.current) return;
    ensureAdSenseScript(client);
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // The AdSense script will process the slot when it finishes loading.
    }
  }, [configured]);

  if (!configured) return null;

  return (
    <aside className={`ad-slot ad-slot--${placement}`} aria-label="Advertisement">
      <span className="ad-label">Advertisement</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}

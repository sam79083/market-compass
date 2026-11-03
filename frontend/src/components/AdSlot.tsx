import { useEffect, useRef } from "react";

const client = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined)?.trim() ?? "";
const slot = (import.meta.env.VITE_ADSENSE_SLOT as string | undefined)?.trim() ?? "";
const configured = /^ca-pub-\d+$/.test(client) && /^\d+$/.test(slot);
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

export function AdSlot() {
  const pushed = useRef(false);

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
  }, []);

  if (!configured) return null;

  return (
    <aside className="ad-slot" aria-label="Advertisement">
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

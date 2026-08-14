"use client";

import { useEffect, useState } from "react";

/**
 * Detects WhatsApp's in-app browser and tries to redirect to the
 * external browser. On Android, this auto-opens Chrome via an
 * intent:// URL. On iOS, WhatsApp uses a restricted WKWebView that
 * blocks all auto-open mechanisms, so we show a minimal banner with
 * a tap-to-open link instead.
 */
export default function InAppBrowserRedirect() {
  const [showIOSBanner, setShowIOSBanner] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;

    // Check if we're inside WhatsApp's in-app browser
    const isWhatsApp = /WhatsApp/i.test(ua);

    if (!isWhatsApp) return;

    // iOS: WKWebView blocks window.open and intent:// URLs.
    // No way to auto-open Safari. Show a banner with a tap-to-open link.
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    if (isIOS) {
      setShowIOSBanner(true);
      return;
    }

    // Android: redirect to Chrome via intent:// URL.
    // This forces the page to open in Chrome instead of WhatsApp's WebView.
    const currentUrl = window.location.href;
    const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;

    // Small delay so the page has a chance to register the redirect
    window.location.href = intentUrl;
  }, []);

  if (!showIOSBanner) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#4f46e5",
        color: "white",
        padding: "12px 16px",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <span>
        Para mejor experiencia, abre en Safari.
      </span>
      <a
        href={typeof window !== "undefined" ? window.location.href : "/"}
        style={{
          background: "white",
          color: "#4f46e5",
          borderRadius: "6px",
          padding: "4px 12px",
          fontWeight: 600,
          textDecoration: "none",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Abrir
      </a>
    </div>
  );
}

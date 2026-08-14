"use client";

import { useEffect, useState } from "react";

/**
 * Detects in-app browsers that throttle requestAnimationFrame or have
 * other limitations that break the karaoke highlight. Redirects Android
 * users to Chrome via an intent:// URL. Shows a tap-to-open banner on
 * iOS (where auto-open is blocked by WKWebView).
 *
 * Known problematic browsers:
 * - WhatsApp in-app browser (restricted WebView on both platforms)
 * - Samsung Internet Browser (throttles RAF during audio playback)
 * - Facebook / Instagram in-app browsers (restricted WebViews)
 *
 * Browsers that work fine (no redirect):
 * - Chrome (Android + desktop)
 * - Safari (iOS + desktop)
 * - Firefox, Edge, etc.
 */
export default function InAppBrowserRedirect() {
  const [showIOSBanner, setShowIOSBanner] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;

    // Browsers that have issues with the karaoke highlight
    const isWhatsApp = /WhatsApp/i.test(ua);
    const isSamsungBrowser = /SamsungBrowser/i.test(ua);
    const isFacebook = /FBAN|FBAV/i.test(ua);
    const isInstagram = /Instagram/i.test(ua);

    const needsRedirect = isWhatsApp || isSamsungBrowser || isFacebook || isInstagram;

    if (!needsRedirect) return;

    // iOS: WKWebView blocks window.open and intent:// URLs.
    // No way to auto-open Safari. Show a banner with a tap-to-open link.
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    if (isIOS) {
      setShowIOSBanner(true);
      return;
    }

    // Android: redirect to Chrome via intent:// URL.
    const currentUrl = window.location.href;
    const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;

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

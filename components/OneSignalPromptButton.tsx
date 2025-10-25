"use client";
import { useEffect, useState } from "react";
import { loadOneSignal } from "../lib/onesignal";

export default function OneSignalPromptButton() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function checkReady() {
      try {
        await loadOneSignal();
        if (!cancelled && window.OneSignal && window.OneSignal.showSlidedownPrompt) {
          setReady(true);
        } else if (!cancelled) {
          setError("OneSignal loaded but prompt not available.");
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load OneSignal");
      }
    }
    checkReady();
    return () => { cancelled = true; };
  }, []);


  const handleClick = () => {
    if (window.OneSignal && window.OneSignal.showSlidedownPrompt) {
      console.log('[OneSignalPromptButton] showSlidedownPrompt available, calling...');
      window.OneSignal.showSlidedownPrompt();
    } else {
      setError("Push prompt not available. See console for OneSignal state.");
      // Log the OneSignal object for debugging
      console.log('[OneSignalPromptButton] OneSignal object:', window.OneSignal);
      if (window.OneSignal) {
        console.log('[OneSignalPromptButton] OneSignal keys:', Object.keys(window.OneSignal));
      }
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={!ready}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          background: ready ? "#2563eb" : "#ccc",
          color: "#fff",
          border: "none",
          cursor: ready ? "pointer" : "not-allowed",
          margin: 8,
        }}
      >
        Enable Push Notifications
      </button>
      {error && <div style={{ color: "#b91c1c", marginTop: 8 }}>{error}</div>}
      {/* Diagnostic: show OneSignal keys if error */}
      {error && window.OneSignal && (
        <pre style={{ color: '#444', background: '#eee', fontSize: 12, marginTop: 8, padding: 8 }}>
          {JSON.stringify(Object.keys(window.OneSignal), null, 2)}
        </pre>
      )}
    </div>
  );
}

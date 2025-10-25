"use client";
declare global {
  interface Window {
    OneSignal?: Record<string, unknown>;
  }
}
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
      } catch {
        if (!cancelled) setError("Failed to load OneSignal");
      }
    }
    checkReady();
    return () => { cancelled = true; };
  }, []);


  const handleClick = () => {
    if (window.OneSignal && typeof window.OneSignal.showSlidedownPrompt === 'function') {
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
        className={`px-4 py-2 rounded-lg font-semibold text-white ${ready ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'} my-2 border-none`}
      >
        Enable Push Notifications
      </button>
      {error && <div className="text-red-700 mt-2">{error}</div>}
      {/* Diagnostic: show OneSignal keys if error */}
      {error && window.OneSignal && (
        <pre className="text-gray-700 bg-gray-100 text-xs mt-2 p-2 rounded">{JSON.stringify(Object.keys(window.OneSignal), null, 2)}</pre>
      )}
    </div>
  );
}

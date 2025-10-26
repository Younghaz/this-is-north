export function loadOneSignal(): void {
  if (typeof window === 'undefined') return;
  type OneSignalType = {
  _initCalled?: boolean;
  push?: (...args: unknown[]) => void;
  init?: (config: Record<string, unknown>) => Promise<void>;
  };
  const win = window as Window & typeof globalThis & {
    OneSignal?: OneSignalType;
    _initCalled?: boolean;
    __oneSignalScriptLoading?: boolean;
  };
  if (win.OneSignal && win.OneSignal._initCalled) return;
  if (document.getElementById('onesignal-sdk')) return;
  if (win.__oneSignalScriptLoading) return;
  win.__oneSignalScriptLoading = true;
  console.log('[OneSignal] loadOneSignal called');
  const script = document.createElement('script');
  script.id = 'onesignal-sdk';
  script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
  script.async = true;
  script.onload = () => {
    win.OneSignal = win.OneSignal || {};
    if (typeof win.OneSignal.push === 'function') {
      win.OneSignal.push(async function() {
        if (!win.OneSignal) return;
        if (win.OneSignal._initCalled) return;
        win.OneSignal._initCalled = true;
        if (typeof win.OneSignal.init === 'function') {
          await win.OneSignal.init({
            appId: "6041dfc7-ee6c-40a8-bc50-6f12eaf119d6",
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: true },
          });
        }
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.register('/OneSignalSDKWorker.js');
            console.log('[OneSignal] Service worker registered:', reg.scope);
          } catch (err) {
            console.error('[OneSignal] Service worker registration failed:', err);
          }
        }
      });
    }
  };
  script.onerror = (e) => {
    console.error('[OneSignal] Failed to load SDK', e);
  };
  document.head.appendChild(script);
}

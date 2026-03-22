import { useState, useCallback } from "preact/hooks";
import * as m from "@/paraglide/messages";

const styles = {
  consentBar:
    "fixed inset-x-0 bottom-0 z-40 bg-gray-900/95 backdrop-blur text-white text-sm px-4 py-3 flex items-center justify-between gap-3 dark:bg-gray-800/95",
  consentText: "flex-1 min-w-0",
  consentLink: "underline text-blue-300 transition-colors hover:text-blue-200",
  consentButton:
    "shrink-0 px-3 py-1.5 bg-blue-600 rounded-md text-xs font-semibold text-white transition-colors cursor-pointer hover:bg-blue-700",
};

interface ConsentBannerClientProps {
  onShowPrivacy: () => void;
  onShowTerms: () => void;
}

export function ConsentBannerClient({ onShowPrivacy, onShowTerms }: ConsentBannerClientProps) {
  const [consentDismissed, setConsentDismissed] = useState(() => {
    // Only access localStorage on client side
    if (typeof window === "undefined") return false;
    return localStorage.getItem("consent-dismissed") === "1";
  });

  const dismissConsent = useCallback(() => {
    setConsentDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("consent-dismissed", "1");
    }
  }, []);

  if (consentDismissed) return null;

  return (
    <div class={styles.consentBar}>
      <p class={styles.consentText}>
        {m.by_using_this_app_you_agree_to_our()}{" "}
        <button
          type="button"
          onClick={onShowPrivacy}
          class={styles.consentLink}
        >
          {m.privacy_policy()}
        </button>{" "}
        {m.and()}{" "}
        <button
          type="button"
          onClick={onShowTerms}
          class={styles.consentLink}
        >
          {m.terms_of_service()}
        </button>
      </p>
      <button
        type="button"
        onClick={dismissConsent}
        class={styles.consentButton}
      >
        {m.consent_ok()}
      </button>
    </div>
  );
}

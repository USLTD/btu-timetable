import { useState, useEffect } from "preact/hooks";
import { ArrowUp } from "lucide-preact";
import * as m from "@/paraglide/messages";

const styles = {
  button:
    "fixed right-6 bottom-6 z-30 p-3 rounded-full bg-blue-600 text-white shadow-lg transition-all cursor-pointer hover:bg-blue-700 scroll-top-anim",
  icon: "w-5 h-5",
};

export function ScrollTopClient() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (!showScrollTop) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      class={styles.button}
      aria-label={m.scroll_to_top()}
    >
      <ArrowUp class={styles.icon} />
    </button>
  );
}

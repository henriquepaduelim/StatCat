import { useEffect, useMemo, useState } from "react";

const SCROLL_THRESHOLD = 400;

type BackToTopButtonProps = {
  /**
   * Optional CSS selector; when present, the button will attach to the latest visible match (e.g., modal content).
   */
  targetSelector?: string;
  /**
   * Fallback to window scroll when no target is available (default: true).
   */
  fallbackToWindow?: boolean;
  mobileOnly?: boolean;
  className?: string;
};

const BackToTopButton = ({
  targetSelector,
  fallbackToWindow = true,
  mobileOnly = false,
  className = "",
}: BackToTopButtonProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const hasTarget = targetSelector ? target !== null : true;

  const resolveTarget = useMemo(() => {
    if (!targetSelector || typeof document === "undefined") {
      return () => null;
    }
    return () => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(targetSelector),
      ).filter((el) => el.offsetParent !== null);
      return candidates.length ? candidates[candidates.length - 1] : null;
    };
  }, [targetSelector]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextTarget = resolveTarget();
    setTarget(nextTarget);
    if (!targetSelector) {
      return undefined;
    }
    const observer = new MutationObserver(() => {
      setTarget(resolveTarget());
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [resolveTarget, targetSelector]);

  useEffect(() => {
    const getScrollTop = () => {
      if (typeof window === "undefined") return 0;
      return target ? target.scrollTop : window.scrollY;
    };

    const handleScroll = () => {
      setIsVisible(getScrollTop() > SCROLL_THRESHOLD);
    };

    // Without a target or fallback, do not render or attach scroll listeners.
    if (targetSelector && !target && !fallbackToWindow) {
      setIsVisible(false);
      return;
    }

    handleScroll();
    if (target && target.addEventListener) {
      target.addEventListener("scroll", handleScroll, { passive: true });
    } else if (fallbackToWindow && typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }
    return () => {
      if (target && target.removeEventListener) {
        target.removeEventListener("scroll", handleScroll);
      } else if (fallbackToWindow && typeof window !== "undefined") {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, [target, fallbackToWindow, targetSelector]);

  if (!hasTarget || !isVisible) {
    return null;
  }

  const positionClass = "fixed bottom-6 right-4";
  const responsiveClass = mobileOnly ? "md:hidden" : "";

  return (
    <button
      type="button"
      onClick={() => {
        if (target) {
          target.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        if (fallbackToWindow) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
      className={`${positionClass} ${responsiveClass} z-50 inline-flex h-11 w-11 items-center justify-center rounded-full bg-action-primary text-action-primary-foreground shadow-lg transition hover:translate-y-[-2px] hover:bg-action-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 ${className}`}
      aria-label="Back to top"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-5 w-5"
      >
        <path d="M12 19V5m0 0-6 6m6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
};

export default BackToTopButton;

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useLocale, useTranslation } from "../i18n/useTranslation";

const videoSource = "/media/hero-tech.mp4";
const posterSource = "/media/hero-tech-poster.jpg";

const Home = () => {
  const t = useTranslation();
  const [locale, setLocale] = useLocale();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => setIsVideoReady(true);
    video.addEventListener("loadeddata", handleLoaded);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!video) return;
          if (entry.isIntersecting) {
            video.play().catch(() => undefined);
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.55 }
    );

    observer.observe(video);

    return () => {
      video.removeEventListener("loadeddata", handleLoaded);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[360px] w-[360px] rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <header className="border-b border-white/5 bg-surface/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <span className="text-xl font-semibold text-primary">{t.common.appName}</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted">
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`rounded-md px-2 py-1 transition-colors ${
                  locale === "en"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "border border-black/10 text-muted hover:border-primary/40 hover:text-primary"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("fr")}
                className={`rounded-md px-2 py-1 transition-colors ${
                  locale === "fr"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "border border-black/10 text-muted hover:border-primary/40 hover:text-primary"
                }`}
              >
                FR
              </button>
            </div>
            <Link
              to="/login"
              className="rounded-md border border-primary/60 px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:text-on-primary hover:bg-primary"
            >
              {t.common.customerArea}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-24 px-6 pb-24 pt-16">
        <section className="grid gap-12 lg:grid-cols-[1.15fr,1fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {t.common.heroBadge}
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-on-surface md:text-5xl">
              {t.home.heroTitle}
            </h1>
            <p className="max-w-xl text-lg text-muted">{t.home.heroDescription}</p>
            <ul className="space-y-3 text-sm text-muted">
              {t.home.heroBullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-xl shadow-primary/30 transition hover:translate-y-[-1px]"
              >
                {t.home.ctaPrimary}
              </Link>
              <a
                href="#features"
                className="rounded-md border border-black/10 px-6 py-3 text-sm font-semibold text-muted transition hover:border-primary hover:text-primary"
              >
                {t.home.ctaSecondary}
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -translate-y-6 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-surface/70 p-6 shadow-[0_40px_80px_-40px_rgba(15,23,42,1)]">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary/80">
                {t.home.highlightTitle}
              </p>
              <p className="mt-4 text-base text-muted">{t.home.highlightDescription}</p>
              <div className="mt-6 space-y-2 text-xs text-muted">
                <p className="font-semibold text-on-surface">{t.home.highlightFooter}</p>
                <p>PDF + Link</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3" aria-label="key metrics">
          {t.home.stats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/5 bg-surface/60 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,1)] backdrop-blur"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</p>
              <p className="mt-4 text-3xl font-semibold text-primary">{item.value}</p>
              <p className="mt-2 text-sm text-muted">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-10 lg:grid-cols-[0.9fr,1.1fr] lg:items-center" id="demo">
          <div className="space-y-5">
            <h2 className="text-3xl font-semibold text-on-surface">{t.home.videoTitle}</h2>
            <p className="text-sm text-muted">{t.home.videoDescription}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="rounded-md border border-primary/60 px-5 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:text-on-primary hover:bg-primary"
              >
                {t.home.videoCTA}
              </Link>
              <span className="text-xs text-muted">{t.home.videoCaption}</span>
            </div>
          </div>
          <div className="relative h-[520px]">
            <div className="sticky top-28">
              <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-black/80 shadow-[0_45px_90px_-45px_rgba(15,23,42,1)]">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  poster={posterSource}
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  controls
                >
                  <source src={videoSource} type="video/mp4" />
                </video>
                {!isVideoReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/70 px-6 text-center text-xs text-muted backdrop-blur">
                    <span>{t.home.videoCaption}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6" aria-label="quick info">
          <h2 className="text-2xl font-semibold text-on-surface">{t.home.quickInfoTitle}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {t.home.quickInfo.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/5 bg-surface/70 p-6 shadow-sm backdrop-blur">
                <h3 className="text-lg font-semibold text-on-surface">{item.title}</h3>
                <p className="mt-3 text-sm text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="space-y-4">
          <div>
            <h2 className="text-3xl font-semibold text-on-surface">{t.home.featuresTitle}</h2>
            <p className="text-sm text-muted">{t.home.featuresSubtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {t.home.features.map((feature) => (
              <div key={feature.title} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-surface/70 p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,1)] backdrop-blur">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <h3 className="text-lg font-semibold text-on-surface">{feature.title}</h3>
                <p className="mt-3 text-sm text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-surface/70 py-6 text-center text-xs text-muted backdrop-blur">
        © {new Date().getFullYear()} {t.common.appName} — {t.home.footer}
      </footer>
    </div>
  );
};

export default Home;

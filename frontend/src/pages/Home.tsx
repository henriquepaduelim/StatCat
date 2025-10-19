import { useState } from "react";
import { Link } from "react-router-dom";

import { useTranslation } from "../i18n/useTranslation";

const videoSource = "/media/hero-tech.mp4";
const posterSource = "/media/hero-tech-poster.jpg";

const Home = () => {
  const t = useTranslation();
  const [isVideoReady, setIsVideoReady] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 -left-36 h-[50rem] w-[50rem] rounded-full bg-[rgb(255,255,255)] blur-[150px]" />
        <div className="absolute top-[-12%] right-[-20%] h-[28rem] w-[28rem] rounded-full bg-[rgb(255,255,255)] blur-[180px]" />
        <div className="absolute bottom-[-34%] left-1/4 h-[30rem] w-[30rem] rounded-full bg-[rgb(255,100,100)] blur-[200px]" />
        <div className="absolute top-[35%] left-[8%] h-[18rem] w-[18rem] rounded-full bg-[rgb(78,62,253)] blur-[160px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(255,2,221)] to-transparent" />
      </div>

      <header className="bg-container-gradient backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-10">
          <img src="/media/logo.png" alt="Logo" className="max-h-12 w-auto" />
          <Link
            to="/login"
            className="rounded-md border border-action-primary/60 px-4 py-2 text-sm font-semibold text-accent shadow-sm transition hover:border-action-primary hover:text-action-primary-foreground hover:bg-action-primary"
          >
            {t.common.customerArea}
          </Link>
        </div>
      </header>

      <div className="relative w-full overflow-hidden">
        <video
          className="h-[60vh] w-full object-cover"
          poster={posterSource}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          onLoadedData={() => setIsVideoReady(true)}
        >
          <source src={videoSource} type="video/mp4" />
        </video>
        {!isVideoReady && (
          <div className="absolute inset-0 flex items-center bg-container-gradient text-center text-xs text-muted backdrop-blur">
            <span>{t.home.videoCaption}</span>
          </div>
        )}
      </div>

      <main className="mx-auto max-w-6xl space-y-24 px-6 pb-24 pt-16">
        <section className="grid gap-12 lg:grid-cols-[1.15fr,1fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/40 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-accent shadow-sm">
              {t.common.heroBadge}
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-container-foreground md:text-5xl">
              {t.home.heroTitle}
            </h1>
            <p className="max-w-xl text-lg text-muted">{t.home.heroDescription}</p>
            <ul className="space-y-3 text-sm text-muted">
              {t.home.heroBullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#339989] via-[#7de2d1] to-[#fffafb] text-[10px] font-semibold text-[#131515] shadow-sm">
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
              
              <Link
                to="/login"
                className="rounded-md bg-action-primary px-6 py-3 text-sm font-semibold text-action-primary-foreground shadow-xl shadow-action-primary/30 transition hover:translate-y-[-1px]"
              >
                {t.home.ctaPrimary}
              </Link>
              <a
                href="#features"
                className="rounded-md border border-black/10 px-6 py-3 text-sm font-semibold text-muted transition hover:border-action-primary hover:text-accent"
              >
                {t.home.ctaSecondary}
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -translate-y-6 rounded-3xl bg-gradient-to-br from-[#339989]/40 via-[#7de2d1]/25 to-transparent blur-[140px]" />
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/70 p-6 shadow-[0_40px_80px_-40px_rgba(51,153,137,0.6)] backdrop-blur">
              <div className="absolute inset-0 bg-gradient-to-br from-[#339989]/60 via-[#7de2d1]/40 to-transparent opacity-30" />
              <div className="relative space-y-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#1d2f6f]">
                  {t.home.highlightTitle}
                </p>
                <p className="text-base text-muted">{t.home.highlightDescription}</p>
                <div className="space-y-2 text-xs text-muted">
                  <p className="font-semibold text-container-foreground">{t.home.highlightFooter}</p>
                  <p>PDF + Link</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3" aria-label="key metrics">
          {t.home.stats.map((item) => (
            <div
              key={item.label}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/70 p-6 shadow-[0_25px_60px_-35px_rgba(51,153,137,0.6)] backdrop-blur transition-shadow hover:shadow-[0_30px_70px_-40px_rgba(51,153,137,0.7)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#339989]/18 via-[#7de2d1]/12 to-[#fffafb]/18 opacity-0 transition-opacity duration-300 hover:opacity-100" />
              <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</p>
              <p className="mt-4 text-3xl font-semibold text-accent">{item.value}</p>
              <p className="mt-2 text-sm text-muted">{item.description}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-6" aria-label="quick info">
          <h2 className="text-2xl font-semibold text-container-foreground">{t.home.quickInfoTitle}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {t.home.quickInfo.map((item) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/70 p-6 shadow-[0_30px_70px_-50px_rgba(51,153,137,0.55)] backdrop-blur"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#339989]/18 via-[#7de2d1]/12 to-[#fffafb]/18 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative space-y-3">
                  <h3 className="text-lg font-semibold text-container-foreground">{item.title}</h3>
                  <p className="text-sm text-muted">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="space-y-4">
          <div>
            <h2 className="text-3xl font-semibold text-container-foreground">{t.home.featuresTitle}</h2>
            <p className="text-sm text-muted">{t.home.featuresSubtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {t.home.features.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/70 p-6 shadow-[0_30px_80px_-45px_rgba(51,153,137,0.55)] backdrop-blur"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#339989]/18 via-[#7de2d1]/12 to-[#fffafb]/18 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <h3 className="relative text-lg font-semibold text-container-foreground">{feature.title}</h3>
                <p className="relative mt-3 text-sm text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-container-gradient py-6 text-center text-xs text-muted backdrop-blur">
        © {new Date().getFullYear()} {t.common.appName} — {t.home.footer}
      </footer>
    </div>
  );
};

export default Home;

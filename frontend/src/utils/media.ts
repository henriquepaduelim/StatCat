const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const mediaBase = import.meta.env.VITE_MEDIA_BASE_URL;

// Garante URL absoluta; para assets locais em /media usa o host do front.
export const getMediaUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  // Arquivos estáticos no diretório public (/media/...) devem sair pelo host do front
  if (url.startsWith("/media/")) {
    const frontOrigin =
      mediaBase?.replace(/\/$/, "") ||
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${frontOrigin}${url}`;
  }

  const base = (mediaBase || apiBase).replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

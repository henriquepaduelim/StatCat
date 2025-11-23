const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Ensure media URLs are absolute; backend may return relative paths like "/media/athletes/..."
export const getMediaUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
};

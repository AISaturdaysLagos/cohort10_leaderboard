/** Wikimedia production thumbnail widths — https://w.wiki/GHai */
export const WIKI_THUMB_WIDTHS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840] as const;

const DEFAULT_HERO_WIDTH = 960;

function nearestStandardWidth(requested: number): number {
  for (const w of WIKI_THUMB_WIDTHS) {
    if (w >= requested) return w;
  }
  return WIKI_THUMB_WIDTHS[WIKI_THUMB_WIDTHS.length - 1];
}

/** Fix hotlinked Commons /thumb/ URLs to use an allowed width (800px etc. return HTTP 400). */
export function normalizeWikiImageUrl(url: string, preferredWidth = DEFAULT_HERO_WIDTH): string {
  const t = url.trim();
  if (!t.includes("upload.wikimedia.org") || !t.includes("/thumb/")) return t;

  const widthMatch = t.match(/\/(\d+)px-/);
  if (!widthMatch) return t;

  const current = Number(widthMatch[1]);
  const target = WIKI_THUMB_WIDTHS.includes(current as (typeof WIKI_THUMB_WIDTHS)[number])
    ? current
    : nearestStandardWidth(preferredWidth);

  if (current === target) return t;
  return t.replace(/\/(\d+)px-/, `/${target}px-`);
}

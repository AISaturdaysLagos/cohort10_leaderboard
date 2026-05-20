/** Resolve a file under `public/` for the current Vite base (GitHub Pages subdirectory or `/`). */
export function publicAsset(path: string): string {
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${clean}`;
}

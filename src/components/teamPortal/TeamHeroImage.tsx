import { useEffect, useState } from "react";
import type { TeamDescription } from "../../types";
import { normalizeWikiImageUrl } from "../../lib/wikiImageUrl";

const CATEGORY_GRADIENT: Record<string, string> = {
  "National Park": "from-emerald-800/90 via-emerald-600/70 to-lime-700/60",
  Lake: "from-sky-800/90 via-blue-600/70 to-cyan-600/60",
  River: "from-teal-800/90 via-cyan-700/70 to-blue-600/60",
  Mountain: "from-stone-700/90 via-slate-600/70 to-zinc-500/60",
  Volcano: "from-orange-900/90 via-red-700/70 to-amber-700/60",
  Desert: "from-amber-800/90 via-orange-700/70 to-yellow-700/60",
  Tree: "from-green-900/90 via-emerald-700/70 to-lime-800/60",
};

type TeamHeroImageProps = {
  teamName: string;
  description: TeamDescription | null;
};

function HeroGradient({
  teamName,
  category,
  alt,
  gradient,
}: {
  teamName: string;
  category: string;
  alt: string;
  gradient: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-tri border border-tri-border bg-gradient-to-br ${gradient} shadow-card`}
      role="img"
      aria-label={alt}
    >
      <div className="aspect-[21/9] w-full min-h-[10rem] sm:min-h-[12rem]" />
      <div className="absolute inset-0 flex flex-col justify-end px-4 py-4">
        <p className="font-display text-lg font-bold text-white drop-shadow sm:text-xl">{teamName}</p>
        {category ? (
          <p className="mt-0.5 font-body text-xs font-semibold uppercase tracking-wide text-white/85">
            {category}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TeamHeroImage({ teamName, description }: TeamHeroImageProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const category = description?.category ?? "";
  const gradient = CATEGORY_GRADIENT[category] ?? "from-tri-forest/90 via-tri-leaf/70 to-tri-orange/50";
  const alt = description?.overview
    ? `${teamName} — ${description.overview.slice(0, 120)}`
    : `${teamName} team landmark`;

  useEffect(() => {
    setImageFailed(false);
  }, [description?.imageUrl]);

  if (description?.imageUrl && !imageFailed) {
    const imageSrc = normalizeWikiImageUrl(description.imageUrl);
    return (
      <figure className="overflow-hidden rounded-tri border border-tri-border bg-tri-mist shadow-card">
        <div className="relative aspect-[21/9] w-full min-h-[10rem] sm:min-h-[12rem]">
          <img
            src={imageSrc}
            alt={alt}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <figcaption className="absolute bottom-0 left-0 right-0 px-4 py-3">
            <p className="font-display text-lg font-bold text-white drop-shadow-sm sm:text-xl">{teamName}</p>
            {category ? (
              <p className="mt-0.5 font-body text-xs font-semibold uppercase tracking-wide text-white/85">
                {category}
              </p>
            ) : null}
          </figcaption>
        </div>
        {description.imageSource ? (
          <p className="border-t border-tri-border px-3 py-2 font-body text-[10px] text-tri-faint">
            Photo: {description.imageSource}
          </p>
        ) : null}
      </figure>
    );
  }

  return <HeroGradient teamName={teamName} category={category} alt={alt} gradient={gradient} />;
}

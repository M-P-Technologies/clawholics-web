import { ChevronLeft,ChevronRight } from "lucide-react";
import { useEffect,useRef,useState } from "react";
import Bow from "../../assets/bow.svg";
import type { Nailist } from "../../types";
import Button from "../ui/Button";

const ROUND_BUTTON =
  "flex h-10 w-10 items-center justify-center rounded-full border border-crimson-light bg-light-orange text-crimson shadow-md shadow-crimson/20 transition-colors hover:bg-crimson hover:text-light-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson";

// One artist at a time: portrait on one side, their details on the other. Arrows, dots
// and swiping move between artists; the old one fades out and the next fades in.
export default function ArtistSpotlight({ artists }: { artists: Nailist[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!artists.length) return null;

  const count = artists.length;
  const artist = artists[index % count] ?? artists[0];

  const show = (target: number) => {
    const next = ((target % count) + count) % count;
    if (!visible || next === index) return;
    setVisible(false);
    timer.current = setTimeout(() => {
      setIndex(next);
      setVisible(true);
    }, 200);
  };

  const fade = `transition-opacity duration-200 ease-in-out motion-reduce:transition-none ${
    visible ? "opacity-100" : "opacity-0"
  }`;

  return (
    <div
      className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16"
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        touchStartX.current = null;
        if (Math.abs(diff) > 50) show(index + (diff > 0 ? 1 : -1));
      }}
    >
      <div className={`relative mx-auto w-full max-w-sm lg:max-w-md ${fade}`}>
        <Bow
          aria-hidden="true"
          focusable="false"
          className="absolute -left-8 -top-4 z-10 h-20 w-20 -rotate-12 text-crimson drop-shadow-md"
        />
        <div className="aspect-3/4 overflow-hidden rounded-sm border border-crimson-light/80 bg-light-orange p-2 shadow-xl shadow-crimson/10">
          <img
            src={artist.image}
            alt={`${artist.name}, ${artist.position}`}
            className="h-full w-full rounded-sm object-cover"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 md:gap-8">
        <div className={`flex flex-col gap-4 md:gap-8 lg:min-h-72 ${fade}`}>
          <p className="text-sm text-gray-red/80">The Artist</p>
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-3xl font-normal uppercase tracking-widest text-gray-red md:text-5xl">
              {artist.name}
            </h3>
            <p className="text-sm font-bold text-crimson">{artist.position}</p>
          </div>
          <p className="whitespace-pre-line text-base md:text-lg leading-relaxed text-gray-red/80">
            {artist.bio}
          </p>
          {artist.specialty && (
            <p className="whitespace-pre-line text-base leading-relaxed text-gray-red/80">
              <span className="font-bold text-gray-red">Specialties: </span>
              {artist.specialty}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {count > 1 && (
            <>
              <Button variant="bare" type="button" aria-label="Previous artist" onClick={() => show(index - 1)} className={ROUND_BUTTON}>
                <ChevronLeft size={20} aria-hidden="true" />
              </Button>
              <div className="flex items-center gap-2">
                {artists.map((a, i) => (
                  <Button
                    variant="bare"
                    key={a.id}
                    type="button"
                    aria-label={`Show ${a.name}`}
                    aria-current={i === index}
                    onClick={() => show(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === index ? "w-6 bg-crimson" : "w-2 bg-crimson-light hover:bg-crimson"
                    }`}
                  />
                ))}
              </div>
              <Button variant="bare" type="button" aria-label="Next artist" onClick={() => show(index + 1)} className={ROUND_BUTTON}>
                <ChevronRight size={20} aria-hidden="true" />
              </Button>
            </>
          )}
          <Button to="/artists" aria-label="Meet all of our artists" className="sm:ml-auto">
            Meet the team
          </Button>
        </div>
      </div>
    </div>
  );
}

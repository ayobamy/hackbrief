import { dateTile } from "@/lib/events/format";

/** A small calendar leaf for an event's start date: the month over the day, or TBA. */
export function DateTile({ startsOn, className = "" }: { startsOn: string | null; className?: string }) {
  const tile = dateTile(startsOn);
  return (
    <span
      className={`flex w-12 shrink-0 flex-col items-center border border-line bg-paper py-1.5 leading-none ${className}`}
      aria-hidden="true"
    >
      <span className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">{tile?.month ?? "TBA"}</span>
      <span className="pt-1 font-serif text-xl tabular-nums">{tile?.day ?? "–"}</span>
    </span>
  );
}

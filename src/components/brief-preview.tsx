import { buildBrief } from "@/lib/coach/brief";
import { formatAmount, formatDate, formatSolo, formatTeamSize } from "@/lib/coach/format";
import { SAMPLES } from "@/lib/coach/samples";

const LABEL = "font-mono text-[11px] uppercase tracking-[0.14em] text-muted";

// Built once, at build time, from the fictional Harbour Light sample: every figure on the card is
// the coach's own output, not a mock-up. Nothing here depends on today's date.
const SAMPLE = SAMPLES.find((sample) => sample.id === "harbour") ?? SAMPLES[0];
const brief = SAMPLE ? buildBrief(SAMPLE.text, "2026-11-02") : null;

/** A real brief from the coach, shown on the landing page as the product itself. */
export function BriefPreview() {
  if (!brief || !SAMPLE) {
    return null;
  }
  const { deadline, team, topPrizes, strategy, checklist } = brief;
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-ink/10 dark:shadow-none">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <span className={LABEL}>Brief · {SAMPLE.name}</span>
        <span className={`${LABEL} hidden sm:inline`}>Sample rules</span>
      </div>

      <dl className="grid grid-cols-3 border-b border-line">
        <div className="flex flex-col gap-1 border-r border-line px-5 py-4">
          <dt className={LABEL}>Deadline</dt>
          <dd className="text-sm font-medium">{deadline ? formatDate(deadline.date) : "Not found"}</dd>
          {deadline?.time ? <dd className="text-xs text-muted">{deadline.time}</dd> : null}
        </div>
        <div className="flex flex-col gap-1 border-r border-line px-5 py-4">
          <dt className={LABEL}>Team</dt>
          <dd className="text-sm font-medium">{team ? formatTeamSize(team) : "Not stated"}</dd>
          {team ? <dd className="text-xs text-muted">{formatSolo(team)}</dd> : null}
        </div>
        <div className="flex flex-col gap-1 px-5 py-4">
          <dt className={LABEL}>Top prize</dt>
          <dd className="text-sm font-medium">{topPrizes[0] ? formatAmount(topPrizes[0]) : "Not stated"}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3 border-b border-line px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className={LABEL}>Where the points are</span>
          <span className={`${LABEL} hidden sm:inline`}>Computed in code</span>
        </div>
        <ul className="flex flex-col gap-3">
          {strategy.map((note) => (
            <li key={note.criterion} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{note.criterion}</span>
                <span className="font-mono tabular-nums">{note.weight}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-line" aria-hidden="true">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: `${note.weight}%` }} />
              </div>
            </li>
          ))}
        </ul>
        {strategy[0] ? <p className="text-xs leading-5 text-muted">{strategy[0].text}</p> : null}
      </div>

      <div className="flex flex-col gap-2 px-5 py-4">
        <span className={LABEL}>To hand in</span>
        <ul className="flex flex-col gap-1.5">
          {checklist.slice(0, 4).map((item) => (
            <li key={item.id} className="flex items-center gap-2.5 text-sm">
              <span className="size-3.5 shrink-0 rounded-[4px] border border-line" aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="sr-only">
        An example brief built by hackr&apos;s coach from the fictional rules of {SAMPLE.name}.
      </figcaption>
    </figure>
  );
}

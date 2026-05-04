type ScorePillProps = {
  label: string;
  value: number | null;
  type: "feasibility" | "novelty" | "stretch";
};

const STYLES = {
  feasibility: "bg-cream text-slate border-stone-border",
  novelty: "bg-[#f0f5ee] text-olive border-[#d4e0d0]",
  stretch: "bg-[#fdf6ec] text-[#8B6914] border-[#f0deb0]",
};

export function ScorePill({ label, value, type }: ScorePillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-semibold uppercase tracking-wider ${STYLES[type]}`}
    >
      <span>{label}</span>
      <span>{value?.toFixed(1) ?? "?"}</span>
    </span>
  );
}

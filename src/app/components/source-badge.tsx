type SourceBadgeProps = {
  name: string;
};

export function SourceBadge({ name }: SourceBadgeProps) {
  return (
    <span className="bg-cream text-slate px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-widest border border-stone-border">
      {name}
    </span>
  );
}

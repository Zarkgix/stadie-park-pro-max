export function StatBlock({
  value,
  label,
  align = "left",
  divider = "right",
}: {
  value: string;
  label: string;
  align?: "left" | "right";
  divider?: "left" | "right" | "none";
}) {
  const rotate = align === "right" ? "rotate-[20deg]" : "rotate-[-20deg]";
  const dividerEl = divider !== "none" && (
    <div className={`hidden md:block h-px w-24 bg-white/40 ${rotate}`} />
  );
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className={`flex items-center gap-3 ${align === "right" ? "justify-end" : "justify-start"}`}>
        {divider === "left" && dividerEl}
        <div className="text-4xl md:text-5xl font-medium tracking-tight">{value}</div>
        {divider === "right" && dividerEl}
      </div>
      <div className="text-xs md:text-sm text-white/70 mt-1">{label}</div>
    </div>
  );
}

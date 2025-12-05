import clsx from "clsx";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={clsx("w-full h-2 rounded-full bg-white/10 overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand.pink to-brand.purple transition-all"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

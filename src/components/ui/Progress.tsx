import clsx from "clsx";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={clsx("w-full h-2 rounded-full bg-gray-200 overflow-hidden dark:bg-gray-800", className)}>
      <div
        className="h-full bg-indigo-600 transition-all dark:bg-indigo-500"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

import clsx from "clsx";
import { PropsWithChildren } from "react";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md",
        "dark:border-gray-800 dark:bg-gray-950",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={clsx(
        "border-b border-gray-200 px-6 py-4 dark:border-gray-800",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("px-6 py-4 space-y-3", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("text-lg font-semibold text-gray-900 dark:text-white", className)}>
      {children}
    </div>
  );
}


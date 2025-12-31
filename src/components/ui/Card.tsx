import clsx from "clsx";
import { PropsWithChildren } from "react";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  const isSolid = className?.includes("card-solid");
  const base = isSolid ? "rounded-2xl" : "glass rounded-2xl";
  return <div className={clsx(base, className)}>{children}</div>;
}

export function CardHeader({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("px-5 py-4 border-b border-white/10", className)}>{children}</div>;
}

export function CardContent({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("px-5 py-4 space-y-3", className)}>{children}</div>;
}

export function CardTitle({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("text-lg font-semibold", className)}>{children}</div>;
}

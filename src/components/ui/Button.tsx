import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", ...props },
  ref,
) {
  const base =
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition";
  const styles = {
    primary: "bg-brand.pink hover:bg-pink-500 text-white shadow-glow",
    ghost: "bg-transparent hover:bg-white/10 text-white",
    outline: "border border-white/30 text-white hover:bg-white/10",
  };
  return (
    <button
      ref={ref}
      className={clsx(base, styles[variant], className)}
      {...props}
    />
  );
});

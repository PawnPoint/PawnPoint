import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", fullWidth = false, ...props },
  ref,
) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm rounded-md",
    md: "px-4 py-2 text-sm rounded-lg",
    lg: "px-6 py-3 text-base rounded-lg",
  };

  const variantStyles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
    outline: "border border-gray-300 text-gray-900 hover:bg-gray-50 active:bg-gray-100",
    ghost: "text-gray-700 hover:bg-gray-100 active:bg-gray-200",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  };

  // Dark mode variants
  const darkVariantStyles = {
    primary: "dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700 dark:active:bg-indigo-800",
    secondary: "dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600",
    outline: "dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-900 dark:active:bg-gray-800",
    ghost: "dark:text-gray-300 dark:hover:bg-gray-900 dark:active:bg-gray-800",
    danger: "dark:bg-red-600 dark:text-white dark:hover:bg-red-700 dark:active:bg-red-800",
  };

  return (
    <button
      ref={ref}
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        darkVariantStyles[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
});

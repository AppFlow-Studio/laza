// components/ui/badge.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "warning";
}

const variantClasses = {
  default:     "bg-indigo-600 text-white",
  secondary:   "bg-gray-100 text-gray-700",
  destructive: "bg-red-100 text-red-700",
  outline:     "border border-gray-200 text-gray-700 bg-transparent",
  warning:     "bg-amber-100 text-amber-700",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
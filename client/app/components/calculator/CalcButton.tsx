"use client";

import { useCalculator } from "./CalculatorContext";

interface CalcButtonProps {
  label: string;
  value?: string;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "primary" | "operator" | "action";
}

export function CalcButton({
  label,
  value,
  onClick,
  className = "",
  variant = "default",
}: CalcButtonProps) {
  const { append } = useCalculator();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (value !== undefined) {
      append(value);
    }
  };

  const variantClasses = {
    default: "bg-card hover:bg-muted/40 text-foreground border border-border",
    primary:
      "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold border-none",
    operator:
      "bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border",
    action:
      "bg-muted hover:bg-muted/80 text-foreground border border-border",
  };

  return (
    <button
      onClick={handleClick}
      className={`h-12 rounded-md transition-colors text-sm font-medium ${variantClasses[variant]} ${className}`}
    >
      {label}
    </button>
  );
}

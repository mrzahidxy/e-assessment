import * as React from "react";
import { cn } from "@/lib/utils";

type PageWidth = "small" | "narrow" | "compact" | "standard" | "wide";

const pageWidths: Record<PageWidth, string> = {
  small: "max-w-3xl",
  narrow: "max-w-4xl",
  compact: "max-w-5xl",
  standard: "max-w-6xl",
  wide: "max-w-7xl",
};

type PageShellProps = React.ComponentProps<"main"> & {
  width?: PageWidth;
};

export function PageShell({
  width = "standard",
  className,
  ...props
}: PageShellProps) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-4 py-8 sm:px-6 lg:px-8",
        pageWidths[width],
        className
      )}
      {...props}
    />
  );
}

import type { ReactNode } from "react";
import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatePanelProps = {
  kind: "loading" | "error" | "empty";
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
};

const stateIcons = {
  loading: LoaderCircle,
  error: AlertCircle,
  empty: Inbox,
};

export function StatePanel({
  kind,
  title,
  description,
  action,
  className,
  compact = false,
}: StatePanelProps) {
  const Icon = stateIcons[kind];
  const isError = kind === "error";

  return (
    <Card
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        compact
          ? "items-center gap-2 border-border p-4 text-center"
          : "items-center gap-3 border-border p-6 text-center sm:p-8",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          compact ? "size-8" : "size-10",
          isError
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn(compact ? "size-4" : "size-5", kind === "loading" && "animate-spin")}
        />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="max-w-lg text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </Card>
  );
}

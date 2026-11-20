"use client";

import { memo } from "react";
import { Clock, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { AssistanceMenu } from "./assistance-menu";
import { useCalculator } from "../calculator/CalculatorContext";

interface TopAppBarProps {
  title: string;
  subject: string;
  timeRemaining: number;
  onQuit: () => void;
  onSubmit: () => void;
  canSubmitEarly: boolean;
  earlySubmitDisabledMessage?: string;
  isInBufferPeriod?: boolean;
}

export const TopAppBar = memo(function TopAppBar({
  title,
  subject,
  timeRemaining,
  onQuit,
  onSubmit,
  canSubmitEarly,
  earlySubmitDisabledMessage,
  isInBufferPeriod = false,
}: TopAppBarProps) {
  const { toggleCalculator } = useCalculator();

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-card sm:h-20">
      <div className="container mx-auto flex h-full items-center justify-between gap-2 px-2 sm:gap-4 sm:px-4">
        {/* Left section */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <Image
            src="/logo.png"
            alt="IB Middle Years Programme"
            width={200}
            height={60}
            className="h-auto w-14 shrink-0 sm:w-28 lg:w-[200px]"
          />
          <div className="hidden h-6 w-px shrink-0 bg-border sm:block" />
          <div className="min-w-0">
            <span className="block truncate text-xs font-semibold text-foreground sm:text-sm">{title}</span>
            <span className="hidden truncate text-sm text-muted-foreground sm:block">{subject}</span>
          </div>
        </div>

        {/* Right section */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {/* Tools Section - Add more tool icons here */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 bg-primary p-0 text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Calculator"
              onClick={toggleCalculator}
              disabled={isInBufferPeriod}
              title={
                isInBufferPeriod
                  ? "Calculator disabled during reading time"
                  : "Toggle calculator"
              }
            >
              <Calculator className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center">
            <AssistanceMenu
              onQuit={onQuit}
              onSubmit={onSubmit}
              canSubmitEarly={canSubmitEarly}
              earlySubmitDisabledMessage={earlySubmitDisabledMessage}
            />
          </div>
          <div className="flex h-full min-w-16 items-center justify-center gap-1 bg-primary px-2 text-primary-foreground sm:w-48 sm:gap-2 sm:px-3 sm:py-1.5">
            <Clock className="h-4 w-4 shrink-0 sm:h-8 sm:w-8" />
            <span className="whitespace-nowrap text-sm font-bold sm:text-xl">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

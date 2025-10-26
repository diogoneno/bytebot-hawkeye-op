"use client";

import React, { useState } from "react";
import { ThinkingContentBlock } from "@bytebot/shared";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";

interface ThinkingContentProps {
  block: ThinkingContentBlock;
}

export function ThinkingContent({ block }: ThinkingContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format thinking content for display
  const thinkingText = block.thinking || "";
  const hasContent = thinkingText.trim().length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="my-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left",
          "hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors rounded-lg"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        )}
        <Brain className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
          {isExpanded ? "Hide" : "Show"} Reasoning
        </span>
        <span className="ml-auto text-xs text-amber-600/60 dark:text-amber-400/60">
          {Math.ceil(thinkingText.length / 4)} tokens
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-amber-200 dark:border-amber-900/30 px-3 py-2">
          <div className="rounded bg-amber-100/50 dark:bg-amber-950/40 p-3">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
              {thinkingText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

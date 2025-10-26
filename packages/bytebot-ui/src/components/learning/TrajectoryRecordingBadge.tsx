"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RecordingStatus {
  enabled: boolean;
  paused: boolean;
  recording: boolean;
  activeCount: number;
}

interface RecordingStats {
  total: number;
  successRate: number;
  averageQuality: number;
  byProvider: Record<string, number>;
}

export function TrajectoryRecordingBadge() {
  const [status, setStatus] = React.useState<RecordingStatus | null>(null);
  const [stats, setStats] = React.useState<RecordingStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isToggling, setIsToggling] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch("/api/trajectory-recording/status"),
        fetch("/api/trajectory-recording/stats"),
      ]);

      if (!statusRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch recording status");
      }

      const statusData = await statusRes.json();
      const statsData = await statsRes.json();

      setStatus(statusData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch recording status:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();

    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleToggle = async () => {
    if (!status || isToggling) return;

    setIsToggling(true);
    try {
      const endpoint = status.paused ? "resume" : "pause";
      const response = await fetch(`/api/trajectory-recording/${endpoint}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to ${endpoint} recording`);
      }

      // Refresh status immediately
      await fetchData();
    } catch (err) {
      console.error("Failed to toggle recording:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsToggling(false);
    }
  };

  const getRecordingStatusColor = () => {
    if (!status?.enabled) return "bg-gray-500";
    if (status.paused) return "bg-yellow-500";
    return "bg-red-500 animate-pulse";
  };

  const getRecordingStatusText = () => {
    if (!status?.enabled) return "Disabled";
    if (status.paused) return "Paused";
    return "Recording";
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 0.7) return "text-green-500";
    if (quality >= 0.4) return "text-yellow-500";
    return "text-red-500";
  };

  const getQualityLabel = (quality: number) => {
    if (quality >= 0.7) return "High";
    if (quality >= 0.4) return "Medium";
    return "Low";
  };

  // Don't show badge if disabled or errored
  if (error || !status?.enabled) {
    return null;
  }

  // Compact badge trigger
  const badgeContent = (
    <button
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-1.5",
        "text-xs text-muted-foreground hover:text-foreground",
        "hover:bg-muted/80 transition-colors",
        "border border-transparent hover:border-border"
      )}
    >
      <div className={cn("w-2 h-2 rounded-full", getRecordingStatusColor())} />
      <span className="font-medium">
        {stats?.total || 0} {stats?.total === 1 ? "trajectory" : "trajectories"}
      </span>
    </button>
  );

  // Expanded popover content
  const popoverContent = (
    <div className="w-80 dark:bg-card dark:border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trajectory Recording
          </h3>
          <div className="flex items-center gap-2">
            <div
              className={cn("w-2.5 h-2.5 rounded-full", getRecordingStatusColor())}
            />
            <span className="text-sm font-medium text-foreground">
              {getRecordingStatusText()}
            </span>
          </div>
        </div>
        {status.enabled && (
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className="text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50 font-medium"
          >
            {isToggling ? "..." : status.paused ? "Resume" : "Pause"}
          </button>
        )}
      </div>

      {stats && (
        <>
          {/* Summary Stats - 2x2 Grid for Better Readability */}
          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Recorded</div>
              <div className="font-semibold text-foreground">{stats.total}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Active</div>
              <div className="font-semibold text-foreground">
                {status.activeCount}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Success Rate</div>
              <div
                className={cn(
                  "font-semibold",
                  stats.total > 0 ? "text-green-500" : "text-muted-foreground"
                )}
              >
                {stats.total > 0
                  ? `${Math.round(stats.successRate * 100)}%`
                  : "--"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Avg Quality</div>
              {stats.total > 0 ? (
                <div
                  className={cn(
                    "font-semibold",
                    getQualityColor(stats.averageQuality)
                  )}
                >
                  {getQualityLabel(stats.averageQuality)}
                </div>
              ) : (
                <div className="font-semibold text-muted-foreground">--</div>
              )}
            </div>
          </div>

          {/* By Provider */}
          {Object.keys(stats.byProvider).length > 0 && (
            <div className="pt-3 border-t border-border">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                By Model Provider
              </h4>
              <div className="space-y-1.5">
                {Object.entries(stats.byProvider).map(([provider, count]) => (
                  <div
                    key={provider}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground capitalize font-medium">
                      {provider}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {count} {count === 1 ? "trajectory" : "trajectories"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Note */}
          {status.enabled && !status.paused && stats.total === 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground italic">
                Recording Claude runs to improve other models via few-shot learning
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{badgeContent}</PopoverTrigger>
      <PopoverContent align="end" className="p-4">
        {popoverContent}
      </PopoverContent>
    </Popover>
  );
}

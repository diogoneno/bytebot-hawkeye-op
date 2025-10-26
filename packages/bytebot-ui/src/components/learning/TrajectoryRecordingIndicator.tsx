"use client";

import React from "react";
import { cn } from "@/lib/utils";

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

export function TrajectoryRecordingIndicator({ className }: { className?: string }) {
  const [status, setStatus] = React.useState<RecordingStatus | null>(null);
  const [stats, setStats] = React.useState<RecordingStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isToggling, setIsToggling] = React.useState(false);

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

  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-3 animate-pulse",
          className
        )}
      >
        <div className="h-4 w-32 bg-muted rounded mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-3/4 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !status || !stats) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-3",
          className
        )}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Trajectory Recording
        </h3>
        <p className="text-sm text-muted-foreground">
          {error || "No data available"}
        </p>
      </div>
    );
  }

  const getRecordingStatusColor = () => {
    if (!status.enabled) return "text-gray-500";
    if (status.paused) return "text-yellow-500";
    return "text-red-500 animate-pulse";
  };

  const getRecordingStatusText = () => {
    if (!status.enabled) return "Disabled";
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

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 dark:border-border/60 dark:bg-muted",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trajectory Recording
          </h3>
          <div className="flex items-center gap-1">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                getRecordingStatusColor()
              )}
            />
            <span className="text-xs text-muted-foreground">
              {getRecordingStatusText()}
            </span>
          </div>
        </div>
        {status.enabled && (
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            {isToggling ? "..." : status.paused ? "Resume" : "Pause"}
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
        <div>
          <div className="text-muted-foreground">Recorded</div>
          <div className="font-medium text-foreground">{stats.total}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Active</div>
          <div className="font-medium text-foreground">
            {status.activeCount}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Success Rate</div>
          <div className="font-medium text-green-500">
            {Math.round(stats.successRate * 100)}%
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Avg Quality</div>
          <div
            className={cn(
              "font-medium",
              getQualityColor(stats.averageQuality)
            )}
          >
            {getQualityLabel(stats.averageQuality)}
          </div>
        </div>
      </div>

      {/* By Provider */}
      {Object.keys(stats.byProvider).length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">
            By Model Provider
          </h4>
          <div className="space-y-1">
            {Object.entries(stats.byProvider).map(([provider, count]) => (
              <div
                key={provider}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-foreground capitalize">{provider}</span>
                <span className="text-muted-foreground">
                  {count} {count === 1 ? "trajectory" : "trajectories"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

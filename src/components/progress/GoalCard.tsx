"use client";

import * as React from "react";
import { Target } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useProgressStore } from "@/stores/progressStore";
import { computeTrackStats } from "@/lib/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function GoalCard() {
  const goal = useProgressStore((s) => s.goal);
  const tracks = useProgressStore((s) => s.tracks);
  const events = useScheduleStore((s) => s.events);

  const mlTrack = tracks.find((t) => t.type === "ml");
  const mlHours = mlTrack ? computeTrackStats(events, mlTrack).loggedHours : 0;
  const pct = goal.targetHours ? (mlHours / goal.targetHours) * 100 : 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Target className="size-5" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Long-term goal
            </p>
            <h3 className="text-sm font-semibold">{goal.title}</h3>
          </div>
        </div>
        <Progress value={pct} indicatorClassName="bg-gradient-to-r from-violet-500 to-primary" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{mlHours.toFixed(1)}h of ML from calendar</span>
          <span>
            {Math.round(pct)}% of {goal.targetHours}h
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

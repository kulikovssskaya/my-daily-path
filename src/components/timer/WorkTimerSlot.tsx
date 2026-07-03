"use client";

import dynamic from "next/dynamic";

const WorkTimer = dynamic(
  () => import("@/components/timer/WorkTimer").then((m) => ({ default: m.WorkTimer })),
  { ssr: false }
);

export function WorkTimerSlot() {
  return <WorkTimer />;
}

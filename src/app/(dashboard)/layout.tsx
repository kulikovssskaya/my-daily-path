import {
  DesktopSidebar,
  MobileDrawer,
} from "@/components/layout/Sidebar";
import { MobileTopbar } from "@/components/layout/MobileTopbar";
import { SwipeArea } from "@/components/layout/SwipeArea";
import { SyncGate } from "@/components/layout/SyncGate";
import { WorkTimerSlot } from "@/components/timer/WorkTimerSlot";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SwipeArea>
      <SyncGate>
        <div className="flex h-svh w-full overflow-hidden bg-background">
          <DesktopSidebar />
          <MobileDrawer />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileTopbar />
            <main className="relative min-h-0 flex-1">{children}</main>
            <WorkTimerSlot />
          </div>
        </div>
      </SyncGate>
    </SwipeArea>
  );
}

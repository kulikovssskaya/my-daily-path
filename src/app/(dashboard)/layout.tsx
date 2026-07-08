import {
  DesktopSidebar,
  MobileDrawer,
} from "@/components/layout/Sidebar";
import { MobileTopbar } from "@/components/layout/MobileTopbar";
import { SwipeArea } from "@/components/layout/SwipeArea";
import { SyncGate } from "@/components/layout/SyncGate";
import { WorkTimerBar } from "@/components/timer/WorkTimerBar";

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
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              <main className="relative min-h-0 min-w-0 flex-1 overflow-auto">
                {children}
              </main>
              <WorkTimerBar />
            </div>
          </div>
        </div>
      </SyncGate>
    </SwipeArea>
  );
}

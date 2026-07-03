"use client";

import * as React from "react";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, PanelLeftClose, PanelLeft } from "lucide-react";
import { NAV_ITEMS, APP_NAME } from "@/config/nav";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import type { NavItem } from "@/config/nav";

function NavLinkInner({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed?: boolean;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  const Icon = item.icon;

  return (
    <>
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <Icon className={cn("size-5 shrink-0", pending && "opacity-70")} />
      {!collapsed && (
        <span className={cn("flex flex-col leading-tight", pending && "opacity-70")}>
          <span>{item.label}</span>
        </span>
      )}
    </>
  );
}

function NavLink({
  item,
  collapsed,
  active,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      prefetch={true}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <NavLinkInner item={item} collapsed={collapsed} active={active} />
    </Link>
  );
}

function NavPrefetch() {
  const router = useRouter();
  React.useEffect(() => {
    for (const item of NAV_ITEMS) {
      router.prefetch(item.href);
    }
  }, [router]);
  return null;
}

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <NavPrefetch />
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              active={active}
              onNavigate={onNavigate}
            />
          );
        })}
      </nav>
    </>
  );
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 px-5 py-5", collapsed && "justify-center px-2")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Sparkles className="size-5" />
      </span>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
          <span className="text-[11px] text-muted-foreground">Your AI day copilot</span>
        </div>
      )}
    </div>
  );
}

/** Always-visible sidebar on desktop (md and up). */
export function DesktopSidebar() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "hidden h-svh shrink-0 flex-col border-r bg-card md:flex",
        sidebarCollapsed ? "w-[76px]" : "w-64"
      )}
    >
      <Brand collapsed={sidebarCollapsed} />
      <div className="mt-2 flex-1 overflow-y-auto scrollbar-thin">
        <NavLinks collapsed={sidebarCollapsed} />
      </div>
      <div
        className={cn(
          "flex items-center gap-2 border-t px-3 py-3",
          sidebarCollapsed ? "flex-col" : "justify-between"
        )}
      >
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Collapse menu"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? <PanelLeft /> : <PanelLeftClose />}
        </Button>
      </div>
    </aside>
  );
}

/** Slide-in drawer for mobile, controlled by the UI store. */
export function MobileDrawer() {
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen);
  const closeMobileNav = useUIStore((s) => s.closeMobileNav);

  React.useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <div className={cn("md:hidden", mobileNavOpen ? "" : "pointer-events-none")}>
      <div
        onClick={closeMobileNav}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-150",
          mobileNavOpen ? "opacity-100" : "opacity-0"
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r bg-card shadow-xl transition-transform duration-150",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Brand />
        <div className="mt-2 flex-1 overflow-y-auto scrollbar-thin">
          <NavLinks onNavigate={closeMobileNav} />
        </div>
        <div className="flex items-center justify-between border-t px-3 py-3">
          <span className="px-2 text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </aside>
    </div>
  );
}

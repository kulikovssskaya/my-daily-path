"use client";

import { Menu, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, APP_NAME } from "@/config/nav";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";

export function MobileTopbar() {
  const openMobileNav = useUIStore((s) => s.openMobileNav);
  const pathname = usePathname();
  const current = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        onClick={openMobileNav}
      >
        <Menu />
      </Button>
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="text-sm font-semibold">
          {current?.label ?? APP_NAME}
        </span>
      </div>
    </header>
  );
}

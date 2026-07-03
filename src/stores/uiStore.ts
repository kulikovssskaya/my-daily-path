import { create } from "zustand";

interface UIState {
  /** Mobile drawer open state. Desktop sidebar is always visible. */
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;

  /** Whether the desktop sidebar is collapsed to icons only. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileNavOpen: false,
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));

import {
  CalendarDays,
  Trophy,
  ChefHat,
  Briefcase,
  Languages,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/calendar",
    label: "Calendar",
    description: "Learning sessions & schedule",
    icon: CalendarDays,
  },
  {
    href: "/progress",
    label: "Progress",
    description: "Calendar analytics & AI",
    icon: Trophy,
  },
  {
    href: "/english",
    label: "Daily English",
    description: "English Boost — 10 words/day",
    icon: Languages,
  },
  {
    href: "/cooking",
    label: "Cooking",
    description: "Fridge & recipes",
    icon: ChefHat,
  },
  {
    href: "/applications",
    label: "Applications",
    description: "Job tracker & statuses",
    icon: Briefcase,
  },
  {
    href: "/knowledge",
    label: "Knowledge",
    description: "ML & Analytics knowledge base",
    icon: BookOpen,
  },
];

export const APP_NAME = "My Daily Path";

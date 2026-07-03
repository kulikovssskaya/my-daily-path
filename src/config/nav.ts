import {
  ClipboardList,
  CalendarDays,
  Trophy,
  ChefHat,
  Briefcase,
  Map,
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
    href: "/schedule",
    label: "Schedule",
    description: "AI day planner",
    icon: ClipboardList,
  },
  {
    href: "/calendar",
    label: "Calendar",
    description: "Day / week / month",
    icon: CalendarDays,
  },
  {
    href: "/progress",
    label: "Progress",
    description: "Learning & applications",
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
    href: "/career",
    label: "Work / Career",
    description: "CV, jobs, LinkedIn",
    icon: Briefcase,
  },
  {
    href: "/roadmap",
    label: "Bootcamp",
    description: "2-week ML schedule & rules",
    icon: Map,
  },
  {
    href: "/knowledge",
    label: "Knowledge",
    description: "ML & Analytics knowledge base",
    icon: BookOpen,
  },
];

export const APP_NAME = "My Daily Path";

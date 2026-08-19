import type { MetadataRoute } from "next";
import { APP_NAME } from "@/config/nav";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "my-daily-path",
    name: APP_NAME,
    short_name: "Daily Path",
    description: "Personal AI assistant for schedule, progress, cooking and career.",
    start_url: "/calendar",
    scope: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#8264FF",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}

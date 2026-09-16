import { describe, expect, it } from "vitest";
import { mapMonitorStatus, monitorVacancyToApplication } from "@/lib/monitor/mapVacancy";

describe("mapVacancy", () => {
  it("maps sent action to applied", () => {
    expect(mapMonitorStatus("APPLIED", "sent")).toBe("applied");
  });

  it("maps skipped to ignored", () => {
    expect(mapMonitorStatus("SKIPPED", "skipped")).toBe("ignored");
  });

  it("builds stable id from monitor vacancy id", () => {
    const app = monitorVacancyToApplication({
      id: 42,
      company: "Yandex",
      title: "ML Engineer",
      url: "https://example.com/job",
      action: "sent",
      action_at: "2026-09-16T10:00:00.000Z",
    });
    expect(app.id).toBe("search-job-42");
    expect(app.status).toBe("applied");
    expect(app.company).toBe("Yandex");
  });
});

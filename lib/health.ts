import { CompanyHealth } from "@/lib/dataconnect/generated";

// Shared by HealthMixDonut (chart) and HealthDot (table cell) so the two never drift —
// dataviz skill's status palette (good/warning/critical), not the categorical one.
export const HEALTH_STATUS: Record<CompanyHealth, { color: string; label: string }> = {
  [CompanyHealth.GREEN]: { color: "var(--viz-status-good)", label: "Healthy" },
  [CompanyHealth.YELLOW]: { color: "var(--viz-status-warning)", label: "Watch" },
  [CompanyHealth.RED]: { color: "var(--viz-status-critical)", label: "Critical" },
};

export const REAL_ESTATE_TABS = ["investment", "rental"] as const;
export type RealEstateTab = typeof REAL_ESTATE_TABS[number];
export function parseRealEstateTab(value?: string): RealEstateTab { return value === "rental" ? "rental" : "investment"; }

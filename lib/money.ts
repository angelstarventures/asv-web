export { formatCurrencyCompact, formatMoic } from "@/components/StatTile";
export function formatCurrency(value: number | null | undefined, currencyCode = "USD") {
    return value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(value);
}
export function formatPercent(value: number | null | undefined) {
    return value == null ? "—" : new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 }).format(value);
}

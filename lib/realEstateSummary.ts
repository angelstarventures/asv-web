// Stored FX rates are native units per USD. Actual ledger USD amounts are already
// converted at their transaction rates and must never be converted a second time.
export function nativeToUsd(value: number | null | undefined, nativeUnitsPerUsd: number): number | null {
  if (value == null) return null;
  if (!Number.isFinite(nativeUnitsPerUsd) || nativeUnitsPerUsd <= 0) throw new Error("A positive recorded exchange rate is required.");
  return value / nativeUnitsPerUsd;
}

export function realEstateSummaryUsd(input: {
  propertyCostNative: number | null | undefined;
  commitmentNative: number;
  salePriceNative: number | null | undefined;
  defaultFxRateToUsd: number;
  saleFxRateToUsd?: number | null;
  deployedUsd: number;
  cashBalanceUsd: number;
  profitUsd: number;
}) {
  return {
    currency: "USD" as const,
    totalPropertyCost: nativeToUsd(input.propertyCostNative, input.defaultFxRateToUsd),
    commitment: nativeToUsd(input.commitmentNative, input.defaultFxRateToUsd)!,
    salePrice: nativeToUsd(input.salePriceNative, input.saleFxRateToUsd ?? input.defaultFxRateToUsd),
    deployed: input.deployedUsd,
    cashBalance: input.cashBalanceUsd,
    profit: input.profitUsd,
  };
}

import { query, withTransaction } from "./dataconnect-admin";
import { xirr, type CashFlow } from "./xirr";
export async function recomputeRealEstateRollups() {
    const properties = await query<{
        id: string;
        kind: string;
        status: string;
        total_property_cost: number | null;
        default_fx_rate_to_usd: number;
    }>("SELECT * FROM real_estate_investment");
    const portfolio: Record<string, {
        flows: CashFlow[];
        contributed: number;
        distributed: number;
        value: number;
    }> = { UNDER_CONSTRUCTION: { flows: [], contributed: 0, distributed: 0, value: 0 }, RENTAL: { flows: [], contributed: 0, distributed: 0, value: 0 } };
    for (const p of properties)
        await withTransaction(async (client) => {
            const fresh = (await client.query<typeof p>('SELECT * FROM real_estate_investment WHERE id=$1 FOR UPDATE', [p.id])).rows[0];
            Object.assign(p, fresh);
            const shares = (await client.query<{
                share_units: number;
                committed_amount: number | null;
            }>("SELECT share_units,committed_amount FROM real_estate_member_share WHERE investment_id=$1 AND superseded_by_id IS NULL", [p.id])).rows;
            // Exclude reversed originals AND reversal entries. Corrected rows remain authoritative.
            const rows = (await client.query<{
                type: string;
                event_date: Date;
                amount_usd: number;
                cash_direction: number;
                funded_outside_hub: boolean;
            }>(`SELECT e.* FROM real_estate_ledger_entry e WHERE e.investment_id=$1 AND e.reverses_entry_id IS NULL AND NOT EXISTS (SELECT 1 FROM real_estate_ledger_entry r WHERE r.reverses_entry_id=e.id) ORDER BY event_date,created_at,id`, [p.id])).rows;
            const total = (types: string[], sign: number) => rows.filter(e => types.includes(e.type)).reduce((s, e) => s + e.amount_usd * (e.cash_direction ? e.cash_direction * sign : 1), 0);
            const deployed = total(['DEVELOPER_PAYMENT', 'ACQUISITION_COST'], -1);
            const fees = total(['FEE_OR_CHARGE', 'CARRY'], -1);
            // Receipt money columns describe obligations, while member allocations describe actual cash.
            const cashRow = (await client.query<{
                cash: number;
            }>(`SELECT coalesce(sum(a.amount_usd * a.cash_direction),0) AS cash FROM real_estate_allocation a JOIN real_estate_ledger_entry e ON e.id=a.ledger_entry_id WHERE e.investment_id=$1 AND NOT e.funded_outside_hub AND e.type NOT IN ('SHARE_TRANSFER','VALUATION_MARK','STATUS_UPDATE') AND e.reverses_entry_id IS NULL AND NOT EXISTS(SELECT 1 FROM real_estate_ledger_entry r WHERE r.reverses_entry_id=e.id)`, [p.id])).rows[0];
            const cash = Number(cashRow.cash);
            const mark = rows.filter(e => e.type === 'VALUATION_MARK').at(-1)?.amount_usd;
            const sold = p.status === 'SOLD', inactive = sold || ['WRITTEN_OFF', 'ARCHIVED'].includes(p.status);
            const equity = inactive ? 0 : Math.max(0, deployed + (mark == null ? 0 : mark - (p.total_property_cost ?? 0) / (p.default_fx_rate_to_usd || 1)));
            const value = equity + cash;
            const sale = total(['SALE'], 1);
            const profit = sold ? sale - deployed - fees : 0;
            const committed = shares.reduce((s, r) => s + (r.committed_amount ?? ((p.total_property_cost ?? 0) * r.share_units / (shares.reduce((s, r) => s + r.share_units, 0) || 1))), 0) / (p.default_fx_rate_to_usd || 1);
            const flows = rows.filter(e => e.type === 'MEMBER_CONTRIBUTION' || e.funded_outside_hub || e.type === 'DISTRIBUTION').map(e => ({ date: e.event_date, amount: e.type === 'DISTRIBUTION' ? e.amount_usd : -e.amount_usd }));
            // Reconstruct contributions/distributions from allocation cells, never from the obligation column.
            const cashFlows = (await client.query<{
                event_date: Date;
                amount: number;
            }>(`SELECT e.event_date,sum(CASE WHEN e.funded_outside_hub THEN -a.amount_usd ELSE -a.amount_usd*a.cash_direction END) AS amount FROM real_estate_allocation a JOIN real_estate_ledger_entry e ON e.id=a.ledger_entry_id WHERE e.investment_id=$1 AND (e.type IN ('MEMBER_CONTRIBUTION','DISTRIBUTION') OR e.funded_outside_hub) AND e.reverses_entry_id IS NULL AND NOT EXISTS(SELECT 1 FROM real_estate_ledger_entry r WHERE r.reverses_entry_id=e.id) GROUP BY e.id,e.event_date ORDER BY e.event_date`, [p.id])).rows;
            flows.splice(0, flows.length, ...cashFlows.map(f => ({ date: f.event_date, amount: Number(f.amount) })));
            const actualContributed = flows.filter(f => f.amount < 0).reduce((s, f) => s - f.amount, 0), actualDistributed = flows.filter(f => f.amount > 0).reduce((s, f) => s + f.amount, 0);
            portfolio[p.kind].flows.push(...flows);
            portfolio[p.kind].contributed += actualContributed;
            portfolio[p.kind].distributed += actualDistributed;
            portfolio[p.kind].value += value;
            flows.push({ date: new Date(), amount: value });
            await client.query(`INSERT INTO real_estate_rollup_cache (investment_key,investment_id,kind,capital_committed_usd,capital_deployed_usd,realized_profit_usd,cumulative_net_cash_flow_usd,current_value_usd,roi,irr,computed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now()) ON CONFLICT (investment_key) DO UPDATE SET capital_committed_usd=$4,capital_deployed_usd=$5,realized_profit_usd=$6,cumulative_net_cash_flow_usd=$7,current_value_usd=$8,roi=$9,irr=$10,computed_at=now()`, [p.id, p.id, p.kind, committed, deployed, profit, actualDistributed - actualContributed, value, actualContributed ? (value + actualDistributed - actualContributed) / actualContributed : null, xirr(flows)]);
        });
    // Separate transaction sees all completed property upserts.
    for (const kind of ['UNDER_CONSTRUCTION', 'RENTAL'])
        await query(`INSERT INTO real_estate_rollup_cache (investment_key,kind,capital_committed_usd,capital_deployed_usd,realized_profit_usd,cumulative_net_cash_flow_usd,current_value_usd,roi,irr,computed_at) SELECT $1,$2,coalesce(sum(capital_committed_usd),0),coalesce(sum(capital_deployed_usd),0),coalesce(sum(realized_profit_usd),0),coalesce(sum(cumulative_net_cash_flow_usd),0),coalesce(sum(current_value_usd),0),NULL,NULL,now() FROM real_estate_rollup_cache WHERE investment_id IS NOT NULL AND kind=$2 ON CONFLICT (investment_key) DO UPDATE SET capital_committed_usd=EXCLUDED.capital_committed_usd,capital_deployed_usd=EXCLUDED.capital_deployed_usd,realized_profit_usd=EXCLUDED.realized_profit_usd,cumulative_net_cash_flow_usd=EXCLUDED.cumulative_net_cash_flow_usd,current_value_usd=EXCLUDED.current_value_usd,computed_at=now()`, ['PORTFOLIO_' + kind, kind]);
    for (const [kind, p] of Object.entries(portfolio))
        await query('UPDATE real_estate_rollup_cache SET roi=$2,irr=$3 WHERE investment_key=$1', ['PORTFOLIO_' + kind, p.contributed ? (p.value + p.distributed - p.contributed) / p.contributed : null, xirr([...p.flows, { date: new Date(), amount: p.value }])]);
    return { ok: true as const };
}

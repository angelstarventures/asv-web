import { RealEstateActiveTable, type RealEstateRow } from "./RealEstateActiveTable";
export function RealEstateCompletedTable({ rows }: {
    rows: RealEstateRow[];
}) { return <RealEstateActiveTable rows={rows} completed/>; }

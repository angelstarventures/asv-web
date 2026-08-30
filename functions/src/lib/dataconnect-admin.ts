import { Connector, IpAddressTypes, AuthTypes } from "@google-cloud/cloud-sql-connector";
import { Pool, type PoolClient } from "pg";

// Raw `pg` against the same Cloud SQL Postgres instance Data Connect manages, used only where
// the generated Data Connect SDK cannot help: multi-row transactions (ledger writes) and
// jsonb filtering (CustomEventDetail/EventTypeDefinition — see the jsonb spike, plan §2).
// Uses a dedicated service account via the Cloud SQL Connector, never a hardcoded password.

const INSTANCE_CONNECTION_NAME = process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME!; // "project:region:instance"
const DB_NAME = process.env.CLOUD_SQL_DATABASE ?? "asvtrackerdb";
const DB_USER = process.env.CLOUD_SQL_IAM_USER!; // IAM database user, no static password

let pool: Pool | undefined;
let connector: Connector | undefined;

async function getPool(): Promise<Pool> {
  if (pool) return pool;

  connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName: INSTANCE_CONNECTION_NAME,
    // No VPC/private network is configured on asv-tracker-sql (Data Connect's free-trial
    // provisioning only enables a public IP) — PRIVATE here would fail to connect. Revisit if
    // the instance is later moved behind a VPC connector.
    ipType: IpAddressTypes.PUBLIC,
    authType: AuthTypes.IAM,
  });

  pool = new Pool({
    ...clientOpts,
    user: DB_USER,
    database: DB_NAME,
    max: 5,
  });
  return pool;
}

// All ledger write paths (plan §3) need a single real transaction spanning
// ledger_entry x 3 + detail x 3 + allocations x N — the generated SDK can't give that.
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const p = await getPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function query<T = unknown>(text: string, params: unknown[] = []): Promise<T[]> {
  const p = await getPool();
  const result = await p.query(text, params);
  return result.rows as T[];
}

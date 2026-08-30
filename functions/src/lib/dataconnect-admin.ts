import { Connector, IpAddressTypes, AuthTypes, type ConnectorOptions } from "@google-cloud/cloud-sql-connector";
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

  let auth: ConnectorOptions["auth"];
  if (process.env.CLOUD_SQL_AUTH_MODE === "local") {
    // Local CLI tools (functions/scripts/migrate-legacy-data.ts) run under the developer's
    // own `firebase login` session, not a deployed Cloud Function's ADC — which plain `next
    // dev`/`node` on a workstation doesn't have (see the scripts/*.js one-offs used to wire
    // this up). Dynamically required so it's never loaded — and firebase-tools never needs to
    // be installed — inside the deployed function bundle, where CLOUD_SQL_AUTH_MODE is unset.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requireAuth } = require("firebase-tools/lib/requireAuth");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
    const account = getGlobalDefaultAccount();
    if (!account) throw new Error("Not logged in — run `firebase login` first.");
    await requireAuth({ user: account.user, tokens: account.tokens });
    auth = new FBToolsAuthClient();
  }

  connector = new Connector({ auth });
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

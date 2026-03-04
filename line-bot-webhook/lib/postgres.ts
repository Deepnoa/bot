import { Pool, type QueryResult, type QueryResultRow } from "pg"

let pool: Pool | null = null

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL || process.env.DB_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL (or DB_URL) is not set")
  }
  return connectionString
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getConnectionString(),
    })
  }
  return pool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params)
}

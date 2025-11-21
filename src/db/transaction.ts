
import { postgresPool } from "../config/postgres";

export const runInTransaction = async <T>(fn: (client: any) => Promise<T>) => {
  const client = await postgresPool.connect();
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
};

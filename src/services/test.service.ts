import { postgresPool } from "../config/postgres";

export const getAllUsersService = async () => {
  const query = `SELECT id FROM test`;

  const { rows } = await postgresPool.query(query);
  return rows;
};


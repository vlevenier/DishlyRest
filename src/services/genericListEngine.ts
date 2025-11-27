// services/listEngine.ts
import {postgresPool} from "../config/postgres";
import { buildWhereClause } from "./queryBuilder";
import { encodeCursor, decodeCursor } from "./cursorUtils";

export type ListConfig = {
  table: string;                    // "orders o"
  columns?: string[];               // ["o.*"]
  columnsMap?: Record<string,string>; // { status:"o.status" }
  defaultOrder?: { column: string; direction: "ASC" | "DESC" };
  preview?: {
    table: string;    // "order_items oi"
    foreignKey: string;  // "oi.order_id"
    limit?: number;      // ej: 3
    select: string;      // lo que se json_agrega
  };
};

export async function listEngineGeneric(filters: any, config: ListConfig) {
  const {
    table,
    columns = ["*"],
    columnsMap = {},
    preview,
    defaultOrder = { column: "created_at", direction: "DESC" },
  } = config;

  const {
    limit = 50,
    offset = 0,
    cursor,
    direction = "next", // next = hacia abajo (más antiguo)
    include_total = false,
  } = filters;

  // -----------------------------
  // 1️⃣ Filtros dinámicos
  // -----------------------------
  const baseFilters = { ...filters };
  delete baseFilters.limit;
  delete baseFilters.offset;
  delete baseFilters.cursor;
  delete baseFilters.direction;
  delete baseFilters.include_total;

  const where = buildWhereClause(baseFilters, columnsMap);
  const whereParts = where.whereSql ? [where.whereSql.replace(/^WHERE\s*/, "")] : [];
  const values = [...where.values];

  // -----------------------------
  // 2️⃣ Cursor pagination general
  // -----------------------------
  let cursorSql = "";
  if (cursor) {
    const decoded = decodeCursor(cursor); // {created_at,id}
    if (decoded) {
      const c1 = values.push(decoded.created_at);
      const c2 = values.push(decoded.id);

      if (direction === "next") {
        cursorSql = `(${tableAlias(table)}.${defaultOrder.column} < $${c1}
                      OR (${tableAlias(table)}.${defaultOrder.column} = $${c1}
                      AND ${tableAlias(table)}.id < $${c2}))`;
      } else {
        cursorSql = `(${tableAlias(table)}.${defaultOrder.column} > $${c1}
                      OR (${tableAlias(table)}.${defaultOrder.column} = $${c1}
                      AND ${tableAlias(table)}.id > $${c2}))`;
      }
    }
  }

  if (cursorSql) whereParts.push(cursorSql);

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  // -----------------------------
  // 3️⃣ Preview LATERAL genérico
  // -----------------------------
  let previewJoin = "";
  if (preview) {
    const { table: pTable, foreignKey, select, limit: pLimit = 3 } = preview;

    previewJoin = `
      LEFT JOIN LATERAL (
        SELECT json_agg(${select} ORDER BY 1) AS preview
        FROM ${pTable}
        WHERE ${foreignKey} = ${tableAlias(table)}.id
        LIMIT ${pLimit}
      ) _preview ON true
    `;
  }

  // -----------------------------
  // 4️⃣ Query final ultra optimizada
  // -----------------------------
  const sql = `
    SELECT
      ${columns.join(", ")},
      ${preview ? "COALESCE(_preview.preview, '[]'::json) AS preview" : ""}
    FROM ${table}
    ${previewJoin}
    ${whereClause}
    ORDER BY ${tableAlias(table)}.${defaultOrder.column} ${defaultOrder.direction}, ${tableAlias(table)}.id ${defaultOrder.direction}
    LIMIT $${values.push(limit)}
    OFFSET $${values.push(offset)}
  `;

  const { rows } = await postgresPool.query(sql, values);

  // -----------------------------
  // 5️⃣ Cursor next/prev
  // -----------------------------
  let next_cursor: string | null = null;
  let prev_cursor: string | null = null;

  if (rows.length) {
    const last = rows[rows.length - 1];
    next_cursor = encodeCursor({ created_at: last.created_at, id: last.id });

    const first = rows[0];
    prev_cursor = encodeCursor({ created_at: first.created_at, id: first.id });
  }

  // -----------------------------
  // 6️⃣ Total count opcional
  // -----------------------------
  let total_count = null;
  if (include_total) {
    const csql = `SELECT COUNT(1) AS cnt FROM ${table} ${whereClause}`;
    const { rows: crow } = await postgresPool.query(csql, values.slice(0, values.length - 2));
    total_count = Number(crow[0]?.cnt);
  }

  return { data: rows, next_cursor, prev_cursor, total_count };
}

// Auxiliar: devuelve alias del table definido como "orders o"
function tableAlias(table: string) {
  return table.split(" ").pop()!;
}

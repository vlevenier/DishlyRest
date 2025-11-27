// services/queryBuilder.ts
import { Pool } from "pg";
export type FilterValue = string | number | boolean | (string | number)[] | null;

export type FiltersMap = Record<string, FilterValue | { op: string; value: FilterValue }>;

export type WhereResult = {
  whereSql: string;
  values: any[];
};

/**
 * buildWhereClause:
 * - filters: un objecto plano con keys (nombre del filtro) y valores (string | array | {op, value})
 * - columnsMap: mapa que relaciona el key del filtro con la columna real en SQL (ej: { status: "o.status" })
 *
 * Soporta:
 * - arrays -> ANY($n::text[])
 * - exact match
 * - custom operator con { op: 'ilike', value: '%foo%' }
 */
export function buildWhereClause(filters: FiltersMap = {}, columnsMap: Record<string, string> = {}): WhereResult {
  const where: string[] = [];
  const values: any[] = [];

  const push = (v: any) => {
    values.push(v);
    return values.length;
  };

  Object.entries(filters).forEach(([k, raw]) => {
    if (raw === undefined || raw === null || raw === "") return;

    const col = columnsMap[k] || k; // si no hay map, usar key como columna (útil para queries simples)

    // soportar forma { op, value }
    if (typeof raw === "object" && !Array.isArray(raw) && (raw as any).op) {
      const { op, value } = raw as any;
      if (value === undefined || value === null || value === "") return;

      if (op.toLowerCase() === "ilike") {
        const idx = push(value);
        where.push(`${col} ILIKE $${idx}`);
      } else if (op.toLowerCase() === "in" && Array.isArray(value)) {
        const idx = push(value);
        where.push(`${col} = ANY($${idx}::text[])`);
      } else {
        const idx = push(value);
        where.push(`${col} ${op} $${idx}`);
      }

      return;
    }

    // arrays -> ANY
    if (Array.isArray(raw)) {
      if (raw.length === 0) return;
      const idx = push(raw);
      where.push(`${col} = ANY($${idx}::text[])`);
      return;
    }

    // numeric exact allowed
    if (typeof raw === "number") {
      const idx = push(raw);
      where.push(`${col} = $${idx}`);
      return;
    }

    // strings: default exact match
    if (typeof raw === "string") {
      // admite búsqueda parcial si la clave termina en __q (por convención)
      if (k.endsWith("__q")) {
        const targetCol = columnsMap[k] || k.replace(/__q$/, "");
        const idx = push(`%${raw}%`);
        where.push(`(${targetCol}::text ILIKE $${idx})`);
      } else {
        const idx = push(raw);
        where.push(`${col} = $${idx}`);
      }
      return;
    }

    // boolean u otros
    const idx = push(raw);
    where.push(`${col} = $${idx}`);
  });

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
  };
}

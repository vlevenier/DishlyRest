import { postgresPool } from "../config/postgres";

export async function listEngine(filters: any, config: any) {
  const {
    table,
    columns,
    columnsMap = {},
    defaultOrder,
    preview,
    extraWhere  = [],
  } = config;

  const params: any[] = [];
  const whereParts: string[] = [];

  // --------------------
  // 1️⃣ Filtros dinámicos
  // --------------------
  for (const key of Object.keys(filters)) {
    if (columnsMap[key] && filters[key] !== undefined && filters[key] !== null) {
      params.push(filters[key]);
      whereParts.push(`${columnsMap[key]} = $${params.length}`);
    }
  }
if (extraWhere.length) {
    console.log("Adding extra where clauses:", extraWhere);
  whereParts.push(...extraWhere);
}
  const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  
  // --------------------
  // 2️⃣ Ordenamiento
  // --------------------
  /*const orderClause = filters.sort
    ? `ORDER BY ${filters.sort.field} ${filters.sort.direction}`
    : `ORDER BY ${defaultOrder.column} ${defaultOrder.direction}`;*/
const sortField = filters.sort?.field && columnsMap[filters.sort.field] ? columnsMap[filters.sort.field] : defaultOrder.column;
const sortDir = filters.sort?.direction?.toUpperCase() === "DESC" ? "DESC" : "ASC";
const orderClause = `ORDER BY ${sortField} ${sortDir}`;
  // --------------------
  // 3️⃣ Paginación
  // --------------------
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const offset = (page - 1) * limit;

  // --------------------
  // 4️⃣ Query de datos
  // --------------------
  const mainQuery = `
    SELECT ${columns.join(", ")}
    FROM ${table}
    ${whereClause}
    ${orderClause}
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const { rows: data } = await postgresPool.query(mainQuery, params);

  // --------------------
  // 5️⃣ Total de registros (para paginación real)
  // --------------------
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM ${table}
    ${whereClause}
  `;

  const { rows: countRows } = await postgresPool.query(countQuery, params);
  const totalRows = Number(countRows[0].total);
  const totalPages = Math.ceil(totalRows / limit);

  // --------------------
  // 6️⃣ Preview dinámico (order_items)
  // --------------------
  if (preview) {
    const ids = data.map((d) => d.id);
    if (ids.length > 0) {
      const previewQuery = `
        SELECT 
          oi.order_id,
          ${preview.select} AS item
        FROM ${preview.table}
        WHERE ${preview.foreignKey} = ANY($1)
        LIMIT ${preview.limit}
      `;

      const { rows: previewRows } = await postgresPool.query(previewQuery, [ids]);

      const grouped: any = {};
      previewRows.forEach((r) => {
        if (!grouped[r.order_id]) grouped[r.order_id] = [];
        grouped[r.order_id].push(r.item);
      });

      data.forEach((row) => {
        row.items_preview = grouped[row.id] || [];
      });
    }
  }

  // --------------------
  // Resultado final
  // --------------------
  return {
    success: true,
    page,
    limit,
    total_rows: totalRows,
    total_pages: totalPages,
    data,
  };
}

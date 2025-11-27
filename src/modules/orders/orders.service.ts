import { postgresPool } from "../../config/postgres";
import { runInTransaction } from "../../db/transaction";
import { listEngine } from "../../services/listEngine";

/**
 * Tipos mínimos para inputs (puedes mover a .types.ts)
 */
type CreateOrderItemInput = {
  product_id: number;
  variant_id?: number | null;
  quantity?: number;
  notes?: string | null;
  options?: { option_id: number; quantity?: number }[]; // nuevo

};

type CreateOrderInput = {
  source?: string; // 'kiosk' por defecto
  notes?: string | null;
  items: CreateOrderItemInput[];
  payment_method?: string | null;
};

export const getOrdersService = async (filters: { status?: string; source?: string } = {}) => {
  const { status, source } = filters;
  const params: any[] = [];
  const where: string[] = [];

  if (status) {
    params.push(status);
    where.push(`o.status = $${params.length}`);
  }
  if (source) {
    params.push(source);
    where.push(`o.source = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const query = `
    SELECT o.*
    FROM public.orders o
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT 100
  `;

  const { rows } = await postgresPool.query(query, params);
  return rows;
};




export const getOrdersServiceFull = async (filters: { status?: string; source?: string } = {}) => {
    const { status, source } = filters;
  const params: any[] = [];
  const where: string[] = [];

  if (status) {
    params.push(status);
    where.push(`o.status = $${params.length}`);
  }
  if (source) {
    params.push(source);
    where.push(`o.source = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const query = `
    SELECT
      o.*,
      COALESCE(oi_count.cnt, 0) AS items_count,
      COALESCE(oi_preview.items, '[]'::json) AS items_preview
    FROM public.orders o
    LEFT JOIN LATERAL (
      SELECT COUNT(1) AS cnt
      FROM public.order_items oi
      WHERE oi.order_id = o.id
    ) oi_count ON true
    LEFT JOIN LATERAL (
      SELECT json_agg(
               json_build_object(
                 'product_id', oi.product_id,
                 'name', p.name,
                 'quantity', oi.quantity
               ) ORDER BY oi.id
             ) FILTER (WHERE oi.id IS NOT NULL) AS items
      FROM public.order_items oi
      LEFT JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = o.id
      LIMIT 3
    ) oi_preview ON true
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT 100
  `;

  const { rows } = await postgresPool.query(query, params);
  return rows;
};



export function listOrders(filters: any) {

    const extraWhere = [];
console.log("Filters received in listOrders:", filters);
 if (filters.todayOnly) {
    extraWhere.push(`o.created_at::date = CURRENT_DATE`);
  }
  return listEngine(filters, {
    table: "public.orders o",
    columns: ["o.*"],
    columnsMap: {
      status: "o.status",
      payment_status: "o.payment_status",
      payment_method: "o.payment_method",
      source: "o.source",
      order_number: "o.order_number",
    },
    defaultOrder: { column: "created_at", direction: "DESC" },
    extraWhere,
    preview: {
      table: "public.order_items oi",
      foreignKey: "oi.order_id",
      limit: 3,
      select: `
        json_build_object(
          'product_id', oi.product_id,
          'quantity', oi.quantity
          
        )
      `,
    },
  });
}

export const getOrderByIdService = async (orderId: number) => {
  const orderQuery = `SELECT * FROM public.orders WHERE id = $1`;
  const { rows: orderRows } = await postgresPool.query(orderQuery, [orderId]);
  const order = orderRows[0];
  if (!order) return null;

  const itemsQuery = `
    SELECT oi.*, p.name as product_name, pv.name as variant_name, pv.price_modifier
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
    WHERE oi.order_id = $1
    ORDER BY oi.id ASC
  `;
  const { rows: items } = await postgresPool.query(itemsQuery, [orderId]);

  return { ...order, items };
};


async function fetchProductBase(client: any, productId: number) {
  const q = `SELECT base_price FROM public.products WHERE id = $1`;
  const { rows } = await client.query(q, [productId]);
  if (!rows[0]) throw new Error(`Product ${productId} not found`);
  return Number(rows[0].base_price) || 0;
}

async function fetchVariantModifier(client: any, variantId: number) {
  const q = `SELECT price_modifier FROM public.product_variants WHERE id = $1`;
  const { rows } = await client.query(q, [variantId]);
  if (!rows[0]) throw new Error(`Variant ${variantId} not found`);
  return Number(rows[0].price_modifier) || 0;
}

async function fetchOptionModifiers(client: any, optionIds: { option_id: number; quantity?: number }[]) {
  if (!optionIds || optionIds.length === 0) return { sumModifiers: 0, optionDetails: [] };

  // obtener price_modifier y allow_quantity de cada option en una sola query
  const ids = optionIds.map(o => o.option_id);
  const q = `SELECT id, price_modifier, allow_quantity FROM public.product_options WHERE id = ANY($1::bigint[])`;
  const { rows } = await client.query(q, [ids]);

  // map por id
  const map = new Map<number, any>();
  for (const r of rows) map.set(Number(r.id), r);

  let sumModifiers = 0;
  const optionDetails: { option_id: number; quantity: number; price_modifier: number }[] = [];

  for (const oi of optionIds) {
    const rec = map.get(Number(oi.option_id));
    if (!rec) throw new Error(`Option ${oi.option_id} not found`);
    const qty = oi.quantity && oi.quantity > 0 ? oi.quantity : 1;
    if (!rec.allow_quantity && qty > 1) {
      // si no permite cantidad, normalizamos a 1
      // o podríamos lanzar error; elegimos normalizar
    }
    const pm = Number(rec.price_modifier) || 0;
    sumModifiers += pm * qty;
    optionDetails.push({ option_id: oi.option_id, quantity: qty, price_modifier: pm });
  }

  return { sumModifiers, optionDetails };
}

/**
 * Crea un pedido y sus items en una transacción.
 * Para calcular unit_price: toma products.base_price + variant.price_modifier (si aplica).
 */
export const createOrderService = async (payload: any) => {
  const client = await postgresPool.connect();
  try {
    await client.query("BEGIN");

    const insertOrderQ = `
      INSERT INTO public.orders (status, payment_status, payment_method, total, created_at, updated_at, source, notes)
      VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6)
      RETURNING *
    `;
    const { rows: [createdOrder] } = await client.query(insertOrderQ, [
      "pending",
      "pending",
      payload.payment_method || null,
      0,
      payload.source || "kiosk",
      payload.notes || null
    ]);

    // insertar items con opciones
    for (const it of payload.items as CreateOrderItemInput[]) {
      const basePrice = await fetchProductBase(client, it.product_id);
      const variantModifier = it.variant_id ? await fetchVariantModifier(client, it.variant_id) : 0;

      const { sumModifiers, optionDetails } = await fetchOptionModifiers(client, it.options || []);

      const unitPrice = basePrice + variantModifier + sumModifiers; // price por unidad
      const quantity = it.quantity && it.quantity > 0 ? it.quantity : 1;
      const subtotal = unitPrice * quantity;

      const insertItemQ = `
        INSERT INTO public.order_items (order_id, product_id, variant_id, quantity, unit_price, subtotal, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;
      const { rows: insertedItems } = await client.query(insertItemQ, [
        createdOrder.id,
        it.product_id,
        it.variant_id || null,
        quantity,
        unitPrice,
        subtotal,
        it.notes || null
      ]);
      const insertedItem = insertedItems[0];

      // insertar order_item_options
      if (optionDetails.length) {
        const insertOptQ = `
          INSERT INTO public.order_item_options (order_item_id, option_id, quantity, price_modifier)
          VALUES
          ${optionDetails.map((_, idx) => `($1, $${idx*3+2}, $${idx*3+3}, $${idx*3+4})`).join(", ")}
          RETURNING *
        `;
        // construir valores dinámicamente
        const values: any[] = [insertedItem.id];
        for (const od of optionDetails) {
          values.push(od.option_id, od.quantity, od.price_modifier);
        }
        await client.query(insertOptQ, values);
      }
      // triggers deberían actualizar orders.total automáticamente
    }

    await client.query("COMMIT");
    const full = await getOrderByIdService(createdOrder.id);
    return full;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};



export const createOrderProductsService = async (payload: any) => {
const { status, payment_status, payment_method, source, items } = payload;

// Validaciones mínimas
if (!items || !Array.isArray(items) || items.length === 0) {
throw new Error("Order must include items");
}


console.log("Creating order with items:", payload);
return runInTransaction(async (client) => {

//
// 1️⃣ Crear la orden
//
const orderRes = await client.query(
  `
  INSERT INTO orders (status, payment_status, payment_method, source)
  VALUES ($1, $2, $3, $4)
  RETURNING id
  `,
  [status, payment_status, payment_method, source]
);

const orderId = orderRes.rows[0].id;

//
// 2️⃣ Insertar items usando un solo INSERT (batch)
//     Los precios y subtotales los calcula la BD
//
const values = items.flatMap(i => [i.product_id, i.quantity]);

const valueRows = items
  .map((_, i) => `($${i*2+2}::BIGINT, $${i*2+3}::INTEGER)`)
  .join(", ");

  console.log("orderId:", orderId );
  console.log( values );
  console.log( valueRows );
const sql = `
  INSERT INTO order_items (order_id, product_id, quantity, unit_price)
  SELECT 
    $1,
    p.id,
    v.quantity,
    p.base_price
   -- ,p.base_price * v.quantity
  FROM products p
  JOIN (VALUES ${valueRows}) AS v(product_id, quantity)
    ON v.product_id = p.id
`;
console.log("Executing SQL:", sql); 
const detOreder =  await client.query({
  text: sql,
  values: [orderId, ...values.flat()],
  name: `insert_order_items_${Date.now()}`
});
//
// 3️⃣ Listo: los triggers se encargan de recalcular total
//
console.log(detOreder);
return {
  ok: true,
  order_id: orderId
};

});
};

export const updateOrderStatusService = async (orderId: number, status: string) => {
  const query = `
    UPDATE public.orders
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  const { rows } = await postgresPool.query(query, [status, orderId]);
  return rows[0];
};

/**
 * Endpoint para marcar pago completado (placeholder).
 * En producción debes verificar webhook de MercadoPago y solo luego setear approved.
 */
export const markOrderPaidService = async (orderId: number, paymentInfo: { method?: string; provider_id?: string } = {}) => {
  const query = `
    UPDATE public.orders
    SET payment_status = 'approved',
        payment_method = COALESCE($2, payment_method),
        status = 'paid',
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const { rows } = await postgresPool.query(query, [orderId, paymentInfo.method || null]);
  return rows[0];
};

/* --- Order Items CRUD (used by controllers) --- */

export const addOrderItemService = async (orderId: number, item: CreateOrderItemInput) => {
  const client = await postgresPool.connect();
  try {
    await client.query("BEGIN");

    const basePrice = await fetchProductBase(client, item.product_id);
    const variantModifier = item.variant_id ? await fetchVariantModifier(client, item.variant_id) : 0;
    const { sumModifiers, optionDetails } = await fetchOptionModifiers(client, item.options || []);

    const unitPrice = basePrice + variantModifier + sumModifiers;
    const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
    const subtotal = unitPrice * quantity;

    const insertItemQ = `
      INSERT INTO public.order_items (order_id, product_id, variant_id, quantity, unit_price, subtotal, notes, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    const { rows: inserted } = await client.query(insertItemQ, [
      orderId, item.product_id, item.variant_id || null, quantity, unitPrice, subtotal, item.notes || null
    ]);
    const insertedItem = inserted[0];

    // insertar options si hay
    if (optionDetails.length) {
      const insertOptQ = `
        INSERT INTO public.order_item_options (order_item_id, option_id, quantity, price_modifier)
        VALUES
        ${optionDetails.map((_, idx) => `($1, $${idx*3+2}, $${idx*3+3}, $${idx*3+4})`).join(", ")}
        RETURNING *
      `;
      const values: any[] = [insertedItem.id];
      for (const od of optionDetails) values.push(od.option_id, od.quantity, od.price_modifier);
      await client.query(insertOptQ, values);
    }

    await client.query("COMMIT");
    return insertedItem;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const updateOrderItemService = async (orderItemId: number, updates: Partial<CreateOrderItemInput & { quantity?: number; notes?: string }>) => {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.product_id !== undefined) {
    fields.push(`product_id = $${idx++}`);
    values.push(updates.product_id);
  }
  if (updates.variant_id !== undefined) {
    fields.push(`variant_id = $${idx++}`);
    values.push(updates.variant_id);
  }
  if (updates.quantity !== undefined) {
    fields.push(`quantity = $${idx++}`);
    values.push(updates.quantity);
  }
  if (updates.notes !== undefined) {
    fields.push(`notes = $${idx++}`);
    values.push(updates.notes);
  }

  if (fields.length === 0) throw new Error("No fields to update");

  // recompute unit_price and subtotal if product/variant/quantity changed
  // For simplicity: if product_id or variant_id or quantity was provided, recompute
  let recompute = !!(updates.product_id || updates.variant_id || updates.quantity);
  // get the order_id for returning later
  const client = await postgresPool.connect();
  try {
    await client.query("BEGIN");

    // If recompute, fetch base_price and modifier (use current values if not provided)
    let orderItemQ = `SELECT * FROM public.order_items WHERE id = $1`;
    const { rows: oiRows } = await client.query(orderItemQ, [orderItemId]);
    if (!oiRows[0]) throw new Error("Order item not found");
    const current = oiRows[0];

    const productId = updates.product_id ?? current.product_id;
    const variantId = updates.variant_id ?? current.variant_id;
    const quantity = updates.quantity ?? current.quantity;

    let basePrice = 0, modifier = 0;
    const prodQ = `SELECT base_price FROM public.products WHERE id = $1`;
    const { rows: prodRows } = await client.query(prodQ, [productId]);
    if (!prodRows[0]) throw new Error(`Product ${productId} not found`);
    basePrice = Number(prodRows[0].base_price) || 0;

    if (variantId) {
      const varQ = `SELECT price_modifier FROM public.product_variants WHERE id = $1`;
      const { rows: varRows } = await client.query(varQ, [variantId]);
      if (!varRows[0]) throw new Error(`Variant ${variantId} not found`);
      modifier = Number(varRows[0].price_modifier) || 0;
    }

    const unitPrice = basePrice + modifier;
    const subtotal = unitPrice * quantity;

    // add unit_price and subtotal to updates
    fields.push(`unit_price = $${idx++}`);
    values.push(unitPrice);
    fields.push(`subtotal = $${idx++}`);
    values.push(subtotal);

    // build update
    values.push(orderItemId);
    const updateQuery = `
      UPDATE public.order_items
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *
    `;
    const { rows: updatedRows } = await client.query(updateQuery, values);

    await client.query("COMMIT");
    return updatedRows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const deleteOrderItemService = async (orderItemId: number) => {
  // soft delete pattern: we can remove row or keep and mark quantity 0; here we delete row physically
  const query = `
    DELETE FROM public.order_items
    WHERE id = $1
    RETURNING *
  `;
  const { rows } = await postgresPool.query(query, [orderItemId]);
  return rows[0];
};

import { postgresPool } from "../../config/postgres";

/**
 * Tipos mínimos para inputs (puedes mover a .types.ts)
 */
type CreateOrderItemInput = {
  product_id: number;
  variant_id?: number | null;
  quantity?: number;
  notes?: string | null;
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

/**
 * Crea un pedido y sus items en una transacción.
 * Para calcular unit_price: toma products.base_price + variant.price_modifier (si aplica).
 */
export const createOrderService = async (payload: CreateOrderInput) => {
  const client = await postgresPool.connect();
  try {
    await client.query("BEGIN");

    const insertOrderQuery = `
      INSERT INTO public.orders (status, payment_status, payment_method, total, created_at, updated_at, source, notes)
      VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6)
      RETURNING *
    `;
    const defaultSource = payload.source || "kiosk";
    const { rows: [createdOrder] } = await client.query(insertOrderQuery, [
      "pending",
      "pending",
      payload.payment_method || null,
      0, // total inicial (se actualizará por trigger)
      defaultSource,
      payload.notes || null
    ]);

    // Insert items
    for (const it of payload.items) {
      // Obtener precios base y modifier
      const prodQ = `SELECT base_price FROM public.products WHERE id = $1`;
      const { rows: prodRows } = await client.query(prodQ, [it.product_id]);
      if (!prodRows[0]) throw new Error(`Product ${it.product_id} not found`);

      const basePrice = Number(prodRows[0].base_price) || 0;
      let modifier = 0;
      if (it.variant_id) {
        const varQ = `SELECT price_modifier FROM public.product_variants WHERE id = $1`;
        const { rows: varRows } = await client.query(varQ, [it.variant_id]);
        if (!varRows[0]) throw new Error(`Variant ${it.variant_id} not found`);
        modifier = Number(varRows[0].price_modifier) || 0;
      }

      const unitPrice = basePrice + modifier;
      const quantity = it.quantity && it.quantity > 0 ? it.quantity : 1;

      const insertItemQ = `
        INSERT INTO public.order_items (order_id, product_id, variant_id, quantity, unit_price, subtotal, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;
      const subtotal = Number(unitPrice) * quantity;
      await client.query(insertItemQ, [
        createdOrder.id,
        it.product_id,
        it.variant_id || null,
        quantity,
        unitPrice,
        subtotal,
        it.notes || null
      ]);
      // note: triggers on order_items should update orders.total
    }

    // Re-read order with items
    await client.query("COMMIT");
    const fullOrder = await getOrderByIdService(createdOrder.id);
    return fullOrder;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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
  // calculate unit price like in createOrderService
  const client = await postgresPool.connect();
  try {
    await client.query("BEGIN");

    const prodQ = `SELECT base_price FROM public.products WHERE id = $1`;
    const { rows: prodRows } = await client.query(prodQ, [item.product_id]);
    if (!prodRows[0]) throw new Error(`Product ${item.product_id} not found`);
    const basePrice = Number(prodRows[0].base_price) || 0;

    let modifier = 0;
    if (item.variant_id) {
      const varQ = `SELECT price_modifier FROM public.product_variants WHERE id = $1`;
      const { rows: varRows } = await client.query(varQ, [item.variant_id]);
      if (!varRows[0]) throw new Error(`Variant ${item.variant_id} not found`);
      modifier = Number(varRows[0].price_modifier) || 0;
    }

    const unitPrice = basePrice + modifier;
    const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
    const subtotal = unitPrice * quantity;

    const insertQ = `
      INSERT INTO public.order_items (order_id, product_id, variant_id, quantity, unit_price, subtotal, notes, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    const { rows: inserted } = await client.query(insertQ, [
      orderId,
      item.product_id,
      item.variant_id || null,
      quantity,
      unitPrice,
      subtotal,
      item.notes || null
    ]);

    await client.query("COMMIT");
    return inserted[0];
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

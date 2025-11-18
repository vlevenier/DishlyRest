import { postgresPool } from "../../config/postgres";

export const getComboItemsService = async (comboId: number) => {
  const query = `
    SELECT ci.id, ci.combo_product_id, ci.item_product_id, p.name AS item_name,
           ci.quantity, ci.position, ci.active, ci.created_at
    FROM public.combo_items ci
    JOIN public.products p ON p.id = ci.item_product_id
    WHERE ci.combo_product_id = $1 AND ci.active = true
    ORDER BY ci.position ASC
  `;
  const { rows } = await postgresPool.query(query, [comboId]);
  return rows;
};


export const addComboItemService = async (data: {
  combo_product_id: number;
  item_product_id: number;
  quantity: number;
  position?: number;
}) => {
  const query = `
    INSERT INTO public.combo_items (combo_product_id, item_product_id, quantity, position)
    VALUES ($1, $2, $3, COALESCE($4, 0))
    RETURNING *;
  `;

  const values = [
    data.combo_product_id,
    data.item_product_id,
    data.quantity,
    data.position ?? null
  ];

  const { rows } = await postgresPool.query(query, values);
  return rows[0];
};


export const updateComboItemService = async (id: number, updates: any) => {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key in updates) {
    fields.push(`"${key}" = $${idx}`);
    values.push(updates[key]);
    idx++;
  }

  values.push(id);

  const query = `
    UPDATE public.combo_items
    SET ${fields.join(", ")}
    WHERE id = $${idx}
    RETURNING *;
  `;

  const { rows } = await postgresPool.query(query, values);
  return rows[0];
};


export const deleteComboItemService = async (id: number) => {
  const query = `
    UPDATE public.combo_items
    SET active = false
    WHERE id = $1
    RETURNING *;
  `;

  const { rows } = await postgresPool.query(query, [id]);
  return rows[0];
};

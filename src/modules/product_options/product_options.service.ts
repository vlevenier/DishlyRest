import { postgresPool } from "../../config/postgres";

export const getOptionsByProductService = async (productId: number) => {
  const query = `
    SELECT id, product_id, name, price_modifier, allow_quantity, position, active, created_at
    FROM product_options
    WHERE product_id = $1 AND active = true
    ORDER BY position ASC, id ASC
  `;
  const { rows } = await postgresPool.query(query, [productId]);
  return rows;
};

export const createOptionService = async (body: any) => {
  const { product_id, name, price_modifier, allow_quantity, position } = body;

  const query = `
    INSERT INTO product_options (product_id, name, price_modifier, allow_quantity, position)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [
    product_id,
    name,
    price_modifier,
    allow_quantity ?? false,
    position || 1,
  ];

  const { rows } = await postgresPool.query(query, values);
  return rows[0];
};

export const updateOptionService = async (id: number, body: any) => {
  const { name, price_modifier, allow_quantity, position, active } = body;

  const query = `
    UPDATE product_options
    SET name = $1,
        price_modifier = $2,
        allow_quantity = $3,
        position = $4,
        active = $5
    WHERE id = $6
    RETURNING *
  `;

  const values = [
    name,
    price_modifier,
    allow_quantity,
    position,
    active,
    id,
  ];

  const { rows } = await postgresPool.query(query, values);
  return rows[0];
};

export const softDeleteOptionService = async (id: number) => {
  const query = `
    UPDATE product_options
    SET active = false
    WHERE id = $1
    RETURNING *
  `;

  const { rows } = await postgresPool.query(query, [id]);
  return rows[0];
};

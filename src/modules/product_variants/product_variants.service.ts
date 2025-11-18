import { postgresPool } from "../../config/postgres";

export const getVariantsByProductService = async (productId: number) => {
  const query = `
    SELECT id, product_id, name, price_modifier, position, active, created_at
    FROM product_variants
    WHERE product_id = $1 AND active = true
    ORDER BY position ASC, id ASC
  `;
  const { rows } = await postgresPool.query(query, [productId]);
  return rows;
};

export const createVariantService = async (body: any) => {
  const { product_id, name, price_modifier, position } = body;

  const query = `
    INSERT INTO product_variants (product_id, name, price_modifier, position)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const values = [product_id, name, price_modifier, position || 1];

  const { rows } = await postgresPool.query(query, values);
  return rows[0];
};

export const updateVariantService = async (id: number, body: any) => {
  const { name, price_modifier, position, active } = body;

  const query = `
    UPDATE product_variants
    SET name = $1,
        price_modifier = $2,
        position = $3,
        active = $4
    WHERE id = $5
    RETURNING *
  `;

  const values = [name, price_modifier, position, active, id];

  const { rows } = await postgresPool.query(query, values);
  return rows[0];
};

export const softDeleteVariantService = async (id: number) => {
  const query = `
    UPDATE product_variants
    SET active = false
    WHERE id = $1
    RETURNING *
  `;
  const { rows } = await postgresPool.query(query, [id]);
  return rows[0];
};

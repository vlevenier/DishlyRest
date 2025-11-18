import { postgresPool } from "../../config/postgres";

export const getAllProducts = async () => {
  const query = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.name ASC;
  `;
  const { rows } = await postgresPool.query(query);
  return rows;
};

export const getProductById = async (id: number) => {
  const query = `SELECT * FROM products WHERE id = $1`;
  const { rows } = await postgresPool.query(query, [id]);
  return rows[0];
};

export const createProduct = async (data: {
  category_id: number;
  name: string;
  description?: string;
  base_price: number;
  image_url?: string;
  is_combo: boolean;
}) => {
  const query = `
    INSERT INTO products (category_id, name, description, base_price, image_url, is_combo)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const params = [
    data.category_id,
    data.name,
    data.description || null,
    data.base_price,
    data.image_url || null,
    data.is_combo
  ];

  const { rows } = await postgresPool.query(query, params);
  return rows[0];
};

export const updateProduct = async (id: number, data: {
  category_id: number;
  name: string;
  description?: string;
  base_price: number;
  image_url?: string;
  is_combo: boolean;
  active: boolean;
}) => {
  const query = `
    UPDATE products
    SET category_id = $1, name = $2, description = $3, base_price = $4,
        image_url = $5, is_combo = $6, active = $7
    WHERE id = $8
    RETURNING *;
  `;

  const params = [
    data.category_id,
    data.name,
    data.description || null,
    data.base_price,
    data.image_url || null,
    data.is_combo,
    data.active,
    id
  ];

  const { rows } = await postgresPool.query(query, params);
  return rows[0];
};

export const deleteProduct = async (id: number) => {
  const query = `DELETE FROM products WHERE id = $1 RETURNING id`;
  const { rows } = await postgresPool.query(query, [id]);
  return rows[0];
};

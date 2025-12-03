
import { postgresPool } from "../../config/postgres";

export const getAllCategories = async () => {
  const query = `
    SELECT id, name, description, active, created_at
    FROM categories
    where active = true
    ORDER BY name ASC;
  `;

  const { rows } = await postgresPool.query(query);
  return rows;
};

export const createCategory = async (name: string, description: string) => {
  const query = `
    INSERT INTO categories (name, description)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const { rows } = await postgresPool.query(query, [name, description]);
  return rows[0];
};

export const updateCategory = async (id: number, name: string, description: string, isActive: boolean) => {
  const query = `
    UPDATE categories
    SET name = $1, description = $2, is_active = $3
    WHERE id = $4
    RETURNING *;
  `;

  const { rows } = await postgresPool.query(query, [name, description, isActive, id]);
  return rows[0];
};

export const deleteCategory = async (id: number) => {
  const query = `
    DELETE FROM categories
    WHERE id = $1
    RETURNING id;
  `;

  const { rows } = await postgresPool.query(query, [id]);
  return rows[0];
};

export const softDeleteCategory = async (id: number) => {
  const query = `
    UPDATE categories 
    SET active = false
    WHERE id = $1
    RETURNING id;
  `;
  const { rows } = await postgresPool.query(query, [id]);
  return rows[0];
};
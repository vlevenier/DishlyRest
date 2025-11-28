import { postgresPool } from "../../config/postgres";


export const getRecipeByVariant = async (variantId: number) => {
  const query = `
    SELECT pr.*, i.name as ingredient_name
    FROM product_recipe pr
    LEFT JOIN ingredients i ON i.id = pr.ingredient_id
    WHERE pr.product_variant_id = $1
    ORDER BY pr.id ASC;
  `;
  const { rows } = await postgresPool.query(query, [variantId]);
  return rows;
};

export const createRecipeItem = async (data: {
  product_variant_id: number;
  ingredient_id: number;
  quantity_base_per_unit: number;
}) => {
  const query = `
    INSERT INTO product_recipe (product_variant_id, ingredient_id, quantity_base_per_unit)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const params = [
    data.product_variant_id,
    data.ingredient_id,
    data.quantity_base_per_unit
  ];
  const { rows } = await postgresPool.query(query, params);
  return rows[0];
};

export const updateRecipeItem = async (id: number, data: {
  product_variant_id: number;
  ingredient_id: number;
  quantity_base_per_unit: number;
}) => {
  const query = `
    UPDATE product_recipe
    SET ingredient_id = $1,
        quantity_base_per_unit = $2
    WHERE id = $3 AND product_variant_id = $4
    RETURNING *;
  `;
  const params = [
    data.ingredient_id,
    data.quantity_base_per_unit,
    id,
    data.product_variant_id
  ];
  const { rows } = await postgresPool.query(query, params);
  return rows[0];
};

export const deleteRecipeItem = async (id: number) => {
  const query = `DELETE FROM product_recipe WHERE id = $1;`;
  await postgresPool.query(query, [id]);
};

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
  quantity_original: number;
ingredient_unit_id: number | null;
}) => {
  const query = `
    INSERT INTO product_recipe (product_variant_id, ingredient_id, quantity_original,ingredient_unit_id)
    VALUES ($1, $2, $3,$4)
    RETURNING *;
  `;
  const params = [
    data.product_variant_id,
    data.ingredient_id,
    data.quantity_original,
    data.ingredient_unit_id
  ];
  const { rows } = await postgresPool.query(query, params);
  return rows[0];
};

export const updateRecipeItem = async (
  id: number,
  data: {
    product_variant_id: number;
    ingredient_id: number;
    quantity_original: number;
    ingredient_unit_id: number | null;
  }
) => {
  const query = `
    UPDATE product_recipe
    SET ingredient_id = $1,
        quantity_original = $2,
        ingredient_unit_id = $3
    WHERE id = $4 AND product_variant_id = $5
    RETURNING *;
  `;

  const params = [
    data.ingredient_id,
    data.quantity_original,
    data.ingredient_unit_id,
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

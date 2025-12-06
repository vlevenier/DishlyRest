import { postgresPool } from "../../config/postgres";
export const getAllProducts = async () => {
  const query = `
    SELECT 
      p.*,
      c.name AS category_name,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', v.id,
            'name', v.name,
            'price_modifier', v.price_modifier,
            'position', v.position,
            'active', v.active,
            'recipes',
              COALESCE(
                (
                  SELECT json_agg(
                    jsonb_build_object(
                      'id', pr.id,
                      'ingredient_id', pr.ingredient_id,
                      'quantity_base_per_unit', pr.quantity_base_per_unit,
                      'ingredient_name', i.name,
                      'ingredient_unit_id', pr.ingredient_unit_id,
                      'quantity_original', pr.quantity_original
                    )
                  )
                  FROM product_recipe pr
                  inner join ingredients i ON i.id = pr.ingredient_id
                  WHERE pr.product_variant_id = v.id
                ),
                '[]'::json
              )
          )
        ) FILTER (WHERE v.id IS NOT NULL),
        '[]'
      ) AS variants
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_variants v ON v.product_id = p.id
    where p.active = true
    GROUP BY p.id, c.name
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


  try{
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
} catch (error) {
  console.error("Error updating product:", error);
  throw error;
}
};

export const deleteProduct = async (id: number) => {
  const query = `DELETE FROM products WHERE id = $1 RETURNING id`;
  const { rows } = await postgresPool.query(query, [id]);
  return rows[0];
};


export const softDeleteProduct = async (id: number) => {
  const query = `
    UPDATE products
    SET active = FALSE
    WHERE id = $1
    RETURNING id;
  `;
  const { rows } = await postgresPool.query(query, [id]);
  return rows[0];
};
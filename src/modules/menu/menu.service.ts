// src/services/menu.service.ts

import { postgresPool } from "../../config/postgres";


export const menuService = {
  async getFullMenu() {
    const query = `
      WITH variants_with_recipes AS (
        SELECT 
          v.id AS variant_id,
          v.product_id,
          jsonb_build_object(
            'id', v.id,
            'name', v.name,
            'price_modifier', v.price_modifier,
            'position', v.position,
            'active', v.active,
            'recipes', COALESCE(
              (
                SELECT json_agg(
                  jsonb_build_object(
                    'id', pr.id,
                    'ingredient_id', pr.ingredient_id,
                    'quantity_base_per_unit', pr.quantity_base_per_unit,
                    'ingredient_name', i.name,
                    'ingredient_unit', i.base_unit
                  )
                )
                FROM product_recipe pr
                JOIN ingredients i ON i.id = pr.ingredient_id
                WHERE pr.product_variant_id = v.id
              ), '[]'::json
            )
          ) AS variant_json
        FROM product_variants v
        WHERE v.active = true
      ),
      products_with_variants AS (
        SELECT 
          p.id AS product_id,
          p.category_id,
          jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'description', p.description,
            'base_price', p.base_price,
            'image_url', p.image_url,
            'is_combo', p.is_combo,
            'variants', COALESCE(
              json_agg(vwr.variant_json ORDER BY vwr.variant_id),
              '[]'::json
            )
          ) AS product_json
        FROM products p
        LEFT JOIN variants_with_recipes vwr ON vwr.product_id = p.id
        WHERE p.active = true
        GROUP BY p.id
      )
      SELECT 
        c.id,
        c.name,
        c.description,
        c.position,
        c.image_url,
        COALESCE(
          json_agg(pwv.product_json ORDER BY pwv.product_id),
          '[]'
        ) AS products
      FROM categories c
      LEFT JOIN products_with_variants pwv ON pwv.category_id = c.id
      WHERE c.active = true
      GROUP BY c.id
      ORDER BY c.position;
    `;

    const { rows } = await postgresPool.query(query);

    return rows;
  }
};

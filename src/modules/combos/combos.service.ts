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


export const getAllCombosService = async () => {
  const query = `
    SELECT 
      p.*,
      c.name AS category_name,

      -- ITEMS DEL COMBO
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', ci.id,
            'quantity', ci.quantity,
            'position', ci.position,

            -- PRODUCTO DEL ITEM
            'product', jsonb_build_object(
              'id', ip.id,
              'name', ip.name,
              'base_price', ip.base_price,
              'image_url', ip.image_url
            ),

            -- VARIANTE POR DEFECTO DEL PRODUCTO
            'default_variant', (
              SELECT jsonb_build_object(
                'id', pv.id,
                'name', pv.name,
                'price_modifier', pv.price_modifier
              )
              FROM product_variants pv
              WHERE pv.product_id = ip.id
              ORDER BY pv.position ASC
              LIMIT 1
            ),

            -- PRECIO FINAL DEL ITEM (base_price + modifier) * cantidad
            'item_final_price', (
              (
                ip.base_price +
                COALESCE(
                  (
                    SELECT pv2.price_modifier
                    FROM product_variants pv2
                    WHERE pv2.product_id = ip.id
                    ORDER BY pv2.position ASC
                    LIMIT 1
                  ),
                  0
                )
              ) * ci.quantity
            )
          )
        ) FILTER (WHERE ci.id IS NOT NULL),
        '[]'
      ) AS items,

      -- PRECIO TOTAL CALCULADO DEL COMBO
      (
        SELECT SUM(
          (
            ip2.base_price +
            COALESCE(
              (
                SELECT pv3.price_modifier
                FROM product_variants pv3
                WHERE pv3.product_id = ip2.id
                ORDER BY pv3.position ASC
                LIMIT 1
              ),
              0
            )
          ) * ci2.quantity
        )
        FROM combo_items ci2
        INNER JOIN products ip2 ON ip2.id = ci2.item_product_id
        WHERE ci2.combo_product_id = p.id
      ) AS combo_total_price

    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN combo_items ci ON ci.combo_product_id = p.id
    LEFT JOIN products ip ON ip.id = ci.item_product_id
    WHERE p.is_combo = true
    GROUP BY p.id, c.name
    ORDER BY p.name ASC;
  `;

  const { rows } = await postgresPool.query(query);
  return rows;
};


export const getComboDetailService = async (comboId: number) => {
  // 1) Obtener info del combo
  const comboQuery = `
    SELECT id, name, image_url, base_price
    FROM products
    WHERE id = $1 AND is_combo = true AND active = true;
  `;
  const comboRes = await postgresPool.query(comboQuery, [comboId]);
  if (comboRes.rowCount === 0) return null;

  const combo = comboRes.rows[0];

  // 2) Obtener items + variante default
  const itemsQuery = `
    SELECT 
      ci.id AS combo_item_id,
      ci.item_product_id,
      p.name AS item_name,
      ci.quantity,
      v.id AS variant_id,
      v.name AS variant_name,
      v.price_modifier AS variant_price_modifier
    FROM combo_items ci
    JOIN products p ON p.id = ci.item_product_id
    JOIN LATERAL (
      SELECT pv.*
      FROM product_variants pv
      WHERE pv.product_id = ci.item_product_id
      ORDER BY pv.position ASC
      LIMIT 1
    ) v ON true
    WHERE ci.combo_product_id = $1 AND ci.active = true
    ORDER BY ci.position ASC;
  `;
  const itemsRes = await postgresPool.query(itemsQuery, [comboId]);

  // 3) Obtener ingredientes totales
  const ingredientsQuery = `
    SELECT
      pr.ingredient_id,
      i.name AS ingredient_name,
      u.name AS unit_name,
      SUM(pr.quantity_base_per_unit * ci.quantity) AS quantity_total
    FROM combo_items ci
    JOIN LATERAL (
      SELECT pv.*
      FROM product_variants pv
      WHERE pv.product_id = ci.item_product_id
      ORDER BY pv.position ASC
      LIMIT 1
    ) v ON true
    JOIN product_recipe pr ON pr.product_variant_id = v.id
    JOIN ingredients i ON i.id = pr.ingredient_id
    JOIN units u ON u.id = pr.ingredient_unit_id
    WHERE ci.combo_product_id = $1 AND ci.active = true
    GROUP BY pr.ingredient_id, i.name, u.name;
  `;
  const ingRes = await postgresPool.query(ingredientsQuery, [comboId]);

  // 4) Precio final (base + modificaciones de variantes si algún día cambias la lógica)
  let priceFinal = combo.base_price;

  combo.items = itemsRes.rows;
  combo.ingredients = ingRes.rows;
  combo.price_final = priceFinal;

  return combo;
};




export const createComboService = async (data: {
  name: string;
  base_price: number;
  items: { product_id: number; quantity: number }[];
}) => {
  const client = await postgresPool.connect();

  try {
    await client.query("BEGIN");

    // 1) Insert en products como combo
    const insertProductQuery = `
      INSERT INTO products (name, base_price, is_combo, active)
      VALUES ($1, $2, true, true)
      RETURNING id, name, base_price, is_combo;
    `;
    const { rows: productRows } = await client.query(insertProductQuery, [
      data.name,
      data.base_price
    ]);

    const comboId = productRows[0].id;

    // 2) Insert items del combo (validando que no sean combos)
    const insertItemQuery = `
      INSERT INTO combo_items (combo_product_id, item_product_id, quantity, position)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    let position = 0;

    for (const item of data.items) {
      // Validación: no permitir productos que sean combo
      const { rows: prodCheck } = await client.query(
        `SELECT is_combo FROM products WHERE id = $1`,
        [item.product_id]
      );

      if (!prodCheck.length) {
        throw new Error(`Product ${item.product_id} does not exist`);
      }

      if (prodCheck[0].is_combo === true) {
        throw new Error(
          `Product ${item.product_id} is a combo. Nested combos are not allowed`
        );
      }

      await client.query(insertItemQuery, [
        comboId,
        item.product_id,
        item.quantity,
        position++
      ]);
    }

    await client.query("COMMIT");

    return {
      id: comboId,
      name: data.name,
      base_price: data.base_price,
      items: data.items
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

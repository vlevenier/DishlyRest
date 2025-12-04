import { postgresPool } from "../../config/postgres";

export const ingredientsService = {
async getAll() {
  const result = await postgresPool.query(`
    SELECT 
      i.id,
      i.name,
      i.base_unit,
      i.is_active,
      i.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', iu.id,
            'unit_name', iu.unit_name,
            'ratio_to_base', iu.ratio_to_base
          )
        ) FILTER (WHERE iu.id IS NOT NULL),
      '[]') AS units
    FROM ingredients i
    LEFT JOIN ingredient_units iu ON iu.ingredient_id = i.id --and iu.is_base = false
    GROUP BY i.id
    ORDER BY i.created_at DESC
  `);

  return result.rows;
}
,

  async getById(id: number) {
    const ingredientResult = await postgresPool.query(
      `SELECT id, name, base_unit, is_active, created_at
       FROM ingredients
       WHERE id = $1`,
      [id]
    );

    if (ingredientResult.rowCount === 0) {
      const error: any = new Error("Ingrediente no encontrado");
      error.status = 404;
      throw error;
    }

    const ingredient = ingredientResult.rows[0];

    const units = await postgresPool.query(
      `SELECT id, unit_name, ratio_to_base
       FROM ingredient_units
       WHERE ingredient_id = $1`,
      [id]
    );

    return {
      ...ingredient,
      units: units.rows
    };
  },

async create(data: any) {
  const { name, base_unit, is_active, units = [] } = data;

  if (!name) throw Object.assign(new Error("El nombre es obligatorio"), { status: 400 });
  if (!base_unit) throw Object.assign(new Error("La unidad base es obligatoria"), { status: 400 });

  const client = await postgresPool.connect();

  try {
    await client.query("BEGIN");

    // 1) Crear ingrediente
    const ingredientRes = await client.query(
      `INSERT INTO ingredients (name, base_unit, is_active)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), base_unit.trim(), is_active ?? true]
    );

    const ingredient = ingredientRes.rows[0];

    // 2) Insertar unidad base (is_base = true)
    await client.query(
      `INSERT INTO ingredient_units (ingredient_id, unit_name, ratio_to_base, is_base)
       VALUES ($1, $2, 1, true)`,
      [ingredient.id, base_unit]
    );

    // 3) Insertar unidades adicionales
    for (const u of units) {
      await client.query(
        `INSERT INTO ingredient_units (ingredient_id, unit_name, ratio_to_base, is_base)
         VALUES ($1, $2, $3, false)`,
        [ingredient.id, u.unit_name.trim(), u.ratio_to_base]
      );
    }

    await client.query("COMMIT");
    return ingredient;

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
,

async update(id: number, data: any) {
  const { name, base_unit, is_active, units = [] } = data;

  const client = await postgresPool.connect();

  try {
    await client.query("BEGIN");

    // -------------------------
    // 1) Actualizar ingrediente
    // -------------------------
    const ingredientRes = await client.query(
      `UPDATE ingredients
       SET name = COALESCE($2, name),
           base_unit = COALESCE($3, base_unit),
           is_active = COALESCE($4, is_active)
       WHERE id = $1
       RETURNING *`,
      [id, name, base_unit, is_active]
    );

    if (ingredientRes.rowCount === 0) {
      throw Object.assign(new Error("Ingrediente no encontrado"), { status: 404 });
    }

    const ingredient = ingredientRes.rows[0];

    // ---------------------------------------------------
    // 2) Tomar unidades actuales y preparar la actualización
    // ---------------------------------------------------
    const dbUnits = await client.query(
      `SELECT id FROM ingredient_units WHERE ingredient_id = $1 AND is_base = false`,
      [id]
    );

    const existingIds = dbUnits.rows.map((u) => u.id);
    const incomingIds = units.filter((u) => u.id).map((u) => u.id);

    // 2.1) Eliminar unidades que ya no vienen del front
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

    if (toDelete.length > 0) {
      await client.query(
        `DELETE FROM ingredient_units
         WHERE ingredient_id = $1 AND id = ANY($2)`,
        [id, toDelete]
      );
    }

    // -------------------------------
    // 3) Insertar / Actualizar unidades
    // -------------------------------
    for (const u of units) {
      if (u.id) {
        // Update unidad extra existente
        await client.query(
          `UPDATE ingredient_units
           SET unit_name = $2,
               ratio_to_base = $3
           WHERE id = $1`,
          [u.id, u.unit_name.trim(), u.ratio_to_base]
        );
      } else {
        // Insert unidad nueva
        await client.query(
          `INSERT INTO ingredient_units (ingredient_id, unit_name, ratio_to_base, is_base)
           VALUES ($1, $2, $3, false)`,
          [id, u.unit_name.trim(), u.ratio_to_base]
        );
      }
    }

    // -------------------------------------------------------
    // 4) Si cambió la base_unit → actualizarla en la tabla base
    // -------------------------------------------------------
    if (base_unit) {
      await client.query(
        `UPDATE ingredient_units
         SET unit_name = $2
         WHERE ingredient_id = $1 AND is_base = true`,
        [id, base_unit.trim()]
      );
    }

    await client.query("COMMIT");
    return ingredient;

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
,
async update_(id: number, data: any) {
  const { name, base_unit } = data;

  // 1. Actualizar ingrediente
  const result = await postgresPool.query(
    `UPDATE ingredients
       SET name = COALESCE($2, name),
           base_unit = COALESCE($3, base_unit)
       WHERE id = $1
       RETURNING *`,
    [id, name, base_unit]
  );

  if (result.rowCount === 0) {
    const err: any = new Error("Ingrediente no encontrado");
    err.status = 404;
    throw err;
  }

  // 2. Si no se cambió la unidad base → listo
  if (!base_unit) return result.rows[0];

  // 3. Si cambió, actualizar unidad base en conversions (solo la fila ratio = 1 si existe)
  await postgresPool.query(
    `UPDATE ingredient_units
       SET unit_name = $2
     WHERE ingredient_id = $1
       AND ratio_to_base = 1`,
    [id, base_unit]
  );

  return result.rows[0];
},

  async deactivate(id: number) {
    const result = await postgresPool.query(
      `UPDATE ingredients
       SET is_active = FALSE
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      const err: any = new Error("Ingrediente no encontrado");
      err.status = 404;
      throw err;
    }
  },

  async addUnit(ingredientId: number, unitData: any) {
    const { unit_name, ratio_to_base } = unitData;

    if (!unit_name || !ratio_to_base) {
      const err: any = new Error("unit_name y ratio_to_base son obligatorios");
      err.status = 400;
      throw err;
    }

    const exists = await postgresPool.query(
      "SELECT id FROM ingredients WHERE id = $1",
      [ingredientId]
    );

    if (exists.rowCount === 0) {
      const err: any = new Error("Ingrediente no encontrado");
      err.status = 404;
      throw err;
    }

    const result = await postgresPool.query(
      `INSERT INTO ingredient_units (ingredient_id, unit_name, ratio_to_base)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [ingredientId, unit_name, ratio_to_base]
    );

    return result.rows[0];
  },


   async saveFull(data: any) {
    const client = await postgresPool.connect();
    try {
      await client.query("BEGIN");

      const { id, name, base_unit, units = [] } = data;

      let ingredientId = id;

      // -----------------------------------
      // 1) Crear o actualizar ingrediente
      // -----------------------------------
      if (!ingredientId) {
        const insertIngredient = await client.query(
          `INSERT INTO ingredients (name, base_unit)
           VALUES ($1, $2)
           RETURNING id`,
          [name, base_unit]
        );
        ingredientId = insertIngredient.rows[0].id;
      } else {
        await client.query(
          `UPDATE ingredients
           SET name = $2, base_unit = $3
           WHERE id = $1`,
          [ingredientId, name, base_unit]
        );
      }

      // -----------------------------------
      // 2) Sincronizar units
      // units = [{ id?, unit_name, ratio_to_base }]
      // -----------------------------------

      // 2.1 Obtener unidades actuales desde la BD
      const dbUnits = await client.query(
        `SELECT id FROM ingredient_units WHERE ingredient_id = $1`,
        [ingredientId]
      );

      const dbUnitIds = dbUnits.rows.map((u) => u.id);
      const payloadIds = units.filter(u => u.id).map((u) => u.id);

      // 2.2 Eliminar unidades que no vienen en el payload
      const unitsToDelete = dbUnitIds.filter((id) => !payloadIds.includes(id));

      if (unitsToDelete.length > 0) {
        await client.query(
          `DELETE FROM ingredient_units WHERE id = ANY($1)`,
          [unitsToDelete]
        );
      }

      // 2.3 Insertar o actualizar unidades enviadas
      for (const u of units) {
        if (!u.id) {
          // insert
          await client.query(
            `INSERT INTO ingredient_units (ingredient_id, unit_name, ratio_to_base)
             VALUES ($1, $2, $3)`,
            [ingredientId, u.unit_name, u.ratio_to_base]
          );
        } else {
          // update
          await client.query(
            `UPDATE ingredient_units
             SET unit_name = $2, ratio_to_base = $3
             WHERE id = $1`,
            [u.id, u.unit_name, u.ratio_to_base]
          );
        }
      }

      await client.query("COMMIT");

      return await this.getById(ingredientId);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
};


export const softDeleteIngredient = async (id: number) => {
  const result = await postgresPool.query(
    `UPDATE ingredients 
      SET is_active = FALSE
      WHERE id = $1`,
    [id]
  );

  if (result.rowCount === 0) {  
    const err: any = new Error("Ingrediente no encontrado");
    err.status = 404;
    throw err;
  } 
  return;
};

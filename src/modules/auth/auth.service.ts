import { postgresPool } from "../../config/postgres";
import { verifyGoogleIdToken } from "../../utils/google";
import { signAccessToken, signRefreshToken, hashToken } from "../../utils/jwt";

export const authService = {
  async loginWithGoogle(idToken: string, meta: { ip: string; ua: string }) {
    const payload = await verifyGoogleIdToken(idToken);
    if (!payload || !payload.sub || !payload.email) {
      throw new Error("Invalid Google token");
    }

    const { sub, email, name, picture } = payload;

    // 1. Buscar provider (auth_providers)
    const providerQuery = `
      SELECT ap.*, u.*
      FROM auth_providers ap
      JOIN users u ON u.id = ap.user_id
      WHERE ap.provider = 'google'
        AND ap.provider_user_id = $1
        and u.is_active = true
      LIMIT 1;
    `;
    const providerRes = await postgresPool.query(providerQuery, [sub]);
    let user = providerRes.rows[0];

    // 2. Si no existe provider
    if (!user) {
      // Buscar por email, por si el usuario ya existe con otro proveedor
      const userByEmail = await postgresPool.query(
        `SELECT * FROM users WHERE email = $1 and is_active = true  LIMIT 1`,
        [email]
      );

      let userId: number;

      if (userByEmail.rows.length === 0) {

          throw new Error("Este correo no está autorizado para ingresar.");

        // 2A. Crear usuario
        const insertUser = `
          INSERT INTO users (email, name, picture, is_active)
          VALUES ($1, $2, $3, true)
          RETURNING *;
        `;
        const { rows: createdUser } = await postgresPool.query(insertUser, [
          email,
          name,
          picture,
        ]);
        user = createdUser[0];
        userId = user.id;
      } else {
        user = userByEmail.rows[0];
        userId = user.id;

        // Actualizar nombre/foto si cambió
        await postgresPool.query(
          `
          UPDATE users
          SET name = $1, picture = $2, updated_at = NOW()
          WHERE id = $3
        `,
          [name, picture, userId]
        );
      }

      // 2B. Crear auth_provider
      const insertProvider = `
        INSERT INTO auth_providers (user_id, provider, provider_user_id)
        VALUES ($1, 'google', $2)
      `;
      await postgresPool.query(insertProvider, [userId, sub]);
    }

    // 3. Generar tokens
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken();
    const tokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const insertRT = `
      INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip, expires_at)
      VALUES ($1, $2, $3, $4, $5);
    `;
    await postgresPool.query(insertRT, [
      user.id,
      tokenHash,
      meta.ua,
      meta.ip,
      expiresAt,
    ]);

    return { user, accessToken, refreshToken };
  },

  async validateRefreshToken(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const q = `
      SELECT * FROM refresh_tokens
      WHERE token_hash = $1 AND expires_at > NOW()
      LIMIT 1;
    `;
    const { rows } = await postgresPool.query(q, [tokenHash]);
    return rows[0] || null;
  },

  async rotateRefreshToken(oldRefreshToken: string, meta: { ip: string; ua: string }) {
    // Validar antiguo
    const oldHash = hashToken(oldRefreshToken);
    const findQ = `SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1;`;
    const { rows } = await postgresPool.query(findQ, [oldHash]);
    const row = rows[0];
    if (!row) return null;

    // Opcional: verificar expiración
    if (new Date(row.expires_at) <= new Date()) {
      await postgresPool.query(`DELETE FROM refresh_tokens WHERE id = $1`, [row.id]);
      return null;
    }

    // Borrar viejo y crear nuevo (simple rotation)
    await postgresPool.query(`DELETE FROM refresh_tokens WHERE id = $1`, [row.id]);

    const newRefreshToken = signRefreshToken();
    const newHash = hashToken(newRefreshToken);
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);

    await postgresPool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip, expires_at) VALUES ($1,$2,$3,$4,$5)`,
      [row.user_id, newHash, meta.ua, meta.ip, expiresAt]
    );

    return { newRefreshToken, userId: row.user_id };
  },

  async revokeRefreshToken(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await postgresPool.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [tokenHash]);
  }
};

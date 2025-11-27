import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
console.log("🔧 Cargando configuración de PostgreSQL (Supabase)");
console.log("Current working directory:", process.cwd());

console.log(process.env.DB_CONNECT);
if (!process.env.DB_CONNECT) {
  console.error("❌ Missing DB_CONNECT in .env");
  process.exit(1);
}

export const postgresPool = new Pool({
  connectionString: process.env.DB_CONNECT,
  ssl: {
    rejectUnauthorized: false, // Supabase requiere SSL
  }
});

// Test de conexión
export const testPostgresConnection = async () => {
  try {
    const client = await postgresPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log("✅ Connected to PostgreSQL (Supabase)");
    return true;
  } catch (err) {
    console.error("❌ PostgreSQL connection error:", err);
    return false;
  }
};

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Missing Supabase environment variables. Please check your .env file');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
});

// Función para verificar la conexión
export const testConnection = async (): Promise<boolean> => {
  try {
    // Intentar hacer una llamada simple a la API de Supabase
    const { data, error } = await supabase.rpc('ping').select();
    
    // Si falla el rpc, intentar obtener la lista de tablas
    if (error) {
      // Método alternativo: intentar listar tablas del schema público
      const { error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);
      
      if (schemaError) {
        // Último intento: verificar autenticación
        const { error: authError } = await supabase.auth.getSession();
        
        if (authError && authError.message !== 'Auth session missing!') {
          console.error('Connection test error:', authError.message);
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

// Función helper para listar todas las tablas disponibles
export const listTables = async () => {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.error('Error listing tables:', error);
      return [];
    }
    
    return data?.map((t: { table_name: string }) => t.table_name) || [];
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};
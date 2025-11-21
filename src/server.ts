
import app from './app';
import { testConnection, listTables } from './config/database';
import http from 'http';
import { postgresPool, testPostgresConnection } from './config/postgres';

const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Verificar variables de entorno
    console.log('🔍 Checking environment variables...');
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Missing Supabase credentials in .env file');
      console.log('Please add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file');
      process.exit(1);
    }
    console.log('✅ Environment variables loaded');
    console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL}`);
    
    // Verificar conexión a Supabase
    console.log('🔍 Testing database connection...');
    const isConnected = await testPostgresConnection();
   
    if (isConnected) {
      console.log('✅ Database connection successful');
      
      // Listar tablas disponibles
      
    } else {
      console.warn('⚠️  Database connection check failed, but continuing...');
      console.warn('   Make sure your Supabase credentials are correct');
    }

   

    // Iniciar servidor
    /*app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });*/

    server.listen(PORT, logServerStatus);

    server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ El puerto ${PORT} ya está en uso.`);
    console.error('   Verifica si otro proceso está ocupando ese puerto.');
  } else {
    console.error('❌ Error del servidor:', err);
  }
  process.exit(1);
});

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};


const logServerStatus = () => {
  console.log('───────────────────────────────');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log('───────────────────────────────');
};

const shutdown = async () => {
  console.log('🛑 Shutting down gracefully...');


  try {
    console.log("🔌 Closing Oracle pool...");
    await postgresPool.end();
  } catch (err) {
    console.error("❌ Error closing Oracle pool", err);
  }

  server.close(() => {
    console.log('✅ Server closed cleanly');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
};
// Manejo de errores no capturados
process.on('unhandledRejection', (reason: Error) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
 // process.exit(1);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
startServer();
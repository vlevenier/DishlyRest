import oracledb from 'oracledb';

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

export const initOraclePool = async () => {
  try {
    await oracledb.createPool({
      user: process.env.DB_USER!,
      password: process.env.DB_PASS!,
      connectString: process.env.DB_CONNECT!,
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1
    });

    console.log("✅ Oracle connection pool initialized");
  } catch (err) {
    console.error("❌ Failed to create Oracle pool", err);
    process.exit(1);
  }
};

export const getConnection = () => {
  return oracledb.getConnection();
};

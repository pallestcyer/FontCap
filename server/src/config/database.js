const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        storage_limit BIGINT DEFAULT 5368709120,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        device_name VARCHAR(255) NOT NULL,
        device_id VARCHAR(255) UNIQUE NOT NULL,
        os_type VARCHAR(50),
        os_version VARCHAR(100),
        last_sync TIMESTAMP,
        last_scan TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        fonts_contributed_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fonts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        font_name VARCHAR(255) NOT NULL,
        font_family VARCHAR(255),
        file_path VARCHAR(500),
        file_size BIGINT,
        file_hash VARCHAR(64) NOT NULL,
        font_format VARCHAR(20),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB,
        origin_device_id INTEGER REFERENCES devices(id),
        version_info VARCHAR(100)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS font_duplicates (
        id SERIAL PRIMARY KEY,
        font_id_1 INTEGER REFERENCES fonts(id) ON DELETE CASCADE,
        font_id_2 INTEGER REFERENCES fonts(id) ON DELETE CASCADE,
        duplicate_type VARCHAR(20),
        resolution_status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS device_fonts (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        font_id INTEGER REFERENCES fonts(id) ON DELETE CASCADE,
        installation_status VARCHAR(20) DEFAULT 'installed',
        installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_checked TIMESTAMP,
        was_present_at_scan BOOLEAN DEFAULT true,
        is_system_font BOOLEAN DEFAULT false,
        UNIQUE(device_id, font_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        font_id INTEGER REFERENCES fonts(id) ON DELETE CASCADE,
        action VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS font_scan_history (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        scan_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        scan_completed_at TIMESTAMP,
        fonts_found INTEGER DEFAULT 0,
        new_fonts_added INTEGER DEFAULT 0,
        errors TEXT
      )
    `);

    const constraintCheck = await client.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'fonts' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%file_hash%'
    `);
    
    if (constraintCheck.rows.length > 0) {
      for (const row of constraintCheck.rows) {
        await client.query(`ALTER TABLE fonts DROP CONSTRAINT IF EXISTS ${row.constraint_name}`);
      }
    }
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fonts_user_id ON fonts(user_id);
      CREATE INDEX IF NOT EXISTS idx_fonts_file_hash ON fonts(file_hash);
      CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_device_fonts_device_id ON device_fonts(device_id);
      CREATE INDEX IF NOT EXISTS idx_device_fonts_font_id ON device_fonts(font_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_device_id ON sync_queue(device_id);
    `);
    
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_fonts_user_hash ON fonts(user_id, file_hash);
    `);

    await client.query('COMMIT');
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };

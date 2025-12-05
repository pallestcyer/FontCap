const { pool } = require('../config/database');

async function runMigration() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Add sync_enabled column to devices table if it doesn't exist
    await client.query(`
      ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true
    `);

    // Create user_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        auto_sync BOOLEAN DEFAULT true,
        scan_frequency VARCHAR(20) DEFAULT 'daily',
        duplicate_handling VARCHAR(20) DEFAULT 'ask',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('✅ Migration completed: Added sync_enabled column and user_settings table');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { runMigration };

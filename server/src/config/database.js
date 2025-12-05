const { supabaseAdmin } = require('./supabase');

// Export supabase client as the main database interface
const supabase = supabaseAdmin;

async function initDatabase() {
  try {
    console.log('🔄 Initializing Supabase database...');

    // Check connection by querying the database
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error && error.code === '42P01') {
      // Table doesn't exist, need to create schema
      console.log('📦 Creating database schema...');
      await createSchema();
    } else if (error) {
      throw error;
    }

    // Ensure storage bucket exists
    await ensureStorageBucket();

    console.log('✅ Supabase database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    console.log('📋 Please run the SQL schema in your Supabase dashboard.');
    console.log('   Go to: SQL Editor > New Query > Paste the schema from server/src/config/schema.sql');
  }
}

async function ensureStorageBucket() {
  try {
    // Check if fonts bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.warn('Could not list buckets:', listError.message);
      return;
    }

    const fontsBucket = buckets?.find(b => b.name === 'fonts');

    if (!fontsBucket) {
      // Create the fonts bucket
      const { error: createError } = await supabase.storage.createBucket('fonts', {
        public: false,
        fileSizeLimit: 52428800, // 50MB max per file
      });

      if (createError && !createError.message.includes('already exists')) {
        console.warn('Could not create fonts bucket:', createError.message);
      } else {
        console.log('✅ Created fonts storage bucket');
      }
    } else {
      console.log('✅ Fonts storage bucket exists');
    }
  } catch (error) {
    console.warn('Storage bucket check failed:', error.message);
  }
}

async function createSchema() {
  // This will be run via Supabase SQL editor
  // The schema is defined in schema.sql
  console.log('⚠️  Please create the database schema via Supabase SQL Editor');
  console.log('   Copy the contents of server/src/config/schema.sql');
}

module.exports = { supabase, initDatabase };

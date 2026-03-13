const Database = require('better-sqlite3');
const path = require('path');

console.log('Testing better-sqlite3...');
console.log('Platform:', process.platform);
console.log('Arch:', process.arch);
console.log('Node version:', process.version);

try {
  const dbPath = path.join(__dirname, 'test.db');
  console.log('\nCreating database at:', dbPath);
  
  const db = new Database(dbPath);
  console.log('✓ Database opened successfully!');
  
  console.log('\nCreating table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )
  `);
  console.log('✓ Table created successfully!');
  
  console.log('\nTesting query...');
  const stmt = db.prepare('SELECT 1 as test');
  const result = stmt.get();
  console.log('✓ Query result:', result);
  
  db.close();
  console.log('\n✓ All tests passed!');
  
} catch (error) {
  console.error('✗ Failed to test better-sqlite3:', error);
  console.error('Error stack:', error.stack);
  process.exit(1);
}

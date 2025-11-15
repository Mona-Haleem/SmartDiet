// static/__tests__/e2e/setup/global-setup.js
import { execSync } from 'child_process';

const test_db_name = 'test_db.sqlite3';
// Define the command prefix to use the test DB
const cmd = `DB_NAME=${test_db_name} python manage.py`;

async function globalSetup() {
  console.log('--- Seeding TEST Database (test_db.sqlite3) ---');
  try {
    // 1. Run migrations on the TEST database
    execSync(`${cmd} migrate`);
    
    // 2. Seed the TEST database
    // (You'll need to create this command)
    execSync(`${cmd} seed_test_db --user=mona --recipes=25`);
    
    console.log('--- TEST Database Seeded Successfully ---');
  } catch (error) {
    console.error('--- TEST Database Seeding Failed ---');
    console.error(error.stdout.toString());
    console.error(error.stderr.toString());
    process.exit(1);
  }
}

export default globalSetup;
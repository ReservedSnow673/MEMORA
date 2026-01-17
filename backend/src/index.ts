import dotenv from 'dotenv';
import { createApp } from './app';
import { createPool } from './database/connection';

dotenv.config();

const PORT = process.env['PORT'] ?? 3000;
const DATABASE_URL = process.env['DATABASE_URL'];

async function main(): Promise<void> {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  createPool({ connectionString: DATABASE_URL });

  const app = createApp();

  app.listen(PORT, () => {
    console.log(`Memora backend running on port ${PORT}`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

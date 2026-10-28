// must stay the first import: loads server/.env before any module reads process.env
import 'dotenv/config';
import { prisma } from './lib/database.js';
import { app } from './app.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Refusing to start: set it in server/.env or the environment.');
  process.exit(1);
}

const PORT = process.env.PORT || 3001;

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
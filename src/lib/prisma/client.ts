import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });
};

// Prevent multiple instances of Prisma Client in development
const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Middleware for soft deletes (if needed in future)
// prisma.$use(async (params, next) => {
//   // Soft delete logic here
//   return next(params);
// });

// Connection management
async function connect() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

async function disconnect() {
  await prisma.$disconnect();
  console.log('Database disconnected');
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnect();
});

export default prisma;
export { connect, disconnect, prisma };
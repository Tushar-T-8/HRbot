import { PrismaClient } from '@prisma/client';

let prisma = null;

try {
    prisma = new PrismaClient();
} catch (error) {
    console.warn('⚠️ Prisma client could not be initialized. Running in mock mode.');
}

export default prisma;

import prisma from '../config/db.js';

export const policyRepository = {
    async findAll() {
        return prisma.policy.findMany();
    },

    async findById(id) {
        return prisma.policy.findUnique({
            where: { id: parseInt(id) },
        });
    },

    async findByTitle(title) {
        return prisma.policy.findUnique({
            where: { title },
        });
    },

    async upsert(title, content) {
        return prisma.policy.upsert({
            where: { title },
            update: { content },
            create: { title, content },
        });
    },
};

import prisma from '../config/db.js';

export const ticketRepository = {
    async findAll() {
        return prisma.ticket.findMany({
            include: { employee: true },
            orderBy: { createdAt: 'desc' },
        });
    },

    async findById(id) {
        return prisma.ticket.findUnique({
            where: { id: parseInt(id) },
            include: { employee: true },
        });
    },

    async findByEmployeeId(employeeId) {
        return prisma.ticket.findMany({
            where: { employeeId: parseInt(employeeId) },
            orderBy: { createdAt: 'desc' },
        });
    },

    async create(data) {
        return prisma.ticket.create({
            data: {
                employeeId: parseInt(data.employeeId),
                issue: data.issue,
                status: 'OPEN',
            },
            include: { employee: true },
        });
    },

    async updateStatus(id, status) {
        return prisma.ticket.update({
            where: { id: parseInt(id) },
            data: { status },
            include: { employee: true },
        });
    },

    async getStats() {
        const total = await prisma.ticket.count();
        const open = await prisma.ticket.count({ where: { status: 'OPEN' } });
        const resolved = await prisma.ticket.count({ where: { status: 'RESOLVED' } });
        return { total, open, resolved };
    },
};

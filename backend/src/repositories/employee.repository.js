import prisma from '../config/db.js';

export const employeeRepository = {
    async findAll() {
        return prisma.employee.findMany({
            include: { leaveBalance: true },
        });
    },

    async findById(id) {
        return prisma.employee.findUnique({
            where: { id: parseInt(id) },
            include: { leaveBalance: true, tickets: true },
        });
    },

    async findByEmail(email) {
        return prisma.employee.findUnique({
            where: { email },
            include: { leaveBalance: true },
        });
    },

    async getLeaveBalance(employeeId) {
        return prisma.leaveBalance.findUnique({
            where: { employeeId: parseInt(employeeId) },
        });
    },
};

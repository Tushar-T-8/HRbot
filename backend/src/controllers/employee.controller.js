import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mapEmployee = (emp) => {
    if (!emp) return null;
    return {
        ...emp,
        leaveBalance: { remainingDays: emp.leaveBalance }
    };
};

export const employeeController = {
    async getAll(req, res, next) {
        try {
            const employees = await prisma.employee.findMany();
            res.json({ success: true, data: employees.map(mapEmployee) });
        } catch (error) {
            next(error);
        }
    },

    async getById(req, res, next) {
        try {
            const employee = await prisma.employee.findUnique({
                where: { id: parseInt(req.params.id) }
            });
            if (!employee) {
                return res.status(404).json({ success: false, error: 'Employee not found' });
            }
            res.json({ success: true, data: mapEmployee(employee) });
        } catch (error) {
            next(error);
        }
    },
};

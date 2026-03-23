import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mapEmployee = (emp, userRole) => {
    if (!emp) return null;
    const mapped = {
        ...emp,
        leaveBalance: { remainingDays: emp.leaveBalance }
    };

    // HR Access Visibility Rules
    // Only HR_ADMIN (or similar high-privileged HR) can see Restricted data
    if (userRole !== 'HR_ADMIN') {
        delete mapped.salary;
        delete mapped.performanceReviews;
        delete mapped.disciplinaryRecords;
    }

    return mapped;
};

export const employeeController = {
    async getAll(req, res, next) {
        try {
            const employees = await prisma.employee.findMany();
            res.json({ success: true, data: employees.map(e => mapEmployee(e, req?.user?.role)) });
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
            res.json({ success: true, data: mapEmployee(employee, req?.user?.role) });
        } catch (error) {
            next(error);
        }
    },
};

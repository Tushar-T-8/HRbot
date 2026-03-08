export const employeeController = {
    async getAll(req, res, next) {
        // Mock data when DB is unavailable
        res.json({
            success: true,
            data: [
                { id: 1, name: 'Tushar Thapliyal', email: 'tushar@company.com', department: 'Engineering', leaveBalance: { remainingDays: 15 } },
            ],
        });
    },

    async getById(req, res, next) {
        res.json({
            success: true,
            data: { id: 1, name: 'Tushar Thapliyal', email: 'tushar@company.com', department: 'Engineering', leaveBalance: { remainingDays: 15 } },
        });
    },
};

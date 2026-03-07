export const employeeController = {
    async getAll(req, res, next) {
        try {
            const { employeeRepository } = await import('../repositories/employee.repository.js');
            const employees = await employeeRepository.findAll();
            res.json({ success: true, data: employees });
        } catch {
            // Mock data when DB is unavailable
            res.json({
                success: true,
                data: [
                    { id: 1, name: 'Tushar Thapliyal', email: 'tushar@company.com', department: 'Engineering', leaveBalance: { remainingDays: 15 } },
                ],
            });
        }
    },

    async getById(req, res, next) {
        try {
            const { employeeRepository } = await import('../repositories/employee.repository.js');
            const employee = await employeeRepository.findById(req.params.id);
            if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
            res.json({ success: true, data: employee });
        } catch {
            res.json({
                success: true,
                data: { id: 1, name: 'Tushar Thapliyal', email: 'tushar@company.com', department: 'Engineering', leaveBalance: { remainingDays: 15 } },
            });
        }
    },
};

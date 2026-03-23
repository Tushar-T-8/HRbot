import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, employeeController.getAll);
router.get('/:id', authenticate, employeeController.getById);

export default router;

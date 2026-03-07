import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller.js';

const router = Router();

router.get('/', employeeController.getAll);
router.get('/:id', employeeController.getById);

export default router;

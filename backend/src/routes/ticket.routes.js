import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller.js';

const router = Router();

router.get('/', ticketController.getAll);
router.get('/stats', ticketController.getStats);
router.get('/:id', ticketController.getById);
router.post('/', ticketController.create);
router.patch('/:id/status', ticketController.updateStatus);

export default router;

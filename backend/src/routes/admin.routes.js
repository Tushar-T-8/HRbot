import { Router } from 'express';
import multer from 'multer';
import { adminController } from '../controllers/admin.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// HR-only endpoint to upload policy files (pdf, txt, xlsx)
router.post('/upload', upload.array('files'), adminController.uploadPolicyFiles);

// HR-only endpoint to reload policies and sync leave balances from Excel
router.post('/reload', adminController.reloadPoliciesAndLeaves);

// HR-only endpoint to list all uploaded policy files
router.get('/files', adminController.listFiles);

export default router;


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { policyService } from '../services/policy.service.js';
import { syncLeaveFromExcel } from '../scripts/syncLeaveFromExcel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const adminController = {
    async uploadPolicyFiles(req, res, next) {
        try {
            const files = req.files || [];
            if (!files.length) {
                return res.status(400).json({ success: false, error: 'No files uploaded' });
            }

            const policiesDir = path.resolve(__dirname, '../../..', 'policies');
            if (!fs.existsSync(policiesDir)) {
                fs.mkdirSync(policiesDir, { recursive: true });
            }

            for (const file of files) {
                const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
                const destPath = path.join(policiesDir, safeName);
                fs.writeFileSync(destPath, file.buffer);
            }

            // Reload policies and sync Excel-derived data after upload
            await policyService.reload();
            await syncLeaveFromExcel();

            res.json({
                success: true,
                message: 'Files uploaded, policies reloaded, and leave balances synced.',
            });
        } catch (error) {
            next(error);
        }
    },

    async reloadPoliciesAndLeaves(req, res, next) {
        try {
            await policyService.reload();
            await syncLeaveFromExcel();

            res.json({
                success: true,
                message: 'Policies reloaded and leave balances synced from Excel.',
            });
        } catch (error) {
            next(error);
        }
    },
};


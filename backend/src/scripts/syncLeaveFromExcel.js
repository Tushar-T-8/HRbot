import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncLeaveFromExcel() {
    const require = (await import('module')).createRequire(import.meta.url);
    const xlsx = require('xlsx');

    const workbookPath = path.resolve(__dirname, '../../..', 'policies', 'Leave Tracker 2025 1.xlsx');

    if (!fs.existsSync(workbookPath)) {
        console.log('ℹ️ Excel leave tracker not found, skipping leave balance sync.');
        return;
    }

    console.log('📊 Syncing leave balances from Excel into PostgreSQL...');

    const prisma = new PrismaClient();

    try {
        const workbook = xlsx.readFile(workbookPath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });

        let updated = 0;
        for (const row of rows) {
            const rawEmail = row.email || row.Email || row.EMAIL;
            const balance =
                row.leaveBalance ??
                row.LeaveBalance ??
                row['Leave Balance'] ??
                row['leave_balance'];

            if (!rawEmail || typeof balance !== 'number') {
                continue;
            }

            const email = String(rawEmail).trim().toLowerCase();

            const result = await prisma.employee.updateMany({
                where: { email },
                data: { leaveBalance: balance },
            });
            if (result.count > 0) {
                updated += result.count;
            }
        }

        console.log(`✅ Synced leave balance for ${updated} employees.`);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    try {
        await syncLeaveFromExcel();
    } catch (err) {
        console.error('❌ Failed to sync leave from Excel:', err);
        process.exitCode = 1;
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}

export { syncLeaveFromExcel };


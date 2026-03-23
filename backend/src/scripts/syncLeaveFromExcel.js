import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONTH_COLS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
};

function parseCustomDate(dateStr) {
    if (!dateStr) return null;
    try {
        const clean = dateStr.replace(/st|nd|rd|th/g, '').replace(/'/g, ' 20');
        const parsed = new Date(clean);
        return isNaN(parsed.valueOf()) ? null : parsed;
    } catch {
        return null;
    }
}

async function syncLeaveFromExcel() {
    const require = (await import('module')).createRequire(import.meta.url);
    const xlsx = require('xlsx');

    const workbookPath = path.resolve(__dirname, '../../..', 'policies', 'Leave Tracker 2025 1.xlsx');

    if (!fs.existsSync(workbookPath)) {
        console.log('ℹ️ Excel leave tracker not found, skipping sync.');
        return;
    }

    console.log('📊 Syncing employees and leave balances from Excel into PostgreSQL...');

    const prisma = new PrismaClient();

    try {
        const workbook = xlsx.readFile(workbookPath);
        const sheetName = workbook.SheetNames.find(n => n.includes('Overall')) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });

        // First find max emp ID to generate sequences
        let maxIdNum = 0;
        const allEmployees = await prisma.employee.findMany();
        for (const emp of allEmployees) {
            if (emp.empCode && emp.empCode.startsWith('8EIN')) {
                const num = parseInt(emp.empCode.replace('8EIN', ''), 10);
                if (!isNaN(num) && num > maxIdNum) {
                    maxIdNum = num;
                }
            }
        }
        for (const row of rows) {
            const rawId = row['Emp ID'] || row['emp_id'] || row['EMP ID'];
            if (rawId && rawId.startsWith('8EIN')) {
                const num = parseInt(rawId.replace('8EIN', ''), 10);
                if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
            }
        }

        let updated = 0;
        let inserted = 0;
        for (const row of rows) {
            let empCode = row['Emp ID'] || row['emp_id'] || row['EMP ID'];
            const name = row['Name'] || row['name'];
            if (!name) continue; // Skip empty rows

            if (!empCode) {
                maxIdNum++;
                empCode = `8EIN${String(maxIdNum).padStart(3, '0')}`;
            }

            const rawDate = row['Date of Joining'] || row['date_of_joining'];
            const dateOfJoining = parseCustomDate(rawDate);

            // Dummy email creation
            const safeName = name.replace(/[^a-zA-Z0-9]/g, '.').toLowerCase();
            const email = `${empCode.toLowerCase()}@company.com`;

            const leaveBalance = row['Available Leaves'] ?? row['Available Leaves_1'] ?? row['leaveBalance'] ?? 0;
            const eligibleLeaves = Math.round(row['Eligible Leaves'] ?? row['Granted Leaves'] ?? 18);
            const grantedLeaves = Math.round(row['Granted Leaves'] ?? eligibleLeaves);
            const utilizedLeaves = Math.round(row['Utilized leave'] ?? row['Utilized Leaves'] ?? 0);
            const lop = Math.round(row['LOP'] ?? 0);

            // Hash the dummy password
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('password123', 10);

            // Upsert Employee
            const employee = await prisma.employee.upsert({
                where: { empCode },
                update: {
                    name,
                    leaveBalance,
                    dateOfJoining,
                },
                create: {
                    empCode,
                    name,
                    email,
                    password: hashedPassword,
                    department: 'Engineering',
                    role: 'EMPLOYEE',
                    status: 'ACTIVE',
                    leaveBalance,
                    dateOfJoining,
                }
            });

            // Handle LeaveRecord
            const currentYear = new Date().getFullYear();
            const leaveRecord = await prisma.leaveRecord.upsert({
                where: {
                    employeeId_year: { employeeId: employee.id, year: currentYear }
                },
                update: {
                    eligibleLeaves,
                    grantedLeaves,
                    utilizedLeaves,
                    availableLeaves: leaveBalance,
                    lop,
                },
                create: {
                    employeeId: employee.id,
                    year: currentYear,
                    eligibleLeaves,
                    grantedLeaves,
                    utilizedLeaves,
                    availableLeaves: leaveBalance,
                    lop,
                }
            });

            // Handle leave entries per month (generate dummy dates to match counts)
            for (let i = 0; i < MONTH_COLS.length; i++) {
                const monthName = MONTH_COLS[i];
                const countStr = row[monthName];
                const count = parseInt(countStr, 10);
                const monthIndex = i + 1; // 1-12

                if (!isNaN(count) && count > 0) {
                    // Check existing leaves for this month
                    const existingCount = await prisma.leaveEntry.count({
                        where: { leaveRecordId: leaveRecord.id, month: monthIndex }
                    });

                    // Insert missing leaves
                    const needed = count - existingCount;
                    for (let n = 0; n < needed; n++) {
                        const dummyDate = new Date(currentYear, monthIndex - 1, 15 + n);
                        await prisma.leaveEntry.create({
                            data: {
                                date: dummyDate,
                                month: monthIndex,
                                type: 'LEAVE',
                                leaveRecordId: leaveRecord.id,
                            }
                        });
                    }
                }
            }

            updated++;
        }

        console.log(`✅ Synced and processed ${updated} employees from Excel.`);
    } catch (err) {
        console.error('❌ Error processing Excel file:', err);
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

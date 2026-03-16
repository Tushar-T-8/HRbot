/**
 * importLeaves.js
 * 
 * Parses the HR Leave Tracking Excel file and imports data into PostgreSQL.
 * 
 * Usage: node src/scripts/importLeaves.js [path-to-excel]
 *        Defaults to: ../../policies/Leave Tracker 2025 1.xlsx
 */
import { createRequire } from 'module';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const YEAR = 2025; // The year this tracker covers

// Month name → month number mapping
const MONTH_MAP = {
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
};

// Sheet name → month number mapping for detail sheets
const SHEET_MONTH_MAP = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12,
};

/**
 * Parse a date string like "01st Feb'23" into a Date object
 */
function parseDateOfJoining(dateStr) {
    if (!dateStr) return null;
    try {
        // Handle format: "01st Feb'23", "13th Mar'23", "27th Nov'22"
        const cleaned = String(dateStr).replace(/(st|nd|rd|th)/i, '');
        const match = cleaned.match(/(\d{1,2})\s*(\w{3})'?(\d{2})/);
        if (match) {
            const [, day, monthName, yearShort] = match;
            const fullYear = parseInt(yearShort) > 50 ? 1900 + parseInt(yearShort) : 2000 + parseInt(yearShort);
            const date = new Date(`${monthName} ${day}, ${fullYear}`);
            if (!isNaN(date.getTime())) return date;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Parse a date column header like "13-Mar", "11-Apr" into a full Date
 */
function parseDateColumn(colName, year) {
    // Match patterns like "13-Mar", "1-Dec", "8-May"
    const match = String(colName).match(/^(\d{1,2})-(\w{3})$/);
    if (!match) return null;
    const [, day, monthAbbr] = match;
    const date = new Date(`${monthAbbr} ${day}, ${year}`);
    if (!isNaN(date.getTime())) return date;
    return null;
}

/**
 * Determine what month number a column belongs to from the sheet name
 */
function getMonthFromSheet(sheetName) {
    return SHEET_MONTH_MAP[sheetName] || null;
}

async function main() {
    const excelPath = process.argv[2] || path.resolve(__dirname, '../../../policies/Leave Tracker 2025 1.xlsx');
    console.log(`📂 Reading Excel file: ${excelPath}`);

    const workbook = xlsx.readFile(excelPath);
    console.log(`📋 Found sheets: ${workbook.SheetNames.join(', ')}`);

    // ── Step 1: Parse "Overall Report" sheet ──
    const overallSheet = workbook.Sheets['Overall Report'];
    if (!overallSheet) {
        console.error('❌ "Overall Report" sheet not found!');
        process.exit(1);
    }

    const overallRows = xlsx.utils.sheet_to_json(overallSheet);
    console.log(`👥 Found ${overallRows.length} employees in Overall Report`);

    let employeesCreated = 0;
    let leaveRecordsCreated = 0;
    let leaveEntriesCreated = 0;

    for (const row of overallRows) {
        const empCode = String(row['Emp ID'] || '').trim();
        const name = String(row['Name'] || '').trim();
        if (!empCode || !name) continue;

        const dateOfJoining = parseDateOfJoining(row['Date of Joining']);
        const eligibleLeaves = parseInt(row['Eligible Leaves']) || 0;
        const grantedLeaves = parseInt(row['Granted Leaves']) || 0;
        const utilizedLeaves = parseInt(row['Utilized leave'] || row['Utilized Leaves']) || 0;
        const availableLeaves = parseInt(row['Available Leaves']) || 0;
        const lop = parseInt(row['LOP']) || 0;

        // Upsert employee — find by empCode or create new
        let employee = await prisma.employee.findUnique({ where: { empCode } });

        if (!employee) {
            // Create a placeholder employee (no email/password since they come from Excel, not signup)
            const placeholderEmail = `${empCode.toLowerCase()}@company.local`;
            employee = await prisma.employee.create({
                data: {
                    empCode,
                    name,
                    email: placeholderEmail,
                    password: 'EXCEL_IMPORT', // Placeholder — these users can't login
                    department: 'Unknown',
                    role: 'EMPLOYEE',
                    dateOfJoining,
                    leaveBalance: availableLeaves,
                },
            });
            employeesCreated++;
            console.log(`  ✅ Created employee: ${name} (${empCode})`);
        } else {
            // Update existing employee with Excel data
            await prisma.employee.update({
                where: { id: employee.id },
                data: {
                    dateOfJoining: dateOfJoining || employee.dateOfJoining,
                    leaveBalance: availableLeaves,
                },
            });
        }

        // Upsert LeaveRecord for this year
        const leaveRecord = await prisma.leaveRecord.upsert({
            where: {
                employeeId_year: { employeeId: employee.id, year: YEAR },
            },
            create: {
                employeeId: employee.id,
                year: YEAR,
                eligibleLeaves,
                grantedLeaves,
                utilizedLeaves,
                availableLeaves,
                lop,
            },
            update: {
                eligibleLeaves,
                grantedLeaves,
                utilizedLeaves,
                availableLeaves,
                lop,
            },
        });
        leaveRecordsCreated++;

        // ── Step 2: Create summary entries for months without detail sheets ──
        // The monthly columns (JAN, FEB, etc.) in the Overall Report give us the count
        // For months that DO have detail sheets, we'll parse actual dates from those sheets
        // JAN and FEB don't have detail sheets in this file, so create summary entries
        for (const monthName of ['JAN', 'FEB']) {
            const monthNum = MONTH_MAP[monthName];
            const count = parseInt(row[monthName]) || 0;
            if (count > 0) {
                // Create summary entries (one per leave day, dated to 1st of month since we don't have exact dates)
                for (let d = 1; d <= count; d++) {
                    await prisma.leaveEntry.create({
                        data: {
                            leaveRecordId: leaveRecord.id,
                            date: new Date(YEAR, monthNum - 1, d),
                            month: monthNum,
                            type: 'LEAVE',
                        },
                    });
                    leaveEntriesCreated++;
                }
            }
        }
    }

    // ── Step 3: Parse monthly detail sheets for exact dates ──
    for (const sheetName of workbook.SheetNames) {
        if (sheetName === 'Overall Report') continue;

        const monthNum = getMonthFromSheet(sheetName);
        if (!monthNum) {
            console.log(`  ⚠️ Skipping unrecognized sheet: "${sheetName}"`);
            continue;
        }

        console.log(`\n📅 Processing sheet: ${sheetName} (month ${monthNum})`);
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        for (const row of rows) {
            const empCode = String(row['Emp ID'] || '').trim();
            if (!empCode) continue;

            const employee = await prisma.employee.findUnique({ where: { empCode } });
            if (!employee) continue;

            const leaveRecord = await prisma.leaveRecord.findUnique({
                where: { employeeId_year: { employeeId: employee.id, year: YEAR } },
            });
            if (!leaveRecord) continue;

            // Iterate over all columns to find date columns
            for (const [colName, value] of Object.entries(row)) {
                if (['Emp ID', 'Name', 'Date of Joining', 'Leave', 'WFH', 'NA'].includes(colName)) continue;

                const date = parseDateColumn(colName, YEAR);
                if (!date) continue;

                const cellValue = String(value || '').trim().toUpperCase();
                let type = null;

                if (cellValue === 'LEAVE' || cellValue === 'L') {
                    type = 'LEAVE';
                } else if (cellValue === 'WFH' || cellValue === 'W') {
                    type = 'WFH';
                } else if (cellValue === 'LOP') {
                    type = 'LOP';
                } else if (cellValue === 'RESIGNED') {
                    continue; // Skip resigned entries
                }

                if (type) {
                    await prisma.leaveEntry.create({
                        data: {
                            leaveRecordId: leaveRecord.id,
                            date,
                            month: monthNum,
                            type,
                        },
                    });
                    leaveEntriesCreated++;
                }
            }
        }
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`✅ Import Complete!`);
    console.log(`   Employees created:    ${employeesCreated}`);
    console.log(`   Leave records:        ${leaveRecordsCreated}`);
    console.log(`   Leave entries:        ${leaveEntriesCreated}`);
    console.log('═'.repeat(50));

    await prisma.$disconnect();
}

main().catch((err) => {
    console.error('❌ Import failed:', err);
    prisma.$disconnect();
    process.exit(1);
});

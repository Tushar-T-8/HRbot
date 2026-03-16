/**
 * cleanupLeaves.js
 * 
 * Cleans up duplicated leave entries, records, and EXCEL_IMPORT placeholder employees.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting database cleanup...');

    // Find all placeholder employees
    const placeholders = await prisma.employee.findMany({
        where: { password: 'EXCEL_IMPORT' }
    });

    console.log(`Found ${placeholders.length} placeholder employees.`);

    if (placeholders.length === 0) {
        console.log('✅ Nothing to clean up.');
        return;
    }

    const placeholderIds = placeholders.map(p => p.id);

    // Delete LeaveEntry for placeholders
    const deletedEntries = await prisma.leaveEntry.deleteMany({
        where: {
            leaveRecord: {
                employeeId: { in: placeholderIds }
            }
        }
    });
    console.log(`🗑️ Deleted ${deletedEntries.count} leave entries.`);

    // Delete LeaveRecord for placeholders
    const deletedRecords = await prisma.leaveRecord.deleteMany({
        where: { employeeId: { in: placeholderIds } }
    });
    console.log(`🗑️ Deleted ${deletedRecords.count} leave records.`);

    // Delete Employees
    const deletedEmployees = await prisma.employee.deleteMany({
        where: { id: { in: placeholderIds } }
    });
    console.log(`🗑️ Deleted ${deletedEmployees.count} placeholder employees.`);

    console.log('✅ Cleanup complete!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

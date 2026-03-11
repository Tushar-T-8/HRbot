import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // Clear existing
    await prisma.ticket.deleteMany();
    await prisma.employee.deleteMany();

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create HR user
    const hrUser = await prisma.employee.create({
        data: {
            name: 'Admin HR',
            email: 'hr@company.com',
            password: hashedPassword,
            role: 'HR',
            department: 'Human Resources',
            leaveBalance: 20,
        }
    });
    console.log('Created HR User:', hrUser.name, '(hr@company.com / password123)');

    // Create Employee user
    const employee = await prisma.employee.create({
        data: {
            name: 'Tushar Thapliyal',
            email: 'tushar@company.com',
            password: hashedPassword,
            role: 'EMPLOYEE',
            department: 'Engineering',
            leaveBalance: 15,
        }
    });
    console.log('Created Employee:', employee.name, '(tushar@company.com / password123)');

    // Create sample ticket
    const ticket1 = await prisma.ticket.create({
        data: {
            issue: 'My laptop is not turning on',
            status: 'OPEN',
            employeeId: employee.id,
        }
    });

    console.log('Created Mock Ticket:', ticket1.id);
    console.log('Seed completed perfectly!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

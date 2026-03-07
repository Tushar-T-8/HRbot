import prisma from '../config/db.js';

async function seed() {
    console.log('🌱 Seeding database...');

    // Create employees
    const employees = await Promise.all([
        prisma.employee.upsert({
            where: { email: 'john.doe@company.com' },
            update: {},
            create: { name: 'John Doe', email: 'john.doe@company.com', department: 'Engineering' },
        }),
        prisma.employee.upsert({
            where: { email: 'jane.smith@company.com' },
            update: {},
            create: { name: 'Jane Smith', email: 'jane.smith@company.com', department: 'Marketing' },
        }),
        prisma.employee.upsert({
            where: { email: 'bob.wilson@company.com' },
            update: {},
            create: { name: 'Bob Wilson', email: 'bob.wilson@company.com', department: 'HR' },
        }),
        prisma.employee.upsert({
            where: { email: 'alice.chen@company.com' },
            update: {},
            create: { name: 'Alice Chen', email: 'alice.chen@company.com', department: 'Finance' },
        }),
    ]);

    console.log(`✅ Created ${employees.length} employees`);

    // Create leave balances
    for (const emp of employees) {
        await prisma.leaveBalance.upsert({
            where: { employeeId: emp.id },
            update: {},
            create: {
                employeeId: emp.id,
                remainingDays: Math.floor(Math.random() * 15) + 5,
            },
        });
    }

    console.log('✅ Created leave balances');

    // Create sample policies
    const policies = [
        { title: 'Leave Policy', content: 'All full-time employees are entitled to 20 days of paid annual leave per calendar year.' },
        { title: 'Work From Home Policy', content: 'Employees may work from home up to 3 days per week after completing probation.' },
        { title: 'Benefits Policy', content: 'Comprehensive health insurance covering employee, spouse, and up to 2 children.' },
    ];

    for (const policy of policies) {
        await prisma.policy.upsert({
            where: { title: policy.title },
            update: { content: policy.content },
            create: policy,
        });
    }

    console.log('✅ Created policies');

    // Create sample tickets
    await prisma.ticket.createMany({
        data: [
            { employeeId: employees[0].id, issue: 'Cannot access leave portal', status: 'OPEN' },
            { employeeId: employees[1].id, issue: 'Need clarification on WFH policy', status: 'RESOLVED' },
            { employeeId: employees[2].id, issue: 'Insurance claim not processed', status: 'IN_PROGRESS' },
        ],
        skipDuplicates: true,
    });

    console.log('✅ Created sample tickets');
    console.log('🎉 Seed completed!');

    await prisma.$disconnect();
}

seed().catch((error) => {
    console.error('❌ Seed failed:', error);
    prisma.$disconnect();
    process.exit(1);
});

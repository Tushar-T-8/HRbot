import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'hr-chatbot-secret-key-2024';

export const authController = {
    async signup(req, res, next) {
        try {
            const { name, email, password, department, role } = req.body;

            if (!name || !email || !password || !department) {
                return res.status(400).json({
                    success: false,
                    error: 'Name, email, password, and department are required',
                });
            }

            // Check if user already exists
            const existingUser = await prisma.employee.findUnique({
                where: { email },
            });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: 'An account with this email already exists',
                });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create employee
            const employee = await prisma.employee.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    department,
                    role: role === 'HR' ? 'HR' : 'EMPLOYEE',
                    leaveBalance: 15,
                },
            });

            // Generate JWT
            const token = jwt.sign(
                { id: employee.id, email: employee.email, role: employee.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(201).json({
                success: true,
                data: {
                    token,
                    user: {
                        id: employee.id,
                        name: employee.name,
                        email: employee.email,
                        role: employee.role,
                        department: employee.department,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    },

    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and password are required',
                });
            }

            // Find user
            const employee = await prisma.employee.findUnique({
                where: { email },
            });

            if (!employee) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password',
                });
            }

            // Compare password
            const validPassword = await bcrypt.compare(password, employee.password);

            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password',
                });
            }

            // Generate JWT
            const token = jwt.sign(
                { id: employee.id, email: employee.email, role: employee.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: employee.id,
                        name: employee.name,
                        email: employee.email,
                        role: employee.role,
                        department: employee.department,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    },

    async me(req, res) {
        res.json({
            success: true,
            data: req.user,
        });
    },
};

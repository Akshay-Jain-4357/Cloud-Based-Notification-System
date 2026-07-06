import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_notifyflow_2026';

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and default preferences
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: email.toLowerCase().includes('admin') ? 'ADMIN' : 'USER',
        preferences: {
          create: {
            emailEnabled: true,
            smsEnabled: true,
            pushEnabled: true,
            marketingEnabled: true,
            securityAlertsEnabled: true,
            digestEnabled: false,
          },
        },
      },
      include: {
        preferences: true,
      },
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, preferences: user.preferences },
    });
  } catch (err: any) {
    console.error('Registration failed:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { preferences: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, preferences: user.preferences },
    });
  } catch (err: any) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
}

export async function googleLogin(req: Request, res: Response) {
  try {
    const { credential, email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: { preferences: true },
    });

    if (!user) {
      // Create user with a dummy password hash
      const randomPassword = Math.random().toString(36).substring(7);
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          passwordHash,
          role: email.toLowerCase().includes('admin') ? 'ADMIN' : 'USER',
          preferences: {
            create: {
              emailEnabled: true,
              smsEnabled: true,
              pushEnabled: true,
              marketingEnabled: true,
              securityAlertsEnabled: true,
              digestEnabled: false,
            },
          },
        },
        include: {
          preferences: true,
        },
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, preferences: user.preferences },
    });
  } catch (err) {
    console.error('Google OAuth Login failed:', err);
    res.status(500).json({ error: 'Internal server error during Google Authentication' });
  }
}

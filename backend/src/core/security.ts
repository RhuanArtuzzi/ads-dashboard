import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { env } from './config.js'

export function signToken(payload: { id: string; email: string; role: string; clienteId?: string | null }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { id: string; email: string; role: string; clienteId?: string | null } {
  return jwt.verify(token, env.JWT_SECRET) as { id: string; email: string; role: string; clienteId?: string | null }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

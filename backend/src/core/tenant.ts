import type { FastifyRequest } from 'fastify'

export interface UserContext {
  id: string
  email: string
  role: string
  clienteId: string | null
}

export function getUserContext(request: FastifyRequest): UserContext {
  const u = request.user as any
  return {
    id: u.id ?? '',
    email: u.email ?? '',
    role: u.role ?? 'VIEWER',
    clienteId: u.clienteId ?? null,
  }
}

export function isAdmin(ctx: UserContext): boolean {
  return ctx.role === 'ADMIN'
}

export function isClienteAdmin(ctx: UserContext): boolean {
  return ctx.role === 'CLIENTE_ADMIN'
}

// Returns the clienteId to use in queries:
// - CLIENTE/CLIENTE_ADMIN: always forced to their own clienteId
// - ADMIN: uses the requested clienteId or null (= all)
export function forceClienteId(ctx: UserContext, requested?: string | null): string | null {
  if (ctx.role === 'CLIENTE' || ctx.role === 'CLIENTE_ADMIN') return ctx.clienteId
  return requested || null
}

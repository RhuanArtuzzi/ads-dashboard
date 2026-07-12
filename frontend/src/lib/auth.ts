export interface CurrentUser {
  id: string
  nome: string
  email: string
  role: 'ADMIN' | 'VIEWER' | 'CLIENTE' | 'CLIENTE_ADMIN'
  clienteId: string | null
}

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('ominy_user')
    if (!raw) return null
    return JSON.parse(raw) as CurrentUser
  } catch {
    return null
  }
}

export function isAdmin(): boolean {
  return getCurrentUser()?.role === 'ADMIN'
}

export function isCliente(): boolean {
  return getCurrentUser()?.role === 'CLIENTE'
}

export function isClienteAdmin(): boolean {
  return getCurrentUser()?.role === 'CLIENTE_ADMIN'
}

export function isClienteRole(): boolean {
  const role = getCurrentUser()?.role
  return role === 'CLIENTE' || role === 'CLIENTE_ADMIN'
}

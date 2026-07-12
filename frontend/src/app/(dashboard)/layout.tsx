'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Users, Megaphone, Bell, Bot, Link2, UserCog, LogOut, Settings
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'

const adminNavItems = [
  { href: '/',                       label: 'Home',        icon: LayoutDashboard },
  { href: '/clientes',               label: 'Clientes',    icon: Users },
  { href: '/meta',                   label: 'Meta Ads',    icon: Megaphone },
  { href: '/alertas',                label: 'Alertas',     icon: Bell },
  { href: '/ia',                     label: 'Agente IA',   icon: Bot },
  { href: '/configuracoes/conexoes', label: 'Conexoes',    icon: Link2 },
  { href: '/configuracoes/clientes', label: 'Config',      icon: UserCog },
]

const clienteAdminNavItems = [
  { href: '/',                              label: 'Home',          icon: LayoutDashboard },
  { href: '/meta',                          label: 'Meta Ads',      icon: Megaphone },
  { href: '/alertas',                       label: 'Alertas',       icon: Bell },
  { href: '/configuracoes/minha-conta',     label: 'Configuracoes', icon: Settings },
]

const clienteNavItems = [
  { href: '/',        label: 'Home',     icon: LayoutDashboard },
  { href: '/meta',    label: 'Meta Ads', icon: Megaphone },
  { href: '/alertas', label: 'Alertas',  icon: Bell },
]

function getRoleLabel(role: string) {
  if (role === 'ADMIN') return 'Admin'
  if (role === 'CLIENTE_ADMIN') return 'Admin'
  return 'Cliente'
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user] = useState(() => getCurrentUser())

  const navItems =
    user?.role === 'ADMIN'
      ? adminNavItems
      : user?.role === 'CLIENTE_ADMIN'
        ? clienteAdminNavItems
        : clienteNavItems

  function handleLogout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ominy_token')
      localStorage.removeItem('ominy_user')
      document.cookie = 'ominy_token=; path=/; max-age=0'
      window.location.href = '/login'
    }
  }

  return (
    <div className="flex min-h-screen bg-ominy-bg">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-ominy-surface border-r border-ominy-border flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-ominy-border">
          <span className="font-heading text-lg font-bold text-gradient">OMINY</span>
          <p className="text-xs text-ominy-muted mt-0.5">Ads Dashboard</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all duration-150',
                  active
                    ? 'bg-ominy-cyan/10 text-ominy-cyan border border-ominy-cyan/20'
                    : 'text-ominy-muted hover:text-ominy-text hover:bg-ominy-bg'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User info + Logout */}
        <div className="p-3 border-t border-ominy-border flex flex-col gap-1">
          {user && (
            <div className="px-3 py-1.5">
              <p className="text-xs text-ominy-text font-medium truncate">{user.nome}</p>
              <p className="text-xs text-ominy-muted truncate">{getRoleLabel(user.role)}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-ominy-muted hover:text-red-400 hover:bg-red-400/5 transition-all"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}

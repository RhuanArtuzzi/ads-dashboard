'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, senha })
      localStorage.setItem('ominy_token', data.token)
      router.push('/')
    } catch {
      setErro('Email ou senha invalidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ominy-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-black text-gradient">OMINY</h1>
          <p className="text-ominy-muted text-sm mt-1">Ads Dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-ominy-surface border border-ominy-border rounded-xl p-6 flex flex-col gap-4">
          <h2 className="font-heading text-base font-medium text-ominy-text">Entrar</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ominy-muted uppercase tracking-widest">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ominy.com.br"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ominy-muted uppercase tracking-widest">Senha</label>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {erro && <p className="text-red-400 text-sm">{erro}</p>}

          <Button type="submit" size="lg" disabled={loading} className="w-full mt-1">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}

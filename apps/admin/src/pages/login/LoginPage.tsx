import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch {
      setError('E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[440px] xl:w-[500px] flex-col justify-between bg-brand-forest px-12 py-14 relative overflow-hidden">
        {/* Dot texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange font-display font-bold text-base text-white leading-none select-none">
            Z&amp;K
          </div>
          <span className="font-display text-xl font-bold text-white tracking-tight">
            Zoro &amp; Kaya
          </span>
        </div>

        {/* Identity — h2 no painel (h1 fica no form, visível em todo viewport) */}
        <div className="relative space-y-5">
          <h2
            className="font-display text-[2.75rem] leading-[1.08] font-bold text-white tracking-tight"
            style={{ textWrap: 'balance' } as React.CSSProperties}
          >
            Estoque, vendas<br />
            e fiscal.<br />
            Tudo integrado.
          </h2>
          <p className="text-white/70 text-[0.9375rem] leading-relaxed max-w-[26ch]">
            O painel completo para gerenciar sua petshop do dia a dia.
          </p>
        </div>

        {/* Tagline */}
        <div className="relative flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-white/30 text-xs tracking-wider">
            mordedores &amp; petiscos naturais
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="mb-10 lg:hidden flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-forest font-display font-bold text-base text-brand-orange leading-none select-none">
            Z&amp;K
          </div>
          <span className="font-display text-xl font-bold text-foreground tracking-tight">
            Zoro &amp; Kaya
          </span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1
              className="font-display text-[1.875rem] font-bold text-foreground tracking-tight"
              style={{ textWrap: 'balance' } as React.CSSProperties}
            >
              Bem-vindo de volta
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Acesse o painel com suas credenciais.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-foreground">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemplo.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-foreground">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-[0.9375rem] font-semibold"
              disabled={loading}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

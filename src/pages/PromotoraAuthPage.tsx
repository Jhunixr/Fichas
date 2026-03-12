import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'
import { supabase } from '../lib/supabaseClient'
import { LogoUTP } from '../components/LogoUTP'
import { useSupabaseSession } from '../hooks/useSupabaseSession'

type Mode = 'login' | 'register'

export function PromotoraAuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const navigate = useNavigate()
  const { session, loading: loadingSession } = useSupabaseSession()

  const canUseSupabase = Boolean(supabase)

  const title = useMemo(
    () => (mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'),
    [mode],
  )

  useEffect(() => {
    if (loadingSession) return
    if (session) navigate('/promotora', { replace: true })
  }, [session, loadingSession, navigate])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (!supabase) {
      setError('Falta configurar Supabase (URL y ANON KEY) en variables de entorno.')
      return
    }

    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message || 'No se pudo iniciar sesión. Revisa tu correo/contraseña.')
        setLoading(false)
        return
      }
      setLoading(false)
      navigate('/promotora', { replace: true })
      return
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message || 'No se pudo registrar. Prueba con otro correo o una contraseña más fuerte.')
      setLoading(false)
      return
    }

    setLoading(false)
    // Siempre mostrar mensaje claro para la promotora
    if (!data.session) {
      setNotice(
        'Cuenta creada. Revisa tu correo (incluye Spam) para confirmar el registro. Luego vuelve aquí e inicia sesión.',
      )
    } else {
      setNotice('Cuenta creada. Ya puedes iniciar sesión con tu correo y contraseña.')
    }
    setPassword('')
    setMode('login')
  }

  return (
    <div className="page page-admin">
      <div className="card auth-card">
        <header className="page-header" style={{ borderBottom: 'none' }}>
          <div className="logo-wrap">
            <LogoUTP width={140} height={52} />
          </div>
          <h1>{title}</h1>
          <p className="page-subtitle">Acceso solo para promotoras.</p>
        </header>

        {!canUseSupabase && (
          <p className="error">
            Falta configurar Supabase. (Vercel/Local: variables `VITE_SUPABASE_URL` y
            `VITE_SUPABASE_ANON_KEY`)
          </p>
        )}

        <form onSubmit={onSubmit}>
          <div className="grid-1">
            <div className="field">
              <label>Correo electrónico</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                placeholder="ej: promotora@correo.com"
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          {notice && (
            <p className="hint" style={{ marginTop: 10, fontWeight: 700 }}>
              {notice}
            </p>
          )}
          {error && (
            <p className="error" style={{ marginTop: 8 }}>
              {error}
            </p>
          )}

          <footer className="form-footer">
            <button className="btn-primary" type="submit" disabled={loading || !canUseSupabase}>
              {loading ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Registrarme'}
            </button>

            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setError(null)
                setMode((m) => (m === 'login' ? 'register' : 'login'))
              }}
            >
              {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}


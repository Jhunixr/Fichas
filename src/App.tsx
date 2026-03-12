import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { StudentFormPage } from './pages/StudentFormPage'
import { PromotoraAuthPage } from './pages/PromotoraAuthPage'
import { PromotoraDashboardPage } from './pages/PromotoraDashboardPage'
import { useSupabaseSession } from './hooks/useSupabaseSession'
import { supabase } from './lib/supabaseClient'
import { StudentLinkPage } from './pages/StudentLinkPage'

function App() {
  const { session, loading } = useSupabaseSession()

  const RequireAuth = ({ children }: { children: React.ReactNode }) => {
    if (!supabase) return <Navigate to="/login" replace />
    if (loading) return <div className="page page-admin"><div className="card"><p className="hint">Cargando…</p></div></div>
    if (!session) return <Navigate to="/login" replace />
    return children
  }

  return (
    <div className="app-root">
      <Routes>
        {/* Inicio: siempre al login de promotora */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Ruta corta para alumnos por QR */}
        <Route path="/s/:code" element={<StudentLinkPage />} />

        {/* Ruta legacy (si ya compartiste links antiguos) */}
        <Route
          path="/colegio/:schoolId/seccion/:sectionId"
          element={<StudentFormPage />}
        />

        {/* Auth promotoras */}
        <Route path="/login" element={<PromotoraAuthPage />} />
        <Route
          path="/promotora"
          element={
            <RequireAuth>
              <PromotoraDashboardPage />
            </RequireAuth>
          }
        />

        {/* Compatibilidad: redirigir panel antiguo */}
        <Route path="/admin" element={<Navigate to="/login" replace />} />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App

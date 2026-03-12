import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { StudentFormPage } from './StudentFormPage'

type SectionInfo = {
  id: string
  nombre: string
  colegio_id: string
  public_code: string
  colegio_nombre: string
}

export function StudentLinkPage() {
  const { code } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<SectionInfo | null>(null)

  useEffect(() => {
    if (!supabase) {
      setError('Falta configurar Supabase.')
      setLoading(false)
      return
    }
    if (!code) {
      setError('Link inválido.')
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase!
        .from('secciones_public')
        .select('*')
        .eq('public_code', code)
        .single()

      if (error) {
        setError('No se encontró la sección. Pide a tu promotora un QR válido.')
        setLoading(false)
        return
      }

      setInfo(data as SectionInfo)
      setLoading(false)
    }

    void load()
  }, [code])

  if (loading) {
    return (
      <div className="page page-student">
        <div className="card">
          <p className="hint">Cargando ficha…</p>
        </div>
      </div>
    )
  }

  if (error || !info) {
    return (
      <div className="page page-student">
        <div className="card">
          <p className="error">{error ?? 'Error'}</p>
        </div>
      </div>
    )
  }

  return (
    <StudentFormPage
      colegioLabel={info.colegio_nombre}
      seccionLabel={info.nombre}
      colegioId={info.colegio_id}
      seccionId={info.id}
      sectionCode={info.public_code}
    />
  )
}


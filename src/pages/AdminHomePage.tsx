import { useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import '../App.css'
import { supabase } from '../lib/supabaseClient'
import { LogoUTP } from '../components/LogoUTP'
import type { FichaRecord } from '../utils/generateFichaPdf'
import { downloadFichaPdf } from '../utils/generateFichaPdf'

export function AdminHomePage() {
  const [schoolId, setSchoolId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [rows, setRows] = useState<FichaRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseUrl = window.location.origin
  const link =
    schoolId && sectionId
      ? `${baseUrl}/colegio/${encodeURIComponent(
          schoolId,
        )}/seccion/${encodeURIComponent(sectionId)}`
      : ''

  const canUseSupabase = Boolean(supabase)

  useEffect(() => {
    if (!supabase || !schoolId || !sectionId) {
      setRows([])
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase!
        .from('fichas_colegio')
        .select('*')
        .eq('colegio', schoolId)
        .eq('seccion', sectionId)
        .order('created_at', { ascending: true })

      if (error) {
        setError('No se pudo cargar la lista de alumnos.')
        // eslint-disable-next-line no-console
        console.error(error)
      } else {
        setRows((data ?? []) as FichaRecord[])
      }
      setLoading(false)
    }

    void fetchData()
  }, [schoolId, sectionId])

  const handleDownloadPdf = async () => {
    if (!rows.length) return
    await downloadFichaPdf(schoolId, sectionId, rows)
  }

  return (
    <div className="page page-admin">
      <div className="card" style={{ marginBottom: 16 }}>
        <header className="page-header">
          <div className="logo-wrap">
            <LogoUTP width={120} height={48} />
          </div>
          <h1>Panel de enlaces</h1>
          <p className="page-subtitle">
            Genera el link por colegio y sección para compartirlo con los alumnos
            y revisa las fichas registradas.
          </p>
        </header>
        <div className="grid-2">
          <div className="field">
            <label>Colegio</label>
            <input
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              placeholder="Ejemplo: SanJose"
            />
          </div>
          <div className="field">
            <label>Sección</label>
            <input
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              placeholder="Ejemplo: 5toB"
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Link para alumnos</label>
            <input
              readOnly
              value={link}
              className="mono"
              placeholder="Completa colegio y sección para generar el link"
            />
            <p className="hint">
              Copia y pega este enlace en WhatsApp / Classroom para que los
              estudiantes llenen la ficha.
            </p>
          </div>

          {link && (
            <div className="field" style={{ alignItems: 'center' }}>
              <label>Código QR del enlace</label>
              <div className="qr-wrapper">
                <QRCodeCanvas
                  value={link}
                  size={140}
                  bgColor="#ffffff"
                  fgColor="#D02340"
                  includeMargin
                />
              </div>
              <p className="hint">
                Puedes proyectar o imprimir este QR para que los alumnos lo
                escaneen con su celular.
              </p>
            </div>
          )}
        </div>

        {!canUseSupabase && (
          <p className="hint">
            Para ver las fichas aquí necesitas configurar Supabase (URL y clave
            anónima).
          </p>
        )}
      </div>

      {canUseSupabase && (
        <div className="card">
          <div className="section">
            <h2 className="section-title">Fichas registradas</h2>
            {loading && <p className="hint">Cargando...</p>}
            {error && <p className="error">{error}</p>}
            {!loading && !error && (
              <>
                <p className="hint">
                  Total: <strong>{rows.length}</strong> alumno(s).
                </p>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>DNI</th>
                        <th>Celular</th>
                        <th>Año</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={`${r.dni}-${r.colegio}-${r.seccion}-${r.created_at}`}>
                          <td>{`${r.primer_apellido} ${r.segundo_apellido ?? ''} ${
                            r.nombres
                          }`}</td>
                          <td>{r.dni}</td>
                          <td>{r.celular_alumno}</td>
                          <td>{r.anio_que_cursa}</td>
                        </tr>
                      ))}
                      {!rows.length && (
                        <tr>
                          <td colSpan={4}>Aún no hay fichas para este grupo.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <footer className="form-footer">
            <button
              className="btn-primary"
              type="button"
              onClick={handleDownloadPdf}
              disabled={!rows.length}
            >
              Descargar informe PDF
            </button>
          </footer>
        </div>
      )}
    </div>
  )
}


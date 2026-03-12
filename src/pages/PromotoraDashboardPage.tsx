import { useEffect, useMemo, useState } from 'react'
import '../App.css'
import { supabase } from '../lib/supabaseClient'
import { LogoUTP } from '../components/LogoUTP'
import { QRCodeCanvas } from 'qrcode.react'
import type { FichaRecord } from '../utils/generateFichaPdf'
import { downloadFichaPdf } from '../utils/generateFichaPdf'

type Colegio = {
  id: string
  nombre: string
}

type Seccion = {
  id: string
  colegio_id: string
  nombre: string
  public_code: string
}

export function PromotoraDashboardPage() {
  const [colegios, setColegios] = useState<Colegio[]>([])
  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [selectedColegioId, setSelectedColegioId] = useState<string>('')

  const [newColegio, setNewColegio] = useState('')
  const [newSeccion, setNewSeccion] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)
  const [sectionRows, setSectionRows] = useState<FichaRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<FichaRecord> | null>(null)

  const baseUrl = window.location.origin
  const selectedSecciones = useMemo(
    () => secciones.filter((s) => s.colegio_id === selectedColegioId),
    [secciones, selectedColegioId],
  )

  useEffect(() => {
    if (!supabase) return
    const load = async () => {
      setLoading(true)
      setError(null)

      const colegiosRes = await supabase!
        .from('colegios')
        .select('id,nombre')
        .order('nombre', { ascending: true })

      if (colegiosRes.error) {
        setError('No se pudo cargar colegios. Revisa las políticas (RLS).')
        setLoading(false)
        return
      }

      setColegios((colegiosRes.data ?? []) as Colegio[])

      const seccionesRes = await supabase!
        .from('secciones')
        .select('id,colegio_id,nombre,public_code')
        .order('created_at', { ascending: true })

      if (seccionesRes.error) {
        setError('No se pudo cargar secciones. Revisa las políticas (RLS).')
        setLoading(false)
        return
      }

      setSecciones((seccionesRes.data ?? []) as Seccion[])
      setLoading(false)
    }
    void load()
  }, [])

  useEffect(() => {
    if (!supabase) return
    if (!selectedColegioId) return
    const run = async () => {
      const next: Record<string, number> = {}
      for (const s of selectedSecciones) {
        const { count } = await supabase!
          .from('fichas_colegio')
          .select('id', { count: 'exact', head: true })
          .eq('seccion_id', s.id)
        next[s.id] = count ?? 0
      }
      setCounts(next)
    }
    void run()
  }, [selectedColegioId, selectedSecciones])

  const createColegio = async () => {
    setError(null)
    if (!supabase) return
    if (!newColegio.trim()) return
    setLoading(true)
    const { data, error } = await supabase!
      .from('colegios')
      .insert({ nombre: newColegio.trim() })
      .select('id,nombre')
      .single()
    if (error) {
      setError('No se pudo crear el colegio. Revisa RLS.')
      setLoading(false)
      return
    }
    setColegios((prev) => [...prev, data as Colegio].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setNewColegio('')
    setSelectedColegioId((data as Colegio).id)
    setLoading(false)
  }

  const createSeccion = async () => {
    setError(null)
    if (!supabase) return
    if (!selectedColegioId) return
    if (!newSeccion.trim()) return
    setLoading(true)
    const { data, error } = await supabase!
      .from('secciones')
      .insert({ colegio_id: selectedColegioId, nombre: newSeccion.trim() })
      .select('id,colegio_id,nombre,public_code')
      .single()
    if (error) {
      setError('No se pudo crear la sección. Revisa RLS.')
      setLoading(false)
      return
    }
    setSecciones((prev) => [...prev, data as Seccion])
    setNewSeccion('')
    setLoading(false)
  }

  const toggleSection = async (seccionId: string) => {
    if (!supabase) return
    if (expandedSectionId === seccionId) {
      setExpandedSectionId(null)
      setSectionRows([])
      setEditingId(null)
      setEditForm(null)
      return
    }
    setExpandedSectionId(seccionId)
    setLoading(true)
    setError(null)
    const { data, error } = await supabase!
      .from('fichas_colegio')
      .select('*')
      .eq('seccion_id', seccionId)
      .order('created_at', { ascending: true })
    if (error) {
      setError('No se pudieron cargar las fichas de esta sección.')
      setLoading(false)
      return
    }
    setSectionRows((data ?? []) as FichaRecord[])
    setEditingId(null)
    setEditForm(null)
    setLoading(false)
  }

  const downloadPdfForSection = async (seccionId: string, seccionNombre: string) => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase!
      .from('fichas_colegio')
      .select('*')
      .eq('seccion_id', seccionId)
      .order('created_at', { ascending: true })
    if (error) {
      setError('No se pudo generar el informe. Revisa RLS.')
      setLoading(false)
      return
    }
    const colegioNombre = colegios.find((c) => c.id === selectedColegioId)?.nombre ?? 'Colegio'
    await downloadFichaPdf(colegioNombre, seccionNombre, (data ?? []) as FichaRecord[])
    setLoading(false)
  }

  const deleteSection = async (seccionId: string) => {
    if (!supabase) return
    const confirm = window.confirm(
      '¿Eliminar esta sección y sus fichas asociadas? Esta acción no se puede deshacer.',
    )
    if (!confirm) return
    setLoading(true)
    setError(null)
    const { error } = await supabase!.from('secciones').delete().eq('id', seccionId)
    if (error) {
      setError('No se pudo eliminar la sección. Revisa RLS.')
      setLoading(false)
      return
    }
    setSecciones((prev) => prev.filter((s) => s.id !== seccionId))
    setCounts((prev) => {
      const copy = { ...prev }
      delete copy[seccionId]
      return copy
    })
    if (expandedSectionId === seccionId) {
      setExpandedSectionId(null)
      setSectionRows([])
    }
    setLoading(false)
  }

  const startEdit = (row: FichaRecord) => {
    setEditingId(row.id)
    setEditForm({ ...row })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEdit = async () => {
    if (!supabase || !editingId || !editForm) return
    setLoading(true)
    setError(null)
    const payload = {
      celular_alumno: editForm.celular_alumno,
      email: editForm.email,
      nombre_padre: editForm.nombre_padre,
      celular_padre: editForm.celular_padre,
      nombre_madre: editForm.nombre_madre,
      celular_madre: editForm.celular_madre,
      codigo_carrera_1: editForm.codigo_carrera_1,
      codigo_carrera_2: editForm.codigo_carrera_2,
      direccion: editForm.direccion,
      distrito: editForm.distrito,
      provincia: editForm.provincia,
      departamento: editForm.departamento,
      dni: editForm.dni,
    }
    const { error } = await supabase.from('fichas_colegio').update(payload).eq('id', editingId)
    if (error) {
      setError('No se pudo actualizar la ficha. Revisa RLS o intenta de nuevo.')
      setLoading(false)
      return
    }
    setSectionRows((prev) =>
      prev.map((r) => (r.id === editingId ? { ...r, ...payload } as FichaRecord : r)),
    )
    setLoading(false)
    setEditingId(null)
    setEditForm(null)
  }

  const deleteAlumno = async (fichaId: string, alumnoNombre: string) => {
    if (!supabase) return
    const confirm = window.confirm(`¿Eliminar la ficha de ${alumnoNombre}? Esta acción no se puede deshacer.`)
    if (!confirm) return
    setLoading(true)
    setError(null)
    const { error } = await supabase!.from('fichas_colegio').delete().eq('id', fichaId)
    if (error) {
      setError('No se pudo eliminar la ficha. Revisa RLS.')
      setLoading(false)
      return
    }
    setSectionRows((prev) => prev.filter((r) => r.id !== fichaId))
    setCounts((prev) => {
      const copy = { ...prev }
      if (expandedSectionId && copy[expandedSectionId]) {
        copy[expandedSectionId] = Math.max(0, copy[expandedSectionId] - 1)
      }
      return copy
    })
    setLoading(false)
  }

  const deleteColegio = async () => {
    if (!supabase) return
    if (!selectedColegioId) return
    const colegio = colegios.find((c) => c.id === selectedColegioId)
    const confirm = window.confirm(
      `¿Eliminar el colegio "${colegio?.nombre ?? ''}" y todas sus secciones y fichas asociadas? Esta acción no se puede deshacer.`,
    )
    if (!confirm) return
    setLoading(true)
    setError(null)
    
    try {
      // Obtener todas las secciones del colegio
      const { data: seccionesDelColegio, error: seccionesError } = await supabase!
        .from('secciones')
        .select('id')
        .eq('colegio_id', selectedColegioId)
      
      if (seccionesError) {
        setError('No se pudo obtener las secciones del colegio.')
        setLoading(false)
        return
      }
      
      const seccionesIds = seccionesDelColegio?.map((s) => s.id) ?? []
      
      // Eliminar todas las fichas de cada sección
      if (seccionesIds.length > 0) {
        for (const seccionId of seccionesIds) {
          const { error: fichasError } = await supabase!
            .from('fichas_colegio')
            .delete()
            .eq('seccion_id', seccionId)
          if (fichasError) {
            console.error('Error eliminando fichas:', fichasError)
            setError('No se pudo eliminar las fichas. Revisa RLS.')
            setLoading(false)
            return
          }
        }
      }
      
      // Luego eliminar todas las secciones (una por una)
      if (seccionesIds.length > 0) {
        for (const seccionId of seccionesIds) {
          const { error: seccionError } = await supabase!
            .from('secciones')
            .delete()
            .eq('id', seccionId)
          if (seccionError) {
            console.error('Error eliminando sección:', seccionError)
            setError('No se pudo eliminar las secciones. Revisa RLS.')
            setLoading(false)
            return
          }
        }
      }
      
      // Finalmente eliminar el colegio
      const { error } = await supabase!.from('colegios').delete().eq('id', selectedColegioId)
      if (error) {
        console.error('Error eliminando colegio:', error)
        setError('No se pudo eliminar el colegio. Revisa RLS.')
        setLoading(false)
        return
      }
      
      setColegios((prev) => prev.filter((c) => c.id !== selectedColegioId))
      setSecciones((prev) => prev.filter((s) => s.colegio_id !== selectedColegioId))
      setCounts((prev) => {
        const copy = { ...prev }
        for (const id of seccionesIds) delete copy[id]
        return copy
      })
      setSelectedColegioId('')
      if (expandedSectionId && seccionesIds.includes(expandedSectionId)) {
        setExpandedSectionId(null)
        setSectionRows([])
      }
    } catch (err) {
      console.error('Error inesperado:', err)
      setError('Error inesperado al eliminar el colegio.')
    }
    setLoading(false)
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="page page-admin">
      <div className="card" style={{ marginBottom: 16 }}>
        <header className="page-header">
          <div className="logo-wrap">
            <LogoUTP width={140} height={52} />
          </div>
          <h1>Panel de promotora</h1>
          <p className="page-subtitle">
            Crea tus colegios y secciones. El sistema generará un QR para que los alumnos escaneen y registren su ficha.
          </p>
        </header>

        <div className="grid-2">
          <div className="field">
            <label>Nuevo colegio</label>
            <input value={newColegio} onChange={(e) => setNewColegio(e.target.value)} placeholder="Ej: Colegio San Juan" />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn-primary" type="button" onClick={createColegio} disabled={loading}>
              Crear colegio
            </button>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Selecciona colegio</label>
            <select
              value={selectedColegioId}
              onChange={(e) => setSelectedColegioId(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {colegios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {selectedColegioId && (
              <button
                type="button"
                className="btn-link"
                style={{ marginTop: 4, alignSelf: 'flex-start' }}
                onClick={() => void deleteColegio()}
                disabled={loading}
              >
                Eliminar colegio
              </button>
            )}
          </div>
          <div className="field">
            <label>Nueva sección</label>
            <input
              value={newSeccion}
              onChange={(e) => setNewSeccion(e.target.value)}
              placeholder="Ej: 5to B"
              disabled={!selectedColegioId}
            />
          </div>
        </div>

        <div className="form-footer">
          {error && <p className="error">{error}</p>}
          <div style={{ display: 'flex', gap: 12, width: '100%', flexWrap: 'wrap' }}>
            <button className="btn-primary" type="button" onClick={createSeccion} disabled={loading || !selectedColegioId}>
              Crear sección
            </button>
            <button className="btn-link" type="button" onClick={signOut}>
              Cerrar sesión
            </button>
          </div>
          {loading && <p className="hint">Cargando…</p>}
        </div>
      </div>

      {selectedColegioId && (
        <div className="card">
          <h2 className="section-title">Secciones y QR</h2>
          {!selectedSecciones.length ? (
            <p className="hint">Aún no hay secciones para este colegio.</p>
          ) : (
            <div className="grid-2">
              {selectedSecciones.map((s) => {
                const link = `${baseUrl}/s/${encodeURIComponent(s.public_code)}`
                return (
                  <div key={s.id} className="card" style={{ padding: 16, border: '1px solid rgba(208,35,64,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#D02340' }}>{s.nombre}</p>
                      <button
                        className="btn-link"
                        type="button"
                        onClick={() => deleteSection(s.id)}
                        disabled={loading}
                      >
                        Eliminar
                      </button>
                    </div>
                    <p className="hint" style={{ marginTop: 6 }}>
                      Registrados: <strong>{counts[s.id] ?? 0}</strong>
                    </p>
                    <p className="hint" style={{ marginTop: 6 }}>
                      Link alumno: <span className="mono">{link}</span>
                    </p>
                    <div className="qr-wrapper" style={{ marginTop: 10 }}>
                      <QRCodeCanvas value={link} size={160} bgColor="#ffffff" fgColor="#D02340" includeMargin />
                    </div>
                    <p className="hint" style={{ marginTop: 8 }}>
                      Los alumnos solo escanean el QR y llenan la ficha.
                    </p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                      <button className="btn-primary" type="button" onClick={() => toggleSection(s.id)} disabled={loading}>
                        {expandedSectionId === s.id ? 'Ocultar fichas' : 'Ver fichas'}
                      </button>
                      <button
                        className="btn-link"
                        type="button"
                        onClick={() => downloadPdfForSection(s.id, s.nombre)}
                        disabled={loading}
                      >
                        Descargar PDF
                      </button>
                    </div>
                    {expandedSectionId === s.id && (
                      <div style={{ marginTop: 12 }}>
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
                              {sectionRows.map((r) => (
                                <tr key={`${r.dni}-${r.created_at}`}>
                                  <td>{`${r.primer_apellido} ${r.segundo_apellido ?? ''} ${r.nombres}`}</td>
                                  <td>{r.dni}</td>
                                  <td>{r.celular_alumno}</td>
                                  <td>{r.anio_que_cursa}</td>
                                </tr>
                              ))}
                              {!sectionRows.length && (
                                <tr>
                                  <td colSpan={4}>Aún no hay fichas en esta sección.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        {sectionRows.length > 0 && (
                          <div className="fichas-grid">
                            {sectionRows.map((r) => (
                              <article key={`${r.dni}-${r.created_at}-card`} className="ficha-card">
                                <div className="ficha-card-header">
                                  <h3>{`${r.primer_apellido} ${r.segundo_apellido ?? ''} ${r.nombres}`}</h3>
                                  <span>DNI: {r.dni ?? '—'}</span>
                                </div>
                                {editingId === r.id && editForm ? (
                                  <div className="ficha-card-section">
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Celular alumno:</span>
                                      <input
                                        className="ficha-field-value"
                                        value={editForm.celular_alumno ?? ''}
                                        onChange={(e) =>
                                          setEditForm((f) => ({ ...(f ?? {}), celular_alumno: e.target.value }))
                                        }
                                      />
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">DNI:</span>
                                      <input
                                        className="ficha-field-value"
                                        value={editForm.dni ?? ''}
                                        onChange={(e) =>
                                          setEditForm((f) => ({ ...(f ?? {}), dni: e.target.value }))
                                        }
                                      />
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Correo:</span>
                                      <input
                                        className="ficha-field-value"
                                        value={editForm.email ?? ''}
                                        onChange={(e) =>
                                          setEditForm((f) => ({ ...(f ?? {}), email: e.target.value }))
                                        }
                                      />
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Padre:</span>
                                      <input
                                        className="ficha-field-value"
                                        placeholder="Nombre del padre"
                                        value={editForm.nombre_padre ?? ''}
                                        onChange={(e) =>
                                          setEditForm((f) => ({ ...(f ?? {}), nombre_padre: e.target.value }))
                                        }
                                      />
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Celular padre:</span>
                                      <input
                                        className="ficha-field-value"
                                        value={editForm.celular_padre ?? ''}
                                        onChange={(e) =>
                                          setEditForm((f) => ({ ...(f ?? {}), celular_padre: e.target.value }))
                                        }
                                      />
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Madre:</span>
                                      <input
                                        className="ficha-field-value"
                                        placeholder="Nombre de la madre"
                                        value={editForm.nombre_madre ?? ''}
                                        onChange={(e) =>
                                          setEditForm((f) => ({ ...(f ?? {}), nombre_madre: e.target.value }))
                                        }
                                      />
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Celular madre:</span>
                                      <input
                                        className="ficha-field-value"
                                        value={editForm.celular_madre ?? ''}
                                        onChange={(e) =>
                                          setEditForm((f) => ({ ...(f ?? {}), celular_madre: e.target.value }))
                                        }
                                      />
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Carrera 1:</span>
                                      <input
                                        className="ficha-field-value"
                                        value={editForm.codigo_carrera_1 ?? ''}
                                        onChange={(e) =>
                                          setEditForm((f) => ({ ...(f ?? {}), codigo_carrera_1: e.target.value }))
                                        }
                                      />
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Carrera 2:</span>
                                      <input
                                        className="ficha-field-value"
                                        value={editForm.codigo_carrera_2 ?? ''}
                                        onChange={(e) =>
                                          setEditForm((f) => ({ ...(f ?? {}), codigo_carrera_2: e.target.value }))
                                        }
                                      />
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Dirección:</span>
                                      <input
                                        className="ficha-field-value"
                                        value={editForm.direccion ?? ''}
                                        onChange={(e) =>
                                          setEditForm((f) => ({ ...(f ?? {}), direccion: e.target.value }))
                                        }
                                      />
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Ubicación:</span>
                                      <input
                                        className="ficha-field-value"
                                        placeholder="Distrito / Provincia / Departamento"
                                        value={
                                          [editForm.distrito, editForm.provincia, editForm.departamento]
                                            .filter(Boolean)
                                            .join(' / ')
                                        }
                                        onChange={(e) => {
                                          const [d, p, dep] = e.target.value.split('/').map((x) => x.trim())
                                          setEditForm((f) => ({
                                            ...(f ?? {}),
                                            distrito: d || null,
                                            provincia: p || null,
                                            departamento: dep || null,
                                          }))
                                        }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                      <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() => void saveEdit()}
                                        disabled={loading}
                                      >
                                        Guardar cambios
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-link"
                                        onClick={cancelEdit}
                                        disabled={loading}
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="ficha-card-section">
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Celular alumno:</span>
                                      <span className="ficha-field-value">{r.celular_alumno}</span>
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Año:</span>
                                      <span className="ficha-field-value">{r.anio_que_cursa}</span>
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Correo:</span>
                                      <span className="ficha-field-value">{r.email ?? '—'}</span>
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Padre:</span>
                                      <span className="ficha-field-value">
                                        {r.nombre_padre ?? '—'} {r.celular_padre ? `(${r.celular_padre})` : ''}
                                      </span>
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Madre:</span>
                                      <span className="ficha-field-value">
                                        {r.nombre_madre ?? '—'} {r.celular_madre ? `(${r.celular_madre})` : ''}
                                      </span>
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Carrera 1:</span>
                                      <span className="ficha-field-value">{r.codigo_carrera_1 ?? '—'}</span>
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Carrera 2:</span>
                                      <span className="ficha-field-value">{r.codigo_carrera_2 ?? '—'}</span>
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Dirección:</span>
                                      <span className="ficha-field-value">{r.direccion ?? '—'}</span>
                                    </div>
                                    <div className="ficha-line">
                                      <span className="ficha-field-label ficha-line-label">Ubicación:</span>
                                      <span className="ficha-field-value">
                                        {[r.distrito, r.provincia, r.departamento]
                                          .filter(Boolean)
                                          .join(' / ') || '—'}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                      <button
                                        type="button"
                                        className="btn-link"
                                        style={{ paddingLeft: 0 }}
                                        onClick={() => startEdit(r)}
                                      >
                                        Editar datos
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-link"
                                        style={{ paddingLeft: 0, color: '#D02340' }}
                                        onClick={() => deleteAlumno(r.id, `${r.primer_apellido} ${r.nombres}`)}
                                        disabled={loading}
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


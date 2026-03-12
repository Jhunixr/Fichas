import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import '../App.css'
import { supabase } from '../lib/supabaseClient'
import { CARRERAS } from '../data/carreras'
import { LogoUTP } from '../components/LogoUTP'

const DOMINIOS: Record<string, string> = {
  hotmail: '@hotmail.com',
  gmail: '@gmail.com',
  outlook: '@outlook.com',
  yahoo: '@yahoo.com',
}

type UbigeoPeru = Record<string, Record<string, string[]>>

const fichaSchema = z.object({
  primerApellido: z.string().min(1, 'Obligatorio'),
  segundoApellido: z.string().optional(),
  nombres: z.string().min(1, 'Obligatorio'),
  dni: z
    .string()
    .min(8, 'Debe tener 8 dígitos')
    .max(8, 'Debe tener 8 dígitos')
    .regex(/^\d+$/, 'Solo números'),
  celularAlumno: z
    .string()
    .min(9, 'Debe tener 9 dígitos')
    .max(9, 'Debe tener 9 dígitos')
    .regex(/^\d+$/, 'Solo números'),
  anioQueCursa: z.enum(['4', '5', 'egresado']),

  // Correo: usuario + dominio
  usuarioEmail: z.string().optional().or(z.literal('')),
  dominioEmail: z
    .enum(['hotmail', 'gmail', 'outlook', 'yahoo'])
    .optional()
    .or(z.literal('')),

  nombrePadre: z.string().optional(),
  celularPadre: z
    .string()
    .min(9, 'Debe tener 9 dígitos')
    .max(9, 'Debe tener 9 dígitos')
    .regex(/^\d+$/, 'Solo números')
    .optional()
    .or(z.literal('')),
  nombreMadre: z.string().optional(),
  celularMadre: z
    .string()
    .min(9, 'Debe tener 9 dígitos')
    .max(9, 'Debe tener 9 dígitos')
    .regex(/^\d+$/, 'Solo números')
    .optional()
    .or(z.literal('')),

  direccion: z.string().optional(),
  tipoVia: z.enum(['av', 'jr', 'calle', 'pasaje', 'aahh', 'otros']).optional(),
  distrito: z.string().optional(),
  provincia: z.string().optional(),
  departamento: z.string().optional(),

  codigoCarrera1: z.string().optional().or(z.literal('')),
  codigoCarrera2: z.string().optional().or(z.literal('')),
})

type FichaForm = z.infer<typeof fichaSchema>

const buildStorageKey = (scope: string) => `ficha-colegio:${scope}`

type StudentFormPageProps = {
  colegioLabel?: string
  seccionLabel?: string
  colegioId?: string
  seccionId?: string
  sectionCode?: string
}

export function StudentFormPage(props: StudentFormPageProps) {
  const { schoolId, sectionId } = useParams()
  const [ubigeo, setUbigeo] = useState<UbigeoPeru | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FichaForm>({
    resolver: zodResolver(fichaSchema),
    defaultValues: {
      anioQueCursa: '5',
    },
  })

  const usuarioEmail = watch('usuarioEmail')
  const dominioEmail = watch('dominioEmail')
  const departamentoSel = watch('departamento')
  const provinciaSel = watch('provincia')

  const correoCompleto =
    usuarioEmail && dominioEmail && DOMINIOS[dominioEmail]
      ? `${usuarioEmail}${DOMINIOS[dominioEmail]}`
      : ''

  const departamentos = ubigeo ? Object.keys(ubigeo).sort() : []
  const provincias =
    ubigeo && departamentoSel && ubigeo[departamentoSel]
      ? Object.keys(ubigeo[departamentoSel]).sort()
      : []
  const distritos =
    ubigeo && departamentoSel && provinciaSel && ubigeo[departamentoSel]?.[provinciaSel]
      ? [...ubigeo[departamentoSel][provinciaSel]].sort()
      : []

  useEffect(() => {
    fetch('/ubigeo-peru.json')
      .then((r) => r.json())
      .then(setUbigeo)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setValue('provincia', '')
    setValue('distrito', '')
  }, [departamentoSel, setValue])

  useEffect(() => {
    setValue('distrito', '')
  }, [provinciaSel, setValue])

  const storageScope =
    props.sectionCode ||
    (schoolId && sectionId ? `legacy:${schoolId}:${sectionId}` : 'default')
  const storageKey = buildStorageKey(storageScope)

  // Cargar borrador local al abrir
  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        reset(parsed)
      } catch {
        // ignorar
      }
    }
  }, [reset, storageKey])

  // Guardar borrador local cada vez que cambie el formulario
  useEffect(() => {
    const subscription = watch((values) => {
      localStorage.setItem(storageKey, JSON.stringify(values))
    })
    return () => subscription.unsubscribe()
  }, [watch, storageKey])

  const onSubmit = async (data: FichaForm) => {
    const emailFinal =
      data.usuarioEmail && data.dominioEmail && DOMINIOS[data.dominioEmail]
        ? `${data.usuarioEmail}${DOMINIOS[data.dominioEmail]}`
        : ''

    const payload = {
      // legacy o normalizado
      colegio: props.colegioLabel ?? schoolId ?? null,
      seccion: props.seccionLabel ?? sectionId ?? null,
      colegio_id: props.colegioId ?? null,
      seccion_id: props.seccionId ?? null,
      section_code: props.sectionCode ?? null,
      primer_apellido: data.primerApellido,
      segundo_apellido: data.segundoApellido || null,
      nombres: data.nombres,
      dni: data.dni || null,
      celular_alumno: data.celularAlumno,
      anio_que_cursa: data.anioQueCursa,
      email: emailFinal || null,
      usuario_email: data.usuarioEmail || null,
      dominio_email: data.dominioEmail || null,
      nombre_padre: data.nombrePadre || null,
      celular_padre: data.celularPadre || null,
      nombre_madre: data.nombreMadre || null,
      celular_madre: data.celularMadre || null,
      direccion: data.direccion || null,
      tipo_via: data.tipoVia || null,
      distrito: data.distrito || null,
      provincia: data.provincia || null,
      departamento: data.departamento || null,
      codigo_carrera_1: data.codigoCarrera1 || null,
      codigo_carrera_2: data.codigoCarrera2 || null,
    }

    if (!supabase) {
      alert(
        'Los datos se guardaron solo en este dispositivo. Falta configurar Supabase (URL y clave).',
      )
      return
    }

    const { error } = await supabase.from('fichas_colegio').insert(payload)

    if (error) {
      // eslint-disable-next-line no-console
      console.error(error)
      alert('Ocurrió un error al guardar en el servidor. Intenta nuevamente.')
      return
    }

    alert('¡Datos guardados correctamente!')
  }

  return (
    <div className="page page-student">
      <div className="card form-card">
        <header className="page-header">
          <div className="logo-wrap">
            <LogoUTP width={120} height={48} />
          </div>
          <h1>Ficha de Colegio</h1>
          <p className="page-subtitle">
            {(props.colegioLabel || schoolId) && (props.seccionLabel || sectionId)
              ? `Colegio: ${props.colegioLabel ?? schoolId} · Sección: ${props.seccionLabel ?? sectionId}`
              : 'Completa tus datos con cuidado.'}
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)}>
        <section className="section">
          <h2 className="section-title">Datos del alumno</h2>
          <div className="grid-2">
            <div className="field">
              <label>
                Primer apellido <span className="required">*</span>
              </label>
              <input {...register('primerApellido')} />
              {errors.primerApellido && (
                <p className="error">{errors.primerApellido.message}</p>
              )}
            </div>
            <div className="field">
              <label>Segundo apellido</label>
              <input {...register('segundoApellido')} />
            </div>
            <div className="field">
              <label>
                Nombres <span className="required">*</span>
              </label>
              <input {...register('nombres')} />
              {errors.nombres && <p className="error">{errors.nombres.message}</p>}
            </div>
            <div className="field">
              <label>DNI (8 dígitos)</label>
              <input {...register('dni')} inputMode="numeric" maxLength={8} />
              {errors.dni && <p className="error">{errors.dni.message}</p>}
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>
                Celular del alumno (9 dígitos) <span className="required">*</span>
              </label>
              <input
                {...register('celularAlumno')}
                inputMode="numeric"
                maxLength={9}
              />
              {errors.celularAlumno && (
                <p className="error">{errors.celularAlumno.message}</p>
              )}
            </div>

            <div className="field">
              <label>Año que cursa</label>
              <div className="radio-group">
                <label>
                  <input type="radio" value="4" {...register('anioQueCursa')} /> 4to
                </label>
                <label>
                  <input type="radio" value="5" {...register('anioQueCursa')} /> 5to
                </label>
                <label>
                  <input
                    type="radio"
                    value="egresado"
                    {...register('anioQueCursa')}
                  />{' '}
                  Egresado
                </label>
              </div>
              {errors.anioQueCursa && (
                <p className="error">{errors.anioQueCursa.message}</p>
              )}
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Correo</label>
              <input
                {...register('usuarioEmail')}
                placeholder="Escribe solo lo que va antes del @ (ej: juan123)"
              />
            </div>
            <div className="field">
              <label>Dominio</label>
              <select {...register('dominioEmail')}>
                <option value="">Selecciona un dominio</option>
                <option value="hotmail">@hotmail.com</option>
                <option value="gmail">@gmail.com</option>
                <option value="outlook">@outlook.com</option>
                <option value="yahoo">@yahoo.com</option>
              </select>
            </div>
          </div>
          {correoCompleto && (
            <div className="field" style={{ marginTop: 8 }}>
              <label>Tu correo completo</label>
              <input
                readOnly
                value={correoCompleto}
                className="correo-completo"
              />
            </div>
          )}
        </section>

        <section className="section">
          <h2 className="section-title">Datos de los padres</h2>
          <div className="grid-2">
            <div className="field">
              <label>Nombre del padre</label>
              <input {...register('nombrePadre')} />
            </div>
            <div className="field">
              <label>Celular del padre (9 dígitos)</label>
              <input
                {...register('celularPadre')}
                inputMode="numeric"
                maxLength={9}
              />
              {errors.celularPadre && (
                <p className="error">{errors.celularPadre.message}</p>
              )}
            </div>
            <div className="field">
              <label>Nombre de la madre</label>
              <input {...register('nombreMadre')} />
            </div>
            <div className="field">
              <label>Celular de la madre (9 dígitos)</label>
              <input
                {...register('celularMadre')}
                inputMode="numeric"
                maxLength={9}
              />
              {errors.celularMadre && (
                <p className="error">{errors.celularMadre.message}</p>
              )}
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Dirección</h2>
          <div className="grid-1">
            <div className="field">
              <label>Dirección</label>
              <input {...register('direccion')} />
            </div>
          </div>
          <div className="grid-1">
            <div className="field">
              <label>Tipo de vía</label>
              <div className="radio-group">
                <label>
                  <input type="radio" value="av" {...register('tipoVia')} /> Av.
                </label>
                <label>
                  <input type="radio" value="jr" {...register('tipoVia')} /> Jr.
                </label>
                <label>
                  <input type="radio" value="calle" {...register('tipoVia')} /> Calle
                </label>
                <label>
                  <input type="radio" value="pasaje" {...register('tipoVia')} /> Pasaje
                </label>
                <label>
                  <input type="radio" value="aahh" {...register('tipoVia')} /> AA.HH.
                </label>
                <label>
                  <input type="radio" value="otros" {...register('tipoVia')} /> Otros
                </label>
              </div>
            </div>
          </div>
          <div className="grid-3">
            <div className="field">
              <label>Departamento</label>
              <select {...register('departamento')}>
                <option value="">Selecciona departamento</option>
                {departamentos.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Provincia</label>
              <select {...register('provincia')} disabled={!departamentoSel}>
                <option value="">Selecciona provincia</option>
                {provincias.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Distrito</label>
              <select {...register('distrito')} disabled={!provinciaSel}>
                <option value="">Selecciona distrito</option>
                {distritos.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Interés de carrera</h2>
          <div className="grid-2">
            <div className="field">
              <label>Código Carrera 1</label>
              <select {...register('codigoCarrera1')}>
                <option value="">Selecciona una opción</option>
                {CARRERAS.map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.codigo} - {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Código Carrera 2</label>
              <select {...register('codigoCarrera2')}>
                <option value="">Selecciona una opción</option>
                {CARRERAS.map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.codigo} - {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <footer className="form-footer">
          <p className="hint">
            Los campos marcados con <span className="required">*</span> son
            obligatorios.
          </p>
          <button className="btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar datos'}
          </button>
        </footer>
        </form>
      </div>
    </div>
  )
}


import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export type FichaRecord = {
  primer_apellido: string
  segundo_apellido: string | null
  nombres: string
  dni: string | null
  celular_alumno: string
  anio_que_cursa: string
  email: string | null
  usuario_email: string | null
  dominio_email: string | null
  dominio_email_otro: string | null
  nombre_padre: string | null
  celular_padre: string | null
  nombre_madre: string | null
  celular_madre: string | null
  direccion: string | null
  tipo_via: string | null
  distrito: string | null
  provincia: string | null
  departamento: string | null
  colegio: string
  seccion: string
  created_at?: string
  codigo_carrera_1: string | null
  codigo_carrera_2: string | null
}

export async function downloadFichaPdf(
  colegio: string,
  seccion: string,
  fichas: FichaRecord[],
) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pageMargin = 40
  const lineHeight = 14

  fichas.forEach((ficha, index) => {
    const page = pdfDoc.addPage([595, 842]) // A4
    const { height } = page.getSize()

    let y = height - pageMargin

    page.drawText('FICHA DE COLEGIO', {
      x: pageMargin,
      y,
      size: 16,
      font,
      color: rgb(208 / 255, 35 / 255, 64 / 255),
    })

    y -= lineHeight * 1.6
    page.drawText(`Colegio: ${colegio}   Sección: ${seccion}`, {
      x: pageMargin,
      y,
      size: 11,
      font,
    })

    y -= lineHeight * 2

    const drawLine = (label: string, value: string | null | undefined) => {
      if (y < pageMargin + lineHeight * 3) return
      const text = `${label}: ${value ?? ''}`
      page.drawText(text, {
        x: pageMargin,
        y,
        size: 10,
        font,
      })
      y -= lineHeight
    }

    drawLine(
      'Alumno',
      `${ficha.primer_apellido} ${ficha.segundo_apellido ?? ''} ${ficha.nombres}`,
    )
    drawLine('DNI', ficha.dni ?? '')
    drawLine('Celular alumno', ficha.celular_alumno)
    drawLine('Año que cursa', ficha.anio_que_cursa)
    drawLine('E-mail', ficha.email ?? '')
    drawLine(
      'Usuario / dominio',
      `${ficha.usuario_email ?? ''} ${
        ficha.dominio_email === 'otro'
          ? ficha.dominio_email_otro ?? ''
          : ficha.dominio_email ?? ''
      }`,
    )
    drawLine('Nombre del padre', ficha.nombre_padre ?? '')
    drawLine('Celular padre', ficha.celular_padre ?? '')
    drawLine('Nombre de la madre', ficha.nombre_madre ?? '')
    drawLine('Celular madre', ficha.celular_madre ?? '')
    drawLine(
      'Dirección',
      `${ficha.direccion ?? ''} ${
        ficha.tipo_via
          ? `(tipo: ${
              {
                av: 'Av.',
                jr: 'Jr.',
                calle: 'Calle',
                pasaje: 'Pasaje',
                aahh: 'AA.HH.',
                otros: 'Otros',
              }[ficha.tipo_via] ?? ficha.tipo_via
            })`
          : ''
      }`,
    )
    drawLine('Distrito', ficha.distrito ?? '')
    drawLine('Provincia', ficha.provincia ?? '')
    drawLine('Departamento', ficha.departamento ?? '')
    drawLine('Código carrera 1', ficha.codigo_carrera_1 ?? '')
    drawLine('Código carrera 2', ficha.codigo_carrera_2 ?? '')

    y -= lineHeight

    page.drawText(`Ficha ${index + 1} de ${fichas.length}`, {
      x: pageMargin,
      y,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    })
  })

  const bytes = await pdfDoc.save()
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `fichas-${colegio}-${seccion}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()

  URL.revokeObjectURL(url)
}


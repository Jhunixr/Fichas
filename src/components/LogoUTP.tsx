/* Logo UTP oficial: U y P en cajas rojas, T al centro en negro. Rojo #D02340 */

interface LogoUTPProps {
  width?: number
  height?: number
  className?: string
}

const UTP_RED = '#D02340'

export function LogoUTP({
  width = 120,
  height = 48,
  className = '',
}: LogoUTPProps) {
  const boxW = 36
  const boxH = 40
  const gap = 4
  const tW = 28

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 108 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Universidad Tecnológica del Perú"
    >
      {/* U - caja roja */}
      <rect x="0" y="2" width={boxW} height={boxH} rx="4" fill={UTP_RED} />
      <text
        x={boxW / 2}
        y="26"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="22"
        fill="#ffffff"
      >
        U
      </text>

      {/* T - fondo negro */}
      <rect x={boxW + gap} y="2" width={tW} height={boxH} rx="4" fill="#1a1a1a" />
      <text
        x={boxW + gap + tW / 2}
        y="26"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="22"
        fill="#ffffff"
      >
        T
      </text>

      {/* P - caja roja */}
      <rect x={boxW + gap + tW + gap} y="2" width={boxW} height={boxH} rx="4" fill={UTP_RED} />
      <text
        x={boxW + gap + tW + gap + boxW / 2}
        y="26"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="22"
        fill="#ffffff"
      >
        P
      </text>

    </svg>
  )
}

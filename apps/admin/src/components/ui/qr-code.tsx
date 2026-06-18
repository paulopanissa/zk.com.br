import { QrCode } from '@ark-ui/react'
import { cn } from '@/lib/utils'

interface QrCodeWidgetProps {
  value: string
  size?: number
  logo?: React.ReactNode
  className?: string
}

export function QrCodeWidget({ value, size = 192, logo, className }: QrCodeWidgetProps) {
  return (
    <QrCode.Root
      value={value}
      encoding={{ ecc: logo ? 'H' : 'M' }}
      className={cn('relative inline-block', className)}
    >
      <QrCode.Frame style={{ width: size, height: size }}>
        <QrCode.Pattern />
      </QrCode.Frame>
      {logo && (
        <QrCode.Overlay className="absolute inset-0 flex items-center justify-center">
          {logo}
        </QrCode.Overlay>
      )}
    </QrCode.Root>
  )
}

export function ZkLogoOverlay() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange text-white font-display font-bold text-xs shadow-sm">
      Z&amp;K
    </div>
  )
}

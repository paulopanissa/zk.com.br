import { useEffect, useRef, useState } from 'react'
import { X, Maximize2, AlertCircle } from 'lucide-react'

interface VideoModalProps {
  videoUrl: string
  nome: string
  onClose: () => void
}

export function VideoModal({ videoUrl, nome, onClose }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoError, setVideoError] = useState(false)
  const [canFullscreen, setCanFullscreen] = useState(true)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    // Detecta suporte a fullscreen para esconder botão quando indisponível
    setCanFullscreen(
      document.fullscreenEnabled ||
        ('webkitFullscreenEnabled' in document &&
          Boolean((document as Record<string, unknown>).webkitFullscreenEnabled)),
    )
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleFullscreen() {
    const el = videoRef.current
    if (!el) return
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if ('webkitEnterFullscreen' in el) {
        // iOS Safari fallback
        ;(el as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.()
      }
    } catch {
      // Fullscreen recusado (ex: policy do browser) — silencia sem alertar o usuário
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Vídeo: ${nome}`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-11 right-0 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Fechar vídeo"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="overflow-hidden rounded-2xl bg-black aspect-video shadow-2xl">
          {videoError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/60">
              <AlertCircle className="h-10 w-10" />
              <p className="text-sm">Não foi possível carregar o vídeo</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              muted
              className="w-full h-full"
              onError={() => setVideoError(true)}
            />
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm text-white/80 font-medium truncate">{nome}</p>
          {canFullscreen && !videoError && (
            <button
              type="button"
              onClick={handleFullscreen}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white font-medium hover:bg-white/20 transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
              Mostrar ao cliente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

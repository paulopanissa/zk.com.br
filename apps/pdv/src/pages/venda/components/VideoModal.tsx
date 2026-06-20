import { useEffect, useRef } from 'react'
import { X, Maximize2 } from 'lucide-react'

interface VideoModalProps {
  videoUrl: string
  nome: string
  onClose: () => void
}

export function VideoModal({ videoUrl, nome, onClose }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleFullscreen() {
    videoRef.current?.requestFullscreen?.()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Fechar vídeo"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="overflow-hidden rounded-2xl bg-black aspect-video shadow-2xl">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full"
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm text-white/80 font-medium truncate">{nome}</p>
          <button
            type="button"
            onClick={handleFullscreen}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm text-white font-medium hover:bg-white/20 transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
            Mostrar ao cliente
          </button>
        </div>
      </div>
    </div>
  )
}

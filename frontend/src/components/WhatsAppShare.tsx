import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WhatsAppShareProps {
  message: string
  url?: string
  className?: string
  variant?: 'button' | 'icon'
}

export default function WhatsAppShare({ message, url, className, variant = 'button' }: WhatsAppShareProps) {
  const handleShare = () => {
    const text = message + (url ? ' ' + url : '')
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleShare}
        className={cn(
          'inline-flex items-center justify-center rounded-lg p-2 text-[#25D366] transition-colors hover:bg-[#25D366]/10',
          className
        )}
        aria-label="Share on WhatsApp"
      >
        <MessageCircle className="size-5" />
      </button>
    )
  }

  return (
    <Button
      onClick={handleShare}
      className={cn(
        'gap-2 border-[#25D366] bg-[#25D366] text-white hover:bg-[#1EBE57]',
        className
      )}
    >
      <MessageCircle className="size-4" />
      Share on WhatsApp
    </Button>
  )
}

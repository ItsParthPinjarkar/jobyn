import * as React from "react"
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface DragDropUploadProps {
  onFile: (file: File) => void
  accept?: string
  maxSize?: number
  loading?: boolean
  error?: string
  fileName?: string
  className?: string
}

export default function DragDropUpload({
  onFile,
  accept = ".pdf,.docx,.doc,.txt",
  maxSize = 10,
  loading = false,
  error,
  fileName,
  className,
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function validate(file: File): string | null {
    const ext = "." + file.name.split(".").pop()?.toLowerCase()
    const accepted = accept.split(",").map((s) => s.trim().toLowerCase())
    if (!accepted.some((a) => ext === a || file.type.includes(a.replace(".", "")))) {
      return `Unsupported file type. Accepted: ${accept}`
    }
    if (file.size > maxSize * 1024 * 1024) {
      return `File exceeds ${maxSize}MB limit`
    }
    return null
  }

  function handleFile(file: File) {
    const err = validate(file)
    if (err) return
    onFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Analyzing your resume...
          </p>
        </div>
      ) : fileName ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <CheckCircle className="size-5 shrink-0 text-mint" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">Upload complete</p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all duration-200",
            isDragging
              ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(0,242,254,0.08)]"
              : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          <Upload
            className={cn(
              "size-8 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground"
            )}
          />
          <div className="text-center">
            <p className="text-sm font-medium">
              {isDragging ? "Drop your file here" : "Drag & drop or click to upload"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, or TXT — up to {maxSize}MB
            </p>
          </div>
        </button>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-crimson">
          <AlertCircle className="size-3.5" />
          {error}
        </div>
      )}
    </div>
  )
}

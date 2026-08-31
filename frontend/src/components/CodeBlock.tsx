import { useState, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { Play, Eye, Copy, Check, Loader2, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { runCode, type RunResult } from '../api/client'

interface CodeBlockProps {
  code: string
  language: string
  onVisualize?: () => void
}

export default function CodeBlock({ code, language, onVisualize }: CodeBlockProps) {
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showOutput, setShowOutput] = useState(false)

  const handleRun = async () => {
    setRunning(true)
    setShowOutput(true)
    setRunResult(null)
    try {
      const result = await runCode(code, language)
      setRunResult(result)
    } catch (err) {
      setRunResult({
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Execution failed',
        returncode: 1,
        timed_out: false,
      })
    } finally {
      setRunning(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Auto-size editor height based on line count
  const lineCount = code.split('\n').length
  const editorHeight = Math.min(Math.max(lineCount * 19 + 16, 60), 400)

  return (
    <Card className="overflow-hidden my-3">
      {/* Header with language badge and action buttons */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] font-mono">
            {language}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={handleCopy}
          >
            {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={handleRun}
            disabled={running}
          >
            {running ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
            Run
          </Button>
          {onVisualize && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              onClick={onVisualize}
            >
              <Eye className="size-3" />
              Visualize
            </Button>
          )}
        </div>
      </div>

      {/* Code editor (read-only, compact) */}
      <Editor
        height={`${editorHeight}px`}
        language={language === 'python' ? 'python' : language === 'javascript' ? 'javascript' : language}
        theme="vs-dark"
        value={code}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 8, bottom: 8 },
          domReadOnly: true,
          cursorBlinking: 'solid',
          overviewRulerBorder: false,
          folding: false,
          glyphMargin: false,
          lineDecorationsWidth: 8,
        }}
      />

      {/* Output panel */}
      {showOutput && (
        <>
          <Separator />
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Terminal className="size-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Output</span>
              {runResult && !runResult.stderr && runResult.returncode === 0 && (
                <Badge variant="secondary" className="text-[10px] ml-auto text-green-500">Success</Badge>
              )}
              {runResult?.stderr && (
                <Badge variant="destructive" className="text-[10px] ml-auto">Error</Badge>
              )}
            </div>
            {running ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Running...
              </div>
            ) : runResult ? (
              <pre className={cn(
                'text-xs font-mono rounded p-2 min-h-[32px] max-h-[120px] overflow-auto whitespace-pre-wrap',
                runResult.stderr ? 'bg-destructive/10 text-destructive' : 'bg-muted/50'
              )}>
                {runResult.stderr || runResult.stdout || '(no output)'}
              </pre>
            ) : null}
          </div>
        </>
      )}
    </Card>
  )
}

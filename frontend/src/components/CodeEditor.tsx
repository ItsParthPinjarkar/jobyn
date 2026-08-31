import Editor from '@monaco-editor/react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CodeEditorProps {
  value: string
  onChange: (v: string | undefined) => void
  language: string
  height?: string
}

const LANGUAGE_MAP: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
}

export default function CodeEditor({ value, onChange, language, height = '400px' }: CodeEditorProps) {
  return (
    <Card className={cn('overflow-hidden')}>
      <Editor
        height={height}
        language={LANGUAGE_MAP[language] ?? language}
        theme="vs-dark"
        value={value}
        onChange={onChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          tabSize: 4,
          automaticLayout: true,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 12 },
        }}
      />
    </Card>
  )
}

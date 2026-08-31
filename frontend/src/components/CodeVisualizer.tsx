import { useState, useEffect, useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { X, ChevronLeft, ChevronRight, Play, Pause, SkipBack } from 'lucide-react'
import type { TraceStep } from '../api/client'

interface CodeVisualizerProps {
  code: string
  language: string
  steps?: TraceStep[]
  traceError?: string | null
  onClose: () => void
}

export default function CodeVisualizer({ code, language, steps = [], traceError, onClose }: CodeVisualizerProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(800) // ms per step
  const editorRef = useRef<any>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = steps.length
  const step = steps[currentStep]

  // Accumulated output up to current step
  const accumulatedOutput = steps
    .slice(0, currentStep + 1)
    .map(s => s.output)
    .filter(Boolean)
    .pop() || ''

  // Highlight current line in Monaco
  useEffect(() => {
    if (!editorRef.current || !step) return
    const editor = editorRef.current
    const decorations = editor.deltaDecorations(
      editor.__prevDecorations || [],
      [
        {
          range: {
            startLineNumber: step.line,
            startColumn: 1,
            endLineNumber: step.line,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: 'sandbox-current-line',
            glyphMarginClassName: 'sandbox-glyph',
          },
        },
        // Highlight all previously executed lines
        ...steps.slice(0, currentStep).map((s, i) => ({
          range: {
            startLineNumber: s.line,
            startColumn: 1,
            endLineNumber: s.line,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: 'sandbox-executed-line',
          },
        })),
      ]
    )
    editor.__prevDecorations = decorations

    // Scroll current line into view
    editor.revealLineInCenter(step.line)
  }, [currentStep, step, steps])

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setCurrentStep(prev => Math.max(prev - 1, 0))
      } else if (e.key === ' ') {
        e.preventDefault()
        setPlaying(prev => !prev)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [totalSteps, onClose])

  // Auto-play
  useEffect(() => {
    if (playing && totalSteps > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= totalSteps - 1) {
            setPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, speed)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, speed, totalSteps])

  const handleReset = () => {
    setPlaying(false)
    setCurrentStep(0)
  }

  const variableEntries = step ? Object.entries(step.locals) : []

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 1100, height: '85vh',
        background: '#1e1e1e', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14 }}>
              Code Visualizer
            </span>
            <span style={{ color: 'var(--text-secondary, #888)', fontSize: 12 }}>
              {language}
            </span>
            {traceError && (
              <span style={{ color: '#f59e0b', fontSize: 11 }}>
                {traceError}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-secondary, #888)',
              cursor: 'pointer', padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button onClick={handleReset} style={ctrlBtnStyle} title="Reset">
            <SkipBack size={14} />
          </button>
          <button onClick={() => setCurrentStep(p => Math.max(p - 1, 0))} style={ctrlBtnStyle} title="Previous (←)">
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => setPlaying(!playing)} style={ctrlBtnStyle} title="Play/Pause (Space)">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={() => setCurrentStep(p => Math.min(p + 1, totalSteps - 1))} style={ctrlBtnStyle} title="Next (→)">
            <ChevronRight size={14} />
          </button>

          {/* Step slider */}
          <input
            type="range"
            min={0}
            max={Math.max(totalSteps - 1, 0)}
            value={currentStep}
            onChange={e => setCurrentStep(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#3b82f6' }}
          />

          <span style={{ color: 'var(--text-secondary, #888)', fontSize: 12, minWidth: 80, textAlign: 'center' }}>
            {totalSteps > 0 ? `${currentStep + 1} / ${totalSteps}` : 'No steps'}
          </span>

          {/* Speed control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-secondary, #888)', fontSize: 11 }}>Speed:</span>
            <select
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#ccc', borderRadius: 4, padding: '2px 6px', fontSize: 11,
              }}
            >
              <option value={1500}>Slow</option>
              <option value={800}>Normal</option>
              <option value={400}>Fast</option>
              <option value={150}>Very Fast</option>
            </select>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Code pane */}
          <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <style>{`
              .sandbox-current-line {
                background: rgba(250, 204, 21, 0.15) !important;
                border-left: 3px solid #facc15 !important;
              }
              .sandbox-executed-line {
                background: rgba(34, 197, 94, 0.06) !important;
              }
              .sandbox-glyph {
                background: #facc15;
                width: 8px !important;
                height: 8px !important;
                border-radius: 50%;
                margin-left: 4px;
                margin-top: 4px;
              }
            `}</style>
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onMount={(editor) => { editorRef.current = editor }}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                tabSize: 4,
                automaticLayout: true,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
                lineNumbers: 'on',
                folding: false,
                glyphMargin: true,
                renderLineHighlight: 'none',
              }}
            />
          </div>

          {/* Right panel: Variables + Output */}
          <div style={{ width: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Step indicator */}
            {step && (
              <div style={{
                padding: '6px 12px',
                background: step.error ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.08)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  padding: '1px 6px', borderRadius: 4,
                  background: step.error ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.15)',
                  color: step.error ? '#ef4444' : '#3b82f6',
                  fontSize: 11, fontWeight: 500,
                }}>
                  {step.error ? 'error' : 'line'}
                </span>
                <span style={{ color: 'var(--text-secondary, #888)' }}>
                  Line {step.line}
                </span>
              </div>
            )}

            {/* Variables */}
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              <h4 style={{
                margin: '0 0 8px', fontSize: 12, fontWeight: 600,
                color: 'var(--text-secondary, #888)', textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Variables
              </h4>
              {variableEntries.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic' }}>
                  No variables at this step
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {variableEntries.map(([name, value]) => (
                    <div
                      key={name}
                      style={{
                        display: 'flex', alignItems: 'baseline', gap: 8,
                        padding: '4px 8px', borderRadius: 4,
                        background: 'rgba(255,255,255,0.03)',
                        fontFamily: 'monospace', fontSize: 13,
                      }}
                    >
                      <span style={{ color: '#c084fc', minWidth: 80, flexShrink: 0 }}>
                        {name}
                      </span>
                      <span style={{ color: '#22c55e', wordBreak: 'break-all' }}>
                        = {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Output */}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              padding: 12, maxHeight: 180, overflow: 'auto',
            }}>
              <h4 style={{
                margin: '0 0 8px', fontSize: 12, fontWeight: 600,
                color: 'var(--text-secondary, #888)', textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Output
              </h4>
              <pre style={{
                margin: 0, fontFamily: 'monospace', fontSize: 13,
                color: accumulatedOutput ? '#22c55e' : 'rgba(255,255,255,0.3)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {accumulatedOutput || '(no output yet)'}
              </pre>

              {/* Error */}
              {step?.error && (
                <div style={{
                  marginTop: 8, padding: '6px 8px', borderRadius: 4,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  <pre style={{
                    margin: 0, fontFamily: 'monospace', fontSize: 12,
                    color: '#ef4444', whiteSpace: 'pre-wrap',
                  }}>
                    {step.error}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const ctrlBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#ccc',
  cursor: 'pointer',
}

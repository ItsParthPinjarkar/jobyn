import { useState, useEffect, useRef } from 'react'

/**
 * SkillGraphViz - Interactive SVG Skill Dependency Graph
 *
 * Layout:
 *   - "You" centre node (glowing blue)
 *   - Inner ring: detected skills (green)
 *   - Outer ring: missing skills  (red = core, orange = optional)
 *   - Dashed arrows: prerequisite relationships from skill-deps data
 *   - Hover tooltip shows skill name + status
 */

interface Node {
    id: string
    label: string
    type: 'center' | 'detected' | 'detected-unverified' | 'missing-core' | 'missing-high' | 'missing-medium'
    x: number
    y: number
    r: number
}

interface Edge {
    from: string
    to: string
    type: 'has' | 'needs'
}

const COLOR: Record<string, string> = {
    center: '#3b82f6',
    detected: '#22c55e',
    'detected-unverified': '#eab308',
    'missing-core': '#ef4444',
    'missing-high': '#f59e0b',
    'missing-medium': '#3b82f6',
}

const GLOW: Record<string, string> = {
    center: 'rgba(59,130,246,0.5)',
    detected: 'rgba(34,197,94,0.45)',
    'detected-unverified': 'rgba(234,179,8,0.4)',
    'missing-core': 'rgba(239,68,68,0.45)',
    'missing-high': 'rgba(245,158,11,0.4)',
    'missing-medium': 'rgba(59,130,246,0.4)',
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, r: number) {
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / len, uy = dy / len
    // Tip point: stop at node edge
    const tx = x2 - ux * r, ty = y2 - uy * r
    const px = -uy * 6, py = ux * 6
    return `M ${tx} ${ty} L ${tx - ux * 10 + px} ${ty - uy * 10 + py} L ${tx - ux * 10 - px} ${ty - uy * 10 - py} Z`
}

interface SkillGraphVizProps {
    detected: string[]
    missingCore: string[]
    missingOptional: string[]
    dependencies: Record<string, string[]>
    onNodeClick?: (skill: string) => void
    /** Detected skills that are claimed but not yet verified (shown amber). */
    unverified?: string[]
}

export default function SkillGraphViz({
    detected,
    missingCore,
    missingOptional,
    dependencies,
    onNodeClick,
    unverified = [],
}: SkillGraphVizProps) {
    const W = 640, H = 430
    const cx = W / 2, cy = H / 2

    const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; type: string } | null>(null)
    const [pulse, setPulse] = useState(true)
    const svgRef = useRef<SVGSVGElement>(null)

    const [view, setView] = useState({ x: 0, y: 0, scale: 0.85 })
    const [isDragging, setIsDragging] = useState(false)
    const prevPos = useRef({ x: 0, y: 0 })
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleWheelNative = (e: WheelEvent) => {
            e.preventDefault()
            const zoomSpeed = 0.0015
            setView(v => {
                const newScale = Math.min(Math.max(v.scale - e.deltaY * zoomSpeed, 0.35), 3)
                return { ...v, scale: newScale }
            })
        }

        container.addEventListener('wheel', handleWheelNative, { passive: false })
        return () => container.removeEventListener('wheel', handleWheelNative)
    }, [])

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return // Left click only
        setIsDragging(true)
        prevPos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        const dx = e.clientX - prevPos.current.x
        const dy = e.clientY - prevPos.current.y
        setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }))
        prevPos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => setIsDragging(false)

    // ── Build nodes ─────────────────────────────────────────────
    const nodes: Node[] = []
    // ... (rest of the node building remains same as it uses cx, cy)
    nodes.push({ id: 'you', label: 'You', type: 'center', x: cx, y: cy, r: 28 })
    const innerSkills = detected.slice(0, 10)
    const coreMissing = missingCore.slice(0, 6)
    const topOpt = missingOptional.slice(0, 2)
    const otherOpt = missingOptional.slice(2, 6)

    const unverifiedSet = new Set(unverified)
    innerSkills.forEach((s, i) => {
        const { x, y } = polar(cx, cy, 145, (i / innerSkills.length) * 360)
        nodes.push({ id: s, label: s, type: unverifiedSet.has(s) ? 'detected-unverified' : 'detected', x, y, r: 17 })
    })

    coreMissing.forEach((s, i) => {
        const offset = innerSkills.length > 0 ? 10 : 0
        const { x, y } = polar(cx, cy, 235, offset + (i / Math.max(coreMissing.length, 1)) * 360)
        nodes.push({ id: s, label: s, type: 'missing-core', x, y, r: 14 })
    })

    topOpt.forEach((s, i) => {
        const { x, y } = polar(cx, cy, 310, 20 + (i / Math.max(topOpt.length, 1)) * 360)
        nodes.push({ id: s, label: s, type: 'missing-high', x, y, r: 12 })
    })

    otherOpt.forEach((s, i) => {
        const { x, y } = polar(cx, cy, 360, 40 + (i / Math.max(otherOpt.length, 1)) * 360)
        nodes.push({ id: s, label: s, type: 'missing-medium', x, y, r: 11 })
    })

    const nodeMap = new Map<string, Node>(nodes.map(n => [n.id, n]))

    // ── Build edges ─────────────────────────────────────────────
    const edges: Edge[] = []
    const allSkillIds = new Set(nodes.map(n => n.id))
    innerSkills.forEach(s => edges.push({ from: 'you', to: s, type: 'has' }))

    Object.entries(dependencies).forEach(([skill, prereqs]) => {
        if (!allSkillIds.has(skill)) return
        prereqs.forEach(p => {
            if (allSkillIds.has(p)) {
                edges.push({ from: p, to: skill, type: 'needs' })
            }
        })
    })

    useEffect(() => {
        const t = setInterval(() => setPulse(p => !p), 1600)
        return () => clearInterval(t)
    }, [])

    // ── Render ──────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            style={{
                width: '100%', position: 'relative', overflow: 'hidden',
                borderRadius: 16, background: 'rgba(13,17,23,0.3)',
                border: '1px solid var(--border)',
                height: 480
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div style={{
                position: 'absolute', top: 12, right: 12, zIndex: 10,
                display: 'flex', gap: 8
            }}>
                <button type="button"
                    onClick={() => setView({ x: 0, y: 0, scale: 0.85 })}
                    className="btn btn--ghost btn--sm"
                    style={{ fontSize: 12, padding: '4px 8px' }}
                >
                    Reset View
                </button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: 4 }}>
                    Scroll to zoom • Drag to pan
                </div>
            </div>

            <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
            >
                <defs>
                    {Object.entries(GLOW).map(([key, color]) => (
                        <filter key={key} id={`glow-${key}`} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feFlood floodColor={color} result="color" />
                            <feComposite in="color" in2="blur" operator="in" result="glow" />
                            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    ))}
                    <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                        <path d="M 0 0 L 8 4 L 0 8 Z" fill="rgba(245,158,11,0.6)" />
                    </marker>
                </defs>

                <g style={{
                    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                    transformOrigin: `${cx}px ${cy}px`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    pointerEvents: 'auto'
                }}>
                    {/* Background subtle grid */}
                    {[130, 145, 200, 235, 270, 310].map(r => (
                        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    ))}

                    {/* ── Edges ── */}
                    {edges.map((e, i) => {
                        const a = nodeMap.get(e.from), b = nodeMap.get(e.to)
                        if (!a || !b) return null
                        const isHas = e.type === 'has'
                        return (
                            <g key={i}>
                                <line
                                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                                    stroke={isHas ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.35)'}
                                    strokeWidth={isHas ? 1.5 : 1.2}
                                    strokeDasharray={isHas ? '' : '5 3'}
                                />
                                {!isHas && (
                                    <path
                                        d={arrowHead(a.x, a.y, b.x, b.y, b.r)}
                                        fill="rgba(245,158,11,0.6)"
                                    />
                                )}
                            </g>
                        )
                    })}

                    {/* ── Nodes ── */}
                    {nodes.map(n => {
                        const col = COLOR[n.type]
                        const isYou = n.type === 'center'
                        const pulseR = isYou ? n.r + (pulse ? 10 : 5) : n.r
                        return (
                            <g
                                key={n.id}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                    setTooltip({ x: n.x, y: n.y, label: n.label, type: n.type })
                                }}
                                onMouseLeave={() => setTooltip(null)}
                                onClick={() => n.type !== 'center' && onNodeClick?.(n.id)}
                            >
                                {isYou && <circle cx={n.x} cy={n.y} r={pulseR} fill="none" stroke={`${col}40`} strokeWidth="2" style={{ transition: 'r 1.6s ease' }} />}
                                <circle cx={n.x} cy={n.y} r={n.r + 5} fill={`${col}18`} filter={`url(#glow-${n.type})`} />
                                <circle cx={n.x} cy={n.y} r={n.r} fill={isYou ? '#1e3a5f' : `${col}20`} stroke={col} strokeWidth={isYou ? 2.5 : 1.8} />
                                {(isYou || n.r >= 17) && (
                                    <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={isYou ? 10 : 8} fontWeight="700" fill={col}>
                                        {isYou ? 'YOU' : n.label.charAt(0).toUpperCase() + n.label.slice(1)}
                                    </text>
                                )}
                            </g>
                        )
                    })}

                    {/* ── Tooltip ── */}
                    {tooltip && (() => {
                        const label = tooltip.type === 'center' ? '📍 Your Profile' :
                            tooltip.type === 'detected' ? `✅ You have: ${tooltip.label}` :
                                tooltip.type === 'missing-core' ? `🔴 Critical gap: ${tooltip.label}` :
                                    tooltip.type === 'missing-high' ? `🟠 High Priority: ${tooltip.label}` :
                                        `🔵 Medium Priority: ${tooltip.label}`
                        return (
                            <g>
                                <rect
                                    x={tooltip.x - 90} y={tooltip.y - 45}
                                    width={180} height={28}
                                    rx={6} fill="#0d1117" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"
                                />
                                <text x={tooltip.x} y={tooltip.y - 27} textAnchor="middle" fontSize={11} fill="#e2e8f0" fontWeight="600">
                                    {label}
                                </text>
                            </g>
                        )
                    })()}
                </g>
            </svg>

            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', pointerEvents: 'none' }}>
                {[
                    { color: '#ef4444', label: 'Critical' },
                    { color: '#f59e0b', label: 'High' },
                    { color: '#3b82f6', label: 'Medium' },
                ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                        {label}
                    </div>
                ))}
            </div>
        </div>
    )
}

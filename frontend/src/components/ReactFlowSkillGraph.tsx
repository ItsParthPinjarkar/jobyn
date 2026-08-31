import { useMemo, useState } from 'react'
import {
    ReactFlow,
    Controls,
    Background,
    MiniMap,
    Handle,
    Position,
    NodeProps,
    Edge,
    Node,
    MarkerType
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Blocks } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   Custom Node Component
   ───────────────────────────────────────────────────────────── */
function SkillNode({ data }: NodeProps) {
    const isCenter = data.type === 'center'
    const status = data.status || 'missing' // 'mastered' | 'missing'
    const priority = data.priority || 'medium' // 'critical' | 'high' | 'medium'

    let bgColor = 'var(--bg-card)'
    let borderColor = 'var(--border)'
    let shadow = 'none'

    if (isCenter) {
        bgColor = '#1e3a5f'
        borderColor = '#3b82f6'
        shadow = '0 0 20px rgba(59,130,246,0.5)'
    } else if (status === 'mastered') {
        bgColor = 'rgba(34,197,94,0.1)'
        borderColor = '#22c55e'
        shadow = '0 0 15px rgba(34,197,94,0.3)'
    } else {
        if (priority === 'critical') { borderColor = '#ef4444'; shadow = '0 0 15px rgba(239,68,68,0.3)' }
        else if (priority === 'high') { borderColor = '#f59e0b'; shadow = '0 0 10px rgba(245,158,11,0.2)' }
        else { borderColor = '#3b82f6' }
    }

    return (
        <div style={{
            padding: isCenter ? '12px 24px' : '8px 16px',
            background: bgColor,
            border: `2px solid ${borderColor}`,
            borderRadius: isCenter ? '24px' : '8px',
            color: 'var(--text-primary)',
            fontSize: isCenter ? '16px' : '12px',
            fontWeight: 'bold',
            boxShadow: shadow,
            textAlign: 'center',
            cursor: isCenter ? 'default' : 'pointer',
            minWidth: 100,
            textTransform: 'capitalize'
        }}>
            <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
            {String(data.label)}
            {Boolean(data.onClick) && !isCenter && status !== 'mastered' && (
                <div style={{
                    marginTop: 8, fontSize: 12, color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                }}>
                    <Blocks size={12} /> Click to Generate
                </div>
            )}
            <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
        </div>
    )
}

const nodeTypes = {
    skill: SkillNode
}

/* ─────────────────────────────────────────────────────────────
   React Flow Graph Component
   ───────────────────────────────────────────────────────────── */
interface Props {
    detected: string[]
    missingCore: string[]
    missingOptional: string[]
    dependencies: Record<string, string[]>
    onNodeClick?: (skill: string) => void
}

export default function ReactFlowSkillGraph({ detected, missingCore, missingOptional, dependencies, onNodeClick }: Props) {

    // Build Nodes and Edges using a concentric circle layout
    const { nodes, edges } = useMemo(() => {
        const newNodes: Node[] = []
        const newEdges: Edge[] = []

        const cx = 400
        const cy = 300

        newNodes.push({
            id: 'you',
            type: 'skill',
            position: { x: cx - 50, y: cy - 20 },
            data: { label: 'You', type: 'center' }
        })

        const allMissing = [
            ...missingCore.map(s => ({ skill: s, priority: 'critical' })),
            ...missingOptional.slice(0, 2).map(s => ({ skill: s, priority: 'high' })),
            ...missingOptional.slice(2, 6).map(s => ({ skill: s, priority: 'medium' }))
        ]

        const polar = (r: number, angleDeg: number) => {
            const rad = ((angleDeg - 90) * Math.PI) / 180
            return { x: cx + r * Math.cos(rad) - 50, y: cy + r * Math.sin(rad) - 20 }
        }

        // Detected Skills (Inner Circle)
        detected.slice(0, 8).forEach((s, i) => {
            const pos = polar(150, (i / Math.min(detected.length, 8)) * 360)
            newNodes.push({
                id: s, type: 'skill', position: pos,
                data: { label: s, status: 'mastered', onClick: onNodeClick }
            })
            newEdges.push({
                id: `e-you-${s}`, source: 'you', target: s,
                animated: true, style: { stroke: '#22c55e', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' }
            })
        })

        // Missing Skills (Outer Circle)
        allMissing.forEach((item, i) => {
            const pos = polar(280, (i / allMissing.length) * 360)
            newNodes.push({
                id: item.skill, type: 'skill', position: pos,
                data: { label: item.skill, status: 'missing', priority: item.priority, onClick: onNodeClick }
            })
        })

        // Add Dependency Edges map
        const existingNodeIds = new Set(newNodes.map(n => n.id))
        Object.entries(dependencies).forEach(([skill, prereqs]) => {
            if (!existingNodeIds.has(skill)) return
            prereqs.forEach(p => {
                if (existingNodeIds.has(p)) {
                    newEdges.push({
                        id: `e-${p}-${skill}`, source: p, target: skill,
                        style: { stroke: '#94a3b8', strokeDasharray: '5,5' },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
                    })
                }
            })
        })

        return { nodes: newNodes, edges: newEdges }
    }, [detected, missingCore, missingOptional, dependencies, onNodeClick])

    return (
        <div style={{ width: '100%', height: 600, background: 'var(--bg-body)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => {
                    if (node.id !== 'you' && node.data.status !== 'mastered' && onNodeClick) {
                        onNodeClick(node.id)
                    }
                }}
                fitView
            >
                <Background color="rgba(255,255,255,0.05)" />
                <Controls />
                <MiniMap nodeColor={(n) => {
                    if (n.id === 'you') return '#3b82f6'
                    if (n.data.status === 'mastered') return '#22c55e'
                    if (n.data.priority === 'critical') return '#ef4444'
                    return '#f59e0b'
                }} />
            </ReactFlow>
        </div>
    )
}

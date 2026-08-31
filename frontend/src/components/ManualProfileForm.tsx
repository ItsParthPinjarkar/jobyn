import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X, Search, Plus, ArrowLeft, ArrowRight, Zap, CheckCircle2, GraduationCap, Briefcase, Link2, Code2 } from 'lucide-react'
import { getSkillsList, submitManualProfile, getRoles } from '../api/client'
import type { UploadResult } from '../api/client'

interface Props {
    onSubmit: (result: UploadResult) => void
    onBack: () => void
}

export default function ManualProfileForm({ onSubmit, onBack }: Props) {
    const [allSkills, setAllSkills] = useState<string[]>([])
    const [roles, setRoles] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [searchOpen, setSearchOpen] = useState(false)

    // Form state
    const [selectedSkills, setSelectedSkills] = useState<string[]>([])
    const [education, setEducation] = useState('')
    const [projects, setProjects] = useState('')
    const [github, setGithub] = useState('')
    const [linkedin, setLinkedin] = useState('')
    const [portfolio, setPortfolio] = useState('')
    const [targetRole, setTargetRole] = useState('auto')

    // Load skills list and roles on mount
    useEffect(() => {
        Promise.all([getSkillsList(), getRoles()])
            .then(([skillsData, rolesData]) => {
                setAllSkills(skillsData.skills)
                setRoles(rolesData)
            })
            .catch(() => setError('Failed to load skills list. Please refresh.'))
    }, [])

    // Filtered skills for search dropdown
    const filteredSkills = useMemo(() => {
        if (!search.trim()) return []
        const q = search.toLowerCase()
        return allSkills
            .filter(s => s.includes(q) && !selectedSkills.includes(s))
            .slice(0, 12)
    }, [search, allSkills, selectedSkills])

    const addSkill = (skill: string) => {
        if (!selectedSkills.includes(skill)) {
            setSelectedSkills(prev => [...prev, skill])
        }
        setSearch('')
        setSearchOpen(false)
    }

    const removeSkill = (skill: string) => {
        setSelectedSkills(prev => prev.filter(s => s !== skill))
    }

    const handleSubmit = async () => {
        if (selectedSkills.length === 0) {
            setError('Select at least one skill.')
            return
        }

        setLoading(true)
        setError('')

        try {
            const links = [github, linkedin, portfolio].filter(l => l.trim())
            const result = await submitManualProfile({
                skills: selectedSkills,
                education,
                projects,
                links,
                target_role: targetRole,
            })
            onSubmit(result)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to submit profile. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Group selected skills by category for display
    const skillsByCategory = useMemo(() => {
        const groups: Record<string, string[]> = {}
        // We'll do a simple categorization based on common groupings
        for (const skill of selectedSkills) {
            // Simple heuristic categorization
            let cat = 'Other'
            const s = skill.toLowerCase()
            if (['python', 'javascript', 'typescript', 'java', 'c++', 'c', 'c#', 'golang', 'rust', 'kotlin', 'swift', 'php', 'ruby', 'scala', 'matlab', 'r', 'dart'].includes(s)) cat = 'Languages'
            else if (['react', 'next.js', 'angular', 'vue', 'svelte', 'html', 'css', 'tailwind', 'bootstrap', 'redux', 'figma'].includes(s)) cat = 'Frontend'
            else if (['fastapi', 'flask', 'django', 'node.js', 'express', 'spring boot', 'nestjs'].includes(s)) cat = 'Backend'
            else if (['sql', 'postgresql', 'mongodb', 'firebase', 'supabase', 'redis', 'elasticsearch'].includes(s)) cat = 'Databases'
            else if (['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'linux', 'ci/cd', 'terraform'].includes(s)) cat = 'DevOps'
            else if (['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp', 'computer vision', 'llm', 'rag'].includes(s)) cat = 'AI/ML'
            else if (['dsa', 'system design', 'testing', 'oops'].includes(s)) cat = 'CS Fundamentals'
            if (!groups[cat]) groups[cat] = []
            groups[cat].push(skill)
        }
        return groups
    }, [selectedSkills])

    return (
        <div className="space-y-6">
            {/* Section 1: Skills Selection */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Code2 className="size-4 text-primary" />
                    <Label className="text-sm font-semibold">Your Skills *</Label>
                    <Badge variant="outline" className="text-[10px]">{selectedSkills.length} selected</Badge>
                </div>

                {/* Search / Add skills */}
                <div className="relative">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search skills (e.g. python, react, docker)..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setSearchOpen(true) }}
                            onFocus={() => setSearchOpen(true)}
                            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                            className="pl-9"
                        />
                    </div>

                    {/* Dropdown results */}
                    {searchOpen && filteredSkills.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md max-h-48 overflow-y-auto">
                            {filteredSkills.map(skill => (
                                <button
                                    key={skill}
                                    onMouseDown={e => { e.preventDefault(); addSkill(skill) }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                >
                                    <Plus className="size-3 shrink-0 text-muted-foreground" />
                                    <span>{skill}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected skills grouped by category */}
                {selectedSkills.length > 0 && (
                    <div className="space-y-2">
                        {Object.entries(skillsByCategory).map(([cat, skills]) => (
                            <div key={cat}>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {skills.map(skill => (
                                        <Badge key={skill} variant="secondary" className="gap-1 pr-1 text-xs">
                                            {skill}
                                            <button
                                                onClick={() => removeSkill(skill)}
                                                className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Quick-add popular skills */}
                {selectedSkills.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/50 p-3">
                        <p className="text-xs text-muted-foreground mb-2">Quick add popular skills:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {['python', 'javascript', 'react', 'node.js', 'sql', 'git', 'docker', 'dsa', 'machine learning', 'fastapi', 'typescript', 'aws'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => addSkill(s)}
                                    className="rounded-md border border-border/50 px-2 py-1 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/5 transition-all"
                                >
                                    + {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Section 2: Target Role */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Briefcase className="size-4 text-primary" />
                    <Label className="text-sm font-semibold">Target Role</Label>
                </div>
                <select
                    value={targetRole}
                    onChange={e => setTargetRole(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                    <option value="auto">Auto-detect best match</option>
                    {roles.map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
            </div>

            {/* Section 3: Education */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-primary" />
                    <Label className="text-sm font-semibold">Education</Label>
                </div>
                <Textarea
                    placeholder="e.g. B.Tech in Computer Science, VIT Vellore, 2024, CGPA: 8.5"
                    value={education}
                    onChange={e => setEducation(e.target.value)}
                    rows={3}
                />
            </div>

            {/* Section 4: Projects */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Briefcase className="size-4 text-primary" />
                    <Label className="text-sm font-semibold">Projects</Label>
                </div>
                <Textarea
                    placeholder="Describe your key projects. e.g.&#10;• E-commerce Platform — Built a full-stack app with React, Node.js, and PostgreSQL. Handled 10K+ daily users.&#10;• ML Resume Screener — Trained a Random Forest model achieving 92% accuracy on 5K resumes."
                    value={projects}
                    onChange={e => setProjects(e.target.value)}
                    rows={5}
                />
            </div>

            {/* Section 5: Links */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Link2 className="size-4 text-primary" />
                    <Label className="text-sm font-semibold">Links</Label>
                </div>
                <div className="space-y-2">
                    <Input
                        placeholder="GitHub URL (optional)"
                        value={github}
                        onChange={e => setGithub(e.target.value)}
                    />
                    <Input
                        placeholder="LinkedIn URL (optional)"
                        value={linkedin}
                        onChange={e => setLinkedin(e.target.value)}
                    />
                    <Input
                        placeholder="Portfolio URL (optional)"
                        value={portfolio}
                        onChange={e => setPortfolio(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center pt-2">
                <Button variant="outline" onClick={onBack} className="gap-2" disabled={loading}>
                    <ArrowLeft className="size-4" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={selectedSkills.length === 0 || loading} className="gap-2">
                    {loading ? 'Analyzing...' : 'Analyze My Profile'} {!loading && <Zap className="size-4" />}
                </Button>
            </div>
        </div>
    )
}

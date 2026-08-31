import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react'
import type { UploadResult, PredictResult } from '../api/client'
import { saveScore } from '../utils/history'
import { useAuth } from './AuthContext'
import { getLatestSession, predictResume, predictBestFit } from '../api/client'

export interface ResumeState {
    analysis: UploadResult | null
    prediction: PredictResult | null
    bestFit: PredictResult | null
    previousAnalysis: UploadResult | null
    masteredSkills: string[] // Skills manually marked as done or learned
    completedTasks: string[] // IDs of tasks checked in the plan
    dailyCommitment: number // hours per day
    currentFile: File | null
    setCurrentFile: (f: File | null) => void
    setAnalysis: (a: UploadResult) => void
    setPrediction: (p: PredictResult) => void
    markSkillMastered: (skill: string) => void
    toggleTask: (taskId: string) => void
    setDailyCommitment: (hours: number) => void
    clear: () => void
    loading: boolean
}

const Ctx = createContext<ResumeState | null>(null)

const LS_KEY_ANALYSIS = 'cse_analysis'
const LS_KEY_PREDICTION = 'cse_prediction'
const LS_KEY_BEST_FIT = 'cse_best_fit'
const LS_KEY_PREV = 'cse_prev_analysis'
const LS_KEY_MASTERED = 'cse_mastered_skills'
const LS_KEY_TASKS = 'cse_completed_tasks'
const LS_KEY_DAILY_COMMITMENT = 'cse_daily_commitment'

function loadJson<T>(key: string): T | null {
    try { return JSON.parse(localStorage.getItem(key) || 'null') }
    catch { return null }
}

export function ResumeProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const userPrefix = user?.email ? `${user.email}_` : ''

    const [analysis, setAnalysisState] = useState<UploadResult | null>(null)
    const [prediction, setPredictionState] = useState<PredictResult | null>(null)
    const [bestFit, setBestFitState] = useState<PredictResult | null>(null)
    const [previousAnalysis, setPreviousAnalysisState] = useState<UploadResult | null>(null)
    const [masteredSkills, setMasteredSkills] = useState<string[]>([])
    const [completedTasks, setCompletedTasks] = useState<string[]>([])
    const [dailyCommitment, setDailyCommitmentState] = useState<number>(2)
    const [currentFile, setCurrentFile] = useState<File | null>(null)
    const [loading, setLoading] = useState<boolean>(true)

    // Load data when user changes
    React.useEffect(() => {
        if (!user) {
            setAnalysisState(null)
            setPredictionState(null)
            setBestFitState(null)
            setPreviousAnalysisState(null)
            setMasteredSkills([])
            setCompletedTasks([])
            setDailyCommitmentState(2)
            setLoading(false)
            return
        }

        const prefix = `${user.email}_`
        const localAnalysis = loadJson<UploadResult>(prefix + LS_KEY_ANALYSIS)
        const localPrediction = loadJson<PredictResult>(prefix + LS_KEY_PREDICTION)
        const localBestFit = loadJson<PredictResult>(prefix + LS_KEY_BEST_FIT)
        const localPrev = loadJson<UploadResult>(prefix + LS_KEY_PREV)

        setAnalysisState(localAnalysis)
        setPredictionState(localPrediction)
        setBestFitState(localBestFit)
        setPreviousAnalysisState(localPrev)
        setMasteredSkills(loadJson(prefix + LS_KEY_MASTERED) || [])
        setCompletedTasks(loadJson(prefix + LS_KEY_TASKS) || [])
        setDailyCommitmentState(loadJson(prefix + LS_KEY_DAILY_COMMITMENT) || 2)

        // If nothing in local storage, attempt recovery from backend (8s timeout)
        if (!localAnalysis && user.email) {
            setLoading(true)
            const recoveryTimeout = setTimeout(() => setLoading(false), 8000)
            getLatestSession(user.email).then(async recovered => {
                clearTimeout(recoveryTimeout)
                if (recovered.analysis) {
                    setAnalysisState(recovered.analysis)
                    localStorage.setItem(prefix + LS_KEY_ANALYSIS, JSON.stringify(recovered.analysis))

                    try {
                        // Restore predictions in parallel (cuts recovery time ~50%)
                        const [pred, best] = await Promise.all([
                            predictResume({
                                skills: recovered.analysis.detected_skills,
                                project_score: recovered.analysis.project_score_percent,
                                ats_score: recovered.analysis.ats_score_percent,
                                structure_score: recovered.analysis.structure_score_percent,
                                core_coverage: recovered.analysis.core_coverage_percent,
                                optional_coverage: recovered.analysis.optional_coverage_percent,
                            }),
                            predictBestFit({
                                skills: recovered.analysis.detected_skills,
                                project_score_percent: recovered.analysis.project_score_percent,
                                ats_score_percent: recovered.analysis.ats_score_percent,
                                structure_score_percent: recovered.analysis.structure_score_percent,
                                raw_text: recovered.analysis.raw_text,
                                sections_detected: recovered.analysis.sections_detected,
                                current_role: recovered.analysis.role,
                            }),
                        ])

                        setPredictionState(pred)
                        localStorage.setItem(prefix + LS_KEY_PREDICTION, JSON.stringify(pred))
                        setBestFitState(best)
                        localStorage.setItem(prefix + LS_KEY_BEST_FIT, JSON.stringify(best))
                    } catch (e) {
                        console.warn("Recovery re-prediction failed:", e)
                    }
                }
            }).catch(err => {
                console.error("Session recovery failed:", err)
                clearTimeout(recoveryTimeout)
            }).finally(() => {
                clearTimeout(recoveryTimeout)
                setLoading(false)
            })
        } else {
            setLoading(false)
        }
    }, [user])

    const setAnalysis = useCallback((a: UploadResult) => {
        if (analysis) {
            setPreviousAnalysisState(analysis)
            localStorage.setItem(userPrefix + LS_KEY_PREV, JSON.stringify(analysis))
        }
        setAnalysisState(a)
        localStorage.setItem(userPrefix + LS_KEY_ANALYSIS, JSON.stringify(a) || '')
        saveScore(a.final_score, a.role, user?.email)

        // Trigger Best Fit Cross-Role check
        predictBestFit({
            skills: a.detected_skills,
            project_score_percent: a.project_score_percent,
            ats_score_percent: a.ats_score_percent,
            structure_score_percent: a.structure_score_percent,
            raw_text: a.raw_text,
            sections_detected: a.sections_detected,
            current_role: a.role,
        }).then(best => {
            setBestFitState(best)
            localStorage.setItem(userPrefix + LS_KEY_BEST_FIT, JSON.stringify(best))
        }).catch(e => console.error("Best fit check failed:", e))
    }, [analysis, userPrefix, user?.email])

    const setPrediction = useCallback((p: PredictResult) => {
        setPredictionState(p)
        localStorage.setItem(userPrefix + LS_KEY_PREDICTION, JSON.stringify(p))
    }, [userPrefix])

    const markSkillMastered = useCallback((skill: string) => {
        setMasteredSkills(prev => {
            const next = prev.includes(skill) ? prev : [...prev, skill]
            localStorage.setItem(userPrefix + LS_KEY_MASTERED, JSON.stringify(next))
            return next
        })
    }, [userPrefix])

    const toggleTask = useCallback((taskId: string) => {
        setCompletedTasks(prev => {
            const next = prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
            localStorage.setItem(userPrefix + LS_KEY_TASKS, JSON.stringify(next))
            return next
        })
    }, [userPrefix])

    const setDailyCommitment = useCallback((hours: number) => {
        setDailyCommitmentState(hours)
        localStorage.setItem(userPrefix + LS_KEY_DAILY_COMMITMENT, JSON.stringify(hours))
    }, [userPrefix])

    const clear = useCallback(() => {
        setAnalysisState(null)
        setPredictionState(null)
        setBestFitState(null)
        setPreviousAnalysisState(null)
        setMasteredSkills([])
        setCompletedTasks([])
        setDailyCommitmentState(2)

        const prefix = user?.email ? `${user.email}_` : ''
        localStorage.removeItem(prefix + LS_KEY_ANALYSIS)
        localStorage.removeItem(prefix + LS_KEY_PREDICTION)
        localStorage.removeItem(prefix + LS_KEY_BEST_FIT)
        localStorage.removeItem(prefix + LS_KEY_PREV)
        localStorage.removeItem(prefix + LS_KEY_MASTERED)
        localStorage.removeItem(prefix + LS_KEY_TASKS)
        localStorage.removeItem(prefix + LS_KEY_DAILY_COMMITMENT)
    }, [user?.email])

    const value = useMemo(() => ({
        analysis, prediction, bestFit, previousAnalysis, masteredSkills, completedTasks, dailyCommitment,
        currentFile, setCurrentFile,
        setAnalysis, setPrediction, markSkillMastered, toggleTask, setDailyCommitment, clear,
        loading
    }), [
        analysis, prediction, bestFit, previousAnalysis, masteredSkills, completedTasks, dailyCommitment,
        currentFile, loading,
        setAnalysis, setPrediction, markSkillMastered, toggleTask, setDailyCommitment, clear
    ])

    return (
        <Ctx.Provider value={value}>
            {children}
        </Ctx.Provider>
    )
}

export function useResume() {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error('useResume must be inside ResumeProvider')
    return ctx
}

export function getReadinessClass(score: number): 'Beginner' | 'Developing' | 'Placement Ready' | 'Interview Ready' {
    if (score < 40) return 'Beginner'
    if (score < 61) return 'Developing'
    if (score < 81) return 'Placement Ready'
    return 'Interview Ready'
}

export function getIndustryAlignment(score: number): { service: number; product: number; startup: number } {
    return {
        service: Math.min(100, Math.round(score * 1.08)),
        product: Math.min(100, Math.round(score * 0.85)),
        startup: Math.min(100, Math.round(score * 0.75)),
    }
}



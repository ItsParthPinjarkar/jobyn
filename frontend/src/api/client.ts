import { supabase } from '../lib/supabase'

const BASE = import.meta.env.VITE_API_URL

if (!BASE) {
    console.error('VITE_API_URL is not set. Add it to frontend/.env')
}

export { BASE }

// ── Cached auth token (avoids hitting supabase.auth.getSession() on every call) ──
let _cachedToken: string | null = null
let _tokenExpiry = 0

async function getAuthToken(): Promise<string | null> {
    const now = Date.now()
    if (_cachedToken && now < _tokenExpiry) return _cachedToken

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
        _cachedToken = session.access_token
        // Cache for 55s (tokens typically live 60s+)
        _tokenExpiry = now + 55_000
        return _cachedToken
    }
    _cachedToken = null
    _tokenExpiry = 0
    return null
}

// Invalidate cache when auth state changes
supabase.auth.onAuthStateChange(() => {
    _cachedToken = null
    _tokenExpiry = 0
})

// ── Generic fetch wrapper (DRY: auth, errors, typing in one place) ──

interface FetchOptions extends Omit<RequestInit, 'body'> {
    body?: unknown
    noAuth?: boolean
    signal?: AbortSignal
    rawBody?: BodyInit  // for FormData etc.
    retries?: number    // max retry attempts (default: 0 = no retry)
}

/** Sleep helper for exponential backoff */
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
    const { body, noAuth, rawBody, retries = 0, ...init } = opts
    const headers: Record<string, string> = {}

    // Auth header (skip for noAuth)
    if (!noAuth) {
        const token = await getAuthToken()
        if (token) headers['Authorization'] = `Bearer ${token}`
    }

    // Content-Type for JSON bodies (skip for FormData)
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json'
    }

    let lastError: Error | null = null
    const maxAttempts = retries + 1

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const res = await fetch(`${BASE}${path}`, {
                ...init,
                headers: { ...headers, ...(init.headers as Record<string, string> ?? {}) },
                body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
            })

            if (!res.ok) {
                const msg = await res.text().catch(() => `Request failed (${res.status})`)
                // Don't retry 4xx client errors
                if (res.status >= 400 && res.status < 500) {
                    throw new Error(msg)
                }
                throw new Error(msg)
            }

            return res.json()
        } catch (err: unknown) {
            lastError = err instanceof Error ? err : new Error(String(err))
            // Don't retry if aborted or client error
            if (err instanceof Error && err.name === 'AbortError') throw err
            if (attempt < maxAttempts - 1) {
                // Exponential backoff: 500ms, 1s, 2s, 4s...
                await sleep(500 * Math.pow(2, attempt))
            }
        }
    }

    throw lastError!
}

/**
 * Create an AbortController that auto-cancels in-flight requests.
 * Use in useEffect cleanup:
 *   const ctl = makeAbortController()
 *   apiFetch('/path', { signal: ctl.signal })
 *   return () => ctl.abort()
 */
export function makeAbortController() { return new AbortController() }

// ── Stale-while-revalidate cache for stable endpoints ──
const _cache = new Map<string, { data: unknown; expiry: number }>()

async function cachedFetch<T>(path: string, ttlMs: number): Promise<T> {
    const cached = _cache.get(path)
    if (cached && Date.now() < cached.expiry) return cached.data as T
    const data = await apiFetch<T>(path, { noAuth: true })
    _cache.set(path, { data, expiry: Date.now() + ttlMs })
    return data
}

export interface RoleMatch {
    role: string
    score: number
    core_coverage: number
    matched_core: number
    total_core: number
}

export interface SkillProficiency {
    skill: string
    level: 'claimed' | 'applied' | 'proficient'
    confidence: number
    is_core: boolean
    verifiable: boolean
}

export interface UploadResult {
    role: string
    final_score: number            // = verified_score (unlockable target)
    verified_score?: number
    provisional_score?: number     // confidence-discounted, shown by default
    score_headroom?: number        // points unlockable via skill verification
    skill_proficiency?: SkillProficiency[]
    readiness_category: string
    core_coverage_percent: number
    optional_coverage_percent: number
    project_score_percent: number
    ats_score_percent: number
    structure_score_percent: number
    missing_core_skills: string[]
    missing_optional_skills: string[]
    recommendations: Array<{ skill: string; priority: string; reason: string }>
    detected_skills: string[]
    sections_detected: string[]
    raw_text: string
    links: string[]
    resume_id: number | null
    analysis_id: number | null
    filename: string
    db_warning?: string
    privacy_active?: boolean
    role_matches?: RoleMatch[]
    auto_detected?: boolean
}

export interface PredictResult {
    predicted_role: string
    confidence: number
    resume_score: number
    weak_areas: string[]
    model_version: string
    inference_time_ms?: number
    explanation?: string
    reasoning?: string
}

export interface HealthResult {
    status: string
    model_loaded: boolean
    model_version?: string
    vocabulary_size?: number
    trained_on?: number
    accuracy?: number
}

// ── Upload resume ─────────────────────────────────────────────
export async function uploadResume(file: File, role: string = 'auto', privacyMode: boolean = false, userEmail?: string): Promise<UploadResult> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('role', role)
    fd.append('privacy_mode', String(privacyMode))
    if (userEmail) fd.append('user_email', userEmail)
    return apiFetch<UploadResult>('/upload', { method: 'POST', rawBody: fd })
}

// ── ML Predict ────────────────────────────────────────────────
export async function predictResume(data: {
    skills: string[]
    project_score: number
    ats_score: number
    structure_score: number
    core_coverage: number
    optional_coverage: number
}): Promise<PredictResult> {
    return apiFetch<PredictResult>('/predict', { method: 'POST', body: data })
}

/** Pure skill-based role prediction (Similarity Engine) */
export async function predictBestFit(data: {
    skills: string[]
    project_score_percent: number
    ats_score_percent: number
    structure_score_percent: number
    raw_text: string
    sections_detected: string[]
    current_role: string
}): Promise<PredictResult> {
    const result = await apiFetch<any>('/ml/predict-role', { method: 'POST', body: data })
    return {
        predicted_role: result.predicted_role,
        confidence: result.confidence,
        resume_score: result.top_matches?.[0]?.score ?? 0,
        weak_areas: [],
        model_version: result.model_version || 'cross-role-v1',
        reasoning: result.reasoning
    }
}

// ── Roles list (cached 5 min) ────────────────────────────────
export async function getRoles(): Promise<string[]> {
    try {
        const data = await cachedFetch<any>('/roles', 5 * 60_000)
        return Array.isArray(data) ? data : data.valid_roles ?? data.roles ?? []
    } catch {
        return ['Software Developer', 'Backend Developer', 'Frontend Developer', 'Full Stack Developer', 'Data Scientist', 'ML Engineer', 'DevOps Engineer']
    }
}

// ── Analytics ─────────────────────────────────────────────────
export async function getAnalytics(): Promise<Record<string, unknown>> {
    try {
        return await apiFetch<Record<string, unknown>>('/analytics/role-stats')
    } catch {
        return {}
    }
}

// ── History ───────────────────────────────────────────────────
export async function getHistory(resumeId: number): Promise<unknown> {
    try {
        return await apiFetch<unknown>(`/history/${resumeId}`, { noAuth: true })
    } catch {
        return null
    }
}

export async function deleteAnalysis(id: number): Promise<{ status: string }> {
    return apiFetch<{ status: string }>(`/history/analysis/${id}`, { method: 'DELETE' })
}

export async function deleteResume(id: number): Promise<{ status: string }> {
    return apiFetch<{ status: string }>(`/history/resume/${id}`, { method: 'DELETE' })
}

// ── Health (cached 30s) ──────────────────────────────────────
export async function getHealth(): Promise<HealthResult> {
    try {
        return await cachedFetch<HealthResult>('/health', 30_000)
    } catch {
        return { status: 'error', model_loaded: false }
    }
}

// ── AI Forecast ───────────────────────────────────────────────
export interface ForecastResult {
    trend_title: string
    growth_pct: number | null
    summary: string
    median_salary_inr?: string
    demand_level?: string
    top_companies?: string[]
    sources: Array<{ name: string; url: string; insight: string }>
}

export async function getMarketForecast(role: string, missingSkills: string[]): Promise<ForecastResult> {
    return apiFetch<ForecastResult>('/ai/market-forecast', {
        method: 'POST',
        body: { role, missing_skills: missingSkills },
        retries: 2,
    })
}

// ── Smart Plan (dependency-aware) ─────────────────────────────
export interface SmartPlanItem {
    id: string
    skill: string
    title: string
    prerequisites: string[]
    unlocks: string[]
    is_target_skill: boolean
    is_prerequisite: boolean
    difficulty: 'Foundational' | 'Intermediate' | 'Advanced'
    duration_minutes: number
    order: number
    scheduled_day: number
}

export interface SmartPlanResult {
    schedule: SmartPlanItem[]
    total_skills: number
    target_skills: number
    prerequisite_skills: number
    total_days: number
    total_hours: number
    daily_hours: number
    recommended_daily_hours: number
    days_available: number | null
    deadline: string | null
}

export async function getSmartPlan(
    missingCore: string[],
    missingOptional: string[],
    mastered: string[],
    dailyHours: number,
    deadline?: string,
): Promise<SmartPlanResult> {
    return apiFetch<SmartPlanResult>('/ai/smart-plan', {
        method: 'POST',
        body: {
            missing_core_skills: missingCore,
            missing_optional_skills: missingOptional,
            mastered_skills: mastered,
            daily_hours: dailyHours,
            deadline: deadline || null,
        },
    })
}

export interface LeetCodeProblem {
    title: string
    number: number
    difficulty: string
    url: string
    pattern?: string
    hint?: string
    description?: string
    example_input?: string
    example_output?: string
}

export interface DetailedContent {
    subheading: string
    explanation: string
    algorithm?: string
    example: string
    key_takeaway?: string
    try_it?: string
    complexity?: string
    leetcode_problems?: LeetCodeProblem[]
    is_fallback?: boolean
}

export interface StudySection {
    title: string
    description: string
}

export interface StudyNotesResult {
    skill: string
    quick_summary: string
    key_concepts?: StudySection[]
    pro_tip: string
    estimated_study_time: string
    sub_roadmap?: Array<{ title: string; duration: string }>
    detailed_content?: DetailedContent[]
    total_sections?: number
}

export interface QuizQuestion {
    id: number
    question: string
    options: string[]
    correct_index: number
    explanation: string
    difficulty?: string
}

export interface QuizResult {
    skill: string
    questions: QuizQuestion[]
}

export async function getStudyNotes(skill: string, masteredSkills: string[] = []): Promise<StudyNotesResult> {
    const skills = masteredSkills.join(',')
    return apiFetch<StudyNotesResult>(`/ai/study/notes?skill=${encodeURIComponent(skill)}&existing_skills=${encodeURIComponent(skills)}`, { noAuth: true, retries: 1 })
}

export async function getStudySection(skill: string, sectionIdx: number, masteredSkills: string[] = []): Promise<DetailedContent> {
    const skills = masteredSkills.join(',')
    return apiFetch<DetailedContent>(`/ai/study/section?skill=${encodeURIComponent(skill)}&section_idx=${sectionIdx}&existing_skills=${encodeURIComponent(skills)}`, { noAuth: true, retries: 1 })
}

export async function getStudyQuiz(skill: string, sectionIdx?: number): Promise<QuizResult> {
    const queryParam = sectionIdx !== undefined ? `&section_idx=${sectionIdx}` : ''
    return apiFetch<QuizResult>(`/ai/study/quiz?skill=${encodeURIComponent(skill)}${queryParam}`, { noAuth: true, retries: 1 })
}

export interface StudyProgress {
    id: number
    user_email: string
    skill: string
    completed_sections: number[]
    mastered: boolean
    created_at: string
    updated_at: string
}

export async function saveStudyProgress(skill: string, sectionIdx: number): Promise<{ status: string; completed_sections: number[]; mastered: boolean }> {
    return apiFetch<{ status: string; completed_sections: number[]; mastered: boolean }>('/ai/study/progress', {
        method: 'POST',
        body: { skill, section_idx: sectionIdx }
    })
}

export async function getStudyProgress(skill?: string): Promise<StudyProgress[]> {
    const query = skill ? `?skill=${encodeURIComponent(skill)}` : ''
    return apiFetch<StudyProgress[]>(`/ai/study/progress${query}`)
}

export async function submitQuizGrade(skill: string, sectionIdx: number, score: number, passed: boolean): Promise<{ status: string; passed: boolean; completed_sections: number[]; mastered: boolean }> {
    return apiFetch<{ status: string; passed: boolean; completed_sections: number[]; mastered: boolean }>('/ai/study/quiz/submit', {
        method: 'POST',
        body: { skill, section_idx: sectionIdx, score, passed }
    })
}

export async function studyChat(skill: string, query: string, history: Array<{ role: string; content: string }> = [], masteredSkills: string[] = []): Promise<string> {
    const data = await apiFetch<{ response: string }>('/ai/study/chat', {
        method: 'POST',
        body: { skill, query, history, mastered_skills: masteredSkills },
        noAuth: true
    })
    return data.response
}

export interface ProjectResult {
    role: string;
    skills: string[];
    markdown: string;
    is_fallback: boolean;
}

export async function generateProject(role: string, skills: string[]): Promise<ProjectResult> {
    return apiFetch<ProjectResult>('/projects/generate', {
        method: 'POST',
        body: { role, skills }
    })
}

// ── Project Verification ──────────────────────────────────────
export interface VerificationCriterion {
    score: number;
    detail: string;
}

export interface VerificationResult {
    verified: boolean;
    overall_score: number;
    verdict: 'VERIFIED' | 'PARTIAL' | 'INSUFFICIENT' | 'SUSPICIOUS';
    skill_coverage: VerificationCriterion;
    spec_alignment: VerificationCriterion;
    code_authenticity: VerificationCriterion;
    documentation: VerificationCriterion;
    completeness: VerificationCriterion;
    strengths: string[];
    improvements: string[];
    summary: string;
    repo: string;
    repo_name: string;
    languages: string[];
    commit_count: number;
    file_count: number;
    verified_at: string;
    is_rule_based?: boolean;
    error?: string;
}

export async function verifyProject(
    github_url: string,
    project_markdown: string,
    required_skills: string[],
    role: string
): Promise<VerificationResult> {
    return apiFetch<VerificationResult>('/projects/verify', {
        method: 'POST',
        body: { github_url, project_markdown, required_skills, role }
    })
}

// ── Admin & Community ─────────────────────────────────────────
export interface AdminStats {
    pending_reviews: number
    approved_contributions: number
    total_courses_cached: number
    active_students: number
}

export interface AdminStudent {
    analysis_id: number
    resume_id: number
    filename: string
    role: string
    final_score: number
    readiness_category: string
    core_coverage_percent: number
    optional_coverage_percent: number
    project_score_percent: number
    ats_score_percent: number
    structure_score_percent: number
    detected_skills: string[]
    missing_core_skills: string[]
    missing_optional_skills: string[]
    analyzed_at: string
}

export interface Contribution {
    id: number
    topic: string
    submitted_by: string
    content: string
    status: string
    created_at: string
}

export async function submitContribution(skill: string, submitted_by: string, notes_content: Record<string, unknown>): Promise<{ status: string }> {
    return apiFetch<{ status: string }>('/ai/study/contribute', {
        method: 'POST',
        body: { skill, submitted_by, notes_content }
    })
}

export async function getAdminStats(): Promise<AdminStats> {
    return apiFetch<AdminStats>('/ai/admin/stats')
}

export async function getPendingContributions(): Promise<Contribution[]> {
    return apiFetch<Contribution[]>('/ai/admin/contributions')
}

export async function approveContribution(id: number): Promise<{ status: string }> {
    return apiFetch<{ status: string }>(`/ai/admin/contributions/${id}/approve`, { method: 'POST' })
}

export async function rejectContribution(id: number): Promise<{ status: string }> {
    return apiFetch<{ status: string }>(`/ai/admin/contributions/${id}/reject`, { method: 'POST' })
}

export async function getFullDataset(page = 1, perPage = 50): Promise<{ students: AdminStudent[]; total: number }> {
    const data = await apiFetch<{ dataset?: AdminStudent[]; total?: number }>(`/export/dataset?page=${page}&per_page=${perPage}`)
    return { students: data.dataset || [], total: data.total || 0 }
}

// ── Admin Feedback Review (admin-only) ────────────────────────
export interface FeedbackSummary {
    total_feedback: number
    corrections: number
    confirmations: number
    score_distribution: { too_high: number; too_low: number; accurate: number }
    page: number
    per_page: number
}

export interface FeedbackCorrection {
    predicted_role: string
    correct_role: string | null
    analysis_id: number | null
    user_email: string | null
    created_at: string
}

export interface FeedbackCorrectionsResult {
    corrections: FeedbackCorrection[]
    total: number
    page: number
    per_page: number
}

export interface ContentFeedbackItem {
    skill: string
    section_idx: number | null
    comment: string
}

export interface ContentFeedbackSummary {
    total_feedback: number
    average_rating: number | null
    rating_count: number
    type_distribution: Record<string, number>
    error_reports: number
    suggestions: number
    recent_errors: ContentFeedbackItem[]
    recent_suggestions: ContentFeedbackItem[]
}

export interface LowRatedContent {
    skill: string
    section_idx: number | null
    average_rating: number
    rating_count: number
}

export async function getFeedbackSummary(page = 1, perPage = 50): Promise<FeedbackSummary> {
    return apiFetch<FeedbackSummary>(`/feedback/summary?page=${page}&per_page=${perPage}`)
}

export async function getFeedbackCorrections(page = 1, perPage = 50): Promise<FeedbackCorrectionsResult> {
    return apiFetch<FeedbackCorrectionsResult>(`/feedback/corrections?page=${page}&per_page=${perPage}`)
}

export async function getContentFeedbackSummary(skill?: string): Promise<ContentFeedbackSummary> {
    const query = skill ? `?skill=${encodeURIComponent(skill)}` : ''
    return apiFetch<ContentFeedbackSummary>(`/content-feedback/summary${query}`)
}

export async function getLowRatedContent(threshold = 3.0): Promise<LowRatedContent[]> {
    const data = await apiFetch<{ low_rated: LowRatedContent[] }>(`/content-feedback/low-rated?threshold=${threshold}`)
    return data.low_rated || []
}

export async function getLatestSession(email: string): Promise<{ analysis: UploadResult | null; prediction: PredictResult | null }> {
    try {
        return await apiFetch<{ analysis: UploadResult | null; prediction: PredictResult | null }>(`/session/latest/${encodeURIComponent(email)}`)
    } catch {
        return { analysis: null, prediction: null }
    }
}

// ── AI Interview Simulator ────────────────────────────────────
export interface InterviewQuestion {
    skill: string
    question_number: number
    question: string
    category: string
    hint: string
    expected_depth: string
    time_estimate_seconds: number
    is_fallback?: boolean
}

export interface InterviewEvaluation {
    score: number
    max_score: number
    feedback: string
    key_points_covered: string[]
    key_points_missed: string[]
    follow_up_question: InterviewQuestion
    interviewer_note: string
    is_fallback?: boolean
}

export interface InterviewScorecard {
    skill: string
    difficulty: string
    overall_score: number
    max_score: number
    percentage: number
    verdict: string
    summary: string
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    skill_breakdown: Record<string, number>
    interview_ready: boolean
    suggested_next_topics: string[]
    questions_answered: number
}

export async function startInterview(skill: string, difficulty: string = 'medium', role: string = ''): Promise<InterviewQuestion> {
    return apiFetch<InterviewQuestion>('/ai/interview/start', {
        method: 'POST',
        body: { skill, difficulty, role },
        noAuth: true,
        retries: 1,
    })
}

export async function submitInterviewAnswer(
    skill: string, question: string, answer: string,
    questionNumber: number, difficulty: string,
    history: Array<Record<string, unknown>> = []
): Promise<InterviewEvaluation> {
    return apiFetch<InterviewEvaluation>('/ai/interview/answer', {
        method: 'POST',
        body: { skill, question, answer, question_number: questionNumber, difficulty, history },
        noAuth: true,
        retries: 1,
    })
}

// ── Content Feedback ────────────────────────────────────────
export async function submitContentFeedback(data: {
    skill: string
    section_idx?: number
    feedback_type: 'rating' | 'error_report' | 'suggestion' | 'quality_issue'
    rating?: number
    comment?: string
    content_type?: 'section' | 'overview' | 'quiz'
}): Promise<{ status: string }> {
    return apiFetch<{ status: string }>('/content-feedback', {
        method: 'POST',
        body: data,
        noAuth: true,
    })
}

export async function endInterview(
    skill: string, difficulty: string,
    history: Array<Record<string, unknown>>
): Promise<InterviewScorecard> {
    return apiFetch<InterviewScorecard>('/ai/interview/end', {
        method: 'POST',
        body: { skill, difficulty, history },
        noAuth: true,
        retries: 1,
    })
}

// ── Quick Score (anonymous) ───────────────────────────────────
export interface QuickScoreResult {
    score: number                 // provisional (confidence-discounted) score
    verified_score?: number       // score unlockable by verifying skills
    score_headroom?: number       // points held back pending verification
    role: string
    readiness_category: string
    missing_count: number
    skill_proficiency?: SkillProficiency[]
}

export async function quickScoreUpload(file: File): Promise<QuickScoreResult> {
    const fd = new FormData()
    fd.append('file', file)
    return apiFetch<QuickScoreResult>('/quick-score', { method: 'POST', rawBody: fd, noAuth: true })
}

// ── Skill verification (Phase 2 — unlock score headroom) ──────
export interface AssessmentQuestion {
    id: string
    skill: string
    question: string
    options: string[]
}
export interface AssessmentStart {
    token: string | null
    skills_to_verify: string[]
    questions: AssessmentQuestion[]
    message?: string
}
export interface AssessmentResult {
    passed_skills: string[]
    failed_skills: string[]
    previous_score: number
    new_score: number
    unlocked_points: number
    verified_score: number
    remaining_headroom: number
    persisted: boolean
}

export async function startAssessment(
    role: string, skills: string[], rawText: string, sections: string[],
): Promise<AssessmentStart> {
    return apiFetch<AssessmentStart>('/assessment/start', {
        method: 'POST',
        body: { role, skills, raw_text: rawText, sections_detected: sections },
    })
}

export async function submitAssessment(
    token: string, answers: Record<string, number>,
): Promise<AssessmentResult> {
    return apiFetch<AssessmentResult>('/assessment/submit', {
        method: 'POST',
        body: { token, answers },
    })
}

// ── JD Matching ───────────────────────────────────────────────
export interface JDMatchResult {
    jd_match_score: number
    matched_skills: string[]
    missing_skills: string[]
    high_priority_missing: string[]
    match_strength: string
}

export interface JDMatchHistoryEntry {
    id: number
    jd_title: string | null
    jd_company: string | null
    match_score: number
    match_strength: string
    created_at: string
}

export async function matchJD(jdText: string, jdTitle?: string, jdCompany?: string): Promise<JDMatchResult> {
    return apiFetch<JDMatchResult>('/jd/match', {
        method: 'POST',
        body: { jd_text: jdText, jd_title: jdTitle, jd_company: jdCompany },
        retries: 1,
    })
}

export async function getJDMatchHistory(): Promise<JDMatchHistoryEntry[]> {
    return apiFetch<JDMatchHistoryEntry[]>('/jd/history')
}

// ── Peer Benchmarking ─────────────────────────────────────────
export interface BenchmarkData {
    role: string
    total_analyses: number
    avg_score: number
    median_score: number
    p10_score: number
    p25_score: number
    p50_score: number
    p75_score: number
    p90_score: number
    user_percentile: number | null
}

export async function getBenchmarks(role: string): Promise<BenchmarkData> {
    return apiFetch<BenchmarkData>(`/benchmarks/${encodeURIComponent(role)}`)
}

// ── Company Prep ──────────────────────────────────────────────
export interface CompanyPrep {
    company_name: string
    company_slug: string
    category: string
    required_skills: string[]
    preferred_skills: string[]
    interview_stages: Array<{ stage: string; duration: string; focus: string }>
    prep_timeline: Record<string, unknown>
    resources: Array<{ name: string; url: string }>
    tips: string[]
    user_match: {
        matched_required: string[]
        matched_preferred: string[]
        gap_required: string[]
        gap_preferred: string[]
        coverage_pct: number
    }
}

export interface CompanyListItem {
    company_name: string
    company_slug: string
    category: string
}

export async function getCompanyList(): Promise<CompanyListItem[]> {
    return apiFetch<CompanyListItem[]>('/company-prep/companies', { noAuth: true })
}

export async function getCompanyPrep(slug: string): Promise<CompanyPrep> {
    return apiFetch<CompanyPrep>(`/company-prep/${encodeURIComponent(slug)}`)
}

// ── Coding Practice ───────────────────────────────────────────
export interface CodingProblem {
    id: number
    title: string
    slug: string
    difficulty: string
    skill_tags: string[]
    description: string
    constraints: string | null
    example_input: string
    example_output: string
    explanation: string
    starter_code: Record<string, string>
    test_cases: Array<{ input: string; expected: string }>
    hints: string[]
}

export interface SubmissionResult {
    submission_id: number
    status: string
    passed: number
    total: number
    test_results: Array<{ passed: boolean; actual?: string; expected?: string; error?: string }>
}

export interface SubmissionHistoryEntry {
    id: number
    problem_id: number
    language: string
    status: string
    passed_count: number
    total_count: number
    created_at: string
}

export async function getCodingProblems(params?: { difficulty?: string; skill?: string; page?: number }): Promise<{ problems: CodingProblem[]; total: number }> {
    const query = new URLSearchParams()
    if (params?.difficulty) query.set('difficulty', params.difficulty)
    if (params?.skill) query.set('skill', params.skill)
    if (params?.page) query.set('page', String(params.page))
    const qs = query.toString()
    return apiFetch<{ problems: CodingProblem[]; total: number }>(`/coding/problems${qs ? '?' + qs : ''}`, { noAuth: true })
}

export async function getCodingProblem(slug: string): Promise<CodingProblem> {
    return apiFetch<CodingProblem>(`/coding/problems/${encodeURIComponent(slug)}`, { noAuth: true })
}

export async function submitCodeSolution(problemId: number, language: string, code: string): Promise<SubmissionResult> {
    return apiFetch<SubmissionResult>('/coding/submit', {
        method: 'POST',
        body: { problem_id: problemId, language, code },
        retries: 0,
    })
}

export async function getCodingSubmissions(problemId?: number): Promise<SubmissionHistoryEntry[]> {
    const query = problemId ? `?problem_id=${problemId}` : ''
    return apiFetch<SubmissionHistoryEntry[]>(`/coding/submissions${query}`)
}

// ── Sandbox (Code Execution & Tracing) ────────────────────────────────

export interface RunResult {
    stdout: string
    stderr: string
    returncode: number
    timed_out: boolean
}

export interface TraceStep {
    line: number
    locals: Record<string, string>
    output: string
    error?: string | null
    event?: string
}

export interface TraceResult {
    steps: TraceStep[]
    error?: string | null
    stdout: string
}

export type SandboxTraceResult = TraceResult

export async function runCode(code: string, language: string = 'python'): Promise<RunResult> {
    return apiFetch<RunResult>('/sandbox/run', {
        method: 'POST',
        body: { code, language },
    })
}

export async function traceCode(code: string, language: string = 'python'): Promise<TraceResult> {
    return apiFetch<TraceResult>('/sandbox/trace', {
        method: 'POST',
        body: { code, language },
    })
}

// ── Onboarding Email ────────────────────────────────────────────────

export async function triggerOnboardingEmail(email: string, name?: string, goal?: string): Promise<{ status: string }> {
    return apiFetch<{ status: string }>('/onboarding/trigger', {
        method: 'POST',
        body: { email, name, goal },
        noAuth: true,
    })
}

export async function checkOnboardingEmails(email: string): Promise<{ sent: string[] }> {
    return apiFetch<{ sent: string[] }>('/onboarding/check', {
        method: 'POST',
        body: { email },
    })
}

export async function recordOnboardingMilestone(email: string, milestone: string): Promise<{ status: string }> {
    return apiFetch<{ status: string }>('/onboarding/milestone', {
        method: 'POST',
        body: { email, milestone },
        noAuth: true,
    })
}

// ── Manual Profile Entry ──────────────────────────────────────────
export async function submitManualProfile(data: {
    skills: string[]
    education: string
    projects: string
    links: string[]
    target_role?: string
}): Promise<UploadResult> {
    return apiFetch<UploadResult>('/profile/manual', {
        method: 'POST',
        body: data,
    })
}

export async function getSkillsList(): Promise<{ skills: string[] }> {
    try {
        const data = await cachedFetch<{ skills: string[] }>('/skills/list', 10 * 60_000)
        if (Array.isArray(data?.skills) && data.skills.length) return data
        throw new Error('empty skills list')
    } catch {
        // Fallback to the bundled ML vocabulary so the manual profile form's skill
        // picker still works when the backend is unreachable (mirrors getRoles()).
        try {
            const res = await fetch('/models/vocabulary_v2_list.json')
            const skills = await res.json()
            return { skills: Array.isArray(skills) ? skills : [] }
        } catch {
            return { skills: [] }
        }
    }
}

// ── Resume Builder ────────────────────────────────────────────────
export interface ResumeBuilderResult {
    resume: string
    method: 'ai' | 'template'
    jd_skills: string[]
    matched_skills: string[]
}

export async function buildResume(data: {
    jd_text: string
    jd_title?: string
    jd_company?: string
    skills: string[]
    education: string
    projects: string
    links: string[]
}): Promise<ResumeBuilderResult> {
    return apiFetch<ResumeBuilderResult>('/resume-builder', {
        method: 'POST',
        body: data,
        retries: 1,
    })
}

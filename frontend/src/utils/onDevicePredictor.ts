/**
 * onDevicePredictor.ts
 *
 * Runs inference in the browser using onnxruntime-web.
 * Falls back gracefully if ONNX not available.
 *
 * Usage:
 *   const ready = await initOnDevice()
 *   if (ready) {
 *     const { score, role } = await predictOnDevice(detectedSkills, numericFeatures)
 *   }
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- onnxruntime-web loaded dynamically; strict types break with dynamic import */
let ort: any = null
let scoreSession: any = null
let roleSession: any = null
let vocabulary: string[] = []
let _initPromise: Promise<boolean> | null = null

export const ON_DEVICE_AVAILABLE = typeof window !== 'undefined' && 'WebAssembly' in window

/** Load models + vocab once. Deduplicates concurrent calls. */
export async function initOnDevice(): Promise<boolean> {
    if (scoreSession) return true          // already loaded
    if (_initPromise) return _initPromise  // loading in progress
    _initPromise = _doInit()
    return _initPromise
}

async function _doInit(): Promise<boolean> {
    if (!ON_DEVICE_AVAILABLE) return false
    try {
        // Dynamic import so it doesn't break SSR / non-ONNX builds
        ort = await import('onnxruntime-web')
        // Force single thread to avoid worker resolution issues in dev
        ort.env.wasm.numThreads = 1
        // Use full URL to avoid Vite resolution issues
        const base = window.location.origin + '/ort/'
        ort.env.wasm.wasmPaths = {
            'ort-wasm-simd-threaded.jsep.mjs': base + 'ort-wasm-simd-threaded.jsep.js',
            'ort-wasm-simd-threaded.jsep.wasm': base + 'ort-wasm-simd-threaded.jsep.wasm',
            'ort-wasm-simd-threaded.wasm': base + 'ort-wasm-simd-threaded.wasm',
            'ort-wasm-simd-threaded.mjs': base + 'ort-wasm-simd-threaded.js',
            // NOTE: the .asyncify build (25.8 MiB) is intentionally NOT shipped — it
            // exceeds Cloudflare's 25 MiB per-file asset cap and isn't used with
            // numThreads=1 (ORT selects the JSEP/SIMD build). See copy-onnx-assets.js.
            'ort-wasm-simd-threaded.jspi.mjs': base + 'ort-wasm-simd-threaded.jspi.js',
            'ort-wasm-simd-threaded.jspi.wasm': base + 'ort-wasm-simd-threaded.jspi.wasm',
            'ort-wasm.wasm': base + 'ort-wasm.wasm', // in case it falls back
            'ort-wasm-simd.wasm': base + 'ort-wasm-simd.wasm',
        }

        // Load vocabulary
        const vocabRes = await fetch('/models/vocabulary_v2_list.json')
        if (!vocabRes.ok) throw new Error('vocab not found')
        vocabulary = await vocabRes.json()

        // Load score model
        scoreSession = await ort.InferenceSession.create('/models/score_model_v2.onnx', {
            executionProviders: ['wasm'],
        })

        // Load role model (optional)
        try {
            roleSession = await ort.InferenceSession.create('/models/role_model_v2.onnx', {
                executionProviders: ['wasm'],
            })
        } catch { /* role model optional */ }

        // Models loaded successfully
        return true
    } catch (e) {
        console.warn('[OnDevice] Models not found - server-side inference used', e)
        return false
    }
}

/** Build feature vector matching training pipeline. */
function buildFeatureVector(
    skills: string[],
    projectScore: number,
    atsScore: number,
    structScore: number,
    coreCov: number,
    optCov: number,
): Float32Array {
    const skillSet = new Set(skills.map(s => s.toLowerCase()))
    const vec = new Float32Array(vocabulary.length + 5)

    // Binary skill encoding - O(V) with Set lookup instead of O(V²)
    vocabulary.forEach((v, i) => {
        vec[i] = skillSet.has(v.toLowerCase()) ? 1 : 0
    })

    // Numeric features (normalised to 0-1)
    const base = vocabulary.length
    vec[base + 0] = projectScore / 100
    vec[base + 1] = atsScore / 100
    vec[base + 2] = structScore / 100
    vec[base + 3] = coreCov / 100
    vec[base + 4] = optCov / 100

    return vec
}

export interface OnDeviceResult {
    score: number
    predictedRole?: string
    explanation?: string
    inferenceMs: number
    onDevice: true
}

const MARKET_INSIGHTS: Record<string, string> = {
    'Backend Developer': 'High demand for scalable system design and API microservices. Your strong backend skills match 85% of current startup requirements.',
    'Frontend Developer': 'Market shift towards high-performance interactive UIs. Your focus on React and modern CSS aligns with Tier-1 agency needs.',
    'Full Stack Developer': 'Most versatile role in current market. Your blend of both ends makes you a high-value asset for early-stage companies.',
    'Data Scientist': 'Explosive growth in predictive analytics. Your statistics and Python background are critical for current ML-heavy products.',
    'ML Engineer': 'Peak market interest due to LLM integration needs. Your deep technical core is perfect for AI-first organizations.',
    'DevOps Engineer': 'Infrastructure-as-code is the new standard. Your automation-first mindset is highly sought by enterprise scaling teams.'
}

function getMarketExplanation(role: string): string {
    return MARKET_INSIGHTS[role] || 'High growth potential in this domain based on recent skill-demand shifts in the tech industry.'
}

/** Run on-device prediction. Auto-inits models if needed. */
export async function predictOnDevice(
    skills: string[],
    projectScore: number,
    atsScore: number,
    structScore: number,
    coreCov: number,
    optCov: number,
): Promise<OnDeviceResult> {
    // Lazy init - loads ONNX + models on first prediction, not at app start
    if (!scoreSession) {
        const ok = await initOnDevice()
        if (!ok) throw new Error('On-device models could not be loaded')
    }

    const t0 = performance.now()
    const vec = buildFeatureVector(skills, projectScore, atsScore, structScore, coreCov, optCov)

    // Score prediction
    const scoreTensor = new ort.Tensor('float32', vec, [1, vec.length])
    const scoreOutput = await scoreSession.run({ X: scoreTensor })
    const rawScore = scoreOutput['variable']?.data?.[0]
        ?? scoreOutput[Object.keys(scoreOutput)[0]]?.data?.[0]
        ?? 50
    const score = Math.min(100, Math.max(0, Math.round(Number(rawScore))))

    // Role prediction (optional)
    let predictedRole: string | undefined
    if (roleSession) {
        const roleOutput = await roleSession.run({ X: new ort.Tensor('float32', vec, [1, vec.length]) })
        const labelData = roleOutput['label']?.data?.[0]
            ?? roleOutput[Object.keys(roleOutput)[0]]?.data?.[0]
        predictedRole = String(labelData ?? '')
    }

    return {
        score,
        predictedRole: predictedRole || undefined,
        explanation: predictedRole ? getMarketExplanation(predictedRole) : undefined,
        inferenceMs: Math.round(performance.now() - t0),
        onDevice: true,
    }
}

/** Check if models are currently loaded. */
export function isOnDeviceReady(): boolean {
    return !!scoreSession
}

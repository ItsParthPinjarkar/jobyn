import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const backendModelsDir = path.join(rootDir, 'backend/models');
const frontendDir = path.join(rootDir, 'frontend');
const publicDir = path.join(frontendDir, 'public');
const destModelsDir = path.join(publicDir, 'models');
const destOrtDir = path.join(publicDir, 'ort');
const ortSourceDir = path.join(frontendDir, 'node_modules/onnxruntime-web/dist');

// Browser-side ML models are gitignored (too large for the repo). The frontend
// is deployed as a standalone static site (rootDir: frontend), so backend/models
// has no .onnx files at build time — fetch them from the same GitHub Release the
// backend uses. Override the host with MODELS_BASE_URL if the release moves.
const MODELS_BASE_URL = (
    process.env.MODELS_BASE_URL ||
    'https://github.com/Ganesh-0509/Jobyn/releases/download/models-v2'
).replace(/\/$/, '');

// Helper to ensure directory exists
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[ONNX Asset Sync] Created directory: ${dir}`);
    }
}

// Download an ONNX model into destDir if it is not already present. Non-fatal:
// a failed fetch only disables privacy-mode inference, it does not fail the build.
async function downloadIfMissing(name, destDir, { required }) {
    const dest = path.join(destDir, name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
        return; // already present (committed or fetched on a previous build)
    }
    const url = `${MODELS_BASE_URL}/${name}`;
    try {
        console.log(`[ONNX Asset Sync] Fetching ${name} from release…`);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        ensureDir(destDir);
        fs.writeFileSync(dest, buf);
        console.log(`[ONNX Asset Sync] Downloaded ${name} (${(buf.length / 1e6).toFixed(1)} MB)`);
    } catch (err) {
        const level = required ? 'Warning' : 'Note';
        console.error(`[ONNX Asset Sync] ${level}: could not fetch ${name}: ${err.message}`);
    }
}

async function syncAssets() {
    console.log('[ONNX Asset Sync] Synchronizing ONNX and WebAssembly assets...');

    ensureDir(destModelsDir);
    ensureDir(destOrtDir);

    // 0. Fetch gitignored ONNX models if they aren't on disk (frontend-only deploy).
    //    score is required for browser inference; role is optional in onDevicePredictor.
    await downloadIfMissing('score_model_v2.onnx', backendModelsDir, { required: true });
    await downloadIfMissing('role_model_v2.onnx', backendModelsDir, { required: false });

    // 1. Copy Model files from backend/models/
    const filesToCopy = [
        {
            src: path.join(backendModelsDir, 'score_model_v2.onnx'),
            dest: path.join(destModelsDir, 'score_model_v2.onnx')
        },
        {
            src: path.join(backendModelsDir, 'role_model_v2.onnx'),
            dest: path.join(destModelsDir, 'role_model_v2.onnx')
        },
        {
            src: path.join(backendModelsDir, 'vocabulary_v2_list.json'),
            dest: path.join(destModelsDir, 'vocabulary_v2_list.json')
        }
    ];

    for (const item of filesToCopy) {
        if (fs.existsSync(item.src)) {
            fs.copyFileSync(item.src, item.dest);
            console.log(`[ONNX Asset Sync] Copied model: ${path.basename(item.src)} -> ${item.dest}`);
        } else {
            if (path.basename(item.src) === 'role_model_v2.onnx') {
                // role_model_v2.onnx is optional in onDevicePredictor
                console.log(`[ONNX Asset Sync] Optional model not found (skipping): ${path.basename(item.src)}`);
            } else {
                console.error(`[ONNX Asset Sync] Warning: Required source file missing: ${item.src}`);
            }
        }
    }

    // 2. Copy WebAssembly worker binaries from onnxruntime-web/dist/
    // Cloudflare static assets cap each file at 25 MiB. The .asyncify build is
    // 25.8 MiB (over the limit) and is not used at runtime (numThreads=1 -> ORT
    // picks the JSEP/SIMD build), so we skip it. Keep onDevicePredictor.ts's
    // wasmPaths in sync (the asyncify entries are removed there too).
    const SKIP_OVERSIZED = new Set([
        'ort-wasm-simd-threaded.asyncify.wasm',
        'ort-wasm-simd-threaded.asyncify.js',
        'ort-wasm-simd-threaded.asyncify.mjs',
    ]);
    if (fs.existsSync(ortSourceDir)) {
        const ortFiles = fs.readdirSync(ortSourceDir);
        let copiedCount = 0;
        for (const file of ortFiles) {
            // We want ort-wasm* files (both .wasm and their loader .js/.mjs files)
            if (file.startsWith('ort-wasm')) {
                if (SKIP_OVERSIZED.has(file)) {
                    console.log(`[ONNX Asset Sync] Skipping oversized asset (>25 MiB Cloudflare cap): ${file}`);
                    continue;
                }
                // Normalize some extensions so the dynamically imported module loader resolves them correctly
                // as requested by the env.wasm.wasmPaths in onDevicePredictor.ts
                const srcPath = path.join(ortSourceDir, file);
                
                // Copy original
                const destPath = path.join(destOrtDir, file);
                fs.copyFileSync(srcPath, destPath);
                
                // Also create .js alias if the filename ends in .mjs, since predictor handles them interchangeably
                if (file.endsWith('.mjs')) {
                    const jsFile = file.slice(0, -4) + '.js';
                    fs.copyFileSync(srcPath, path.join(destOrtDir, jsFile));
                }
                
                copiedCount++;
            }
        }
        console.log(`[ONNX Asset Sync] Copied ${copiedCount} ONNX WebAssembly support files to ${destOrtDir}`);
    } else {
        console.error(`[ONNX Asset Sync] Error: onnxruntime-web distribution folder not found at: ${ortSourceDir}`);
    }

    console.log('[ONNX Asset Sync] Synchronization complete!');
}

syncAssets().catch(err => {
    console.error('[ONNX Asset Sync] Synchronization failed:', err);
});

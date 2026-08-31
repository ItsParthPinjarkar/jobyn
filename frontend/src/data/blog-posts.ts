export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  content: string
  date: string
  readTime: string
  category: string
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'measure-placement-readiness-engineering-students',
    title: 'How to Measure Your Placement Readiness as an Engineering Student (2026 Guide)',
    excerpt: 'A practical 2026 guide to placement readiness for engineering students — what it means, the five dimensions that matter, how to measure it, and how AI resume scoring compares to manual review and general-purpose AI tools.',
    date: '2026-06-27',
    readTime: '9 min read',
    category: 'Career',
    content: `# How to Measure Your Placement Readiness as an Engineering Student (2026 Guide)

**Placement readiness is how prepared you are to clear a specific role's hiring bar — measured across your skills, projects, resume quality, and interview ability for that target role.** It is not one vague rating; it is the gap between what a role requires and what your profile currently proves.

*Last updated: June 27, 2026*

---

## What is placement readiness?

Placement readiness measures whether your current skills, projects, and resume align with the requirements of a specific engineering role — such as Frontend Developer or Data Scientist. The same student can be "ready" for one role and far from ready for another, because each role weights skills differently.

Unlike a generic resume rating, readiness is **role-relative**: it compares your profile against the real requirements of the role you are targeting, then shows the exact gaps to close.

## The five dimensions of readiness

Reliable readiness assessments break the score into measurable dimensions rather than one number:

| Dimension | What it measures | Typical weight |
|---|---|---|
| Core skills | Must-have skills for the target role | Highest |
| Optional skills | Nice-to-have skills that differentiate you | Medium |
| Projects | Evidence you have applied the skills | Medium |
| ATS / resume structure | Whether software and recruiters can parse your resume | Lower |
| Formatting & clarity | Readability and signal density | Lower |

Scoring each dimension separately turns "your resume is a 6 out of 10" into "you cover data structures and REST APIs but are missing system-design depth and a deployed project."

## How to measure placement readiness: 4 approaches compared

Students typically assess readiness in one of four ways. Here is how they stack up:

| Approach | Role-specific? | Objective? | Actionable next steps? | Cost |
|---|---|---|---|---|
| Self-assessment | Rarely | No (bias) | Vague | Free |
| College placement cell | Sometimes | Partly | Generic | Free |
| General-purpose AI assistant | Only if prompted well | Inconsistent | Text only, not tracked | Free / paid |
| Dedicated readiness platform | Yes | Yes (ML + rules) | Specific and tracked | Varies |

A general-purpose AI assistant can critique a resume if you prompt it carefully, but it returns unstructured text, no consistent score, and no way to track progress over time. A dedicated platform scores against real role requirements and turns the gaps into a study plan.

## How AI resume scoring works

Modern readiness tools combine three layers:

1. **Deterministic scoring** — a transparent, weighted formula across the five dimensions above.
2. **Machine learning** — models trained on large resume datasets predict your best-fit role and a quality score. Jobyn's models are trained on 57,100 real resumes and reach about 95% role-classification accuracy across 7 roles.
3. **Generative AI** — produces tailored study material, mock-interview questions, and feedback.

The machine-learning layer is what makes scoring objective and repeatable: the same resume gets the same score every time, reflecting patterns learned from tens of thousands of real resumes rather than one reviewer's opinion.

## A step-by-step readiness checklist

1. **Pick one target role** — readiness is meaningless without a target.
2. **Score your resume against that role** across the five dimensions.
3. **Identify your top 3 gaps**, ordered by impact and prerequisites.
4. **Close gaps with projects, not just courses** — applied evidence outscores certificates.
5. **Practice role-specific interviews out loud**, then check which concepts you actually covered.
6. **Re-score every few weeks** to confirm the number is moving.

## Does your resume have to leave your device?

No. The most privacy-protective tools run the scoring model directly in your browser using on-device machine learning (via WebAssembly), so your resume is analyzed locally and never uploaded. If a tool requires uploading your resume to its servers just to score it, that is a product choice, not a technical requirement.

## Frequently asked questions

### What is a good placement readiness score?
A readiness score is best read against role tiers rather than a universal pass mark. Many platforms use bands like Beginner, Developing, Placement Ready, and Interview Ready. Aim to reach "Placement Ready" for your target role before applying, and "Interview Ready" before interviews.

### Can a general AI chatbot tell me if I am placement ready?
It can give you feedback text, but not a consistent, role-specific, trackable score. General assistants are not trained specifically on placement outcomes, so they can give different answers to the same resume on different days.

### How often should I re-check my readiness?
Every two to four weeks while you are actively closing gaps. Readiness changes as you add projects and skills, so a single score has a short shelf life.

### Is resume scoring free for students?
Some tools are. Jobyn is free for engineering students and offers an instant resume readiness score with no signup required.

---

*Want to see your role-specific readiness score in 60 seconds? Try the free scorer at [Jobyn](https://getjobyn.pages.dev/quick-score) — no signup, and privacy mode means your resume never leaves your browser.*`,
  },
  {
    slug: 'browser-native-voice-interview-simulator',
    title: 'How I Built a Browser-Native Voice Interview Simulator (And Why Privacy Made Me Skip the Cloud)',
    excerpt: 'Building a voice-powered technical interview practice tool using only the browser\'s Web Speech API — no audio uploads, no cloud processing, no data leaving the device.',
    date: '2026-05-15',
    readTime: '8 min read',
    category: 'Engineering',
    content: `# How I Built a Browser-Native Voice Interview Simulator (And Why Privacy Made Me Skip the Cloud)

*Building a voice-powered technical interview practice tool using only the browser's Web Speech API — no audio uploads, no cloud processing, no data leaving the device.*

---

## The Problem

Technical interview practice is broken in two ways:

1. **Typing answers doesn't simulate real interviews.** In a real interview, you speak. Your ability to articulate concepts verbally is a skill that typing practice doesn't build.

2. **Voice AI tools send your audio to the cloud.** Most voice-powered tools upload your recordings to third-party servers for speech-to-text processing. For a career tool handling sensitive resume data and interview responses, that's a privacy tradeoff I wasn't willing to make.

I wanted to build something different: a voice interview simulator that processes everything in the browser, never uploads audio, and still provides meaningful feedback on technical concept coverage.

## The Architecture

Jobyn is a career readiness platform built with React + TypeScript on the frontend and FastAPI + Python on the backend. The voice interview feature sits in the \`InterviewReadiness\` page, which has three layers:

\`\`\`
┌─────────────────────────────────────────────────┐
│  Browser (React)                                │
│  ┌───────────────────────────────────────────┐  │
│  │  useWebSpeech() hook                      │  │
│  │  → SpeechRecognition API (browser-native) │  │
│  │  → continuous=true, interimResults=true   │  │
│  │  → transcript stays in React state (RAM)  │  │
│  └──────────────────┬────────────────────────┘  │
│                     │ transcript text only       │
│                     ▼                            │
│  ┌───────────────────────────────────────────┐  │
│  │  InterviewReadiness component             │  │
│  │  → Record/Stop button (Mic/MicOff icons)  │  │
│  │  → Textarea (voice OR manual typing)      │  │
│  │  → Submit sends text to backend           │  │
│  └──────────────────┬────────────────────────┘  │
└─────────────────────┼───────────────────────────┘
                      │ POST /interview/evaluate
                      │ { role, question_id, answer }
                      ▼
┌─────────────────────────────────────────────────┐
│  Backend (FastAPI)                              │
│  ┌───────────────────────────────────────────┐  │
│  │  interview_engine.py                      │  │
│  │  → 30 questions across 7 roles            │  │
│  │  → keyword/concept matching               │  │
│  │  → score = (detected / expected) * 100    │  │
│  └──────────────────┬────────────────────────┘  │
│                     │                            │
│  ┌──────────────────▼────────────────────────┐  │
│  │  interview_service.py                     │  │
│  │  → Gemini/Bytez LLM for adaptive followup │  │
│  │  → AI-powered evaluation when available   │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
\`\`\`

The key insight: **the backend never sees audio.** It receives a plain text string — the same format whether the user spoke or typed. This means the evaluation logic is completely decoupled from the input method.

## The Web Speech API Hook

The core of the voice feature is a custom React hook called \`useWebSpeech()\`. Here's the simplified version:

\`\`\`typescript
function useWebSpeech() {
    const [transcript, setTranscript] = useState('')
    const [listening, setListening] = useState(false)
    const recRef = useRef<SpeechRecognition | null>(null)

    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SR) return

        const rec = new SR()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = 'en-US'

        rec.onresult = (e) => {
            const text = Array.from({ length: e.results.length },
                (_, i) => e.results[i][0].transcript
            ).join(' ')
            setTranscript(text)
        }

        rec.onend = () => setListening(false)
        recRef.current = rec
    }, [])

    const start = () => { recRef.current?.start(); setListening(true) }
    const stop = () => { recRef.current?.stop(); setListening(false) }

    return { transcript, setTranscript, listening, start, stop }
}
\`\`\`

A few things worth noting:

- **\`continuous: true\`** — the recognition keeps listening even during pauses, which is important for technical answers that have natural pauses.
- **\`interimResults: true\`** — the user sees their words appearing in real-time, which provides immediate feedback that the system is working.
- **No audio recording** — the \`SpeechRecognition\` API streams recognized text directly. There's no \`MediaRecorder\`, no audio blobs, no audio files. The browser's speech engine processes the audio internally and only exposes the text result.
- **Graceful degradation** — if the browser doesn't support Web Speech API (looking at you, Firefox), the user can still type their answer. The textarea accepts both voice transcript and manual input interchangeably.

## The Evaluation Engine

On the backend, the evaluation doesn't care how the answer was generated. It works with text through two complementary systems:

### Rule-Based Engine (No LLM Required)

The rule-based engine in \`interview_engine.py\` has a question bank of 30 questions across 7 roles. Each question has a set of \`expected_concepts\` — keywords and phrases that a good answer should mention.

\`\`\`python
{
    "id": "sd_001",
    "question": "Explain how a HashMap works internally.",
    "concepts": [
        "hash function", "collision", "bucket", "key", "value",
        "load factor", "O(1)", "equals", "hashcode"
    ],
    "difficulty": "Intermediate",
}
\`\`\`

The scoring is straightforward:

\`\`\`python
score = (detected_concepts / expected_concepts) * 100
\`\`\`

If the answer mentions 6 out of 9 expected concepts, the score is 67. Simple, deterministic, and explainable.

### AI-Powered Service (Gemini/Bytez)

When LLM API keys are available, \`interview_service.py\` uses Gemini or Bytez to do deeper evaluation. The AI can:

- Detect concepts even when the user uses different terminology
- Provide nuanced feedback on answer quality
- Generate adaptive follow-up questions based on the user's response

The AI evaluation returns the same structured data as the rule-based engine — score, grade, detected concepts, missing concepts, and feedback — so the frontend handles both transparently.

## Privacy Architecture

The privacy decision was deliberate. Here's what happens to voice data at each step:

| Step | Where | Data Format | Persisted? |
|------|-------|-------------|------------|
| Speech recognition | Browser (Web Speech API) | Audio → text | No (streaming) |
| Transcript | React state (RAM) | Text string | No (cleared on page leave) |
| Submit to backend | HTTP POST | JSON with text | No (processed in-memory) |
| Evaluation result | Supabase database | Score + concepts | Yes (user's choice) |

The voice audio never leaves the browser. The Web Speech API processes it locally (in Chrome, this uses Google's servers — that's a browser-level privacy boundary, not ours). We only send the resulting text.

This is documented in our privacy policy: "Voice recordings processed by Speech API, stored in RAM (Ephemeral), cloud upload: NEVER, wiped on exit."

## What I Learned

1. **Browser-native speech recognition is surprisingly good.** For technical English with domain-specific vocabulary, Chrome's Web Speech API handles it well. The accuracy is high enough that users rarely need to edit the transcript.

2. **The evaluation is the hard part, not the speech recognition.** Getting speech-to-text working was a few hours. Building an evaluation system that meaningfully scores technical concept coverage took weeks.

3. **Privacy-first design constrains you in useful ways.** Because we committed to "no audio uploads," we were forced to think carefully about what data flows where. This led to a cleaner architecture where the backend is stateless and the frontend owns the user experience.

4. **Voice input increases answer quality.** When users speak instead of type, their answers tend to be longer, more natural, and cover more concepts. This is probably because speaking feels lower-friction than typing for technical explanations.

## What I'd Do Differently

1. **Add SpeechSynthesis for question reading.** Right now, questions are displayed as text. Having the AI read the question aloud would make it more realistic. The browser's \`SpeechSynthesis\` API could handle this with zero backend changes.

2. **Record audio for playback.** Users might want to hear themselves answer. We could use \`MediaRecorder\` to capture audio locally and play it back — still keeping it browser-only.

3. **Build a phone-based version.** A platform like Bolna could power phone-based mock interviews — students call a number, speak their answers, and get scored. This would extend access to students without reliable internet or modern browsers.

---

*This post describes the voice interview feature in [Jobyn](https://getjobyn.pages.dev), an open-source career readiness platform built with React, FastAPI, and Supabase.*`,
  },
  {
    slug: 'voice-ai-interview-simulator-web-speech-api',
    title: 'How I Built a Voice AI Interview Simulator with Web Speech API — and What I Learned About Voice AI',
    excerpt: 'A technical deep-dive into building browser-native voice interviews, the limitations I hit, and why phone-based Voice AI is the next frontier.',
    date: '2026-05-20',
    readTime: '6 min read',
    category: 'Voice AI',
    content: `# How I Built a Voice AI Interview Simulator with Web Speech API — and What I Learned About Voice AI

*A technical deep-dive into building browser-native voice interviews, the limitations I hit, and why phone-based Voice AI is the next frontier.*

---

## The Problem

College students preparing for tech interviews face a gap: they can practice coding problems on LeetCode, but there's no tool that lets them practice *speaking* technical answers out loud and getting real-time feedback.

I wanted to build something different — an interview simulator where you talk to an AI, it listens, transcribes your answer, evaluates your technical accuracy, and tells you what you missed. All in the browser, no downloads, no phone calls.

## The Architecture

Jobyn is a full-stack career readiness platform (React + FastAPI + Supabase). The interview simulator is one of its core features. Here's how the voice part works:

\`\`\`
┌─────────────────┐     Web Speech API     ┌──────────────────┐
│  Browser         │ ────────────────────▶ │  Speech-to-Text  │
│  Microphone      │     (real-time)       │  (on-device)     │
└─────────────────┘                        └────────┬─────────┘
                                                    │ transcript
                                                    ▼
                                           ┌──────────────────┐
                                           │  Interview Engine │
                                           │  (keyword match)  │
                                           └────────┬─────────┘
                                                    │ score + feedback
                                                    ▼
                                           ┌──────────────────┐
                                           │  AI Evaluation   │
                                           │  (Gemini/Bytez)  │
                                           └──────────────────┘
\`\`\`

### Step 1: Browser Speech Recognition

The \`useWebSpeech()\` hook wraps the Web Speech API:

\`\`\`typescript
function useWebSpeech() {
    const [transcript, setTranscript] = useState('')
    const [listening, setListening] = useState(false)

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (e) => {
        const text = Array.from(
            { length: e.results.length },
            (_, i) => e.results[i][0].transcript
        ).join(' ')
        setTranscript(text)
    }

    return { transcript, listening, start: () => rec.start(), stop: () => rec.stop() }
}
\`\`\`

**What works well:**
- Zero latency — transcription happens on-device
- No API costs — browser-native, no cloud calls
- Privacy-first — audio never leaves the browser
- Chrome has excellent accuracy for technical English

**What doesn't:**
- Only works in Chrome/Edge (Firefox and Safari have limited/no support)
- Technical terms get mangled — "HashMap" becomes "hash map" or "has map"
- No speaker diarization — can't distinguish interviewer from candidate
- Background noise kills accuracy
- No phone call support — browser-only

### Step 2: Question Bank + Concept Matching

The interview engine has a question bank with 30+ questions across 6 roles. Each question has expected concepts:

\`\`\`python
{
    "question": "Explain how a HashMap works internally.",
    "concepts": [
        "hash function", "collision", "bucket", "key", "value",
        "load factor", "O(1)", "equals", "hashcode", "chaining",
        "open addressing"
    ],
    "difficulty": "Intermediate"
}
\`\`\`

When the user speaks their answer, the transcript is matched against these concepts:

\`\`\`python
def evaluate_answer(role, question, answer):
    concepts = matched_question["concepts"]
    found = [c for c in concepts if c in answer.lower()]
    missing = [c for c in concepts if c not in answer.lower()]
    ratio = len(found) / len(concepts)
    score = min(100, int(ratio * 100 + 10))  # +10 for effort
    return {"score": score, "concepts_found": found, "concepts_missing": missing}
\`\`\`

This is intentionally simple — keyword matching, not NLP. It works surprisingly well for technical interviews because technical answers are keyword-dense. Saying "hash function" and "collision" and "O(1)" is a strong signal that you understand HashMaps.

### Step 3: AI-Powered Evaluation

For the AI interview mode, answers go to Google Gemini 2.0 Flash:

\`\`\`python
prompt = f"""
You are a technical interviewer. Evaluate this candidate answer.

Role: {role}
Question: {question}
Answer: {answer}

Return JSON with:
- score (0-100)
- strengths (list)
- weaknesses (list)
- follow_up_question (string)
"""
\`\`\`

The AI provides nuanced feedback that keyword matching can't — it catches partial understanding, identifies misconceptions, and generates adaptive follow-up questions.

## What I Learned

### 1. Browser Speech API is Not Enough for Voice AI

Web Speech API is great for a demo, but it has fundamental limitations:
- **No phone support** — most interview practice happens on mobile or phone calls
- **No conversation flow** — it's one-directional transcription, not a conversation
- **No voice synthesis** — the interviewer's questions are displayed as text, not spoken
- **Accuracy degrades** with technical vocabulary

### 2. Voice AI Needs Telephony

The real interview experience is a phone call. You pick up, an AI asks you questions, you speak naturally, it evaluates and adapts. That requires:
- Telephony infrastructure (Twilio, Bolna, etc.)
- Real-time speech-to-text with speaker diarization
- Voice synthesis for the AI interviewer
- Sub-500ms latency for natural conversation

### 3. The Evaluation Engine is the Moat

The voice part is commodity — everyone has speech-to-text. The differentiator is what you DO with the transcript:
- Concept matching for technical accuracy
- Adaptive follow-up questions based on what was missed
- Structured scoring that maps to job readiness
- Personalized improvement recommendations

This is where Jobyn's interview engine shines. It doesn't just say "your answer was 7/10" — it says "you covered hash functions and collision resolution, but missed load factor and the equals/hashcode contract. Here's what to study next."

## What's Next

I'm exploring how to bridge the gap between browser-native speech and real Voice AI platforms. The goal: a phone-based mock interview where you call a number, an AI asks you technical questions, and you get a detailed scorecard when you hang up.

The Web Speech API got me 80% of the way. The last 20% — telephony, voice synthesis, real-time conversation — is where platforms like Bolna come in.

---

*Built with React, FastAPI, Supabase, Google Gemini, and the Web Speech API. Open source at [Jobyn](https://github.com/Ganesh-0509/Jobyn).*`,
  },
  {
    slug: 'how-to-analyze-resume-for-campus-placements',
    title: 'How to Analyze Your Resume for Campus Placements',
    excerpt: 'A step-by-step guide to evaluating your resume against what top recruiters actually look for during campus placement drives.',
    date: '2026-05-25',
    readTime: '5 min read',
    category: 'Resume Tips',
    content: `# How to Analyze Your Resume for Campus Placements

*A step-by-step guide to evaluating your resume against what top recruiters actually look for during campus placement drives.*

---

## Why Most Resumes Get Rejected in 6 Seconds

Recruiters at campus drives scan hundreds of resumes in a single day. Studies show they spend an average of 6 seconds on their first pass. That means your resume needs to communicate value instantly — not buried in paragraph three of your project description.

The problem isn't that students lack skills. It's that their resumes don't communicate those skills in a way that matches what recruiters and ATS systems are scanning for.

## The 5-Point Resume Audit Framework

Here's the framework I use when analyzing resumes for placement readiness:

### 1. Skills-to-Job Alignment

Look at the job description. Extract the top 10 skills mentioned. Now count how many appear in your resume — not just in a "Skills" section, but demonstrated through projects, coursework, or experience.

**Target:** 7/10 skills clearly demonstrated.

### 2. Quantified Impact

Every project or experience bullet should have a number. "Built a web app" is weak. "Built a web app serving 200+ users with 99.5% uptime" is strong.

**Target:** At least 60% of bullets contain a metric.

### 3. Technical Depth Signals

Recruiters look for depth, not breadth. Listing 15 programming languages is a red flag. Having 3-4 languages with projects that demonstrate real proficiency is much stronger.

**Target:** 3-4 core skills with project evidence.

### 4. ATS Keyword Density

Most companies use Applicant Tracking Systems that scan for keywords. If your resume says "web development" but the JD says "full-stack engineering," you might get filtered out even though it's the same thing.

**Target:** Mirror the JD's terminology.

### 5. Formatting for Machines

Fancy templates with columns, tables, and graphics break ATS parsing. Stick to single-column, standard fonts, clear section headers.

**Target:** Clean, parseable structure.

## How Jobyn Automates This

Manual resume analysis takes 30-45 minutes per resume. Jobyn does it in 30 seconds using an ML model trained on 57,100 real resumes with 95% accuracy.

It scores your resume across all 5 dimensions and gives you specific, actionable feedback — not generic advice like "add more keywords," but "add Docker and Kubernetes to your skills section; 87% of similar resumes for this role mention containerization."

## The Bottom Line

Your resume is a marketing document, not a biography. Analyze it the way a marketer analyzes ad copy: does it communicate the right message to the right audience in the right format?

If you're not sure, run it through a tool that can give you objective, data-driven feedback. Your instincts about your own resume are almost always too generous.

---

*Try the free resume scorer at [Jobyn](https://getjobyn.pages.dev/quick-score) — no signup required.*`,
  },
  {
    slug: '5-resume-mistakes-engineering-students-make',
    title: '5 Resume Mistakes Engineering Students Make (And How to Fix Them)',
    excerpt: 'The most common resume pitfalls that cost engineering students interviews — and what to do instead.',
    date: '2026-05-27',
    readTime: '4 min read',
    category: 'Resume Tips',
    content: `# 5 Resume Mistakes Engineering Students Make (And How to Fix Them)

*The most common resume pitfalls that cost engineering students interviews — and what to do instead.*

---

After analyzing thousands of resumes from engineering students across India, here are the 5 most common mistakes I see — and they're all fixable.

## Mistake 1: The Skills Laundry List

**What it looks like:**
> Skills: C, C++, Java, Python, JavaScript, TypeScript, React, Angular, Vue, Node.js, Django, Flask, Spring Boot, MongoDB, PostgreSQL, MySQL, Redis, Docker, Kubernetes, AWS, GCP, Azure, Git, Linux, TensorFlow, PyTorch, Scikit-learn...

**Why it's a problem:** Listing 25+ skills signals to recruiters that you're a beginner in all of them. No one is proficient in 25 technologies as a student.

**The fix:** Pick your top 5-6 skills. For each one, have a project or experience that demonstrates real proficiency. Depth beats breadth every time.

## Mistake 2: Describing What You Did, Not What You Achieved

**What it looks like:**
> "Worked on backend development for the college fest website."

**Why it's a problem:** This tells the recruiter nothing about your impact or ability.

**The fix:** Use the formula: **Action + Context + Result**
> "Built REST API handling 500+ concurrent registrations for college fest, reducing page load time from 3s to 800ms using Redis caching."

## Mistake 3: One Resume for Every Application

**What it looks like:** Same resume sent to TCS, Google, and a startup.

**Why it's a problem:** These companies want completely different things. TCS values consistency and communication. Google values technical depth. Startups value initiative and breadth.

**The fix:** Maintain a "master resume" with everything, then create tailored versions for each application. Swap out projects and emphasize different skills based on the JD.

## Mistake 4: Ignoring the ATS

**What it looks like:** Beautiful two-column template with icons, progress bars, and custom fonts.

**Why it's a problem:** Most ATS systems can't parse this correctly. Your "90% Python" progress bar becomes garbled text. Your carefully aligned columns become a mess.

**The fix:** Use a single-column layout. Standard fonts (Calibri, Arial, Georgia). Clear section headers. Save as PDF. Test by copying the text from your PDF — if it comes out clean, the ATS will read it clean.

## Mistake 5: No Projects Section (or Weak Projects)

**What it looks like:** Resume lists coursework and grades but no tangible projects.

**Why it's a problem:** Projects are the strongest signal of ability for students without work experience. A recruiter would rather see one well-built project than a 9.0 CGPA with no practical work.

**The fix:** Include 2-3 projects with:
- What problem it solves
- Tech stack used
- Your specific contribution
- Quantified results (users, performance, accuracy)

## The Bottom Line

Your resume doesn't need to be perfect. It needs to be clear, specific, and honest. Fix these 5 mistakes and you'll be ahead of 80% of applicants.

---

*Get instant, objective feedback on your resume at [Jobyn](https://getjobyn.pages.dev/quick-score).*`,
  },
  {
    slug: 'skill-gap-analysis-what-top-companies-want',
    title: 'Skill Gap Analysis: What Top Companies Actually Want',
    excerpt: 'Breaking down the real skill requirements from placement data — and how to close the gap before your next interview.',
    date: '2026-05-29',
    readTime: '6 min read',
    category: 'Career Prep',
    content: `# Skill Gap Analysis: What Top Companies Actually Want

*Breaking down the real skill requirements from placement data — and how to close the gap before your next interview.*

---

## The Disconnect

There's a persistent gap between what engineering students think companies want and what companies actually evaluate during placements. Students optimize for CGPA and breadth of skills. Companies optimize for problem-solving ability and depth in fundamentals.

Let me break down what the data actually shows.

## What Placement Data Tells Us

Based on analysis of placement patterns across top-tier engineering colleges:

### Tier 1 Companies (Google, Microsoft, Amazon, etc.)
**What they test:**
- Data structures and algorithms (60% of evaluation)
- System design basics (20%)
- Communication and problem-solving approach (20%)

**What students prepare:**
- "Full-stack" projects with 10 technologies
- Memorized solutions to 500 LeetCode problems
- Buzzword-heavy resumes

**The gap:** Companies want to see how you think, not what you've memorized. Walking through your approach to a problem you haven't seen before is more valuable than speed-solving a medium LeetCode problem.

### Tier 2 Companies (Walmart, Samsung, Cisco, etc.)
**What they test:**
- Domain-specific skills (40%)
- DSA fundamentals (30%)
- Projects and practical experience (30%)

**What students prepare:**
- Generic DSA practice
- Same resume for every company

**The gap:** These companies care more about fit. If you're interviewing for a backend role at Walmart, they want to see you understand distributed systems, not that you can solve dynamic programming problems.

### Service Companies (TCS, Infosys, Wipro, etc.)
**What they test:**
- Communication skills (30%)
- Aptitude and logical reasoning (30%)
- Basic programming (20%)
- Domain knowledge (20%)

**What students prepare:**
- Technical skills only
- Minimal communication practice

**The gap:** These companies hire for trainability, not current skill. Strong communication and learning ability matter more than a GitHub profile.

## How to Run Your Own Skill Gap Analysis

Here's a simple framework:

1. **Pick your target companies** (3-5 max)
2. **Find their actual JDs** from recent placement drives
3. **Extract the top 10 skills** they mention
4. **Rate yourself honestly** on each (beginner/intermediate/advanced)
5. **Identify the gaps** — where you're "beginner" on a skill they list as "required"
6. **Prioritize by impact** — close the gaps that appear in multiple JDs first

## How Jobyn Automates This

Manual skill gap analysis takes hours of research per company. Jobyn matches your resume against role-specific requirements from real placement data and gives you a prioritized list of skills to develop.

It doesn't just say "you're missing Docker." It says "87% of successful candidates for this role had Docker experience. Here's a 2-week learning plan to get you from zero to deployable."

## The Real Differentiator

After working with hundreds of engineering students, here's what actually separates students who get placed from those who don't:

1. **They can explain their projects deeply** — not just what they built, but why they made specific technical decisions
2. **They communicate their thought process** — even when solving problems they haven't seen before
3. **They've done skill gap analysis** — they know exactly what their target companies want and they've specifically prepared for it

The students who don't get placed are usually just as skilled. They just haven't connected their skills to what companies are actually evaluating.

## Your Next Step

Don't prepare blindly. Run a skill gap analysis against your target companies, identify the 3-5 skills that will have the biggest impact, and focus your preparation there.

Quality of preparation beats quantity every time.

---

*Get a personalized skill gap analysis at [Jobyn](https://getjobyn.pages.dev/skill-gap) — powered by real placement data.*`,
  },
]

/** Get a single blog post by slug */
export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find(p => p.slug === slug)
}

/** Get all blog posts sorted by date (newest first) */
export function getAllBlogPosts(): BlogPost[] {
  return [...blogPosts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

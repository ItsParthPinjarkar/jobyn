/// <reference types="vite/client" />

/* Web Speech API - not all TS libs ship these declarations */
interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onend: (() => void) | null
    start(): void
    stop(): void
    abort(): void
}

interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
    readonly length: number
    [index: number]: SpeechRecognitionResult
}

declare var SpeechRecognition: {
    prototype: SpeechRecognition
    new(): SpeechRecognition
}

interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
}

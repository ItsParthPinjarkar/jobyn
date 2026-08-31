import { useState, useEffect } from 'react'

const LS_KEY = 'cse_low_data'

/**
 * Hook to read/write Low Data Mode preference.
 * When enabled, apps should: skip heavy animations, prefer on-device ML,
 * reduce API polling, and avoid preloading large assets.
 */
export function useLowDataMode(): [boolean, (v: boolean) => void] {
    const [lowData, setLowData] = useState(() => {
        try { return localStorage.getItem(LS_KEY) === 'true' }
        catch { return false }
    })

    useEffect(() => {
        try { localStorage.setItem(LS_KEY, String(lowData)) } catch {}
    }, [lowData])

    return [lowData, setLowData]
}

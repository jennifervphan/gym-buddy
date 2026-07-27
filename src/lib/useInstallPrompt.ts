import { useEffect, useState } from 'react'

/** Chromium fires this before offering its own install UI; there are no types for it. */
type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'gym-buddy:install-dismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari's non-standard flag for home-screen apps.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Safari never fires beforeinstallprompt, so iOS needs written instructions. */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports as a Mac, but with touch support.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export type InstallState = {
  /** Whether to show any install suggestion at all. */
  canSuggest: boolean
  /** True when the browser gave us a real prompt to trigger. */
  canPrompt: boolean
  /** True when the user must follow manual steps instead. */
  manual: boolean
  install: () => void
  dismiss: () => void
}

/**
 * Installing to the home screen is the difference between history that
 * survives and history a browser may evict, so the app suggests it once the
 * user has sessions worth keeping.
 */
export function useInstallPrompt(): InstallState {
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Suppress the browser's own banner so the suggestion appears in context.
      e.preventDefault()
      setEvent(e as InstallEvent)
    }
    const onInstalled = () => setInstalled(true)

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const manual = isIOS() && !installed
  const canPrompt = event !== null

  return {
    canSuggest: !installed && !dismissed && (canPrompt || manual),
    canPrompt,
    manual,
    install: () => {
      if (!event) return
      void event.prompt()
      void event.userChoice.finally(() => setEvent(null))
    },
    dismiss: () => {
      setDismissed(true)
      try {
        localStorage.setItem(DISMISSED_KEY, 'true')
      } catch {
        // Storage unavailable; the suggestion just returns next visit.
      }
    },
  }
}

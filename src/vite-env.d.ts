/// <reference types="vite/client" />

interface Window {
  desktop?: {
    platform: string
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    onMaximized: (callback: (value: boolean) => void) => () => void
  }
}

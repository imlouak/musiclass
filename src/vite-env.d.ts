/// <reference types="vite/client" />

interface Window {
  desktop?: {
    platform: string
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    importScoreFile: (file: File) => Promise<{ ok: boolean; fileName?: string; scores?: Array<{ title: string; composer: string; page?: number }>; error?: string }>
    pickAttachment: () => Promise<{ ok: boolean; attachment?: import('./types').Attachment | null; error?: string }>
    storeAttachment: (file: File) => Promise<{ ok: boolean; attachment?: import('./types').Attachment; error?: string }>
    openAttachment: (attachment: import('./types').Attachment) => Promise<{ ok: boolean; error?: string }>
    removeAttachment: (attachment: import('./types').Attachment) => Promise<{ ok: boolean; error?: string }>
    installUpdate: () => void
    onUpdateStatus: (callback: (value: { status: 'checking' | 'downloading' | 'current' | 'ready' | 'error'; version?: string; percent?: number }) => void) => () => void
    onMaximized: (callback: (value: boolean) => void) => () => void
  }
}

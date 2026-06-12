import { create } from 'zustand'

interface SettingsState {
  reviewMode: boolean
  gmailConnected: boolean
  gmailEmail: string | null
  queueCount: number
  isAdmin: boolean
  setReviewMode: (val: boolean) => void
  setGmailStatus: (connected: boolean, email?: string | null) => void
  setQueueCount: (n: number) => void
  setIsAdmin: (val: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  reviewMode: false,
  gmailConnected: false,
  gmailEmail: null,
  queueCount: 0,
  isAdmin: false,
  setReviewMode: (val) => set({ reviewMode: val }),
  setGmailStatus: (connected, email = null) => set({ gmailConnected: connected, gmailEmail: email }),
  setQueueCount: (n) => set({ queueCount: n }),
  setIsAdmin: (val) => set({ isAdmin: val }),
}))

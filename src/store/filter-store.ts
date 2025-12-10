'use client'

import { create } from 'zustand'
import { DateRange } from 'react-day-picker'

interface FilterStore {
  dateRange: DateRange | undefined
  selectedUserId: string
  selectedChannel: string
  setDateRange: (dateRange: DateRange | undefined) => void
  setSelectedUserId: (userId: string) => void
  setSelectedChannel: (channel: string) => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  dateRange: undefined,
  selectedUserId: 'all',
  selectedChannel: 'all',
  setDateRange: (dateRange) => set({ dateRange }),
  setSelectedUserId: (selectedUserId) => set({ selectedUserId }),
  setSelectedChannel: (selectedChannel) => set({ selectedChannel }),
}))
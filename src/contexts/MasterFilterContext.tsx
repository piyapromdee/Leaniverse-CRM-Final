'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

export type TimePeriod = 'all_time' | 'this_year' | 'last_7_days' | 'last_30_days' | 'this_month' | 'this_quarter'

interface MasterFilterContextType {
  masterTimePeriod: TimePeriod
  setMasterTimePeriod: (period: TimePeriod) => void
  masterAssignee: string
  setMasterAssignee: (assignee: string) => void
  masterSource: string
  setMasterSource: (source: string) => void
  resetMasterFilters: () => void
  getDateRange: () => { startDate: Date | null; endDate: Date }
}

const MasterFilterContext = createContext<MasterFilterContextType | undefined>(undefined)

export function MasterFilterProvider({ children }: { children: ReactNode }) {
  const [masterTimePeriod, setMasterTimePeriod] = useState<TimePeriod>('all_time')
  const [masterAssignee, setMasterAssignee] = useState<string>('all')
  const [masterSource, setMasterSource] = useState<string>('all')

  const resetMasterFilters = () => {
    setMasterTimePeriod('all_time')
    setMasterAssignee('all')
    setMasterSource('all')
  }

  const getDateRange = (): { startDate: Date | null; endDate: Date } => {
    const now = new Date()
    let startDate: Date | null = null

    switch (masterTimePeriod) {
      case 'last_7_days':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        break
      case 'last_30_days':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 30)
        break
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'this_quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1)
        break
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1) // January 1st of current year
        break
      case 'all_time':
      default:
        startDate = null
        break
    }

    return { startDate, endDate: now }
  }

  return (
    <MasterFilterContext.Provider
      value={{
        masterTimePeriod,
        setMasterTimePeriod,
        masterAssignee,
        setMasterAssignee,
        masterSource,
        setMasterSource,
        resetMasterFilters,
        getDateRange,
      }}
    >
      {children}
    </MasterFilterContext.Provider>
  )
}

export function useMasterFilter() {
  const context = useContext(MasterFilterContext)
  if (context === undefined) {
    throw new Error('useMasterFilter must be used within a MasterFilterProvider')
  }
  return context
}

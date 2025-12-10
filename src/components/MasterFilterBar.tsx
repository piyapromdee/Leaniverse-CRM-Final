'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'
import { useMasterFilter } from '@/contexts/MasterFilterContext'

interface User {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface MasterFilterBarProps {
  users?: User[]
  showAssignee?: boolean
  showSource?: boolean
}

export default function MasterFilterBar({
  users = [],
  showAssignee = true,
  showSource = true
}: MasterFilterBarProps) {
  const {
    masterTimePeriod,
    setMasterTimePeriod,
    masterAssignee,
    setMasterAssignee,
    masterSource,
    setMasterSource,
    resetMasterFilters,
  } = useMasterFilter()

  const hasActiveFilters = masterTimePeriod !== 'all_time' ||
                          (showAssignee && masterAssignee !== 'all') ||
                          (showSource && masterSource !== 'all')

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Master Filters</h3>
            <span className="text-sm text-gray-500">
              Apply global filters to analyze all metrics and data
            </span>
          </div>

          <div className={`grid grid-cols-1 ${showAssignee && showSource ? 'md:grid-cols-3' : showAssignee || showSource ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
            {/* Time Period Filter - Always shown */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Time Period
              </label>
              <select
                value={masterTimePeriod}
                onChange={(e) => setMasterTimePeriod(e.target.value as typeof masterTimePeriod)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="all_time">All Time</option>
                <option value="this_year">Current Year</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_month">This Month</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_7_days">Last 7 Days</option>
              </select>
            </div>

            {/* Assignee Filter - Conditional */}
            {showAssignee && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Sales Rep
                </label>
                <select
                  value={masterAssignee}
                  onChange={(e) => setMasterAssignee(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="all">All Sales Reps</option>
                  {users
                    .filter(u => u.role === 'sales')
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Source Filter - Conditional */}
            {showSource && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Marketing Channel
                </label>
                <select
                  value={masterSource}
                  onChange={(e) => setMasterSource(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="all">All Sources</option>
                  <option value="website">Website</option>
                  <option value="lead_form">Lead Form</option>
                  <option value="referral">Referral</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>
            )}
          </div>

          {/* Reset Master Filters Button */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={resetMasterFilters}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-300"
              >
                <Filter className="h-4 w-4 mr-1" />
                Reset Master Filters
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

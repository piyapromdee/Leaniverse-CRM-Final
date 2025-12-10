'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, TrendingDown, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AtRiskDeal {
  id: string
  title: string
  stage: string
  value: number
  updated_at: string
  close_date: string | null
  company?: string
  contact?: string
  days_since_update: number
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW'
  risk_reason: string
}

const DealsAtRiskWidget = () => {
  const [atRiskDeals, setAtRiskDeals] = useState<AtRiskDeal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadAtRiskDeals = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Query for deals that might be at risk (completely safe - only deals table)
      const { data, error: queryError } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          stage,
          value,
          updated_at,
          close_date,
          created_at
        `)
        .not('stage', 'in', '(won,lost)')
        .order('updated_at', { ascending: true })
        .limit(10)

      if (queryError) {
        console.error('Supabase query error:', queryError)
        throw queryError
      }

      console.log('Raw deals data:', data)

      // Process deals to determine risk level
      const processedDeals = (data || []).map(deal => {
        const updatedAt = new Date(deal.updated_at)
        const now = new Date()
        const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
        
        // Determine risk level and reason
        let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
        let riskReason = ''
        
        if (daysSinceUpdate > 30) {
          riskLevel = 'HIGH'
          riskReason = `No activity for ${daysSinceUpdate} days`
        } else if (daysSinceUpdate > 14) {
          riskLevel = 'MEDIUM'  
          riskReason = `Cooling down (${daysSinceUpdate} days)`
        } else if (daysSinceUpdate > 7) {
          riskLevel = 'MEDIUM'
          riskReason = `Needs attention (${daysSinceUpdate} days)`
        } else {
          // Skip deals that are active (less than 7 days)
          return null
        }

        // Check for overdue close date
        if (deal.close_date) {
          const closeDate = new Date(deal.close_date)
          if (closeDate < now) {
            riskLevel = 'HIGH'
            riskReason = `Overdue by ${Math.floor((now.getTime() - closeDate.getTime()) / (1000 * 60 * 60 * 24))} days`
          }
        }

        return {
          id: deal.id,
          title: deal.title,
          stage: deal.stage,
          value: deal.value || 0,
          updated_at: deal.updated_at,
          close_date: deal.close_date,
          company: undefined, // We'll fetch this separately if needed
          contact: undefined, // We'll fetch this separately if needed
          days_since_update: daysSinceUpdate,
          risk_level: riskLevel,
          risk_reason: riskReason
        }
      }).filter(Boolean) as AtRiskDeal[]

      // Sort by risk level (HIGH first) then by days since update
      processedDeals.sort((a, b) => {
        const riskOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        if (riskOrder[a.risk_level] !== riskOrder[b.risk_level]) {
          return riskOrder[b.risk_level] - riskOrder[a.risk_level]
        }
        return b.days_since_update - a.days_since_update
      })

      setAtRiskDeals(processedDeals.slice(0, 5)) // Show top 5 at-risk deals
      
    } catch (err: any) {
      console.error('Error loading at-risk deals:', err)
      setError(err.message || 'Failed to load at-risk deals')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAtRiskDeals()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'MEDIUM': return <Clock className="w-4 h-4 text-yellow-600" />
      case 'LOW': return <TrendingDown className="w-4 h-4 text-blue-600" />
      default: return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Deals at Risk - Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={loadAtRiskDeals}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Deals at Risk</span>
            {!isLoading && (
              <Badge variant="outline" className="ml-2">
                {atRiskDeals.length}
              </Badge>
            )}
          </div>
          <button
            onClick={loadAtRiskDeals}
            disabled={isLoading}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : atRiskDeals.length === 0 ? (
          <div className="text-center py-6">
            <TrendingDown className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No deals at risk!</p>
            <p className="text-xs text-gray-500">All deals are progressing well</p>
          </div>
        ) : (
          <div className="space-y-3">
            {atRiskDeals.map(deal => (
              <div key={deal.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {deal.title}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {deal.stage}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatCurrency(deal.value)}
                      </span>
                    </div>
                  </div>
                  <Badge className={`ml-2 text-xs flex items-center space-x-1 ${getRiskBadgeColor(deal.risk_level)}`}>
                    {getRiskIcon(deal.risk_level)}
                    <span>{deal.risk_level}</span>
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{deal.risk_reason}</span>
                  </p>
                  <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                    <ExternalLink className="w-3 h-3" />
                    <span>View</span>
                  </button>
                </div>
                
                {(deal.company || deal.contact) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {deal.company && `${deal.company}`}
                    {deal.company && deal.contact && ' • '}
                    {deal.contact && `${deal.contact}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        
        {atRiskDeals.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
              View All At-Risk Deals →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DealsAtRiskWidget
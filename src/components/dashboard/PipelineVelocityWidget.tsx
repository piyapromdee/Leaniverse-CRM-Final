'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Clock, AlertCircle, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface StageMetrics {
  stage: string
  avgDays: number
  dealCount: number
  isBottleneck: boolean
}

interface VelocityData {
  avgCycleTime: number
  totalDeals: number
  wonDeals: number
  stageMetrics: StageMetrics[]
  conversionRate: number
}

const PipelineVelocityWidget = () => {
  const [velocityData, setVelocityData] = useState<VelocityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadVelocityData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get all deals for analysis (simplified query)
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100) // Analyze recent 100 deals

      if (dealsError) {
        console.error('Pipeline velocity query error:', dealsError)
        throw dealsError
      }

      console.log('Pipeline deals data:', deals)

      if (!deals || deals.length === 0) {
        setVelocityData({
          avgCycleTime: 0,
          totalDeals: 0,
          wonDeals: 0,
          stageMetrics: [],
          conversionRate: 0
        })
        return
      }

      // Calculate metrics
      const wonDeals = deals.filter(d => d.stage === 'won')
      const totalDeals = deals.length
      const conversionRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0

      // Calculate average cycle time for won deals
      let avgCycleTime = 0
      if (wonDeals.length > 0) {
        const cycleTimes = wonDeals.map(deal => {
          const created = new Date(deal.created_at)
          const updated = new Date(deal.updated_at)
          return Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        })
        avgCycleTime = cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length
      }

      // Calculate stage metrics (time deals spend in each stage)
      const stageGroups = deals.reduce((acc, deal) => {
        if (!acc[deal.stage]) {
          acc[deal.stage] = []
        }
        
        const created = new Date(deal.created_at)
        const updated = new Date(deal.updated_at)
        const daysInStage = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        
        acc[deal.stage].push(daysInStage)
        return acc
      }, {} as Record<string, number[]>)

      const stageMetrics: StageMetrics[] = Object.entries(stageGroups).map(([stage, days]) => {
        const avgDays = (days as number[]).reduce((sum, d) => sum + d, 0) / (days as number[]).length
        return {
          stage,
          avgDays: Math.round(avgDays),
          dealCount: (days as number[]).length,
          isBottleneck: avgDays > 30 // Stages taking >30 days are bottlenecks
        }
      })

      // Sort stages in logical order
      const stageOrder = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
      stageMetrics.sort((a, b) => {
        const aIndex = stageOrder.indexOf(a.stage)
        const bIndex = stageOrder.indexOf(b.stage)
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
      })

      setVelocityData({
        avgCycleTime: Math.round(avgCycleTime),
        totalDeals,
        wonDeals: wonDeals.length,
        stageMetrics,
        conversionRate: Math.round(conversionRate)
      })

    } catch (err: any) {
      console.error('Error loading velocity data:', err)
      setError(err.message || 'Failed to load pipeline velocity data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVelocityData()
  }, [])

  const getStageDisplayName = (stage: string) => {
    const names: Record<string, string> = {
      'lead': 'Lead',
      'qualified': 'Qualified',
      'proposal': 'Proposal',
      'negotiation': 'Negotiation',
      'won': 'Won',
      'lost': 'Lost'
    }
    return names[stage] || stage
  }

  const getStageColor = (stage: string, isBottleneck: boolean) => {
    if (isBottleneck) {
      return 'bg-red-100 text-red-800 border-red-200'
    }
    
    switch (stage) {
      case 'lead': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'qualified': return 'bg-green-100 text-green-800 border-green-200'
      case 'proposal': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'negotiation': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'won': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'lost': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>Pipeline Velocity - Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={loadVelocityData}
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
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Pipeline Velocity</span>
          </div>
          <button
            onClick={loadVelocityData}
            disabled={isLoading}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-6 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ) : !velocityData ? (
          <div className="text-center py-6">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No pipeline data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 flex items-center justify-center space-x-1">
                  <Clock className="w-5 h-5" />
                  <span>{velocityData.avgCycleTime}</span>
                </div>
                <p className="text-xs text-blue-700">Avg Cycle Days</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 flex items-center justify-center space-x-1">
                  <TrendingUp className="w-5 h-5" />
                  <span>{velocityData.conversionRate}%</span>
                </div>
                <p className="text-xs text-green-700">Win Rate</p>
              </div>
            </div>

            {/* Stage Breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Stage Duration</h4>
              {velocityData.stageMetrics.map(stage => (
                <div key={stage.stage} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <Badge className={`text-xs ${getStageColor(stage.stage, stage.isBottleneck)}`}>
                      {getStageDisplayName(stage.stage)}
                    </Badge>
                    {stage.isBottleneck && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {stage.avgDays} days
                    </div>
                    <div className="text-xs text-gray-500">
                      {stage.dealCount} deals
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Insights */}
            <div className="pt-3 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Insights</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <p>• Analyzed {velocityData.totalDeals} recent deals</p>
                <p>• {velocityData.wonDeals} deals won ({velocityData.conversionRate}% win rate)</p>
                {velocityData.stageMetrics.some(s => s.isBottleneck) ? (
                  <p className="text-red-600">• ⚠️ Bottlenecks detected in pipeline</p>
                ) : (
                  <p className="text-green-600">• ✓ Pipeline flowing smoothly</p>
                )}
                {velocityData.avgCycleTime > 60 ? (
                  <p className="text-yellow-600">• Consider shortening sales cycle</p>
                ) : velocityData.avgCycleTime < 15 ? (
                  <p className="text-blue-600">• Fast-moving pipeline!</p>
                ) : (
                  <p className="text-green-600">• Healthy cycle time</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PipelineVelocityWidget
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface IndustryBannerProps {
  className?: string
  showBenchmarks?: boolean
}

interface IndustryBenchmarks {
  industry: string
  email_open_rate_excellent: number
  email_open_rate_good: number
  email_open_rate_average: number
  email_click_rate_excellent: number
  email_click_rate_good: number
  email_click_rate_average: number
  sales_conversion_rate_excellent: number
  sales_conversion_rate_good: number
  sales_conversion_rate_average: number
  lead_response_time_excellent: number
  lead_response_time_good: number
  lead_response_time_average: number
}

const industryDisplayNames: Record<string, string> = {
  'technology': 'Technology & Software',
  'ecommerce': 'E-commerce & Retail',
  'financial': 'Financial Services',
  'healthcare': 'Healthcare & Medical',
  'education': 'Education & Training',
  'marketing': 'Marketing & Advertising',
  'custom': 'Custom Settings'
}

export function IndustryBanner({ className = '', showBenchmarks = false }: IndustryBannerProps) {
  const [industryBenchmarks, setIndustryBenchmarks] = useState<IndustryBenchmarks | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false) // Collapsed by default
  
  const supabase = createClient()

  useEffect(() => {
    loadIndustryBenchmarks()
  }, [])

  const loadIndustryBenchmarks = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('benchmark_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data && !error) {
        setIndustryBenchmarks({
          industry: data.industry || 'technology',
          email_open_rate_excellent: data.email_open_rate_excellent || 25,
          email_open_rate_good: data.email_open_rate_good || 20,
          email_open_rate_average: data.email_open_rate_average || 15,
          email_click_rate_excellent: data.email_click_rate_excellent || 5,
          email_click_rate_good: data.email_click_rate_good || 3,
          email_click_rate_average: data.email_click_rate_average || 2,
          sales_conversion_rate_excellent: data.sales_conversion_rate_excellent || 8,
          sales_conversion_rate_good: data.sales_conversion_rate_good || 5,
          sales_conversion_rate_average: data.sales_conversion_rate_average || 3,
          lead_response_time_excellent: data.lead_response_time_excellent || 1,
          lead_response_time_good: data.lead_response_time_good || 4,
          lead_response_time_average: data.lead_response_time_average || 24
        })
      } else {
        // Default to Technology industry if no settings found
        setIndustryBenchmarks({
          industry: 'technology',
          email_open_rate_excellent: 25,
          email_open_rate_good: 20,
          email_open_rate_average: 15,
          email_click_rate_excellent: 5,
          email_click_rate_good: 3,
          email_click_rate_average: 2,
          sales_conversion_rate_excellent: 8,
          sales_conversion_rate_good: 5,
          sales_conversion_rate_average: 3,
          lead_response_time_excellent: 1,
          lead_response_time_good: 4,
          lead_response_time_average: 24
        })
      }
    } catch (error) {
      console.log('Error loading industry benchmarks:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !industryBenchmarks) {
    return null
  }

  const industryDisplayName = industryDisplayNames[industryBenchmarks.industry] || industryBenchmarks.industry

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-blue-100/50 rounded p-1 -m-1 transition-colors" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <div>
            <h3 className="text-sm font-medium text-blue-900">Current Industry Benchmarks</h3>
            <p className="text-xs text-blue-700">
              Your performance is measured against: <strong>{industryDisplayName}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <a 
            href="/dashboard/settings/benchmarks" 
            className="text-xs text-blue-600 hover:text-blue-800 underline"
            onClick={(e) => e.stopPropagation()} // Prevent accordion toggle when clicking link
          >
            Change Industry
          </a>
          <span className="text-blue-600 font-medium">
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>
      
      {isExpanded && showBenchmarks && (
        <div className="mt-3 pt-3 border-t border-blue-200 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="font-medium text-blue-900">Email Open Rate</p>
              <p className="text-blue-700">Excellent: {industryBenchmarks.email_open_rate_excellent}%+</p>
              <p className="text-blue-700">Good: {industryBenchmarks.email_open_rate_good}%+</p>
              <p className="text-blue-700">Average: {industryBenchmarks.email_open_rate_average}%+</p>
            </div>
            <div>
              <p className="font-medium text-blue-900">Email Click Rate</p>
              <p className="text-blue-700">Excellent: {industryBenchmarks.email_click_rate_excellent}%+</p>
              <p className="text-blue-700">Good: {industryBenchmarks.email_click_rate_good}%+</p>
              <p className="text-blue-700">Average: {industryBenchmarks.email_click_rate_average}%+</p>
            </div>
            <div>
              <p className="font-medium text-blue-900">Sales Conversion</p>
              <p className="text-blue-700">Excellent: {industryBenchmarks.sales_conversion_rate_excellent}%+</p>
              <p className="text-blue-700">Good: {industryBenchmarks.sales_conversion_rate_good}%+</p>
              <p className="text-blue-700">Average: {industryBenchmarks.sales_conversion_rate_average}%+</p>
            </div>
            <div>
              <p className="font-medium text-blue-900">Response Time</p>
              <p className="text-blue-700">Excellent: &lt;{industryBenchmarks.lead_response_time_excellent}h</p>
              <p className="text-blue-700">Good: &lt;{industryBenchmarks.lead_response_time_good}h</p>
              <p className="text-blue-700">Average: &lt;{industryBenchmarks.lead_response_time_average}h</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IndustryBanner
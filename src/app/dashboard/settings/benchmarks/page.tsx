'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, TrendingUp, Mail, Users, Target, Info, RotateCcw, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { HelpTooltip } from '@/lib/help-tooltips'

interface BenchmarkSettings {
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
  lead_response_time_excellent: number // in hours
  lead_response_time_good: number
  lead_response_time_average: number
  customer_retention_rate_excellent: number
  customer_retention_rate_good: number
  customer_retention_rate_average: number
}

const industryBenchmarks: Record<string, BenchmarkSettings> = {
  'technology': {
    industry: 'Technology & Software',
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
    lead_response_time_average: 24,
    customer_retention_rate_excellent: 95,
    customer_retention_rate_good: 90,
    customer_retention_rate_average: 85
  },
  'ecommerce': {
    industry: 'E-commerce & Retail',
    email_open_rate_excellent: 22,
    email_open_rate_good: 18,
    email_open_rate_average: 14,
    email_click_rate_excellent: 4,
    email_click_rate_good: 2.5,
    email_click_rate_average: 1.5,
    sales_conversion_rate_excellent: 12,
    sales_conversion_rate_good: 8,
    sales_conversion_rate_average: 5,
    lead_response_time_excellent: 2,
    lead_response_time_good: 8,
    lead_response_time_average: 48,
    customer_retention_rate_excellent: 85,
    customer_retention_rate_good: 75,
    customer_retention_rate_average: 65
  },
  'financial': {
    industry: 'Financial Services',
    email_open_rate_excellent: 28,
    email_open_rate_good: 23,
    email_open_rate_average: 18,
    email_click_rate_excellent: 6,
    email_click_rate_good: 4,
    email_click_rate_average: 2.5,
    sales_conversion_rate_excellent: 15,
    sales_conversion_rate_good: 10,
    sales_conversion_rate_average: 6,
    lead_response_time_excellent: 0.5,
    lead_response_time_good: 2,
    lead_response_time_average: 12,
    customer_retention_rate_excellent: 92,
    customer_retention_rate_good: 88,
    customer_retention_rate_average: 82
  },
  'healthcare': {
    industry: 'Healthcare & Medical',
    email_open_rate_excellent: 24,
    email_open_rate_good: 19,
    email_open_rate_average: 15,
    email_click_rate_excellent: 4.5,
    email_click_rate_good: 3,
    email_click_rate_average: 2,
    sales_conversion_rate_excellent: 20,
    sales_conversion_rate_good: 15,
    sales_conversion_rate_average: 10,
    lead_response_time_excellent: 1,
    lead_response_time_good: 6,
    lead_response_time_average: 24,
    customer_retention_rate_excellent: 90,
    customer_retention_rate_good: 85,
    customer_retention_rate_average: 80
  },
  'education': {
    industry: 'Education & Training',
    email_open_rate_excellent: 26,
    email_open_rate_good: 21,
    email_open_rate_average: 16,
    email_click_rate_excellent: 5.5,
    email_click_rate_good: 3.5,
    email_click_rate_average: 2.2,
    sales_conversion_rate_excellent: 18,
    sales_conversion_rate_good: 12,
    sales_conversion_rate_average: 8,
    lead_response_time_excellent: 2,
    lead_response_time_good: 8,
    lead_response_time_average: 72,
    customer_retention_rate_excellent: 88,
    customer_retention_rate_good: 82,
    customer_retention_rate_average: 75
  },
  'marketing': {
    industry: 'Marketing & Advertising',
    email_open_rate_excellent: 23,
    email_open_rate_good: 18,
    email_open_rate_average: 14,
    email_click_rate_excellent: 4.2,
    email_click_rate_good: 2.8,
    email_click_rate_average: 1.8,
    sales_conversion_rate_excellent: 10,
    sales_conversion_rate_good: 6,
    sales_conversion_rate_average: 4,
    lead_response_time_excellent: 1,
    lead_response_time_good: 4,
    lead_response_time_average: 24,
    customer_retention_rate_excellent: 80,
    customer_retention_rate_good: 70,
    customer_retention_rate_average: 60
  },
  'custom': {
    industry: 'Custom Settings',
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
    lead_response_time_average: 24,
    customer_retention_rate_excellent: 90,
    customer_retention_rate_good: 80,
    customer_retention_rate_average: 70
  }
}

export default function BenchmarksSettingsPage() {
  const [selectedIndustry, setSelectedIndustry] = useState('technology')
  const [customBenchmarks, setCustomBenchmarks] = useState<BenchmarkSettings>(industryBenchmarks.technology)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const supabase = createClient()
  
  useEffect(() => {
    loadSettings()
  }, [])
  
  useEffect(() => {
    if (!isCustomMode && selectedIndustry !== 'custom') {
      setCustomBenchmarks(industryBenchmarks[selectedIndustry])
    }
  }, [selectedIndustry, isCustomMode])
  
  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase
        .from('benchmark_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (data) {
        setSelectedIndustry(data.industry || 'technology')
        setCustomBenchmarks(data)
        setIsCustomMode(data.industry === 'custom')
      }
    } catch (error) {
      console.log('No existing settings, using defaults')
    }
  }
  
  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const settings = {
        ...customBenchmarks,
        user_id: user.id,
        industry: isCustomMode ? 'custom' : selectedIndustry,
        updated_at: new Date().toISOString()
      }
      
      const { error } = await supabase
        .from('benchmark_settings')
        .upsert(settings, { onConflict: 'user_id' })
      
      if (error) throw error
      
      alert('Benchmark settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }
  
  const resetToDefaults = () => {
    if (selectedIndustry && selectedIndustry !== 'custom') {
      setCustomBenchmarks(industryBenchmarks[selectedIndustry])
      setIsCustomMode(false)
    }
  }
  
  const handleIndustryChange = (industry: string) => {
    setSelectedIndustry(industry)
    if (industry === 'custom') {
      setIsCustomMode(true)
    } else {
      setIsCustomMode(false)
      setCustomBenchmarks(industryBenchmarks[industry])
    }
  }
  
  const updateBenchmark = (field: keyof BenchmarkSettings, value: number) => {
    setCustomBenchmarks(prev => ({
      ...prev,
      [field]: value
    }))
    setIsCustomMode(true)
  }
  
  return (
    <div className="space-y-6 p-4 md:p-6 lg:px-12 lg:py-8 min-h-screen">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-6">
              <Settings className="w-8 h-8 mr-3 text-teal-600" />
              Industry Benchmarks
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              Configure industry-specific benchmarks for your CRM metrics and performance indicators
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={resetToDefaults} variant="outline" disabled={!isCustomMode}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Industry Defaults
            </Button>
            <Button onClick={saveSettings} disabled={isSaving} className="bg-teal-500 hover:bg-teal-600">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
        
        {/* Industry Selector */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Select Your Industry</Label>
              <p className="text-sm text-gray-600 mt-1">
                Choose your industry to get accurate benchmark comparisons, or create custom settings
              </p>
            </div>
            <div className="min-w-64">
              <Select value={selectedIndustry} onValueChange={handleIndustryChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">🖥️ Technology & Software</SelectItem>
                  <SelectItem value="ecommerce">🛒 E-commerce & Retail</SelectItem>
                  <SelectItem value="financial">💰 Financial Services</SelectItem>
                  <SelectItem value="healthcare">🏥 Healthcare & Medical</SelectItem>
                  <SelectItem value="education">🎓 Education & Training</SelectItem>
                  <SelectItem value="marketing">📢 Marketing & Advertising</SelectItem>
                  <SelectItem value="custom">⚙️ Custom Settings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isCustomMode && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-orange-600 mt-0.5" />
                <p className="text-sm text-orange-800">
                  You're using custom benchmarks. These settings will override industry standards and affect how your metrics are graded throughout the CRM.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Benchmark Settings */}
      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email">📧 Email Marketing</TabsTrigger>
          <TabsTrigger value="sales">💰 Sales Performance</TabsTrigger>
          <TabsTrigger value="response">⚡ Response Times</TabsTrigger>
          <TabsTrigger value="retention">🎯 Customer Retention</TabsTrigger>
        </TabsList>
        
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2 text-blue-500" />
                Email Marketing Benchmarks
              </CardTitle>
              <CardDescription>
                Set benchmarks for email open rates and click-through rates used throughout your campaigns dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Open Rate Benchmarks */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-lg">Email Open Rate Thresholds</h4>
                  <HelpTooltip content={{
                    title: "Email Open Rate Benchmarks",
                    description: "These thresholds determine how your email performance is graded in the dashboard",
                    calculation: "(Unique Opens / Delivered Emails) × 100",
                    example: "200 opens from 1,000 delivered = 20% open rate"
                  }} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-green-500 rounded"></span>
                      <span>Excellent (%)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.email_open_rate_excellent}
                      onChange={(e) => updateBenchmark('email_open_rate_excellent', parseFloat(e.target.value) || 0)}
                      placeholder="25"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-500">🏆 Top performance</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-blue-500 rounded"></span>
                      <span>Good (%)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.email_open_rate_good}
                      onChange={(e) => updateBenchmark('email_open_rate_good', parseFloat(e.target.value) || 0)}
                      placeholder="20"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-500">✅ Above average</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-yellow-500 rounded"></span>
                      <span>Average (%)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.email_open_rate_average}
                      onChange={(e) => updateBenchmark('email_open_rate_average', parseFloat(e.target.value) || 0)}
                      placeholder="15"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-500">📊 Industry baseline</p>
                  </div>
                </div>
              </div>
              
              {/* Click Rate Benchmarks */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-lg">Email Click Rate Thresholds</h4>
                  <HelpTooltip content={{
                    title: "Email Click Rate Benchmarks", 
                    description: "These thresholds determine how your email engagement is graded",
                    calculation: "(Unique Clicks / Delivered Emails) × 100",
                    example: "50 clicks from 1,000 delivered = 5% click rate"
                  }} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-green-500 rounded"></span>
                      <span>Excellent (%)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.email_click_rate_excellent}
                      onChange={(e) => updateBenchmark('email_click_rate_excellent', parseFloat(e.target.value) || 0)}
                      placeholder="5"
                      step="0.1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-blue-500 rounded"></span>
                      <span>Good (%)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.email_click_rate_good}
                      onChange={(e) => updateBenchmark('email_click_rate_good', parseFloat(e.target.value) || 0)}
                      placeholder="3"
                      step="0.1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-yellow-500 rounded"></span>
                      <span>Average (%)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.email_click_rate_average}
                      onChange={(e) => updateBenchmark('email_click_rate_average', parseFloat(e.target.value) || 0)}
                      placeholder="2"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                Sales Performance Benchmarks
              </CardTitle>
              <CardDescription>
                Configure conversion rate benchmarks for sales pipeline performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-lg">Sales Conversion Rate Thresholds</h4>
                  <HelpTooltip content={{
                    title: "Sales Conversion Rate",
                    description: "Percentage of leads that become paying customers",
                    calculation: "(Won Deals / Total Leads) × 100",
                    example: "50 deals won from 500 leads = 10% conversion rate"
                  }} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-green-500 rounded"></span>
                      <span>Excellent (%)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.sales_conversion_rate_excellent}
                      onChange={(e) => updateBenchmark('sales_conversion_rate_excellent', parseFloat(e.target.value) || 0)}
                      placeholder="8"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-500">🏆 Top sales performance</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-blue-500 rounded"></span>
                      <span>Good (%)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.sales_conversion_rate_good}
                      onChange={(e) => updateBenchmark('sales_conversion_rate_good', parseFloat(e.target.value) || 0)}
                      placeholder="5"
                      step="0.1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-yellow-500 rounded"></span>
                      <span>Average (%)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.sales_conversion_rate_average}
                      onChange={(e) => updateBenchmark('sales_conversion_rate_average', parseFloat(e.target.value) || 0)}
                      placeholder="3"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="response" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-orange-500" />
                Lead Response Time Benchmarks
              </CardTitle>
              <CardDescription>
                Set expectations for how quickly leads should be contacted
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-lg">Lead Response Time Thresholds (Hours)</h4>
                  <HelpTooltip content={{
                    title: "Lead Response Time",
                    description: "Time between lead generation and first contact attempt",
                    calculation: "Time from lead creation to first outreach",
                    example: "Lead created at 9 AM, first call at 10 AM = 1 hour response time"
                  }} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-green-500 rounded"></span>
                      <span>Excellent (hours)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.lead_response_time_excellent}
                      onChange={(e) => updateBenchmark('lead_response_time_excellent', parseFloat(e.target.value) || 0)}
                      placeholder="1"
                      step="0.5"
                    />
                    <p className="text-xs text-gray-500">🏆 Lightning fast</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-blue-500 rounded"></span>
                      <span>Good (hours)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.lead_response_time_good}
                      onChange={(e) => updateBenchmark('lead_response_time_good', parseFloat(e.target.value) || 0)}
                      placeholder="4"
                      step="0.5"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-yellow-500 rounded"></span>
                      <span>Average (hours)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.lead_response_time_average}
                      onChange={(e) => updateBenchmark('lead_response_time_average', parseFloat(e.target.value) || 0)}
                      placeholder="24"
                      step="0.5"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="retention" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-500" />
                Customer Retention Benchmarks
              </CardTitle>
              <CardDescription>
                Define what constitutes good customer retention rates for your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-lg">Customer Retention Rate Thresholds (%)</h4>
                  <HelpTooltip content={{
                    title: "Customer Retention Rate",
                    description: "Percentage of customers who remain active over a given period",
                    calculation: "((Customers End - Customers Acquired) / Customers Start) × 100",
                    example: "Started with 100, gained 20, ended with 110 = 90% retention"
                  }} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-green-500 rounded"></span>
                      <span>Excellent (%)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.customer_retention_rate_excellent}
                      onChange={(e) => updateBenchmark('customer_retention_rate_excellent', parseFloat(e.target.value) || 0)}
                      placeholder="90"
                      step="1"
                    />
                    <p className="text-xs text-gray-500">🏆 Exceptional loyalty</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-blue-500 rounded"></span>
                      <span>Good (%)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.customer_retention_rate_good}
                      onChange={(e) => updateBenchmark('customer_retention_rate_good', parseFloat(e.target.value) || 0)}
                      placeholder="80"
                      step="1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-yellow-500 rounded"></span>
                      <span>Average (%)</span>
                    </Label>
                    <Input
                      type="number"
                      value={customBenchmarks.customer_retention_rate_average}
                      onChange={(e) => updateBenchmark('customer_retention_rate_average', parseFloat(e.target.value) || 0)}
                      placeholder="70"
                      step="1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Current Industry Info */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Current Benchmark Settings</CardTitle>
          <CardDescription>
            Your CRM will use these benchmarks to grade performance across all dashboards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-900">Industry:</p>
              <p className="text-gray-600">{customBenchmarks.industry}</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Email Open (Excellent):</p>
              <p className="text-green-600 font-semibold">{customBenchmarks.email_open_rate_excellent}%+</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Email Click (Excellent):</p>
              <p className="text-green-600 font-semibold">{customBenchmarks.email_click_rate_excellent}%+</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Response Time (Excellent):</p>
              <p className="text-green-600 font-semibold">&lt;{customBenchmarks.lead_response_time_excellent}h</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
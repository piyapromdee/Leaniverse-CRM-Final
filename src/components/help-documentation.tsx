'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Search, HelpCircle, Calculator, Users, Mail, TrendingUp, Target, BookOpen } from 'lucide-react'
import { helpTooltips } from '@/lib/help-tooltips'

export function HelpDocumentation() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('contacts')
  
  const categories = {
    contacts: {
      icon: Users,
      title: 'Contact Management',
      description: 'Understanding how contacts are segmented and scored',
      sections: helpTooltips.contactLists
    },
    sales: {
      icon: TrendingUp,
      title: 'Sales Metrics',
      description: 'Revenue tracking and pipeline analysis',
      sections: helpTooltips.salesMetrics
    },
    email: {
      icon: Mail,
      title: 'Email Campaigns',
      description: 'Email performance and engagement metrics',
      sections: helpTooltips.emailMetrics
    },
    scoring: {
      icon: Calculator,
      title: 'Lead Scoring',
      description: 'How leads are scored and prioritized',
      sections: helpTooltips.leadScoring
    },
    health: {
      icon: Target,
      title: 'Customer Health',
      description: 'Customer retention and churn prediction',
      sections: helpTooltips.customerHealth
    }
  }
  
  // Filter content based on search
  const filteredContent = Object.entries(categories).reduce((acc, [key, category]) => {
    if (searchTerm) {
      const filteredSections = Object.entries(category.sections).filter(([sectionKey, section]: [string, any]) =>
        section.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.calculation?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      if (filteredSections.length > 0) {
        acc[key] = { ...category, sections: Object.fromEntries(filteredSections) }
      }
    } else {
      acc[key] = category
    }
    return acc
  }, {} as any)
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="w-4 h-4 mr-2" />
          Help & Formulas
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <HelpCircle className="w-6 h-6 mr-2 text-teal-600" />
            CRM Help Documentation
          </DialogTitle>
          <DialogDescription>
            Comprehensive guide to all metrics, calculations, and segmentation rules in your CRM
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(90vh-120px)]">
          {/* Sidebar Navigation */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search help topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="space-y-2">
              {Object.entries(filteredContent).map(([key, category]) => {
                const IconComponent = (category as any).icon
                const isActive = activeCategory === key
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-start space-x-3 ${
                      isActive
                        ? 'bg-teal-50 border border-teal-200 text-teal-900'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{(category as any).title}</div>
                      <div className="text-xs text-gray-500">{(category as any).description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Content Area */}
          <div className="lg:col-span-3 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="space-y-6 pr-4">
                {Object.entries(filteredContent).map(([categoryKey, category]) => {
                  if (activeCategory !== categoryKey) return null
                  
                  return (
                    <div key={categoryKey} className="space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          {(category as any).title}
                        </h2>
                        <p className="text-gray-600">{(category as any).description}</p>
                      </div>
                      
                      <div className="space-y-4">
                        {Object.entries((category as any).sections).map(([sectionKey, section]: [string, any]) => (
                          <Card key={sectionKey}>
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <span className="text-lg">{section.title}</span>
                                {section.stage && (
                                  <Badge variant="outline">{section.stage}</Badge>
                                )}
                              </CardTitle>
                              <CardDescription>{section.description}</CardDescription>
                            </CardHeader>
                            
                            <CardContent className="space-y-4">
                              {/* Calculation Formula */}
                              {section.calculation && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                                    <Calculator className="w-4 h-4 mr-2" />
                                    Calculation Formula
                                  </h4>
                                  <code className="text-sm text-blue-800 bg-blue-100 px-2 py-1 rounded">
                                    {section.calculation}
                                  </code>
                                </div>
                              )}
                              
                              {/* Details List */}
                              {section.details && (
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">Details:</h4>
                                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                                    {section.details.map((detail: string, idx: number) => (
                                      <li key={idx}>{detail}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Example */}
                              {section.example && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                  <h4 className="font-medium text-green-900 mb-2">Example:</h4>
                                  <p className="text-sm text-green-800">{section.example}</p>
                                </div>
                              )}
                              
                              {/* Industry Benchmarks for Email Metrics */}
                              {sectionKey === 'openRate' && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                  <h4 className="font-medium text-gray-900 mb-2">Industry Benchmarks:</h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="font-medium">Excellent:</span> 25%+</div>
                                    <div><span className="font-medium">Good:</span> 20-25%</div>
                                    <div><span className="font-medium">Average:</span> 15-20%</div>
                                    <div><span className="font-medium">Needs Work:</span> &lt;15%</div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t pt-4">
          <p className="text-xs text-gray-500 text-center">
            💡 <strong>Tip:</strong> Hover over any metric in the dashboard to see quick explanations and formulas.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { HelpCircle, Calculator, Lightbulb, Target, Award, BookOpen, Info } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface HelpContent {
  title: string
  description: string
  sections?: Array<{
    title: string
    content: string
    items?: string[]
  }>
  formulas?: Array<{
    name: string
    formula: string
    description: string
  }>
  tips?: string[]
}

const helpContentMap: Record<string, HelpContent> = {
  'lead-scoring': {
    title: 'Lead Scoring System',
    description: 'How leads are automatically scored from 0-100 based on quality indicators',
    sections: [
      {
        title: 'Source Quality Points',
        content: 'Different lead sources have different quality scores:',
        items: [
          'Referral: +25 points (highest quality)',
          'LinkedIn: +20 points',
          'Website: +15 points',
          'Google Ads: +10 points',
          'Facebook Ads: +8 points',
          'Email Marketing: +5 points',
          'Cold Outreach: +3 points'
        ]
      },
      {
        title: 'Contact Information',
        content: 'Complete contact details increase lead quality:',
        items: [
          'Has Company Name: +10 points',
          'Has Email: +10 points',
          'Has Phone: +10 points'
        ]
      },
      {
        title: 'Job Title (Decision Maker)',
        content: 'Higher-level positions get more points:',
        items: [
          'CEO/Founder/President: +25 points',
          'Manager/Director/Head: +15 points',
          'Lead/Senior roles: +10 points',
          'Other titles: +5 points'
        ]
      },
      {
        title: 'Priority Level',
        content: 'Manual priority affects scoring:',
        items: [
          'Urgent: +20 points',
          'High: +15 points',
          'Medium: +10 points',
          'Low: +5 points'
        ]
      }
    ],
    formulas: [
      {
        name: 'Total Lead Score',
        formula: 'Source Points + Contact Points + Job Title Points + Priority Points',
        description: 'Maximum score is capped at 100 points'
      }
    ],
    tips: [
      'Scores of 80+ are high-quality leads worth immediate attention',
      'Scores of 60-79 are qualified prospects for follow-up',
      'Scores below 40 may need nurturing before conversion',
      'Referral leads typically score highest due to trust factor'
    ]
  },
  'lead-conversion': {
    title: 'Lead to Deal Conversion',
    description: 'How to convert qualified leads into sales opportunities',
    sections: [
      {
        title: 'Conversion Process',
        content: 'Only qualified leads can be converted to deals:',
        items: [
          '1. Lead status must be "qualified"',
          '2. Click the green "Convert" button',
          '3. Deal is created in Sales Pipeline',
          '4. Lead status changes to "converted"'
        ]
      },
      {
        title: 'What Happens During Conversion',
        content: 'The system automatically:',
        items: [
          'Creates new deal with lead information',
          'Sets deal stage to "discovery"',
          'Copies company and contact details',
          'Sets default value (฿10,000)',
          'Sets default close date (30 days)',
          'Preserves source/channel information'
        ]
      }
    ],
    tips: [
      'Qualify leads thoroughly before converting',
      'Converted deals appear in the Sales Pipeline',
      'Original lead record is preserved for reference',
      'Conversion cannot be undone'
    ]
  },
  'deal-stages': {
    title: 'Deal Pipeline Stages',
    description: 'Understanding the sales process stages',
    sections: [
      {
        title: 'Pipeline Flow',
        content: 'Deals progress through these stages:',
        items: [
          'Discovery: Initial contact and needs assessment',
          'Proposal: Presenting solution and pricing',
          'Negotiation: Terms and contract discussions',
          'Closed Won: Deal successfully closed',
          'Closed Lost: Deal was not won'
        ]
      }
    ],
    tips: [
      'Move deals through stages as they progress',
      'Update deal values during negotiation',
      'Set realistic close dates',
      'Add notes for deal context'
    ]
  },
  'dashboard-monitoring': {
    title: 'Dashboard Monitoring',
    description: 'Using the dashboard to monitor your sales performance',
    sections: [
      {
        title: 'Key Metrics to Monitor',
        content: 'Focus on these critical indicators:',
        items: [
          'Pipeline Value: Total value of active deals',
          'Win Rate: Percentage of won vs lost deals',
          'Average Deal Size: Revenue per closed deal',
          'Sales Velocity: How fast deals close',
          'Lead Conversion Rate: Leads becoming deals'
        ]
      },
      {
        title: 'Warning Signs',
        content: 'Look out for these issues:',
        items: [
          'Decreasing pipeline value',
          'Deals stuck in one stage too long',
          'Low lead scores trending down',
          'High number of lost deals',
          'Long sales cycles'
        ]
      },
      {
        title: 'Action Plans',
        content: 'Take these actions based on data:',
        items: [
          'Low pipeline: Increase lead generation',
          'Stuck deals: Follow up and move forward',
          'Poor conversion: Improve lead qualification',
          'Long cycles: Streamline sales process',
          'Low scores: Focus on better lead sources'
        ]
      }
    ],
    tips: [
      'Check dashboard daily for trends',
      'Set alerts for deals at risk',
      'Review weekly performance metrics',
      'Use data to guide sales strategy'
    ]
  }
}

interface HelpSidebarProps {
  className?: string
}

export function HelpSidebar({ className = '' }: HelpSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  
  // Determine which help content to show based on current page
  let currentSection = 'dashboard-monitoring' // default
  if (pathname.includes('/leads')) {
    currentSection = 'lead-scoring'
  } else if (pathname.includes('/deals')) {
    currentSection = 'deal-stages'
  }
  
  const content = helpContentMap[currentSection]
  if (!content) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-lg ${className}`}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          📖 Help & Guide
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            {content.title}
          </SheetTitle>
          <SheetDescription>
            {content.description}
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 py-6">
          {content.sections?.map((section, index) => (
            <div key={index} className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600" />
                {section.title}
              </h4>
              <p className="text-sm text-gray-600">{section.content}</p>
              {section.items && (
                <ul className="space-y-1 ml-6">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {content.formulas && content.formulas.length > 0 && (
            <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                Formulas
              </h4>
              {content.formulas.map((formula, index) => (
                <div key={index} className="space-y-2">
                  <div className="font-medium text-blue-900">{formula.name}</div>
                  <div className="font-mono text-sm bg-white p-2 rounded border">
                    {formula.formula}
                  </div>
                  <div className="text-sm text-blue-700">{formula.description}</div>
                </div>
              ))}
            </div>
          )}

          {content.tips && content.tips.length > 0 && (
            <div className="space-y-3 bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-600" />
                Pro Tips
              </h4>
              <ul className="space-y-2">
                {content.tips.map((tip, index) => (
                  <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                    <Award className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Links */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-600" />
              Quick Access
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setOpen(false)
                  setTimeout(() => {
                    const newContent = helpContentMap['lead-scoring']
                    if (newContent) setOpen(true)
                  }, 100)
                }}
              >
                Lead Scoring
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setOpen(false)
                  setTimeout(() => {
                    const newContent = helpContentMap['deal-stages']
                    if (newContent) setOpen(true)
                  }, 100)
                }}
              >
                Deal Stages
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setOpen(false)
                  setTimeout(() => {
                    const newContent = helpContentMap['dashboard-monitoring']
                    if (newContent) setOpen(true)
                  }, 100)
                }}
              >
                Dashboard Guide
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
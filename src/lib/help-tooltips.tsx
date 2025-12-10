import React from 'react'
import { Info, HelpCircle } from 'lucide-react'

// Comprehensive help tooltips and calculation explanations for the entire CRM

export const helpTooltips = {
  // ==========================================
  // CONTACT SEGMENTATION & LISTS
  // ==========================================
  contactLists: {
    hotLeads: {
      title: "🔥 Hot Leads",
      description: "Contacts most likely to convert to customers soon",
      calculation: "Lead Score > 80% AND Recent Activity (< 7 days) AND Qualified Status",
      details: [
        "Lead Score: Calculated from engagement, interactions, and profile completeness",
        "Recent Activity: Any action taken in the last 7 days (email open, website visit, form submission)",
        "Qualified Status: Marked as 'qualified' after meeting certain criteria"
      ],
      example: "A contact who opened 3 emails this week, visited pricing page, and has 85% lead score"
    },
    
    currentClients: {
      title: "💼 Current Clients",
      description: "Active paying customers with current subscriptions",
      calculation: "Status = 'Customer' AND Active Subscription",
      details: [
        "Customer Status: Contact has made at least one purchase",
        "Active Subscription: Has a subscription that hasn't expired or been cancelled",
        "Excludes churned customers even if they were previously clients"
      ],
      example: "A customer paying $99/month with an active subscription"
    },
    
    vipCustomers: {
      title: "⭐ VIP Customers",
      description: "Your most valuable customers requiring special attention",
      calculation: "Lifetime Value > $10,000 AND Customer Status = Active",
      details: [
        "Lifetime Value: Total revenue from all purchases and subscriptions",
        "Includes: Product purchases + Subscription fees + Upsells",
        "These customers get priority support and exclusive offers"
      ],
      example: "A customer who has spent $15,000 over 2 years"
    },
    
    atRisk: {
      title: "⚠️ At Risk",
      description: "Active customers showing signs they might cancel",
      calculation: "No Activity > 30 days OR Support Tickets > 2 OR Usage Decline > 50%",
      details: [
        "Inactivity: No logins, email opens, or feature usage in 30+ days",
        "Support Issues: Multiple unresolved tickets indicate frustration",
        "Usage Decline: Significant drop in platform usage compared to their average"
      ],
      example: "A customer who hasn't logged in for 35 days and has 3 support tickets"
    },
    
    prospects: {
      title: "🎯 Prospects",
      description: "Potential customers actively being pursued",
      calculation: "Lead Score 30-80% AND Stage IN (Discovery, Proposal, Negotiation)",
      details: [
        "Mid-range Lead Score: Shows interest but needs nurturing",
        "Active Pipeline Stages: Currently in sales process",
        "Not yet converted to customer status"
      ],
      example: "A lead in proposal stage with 65% lead score"
    },
    
    newSignups: {
      title: "🆕 New Signups",
      description: "Recent contacts requiring onboarding attention",
      calculation: "Created Date < 30 days ago",
      details: [
        "Includes all new contacts from any source",
        "Critical period for engagement and conversion",
        "Should receive welcome series and onboarding emails"
      ],
      example: "Someone who signed up for a free trial 5 days ago"
    },
    
    engagedSubscribers: {
      title: "📧 Engaged Subscribers",
      description: "Contacts who actively read and interact with emails",
      calculation: "Email Open Rate > 30% AND Click Rate > 10%",
      details: [
        "Open Rate: (Emails Opened / Emails Sent) × 100",
        "Click Rate: (Links Clicked / Emails Sent) × 100",
        "High engagement indicates interest in your content"
      ],
      example: "Opened 6 of 10 emails (60%) and clicked links in 2 (20%)"
    },
    
    coldLeads: {
      title: "❄️ Cold Leads",
      description: "Contacts needing re-engagement campaigns",
      calculation: "Lead Score < 30% AND Last Activity > 60 days",
      details: [
        "Low Lead Score: Minimal engagement or interest shown",
        "Stale Activity: No recent interactions with your business",
        "Requires warming up through targeted nurture campaigns"
      ],
      example: "A contact with 20% lead score who last engaged 3 months ago"
    }
  },
  
  // ==========================================
  // SALES METRICS & CALCULATIONS
  // ==========================================
  salesMetrics: {
    conversionRate: {
      title: "Conversion Rate",
      description: "Percentage of leads that become customers",
      calculation: "(Won Deals / Total Opportunities) × 100",
      details: [
        "Industry Average: 2-5% for cold leads, 20-30% for qualified leads",
        "Higher is better - indicates effective sales process",
        "Track by source to identify best lead channels"
      ],
      example: "5 won deals from 20 opportunities = 25% conversion rate"
    },
    
    averageDealSize: {
      title: "Average Deal Size",
      description: "Mean value of closed deals",
      calculation: "Total Revenue / Number of Won Deals",
      details: [
        "Helps predict revenue from pipeline",
        "Used for sales forecasting",
        "Compare across sales reps to identify training needs"
      ],
      example: "$50,000 revenue from 10 deals = $5,000 average"
    },
    
    salesVelocity: {
      title: "Sales Velocity",
      description: "Speed of moving deals through pipeline",
      calculation: "(Opportunities × Win Rate × Avg Deal Size) / Sales Cycle Length",
      details: [
        "Measures how quickly you generate revenue",
        "Higher velocity = faster revenue generation",
        "Optimize by improving any of the four factors"
      ],
      example: "(50 opps × 25% × $5,000) / 30 days = $2,083/day"
    },
    
    pipelineValue: {
      title: "Pipeline Value",
      description: "Total potential revenue in active deals",
      calculation: "SUM(Deal Value × Probability)",
      details: [
        "Weighted by probability of closing",
        "Discovery: 10%, Proposal: 30%, Negotiation: 60%, Verbal Commit: 90%",
        "Used for revenue forecasting"
      ],
      example: "$100k deal at 30% probability = $30k pipeline value"
    },
    
    winRate: {
      title: "Win Rate",
      description: "Percentage of opportunities that result in closed deals",
      calculation: "(Won Deals / (Won Deals + Lost Deals)) × 100",
      details: [
        "Excludes open opportunities",
        "Key indicator of sales effectiveness",
        "Track by rep, product, and lead source"
      ],
      example: "20 won, 30 lost = 40% win rate"
    },
    
    salesCycleLength: {
      title: "Sales Cycle Length",
      description: "Average time from opportunity creation to close",
      calculation: "AVG(Close Date - Create Date) for Won Deals",
      details: [
        "Measured in days",
        "Shorter cycles = faster revenue realization",
        "Varies by deal size and complexity"
      ],
      example: "Average of 45 days from first contact to closed deal"
    }
  },
  
  // ==========================================
  // EMAIL CAMPAIGN METRICS
  // ==========================================
  emailMetrics: {
    openRate: {
      title: "Email Open Rate",
      description: "Percentage of recipients who opened the email",
      calculation: "(Unique Opens / Delivered Emails) × 100",
      details: [
        "Industry Average: 15-25%",
        "Tracked via invisible pixel in email",
        "Higher rates indicate good subject lines and sender reputation"
      ],
      example: "200 opens from 1,000 delivered = 20% open rate"
    },
    
    clickRate: {
      title: "Click-Through Rate (CTR)",
      description: "Percentage who clicked links in the email",
      calculation: "(Unique Clicks / Delivered Emails) × 100",
      details: [
        "Industry Average: 2-5%",
        "Measures content engagement",
        "Higher CTR = more compelling content and CTAs"
      ],
      example: "50 clicks from 1,000 delivered = 5% CTR"
    },
    
    clickToOpenRate: {
      title: "Click-to-Open Rate (CTOR)",
      description: "Percentage of openers who clicked",
      calculation: "(Unique Clicks / Unique Opens) × 100",
      details: [
        "Industry Average: 10-20%",
        "Measures email content effectiveness",
        "Isolates content quality from subject line performance"
      ],
      example: "50 clicks from 200 opens = 25% CTOR"
    },
    
    bounceRate: {
      title: "Bounce Rate",
      description: "Percentage of emails that couldn't be delivered",
      calculation: "(Bounced Emails / Sent Emails) × 100",
      details: [
        "Hard Bounce: Invalid email address (remove immediately)",
        "Soft Bounce: Temporary issue (retry later)",
        "Keep below 2% to maintain sender reputation"
      ],
      example: "10 bounces from 1,000 sent = 1% bounce rate"
    },
    
    unsubscribeRate: {
      title: "Unsubscribe Rate",
      description: "Percentage who opted out of future emails",
      calculation: "(Unsubscribes / Delivered Emails) × 100",
      details: [
        "Industry Average: 0.1-0.5%",
        "High rates indicate content-audience mismatch",
        "Monitor after each campaign for trends"
      ],
      example: "5 unsubscribes from 1,000 delivered = 0.5%"
    }
  },
  
  // ==========================================
  // LEAD SCORING CALCULATION
  // ==========================================
  leadScoring: {
    overview: {
      title: "Lead Score",
      description: "Numerical score indicating likelihood to purchase",
      calculation: "Demographic Score + Behavioral Score + Engagement Score",
      details: [
        "Range: 0-100 points",
        "0-30: Cold Lead",
        "31-60: Warm Lead",
        "61-80: Qualified Lead",
        "81-100: Hot Lead (Sales Ready)"
      ]
    },
    
    demographicScore: {
      title: "Demographic Score (Max 30 points)",
      components: [
        "Job Title Match: +10 points for decision maker",
        "Company Size: +10 points for target company size",
        "Industry Match: +5 points for target industry",
        "Budget Authority: +5 points if has budget"
      ]
    },
    
    behavioralScore: {
      title: "Behavioral Score (Max 40 points)",
      components: [
        "Website Visits: +2 points per visit (max 10)",
        "Pricing Page View: +10 points",
        "Demo Request: +15 points",
        "Content Downloads: +3 points each (max 15)",
        "Webinar Attendance: +10 points"
      ]
    },
    
    engagementScore: {
      title: "Engagement Score (Max 30 points)",
      components: [
        "Email Opens: +1 point per open (max 10)",
        "Email Clicks: +2 points per click (max 10)",
        "Social Media Interaction: +5 points",
        "Direct Reply/Response: +5 points"
      ]
    }
  },
  
  // ==========================================
  // CUSTOMER HEALTH SCORE
  // ==========================================
  customerHealth: {
    overview: {
      title: "Customer Health Score",
      description: "Predicts customer retention and growth potential",
      calculation: "Usage Score + Engagement Score + Support Score + Payment Score",
      details: [
        "Green (80-100): Healthy, likely to renew/expand",
        "Yellow (50-79): Needs attention",
        "Red (0-49): At risk of churn"
      ]
    },
    
    components: {
      usage: {
        title: "Product Usage (40%)",
        factors: [
          "Login Frequency: Daily = 100%, Weekly = 70%, Monthly = 40%",
          "Feature Adoption: Using core features regularly",
          "Usage Trend: Increasing, stable, or declining"
        ]
      },
      
      engagement: {
        title: "Engagement (20%)",
        factors: [
          "Email interaction with company",
          "Support ticket resolution satisfaction",
          "Participation in webinars/training"
        ]
      },
      
      support: {
        title: "Support Health (20%)",
        factors: [
          "Number of tickets: Fewer is better",
          "Ticket resolution time",
          "Customer satisfaction ratings"
        ]
      },
      
      payment: {
        title: "Payment History (20%)",
        factors: [
          "On-time payments",
          "No failed payments",
          "Account upgrades vs downgrades"
        ]
      }
    }
  },
  
  // ==========================================
  // DEAL PROBABILITY STAGES
  // ==========================================
  dealStages: {
    discovery: {
      stage: "Discovery (10%)",
      description: "Initial contact and qualification",
      criteria: [
        "First meeting scheduled or completed",
        "Basic needs identified",
        "Budget range discussed"
      ]
    },
    
    qualification: {
      stage: "Qualification (20%)",
      description: "Determining if there's a fit",
      criteria: [
        "Decision makers identified",
        "Budget confirmed",
        "Timeline established",
        "Pain points documented"
      ]
    },
    
    proposal: {
      stage: "Proposal (40%)",
      description: "Solution presented and being reviewed",
      criteria: [
        "Formal proposal sent",
        "Demo completed",
        "Pricing discussed",
        "References provided"
      ]
    },
    
    negotiation: {
      stage: "Negotiation (70%)",
      description: "Working out final terms",
      criteria: [
        "Proposal accepted in principle",
        "Negotiating terms/pricing",
        "Legal review in progress",
        "Implementation timeline agreed"
      ]
    },
    
    closedWon: {
      stage: "Closed Won (100%)",
      description: "Deal successfully closed",
      criteria: [
        "Contract signed",
        "Payment received or scheduled",
        "Onboarding started"
      ]
    }
  },
  
  // ==========================================
  // ACTIVITY SCORING
  // ==========================================
  activityScoring: {
    email: {
      sent: { points: 1, description: "Email sent to contact" },
      opened: { points: 2, description: "Contact opened email" },
      clicked: { points: 5, description: "Contact clicked link" },
      replied: { points: 10, description: "Contact replied to email" }
    },
    
    meeting: {
      scheduled: { points: 15, description: "Meeting scheduled" },
      completed: { points: 20, description: "Meeting completed" },
      noShow: { points: -10, description: "Contact didn't show" }
    },
    
    website: {
      visit: { points: 3, description: "Visited website" },
      pricingPage: { points: 10, description: "Viewed pricing" },
      demoRequest: { points: 25, description: "Requested demo" },
      trialSignup: { points: 30, description: "Started free trial" }
    }
  }
}

// Helper component to display tooltips
export const HelpTooltip: React.FC<{
  content: any,
  icon?: boolean
}> = ({ content, icon = true }) => {
  return (
    <div className="inline-flex items-center group relative">
      {icon && <Info className="w-4 h-4 text-gray-400 cursor-help" />}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 px-5 py-4 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-80 shadow-xl border border-gray-700">
        <div className="font-semibold mb-3 text-white text-base">{content.title}</div>
        <div className="text-xs text-gray-200 leading-relaxed mb-2">{content.description}</div>
        {content.calculation && (
          <div className="text-xs mt-2 text-blue-300 font-mono bg-gray-800 px-2 py-1 rounded">
            Formula: {content.calculation}
          </div>
        )}
        {content.example && (
          <div className="text-xs mt-2 text-green-300 bg-gray-800 px-2 py-1 rounded">
            Example: {content.example}
          </div>
        )}
      </div>
    </div>
  )
}
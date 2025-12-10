// Smart Contact Segmentation System for Dummi & Co CRM

export interface ContactSegmentRule {
  id: string
  name: string
  description: string
  icon: string
  color: string
  conditions: SegmentCondition[]
  priority: number // Higher priority rules are checked first
}

export interface SegmentCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'days_since' | 'exists' | 'not_exists'
  value?: any
  value2?: any // For 'between' operator
}

// Predefined smart segments that automatically categorize contacts
export const smartSegments: ContactSegmentRule[] = [
  {
    id: 'hot_leads',
    name: 'Hot Leads 🔥',
    description: 'Highly engaged prospects ready to convert',
    icon: '🔥',
    color: 'red',
    priority: 10,
    conditions: [
      { field: 'lead_score', operator: 'greater_than', value: 80 },
      { field: 'last_activity', operator: 'days_since', value: 7 },
      { field: 'email_opens', operator: 'greater_than', value: 3 },
      { field: 'stage', operator: 'equals', value: 'qualified' }
    ]
  },
  {
    id: 'current_clients',
    name: 'Current Clients 💼',
    description: 'Active paying customers',
    icon: '💼',
    color: 'green',
    priority: 9,
    conditions: [
      { field: 'customer_status', operator: 'equals', value: 'active' },
      { field: 'subscription_status', operator: 'equals', value: 'active' }
    ]
  },
  {
    id: 'prospects',
    name: 'Prospects 🎯',
    description: 'Potential customers in the pipeline',
    icon: '🎯',
    color: 'blue',
    priority: 8,
    conditions: [
      { field: 'stage', operator: 'contains', value: ['discovery', 'proposal', 'negotiation'] },
      { field: 'customer_status', operator: 'not_exists' }
    ]
  },
  {
    id: 'churned_clients',
    name: 'Churned Clients 😔',
    description: 'Former customers who cancelled',
    icon: '😔',
    color: 'gray',
    priority: 7,
    conditions: [
      { field: 'customer_status', operator: 'equals', value: 'churned' },
      { field: 'churned_date', operator: 'exists' }
    ]
  },
  {
    id: 'new_signups',
    name: 'New Signups 🆕',
    description: 'Recently joined contacts (last 30 days)',
    icon: '🆕',
    color: 'purple',
    priority: 6,
    conditions: [
      { field: 'created_at', operator: 'days_since', value: 30 },
      { field: 'onboarding_completed', operator: 'not_exists' }
    ]
  },
  {
    id: 'vip_customers',
    name: 'VIP Customers ⭐',
    description: 'High-value customers with significant lifetime value',
    icon: '⭐',
    color: 'gold',
    priority: 11,
    conditions: [
      { field: 'lifetime_value', operator: 'greater_than', value: 10000 },
      { field: 'customer_status', operator: 'equals', value: 'active' }
    ]
  },
  {
    id: 'at_risk',
    name: 'At Risk ⚠️',
    description: 'Customers showing signs of churn',
    icon: '⚠️',
    color: 'orange',
    priority: 12,
    conditions: [
      { field: 'last_activity', operator: 'days_since', value: 30 },
      { field: 'support_tickets', operator: 'greater_than', value: 2 },
      { field: 'customer_status', operator: 'equals', value: 'active' }
    ]
  },
  {
    id: 'engaged_subscribers',
    name: 'Engaged Subscribers 📧',
    description: 'Contacts who regularly open and click emails',
    icon: '📧',
    color: 'teal',
    priority: 5,
    conditions: [
      { field: 'email_open_rate', operator: 'greater_than', value: 0.3 },
      { field: 'email_click_rate', operator: 'greater_than', value: 0.1 }
    ]
  },
  {
    id: 'cold_leads',
    name: 'Cold Leads ❄️',
    description: 'Contacts who need nurturing',
    icon: '❄️',
    color: 'cyan',
    priority: 3,
    conditions: [
      { field: 'lead_score', operator: 'less_than', value: 30 },
      { field: 'last_activity', operator: 'days_since', value: 60 }
    ]
  },
  {
    id: 'referral_sources',
    name: 'Referral Sources 🤝',
    description: 'Contacts who have referred others',
    icon: '🤝',
    color: 'indigo',
    priority: 4,
    conditions: [
      { field: 'referrals_made', operator: 'greater_than', value: 0 }
    ]
  }
]

// Function to evaluate if a contact matches a segment
export function evaluateSegment(contact: any, segment: ContactSegmentRule): boolean {
  return segment.conditions.every(condition => {
    const fieldValue = getNestedValue(contact, condition.field)
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value
      
      case 'contains':
        if (Array.isArray(condition.value)) {
          return condition.value.includes(fieldValue)
        }
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase())
      
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value)
      
      case 'less_than':
        return Number(fieldValue) < Number(condition.value)
      
      case 'between':
        const num = Number(fieldValue)
        return num >= Number(condition.value) && num <= Number(condition.value2)
      
      case 'days_since':
        if (!fieldValue) return false
        const daysDiff = Math.floor((Date.now() - new Date(fieldValue).getTime()) / (1000 * 60 * 60 * 24))
        return daysDiff <= Number(condition.value)
      
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
      
      case 'not_exists':
        return fieldValue === null || fieldValue === undefined || fieldValue === ''
      
      default:
        return false
    }
  })
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

// Function to segment contacts automatically
export function segmentContacts(contacts: any[]): Map<string, any[]> {
  const segmentMap = new Map<string, any[]>()
  
  // Initialize all segments
  smartSegments.forEach(segment => {
    segmentMap.set(segment.id, [])
  })
  
  // Add "all contacts" segment
  segmentMap.set('all', contacts)
  
  // Sort segments by priority (highest first)
  const sortedSegments = [...smartSegments].sort((a, b) => b.priority - a.priority)
  
  // Categorize each contact
  contacts.forEach(contact => {
    let assigned = false
    
    // Try to assign to the highest priority matching segment
    for (const segment of sortedSegments) {
      if (evaluateSegment(contact, segment)) {
        segmentMap.get(segment.id)?.push(contact)
        assigned = true
        break // Only assign to one primary segment
      }
    }
    
    // If no segment matched, add to uncategorized
    if (!assigned) {
      if (!segmentMap.has('uncategorized')) {
        segmentMap.set('uncategorized', [])
      }
      segmentMap.get('uncategorized')?.push(contact)
    }
  })
  
  return segmentMap
}

// Function to create dynamic SQL for segment
export function generateSegmentSQL(segment: ContactSegmentRule): string {
  const conditions = segment.conditions.map(condition => {
    switch (condition.operator) {
      case 'equals':
        return `${condition.field} = '${condition.value}'`
      case 'greater_than':
        return `${condition.field} > ${condition.value}`
      case 'less_than':
        return `${condition.field} < ${condition.value}`
      case 'between':
        return `${condition.field} BETWEEN ${condition.value} AND ${condition.value2}`
      case 'days_since':
        return `${condition.field} >= CURRENT_DATE - INTERVAL '${condition.value} days'`
      case 'exists':
        return `${condition.field} IS NOT NULL`
      case 'not_exists':
        return `${condition.field} IS NULL`
      default:
        return '1=1'
    }
  }).join(' AND ')
  
  return `SELECT * FROM contacts WHERE ${conditions}`
}

// Function to get segment statistics
export function getSegmentStats(contacts: any[]): Array<{segment: ContactSegmentRule, count: number, percentage: number}> {
  const segmentMap = segmentContacts(contacts)
  const total = contacts.length
  
  return smartSegments.map(segment => ({
    segment,
    count: segmentMap.get(segment.id)?.length || 0,
    percentage: total > 0 ? ((segmentMap.get(segment.id)?.length || 0) / total) * 100 : 0
  })).sort((a, b) => b.count - a.count)
}
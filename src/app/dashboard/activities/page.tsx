'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, Search, Filter, Phone, Mail, Calendar, Target, Users, CheckCircle, X } from 'lucide-react'
import PageHeader from '@/components/page-header'
import { createClient } from '@/lib/supabase/client'

// Get display label for activity type
const getActivityTypeLabel = (type: string) => {
  // Handle null/undefined/empty types
  if (!type || typeof type !== 'string') {
    console.warn('⚠️ [ACTIVITIES] Invalid type received:', type);
    return 'Activity';
  }
  
  const typeLabels: { [key: string]: string } = {
    // Core CRM Activities
    'call': 'Call',
    'email': 'Email',
    'meeting': 'Meeting',
    'follow_up': 'Follow-up',
    'presentation': 'Presentation',
    'demo': 'Demo',
    'negotiation': 'Negotiation',
    'site_visit': 'Site Visit',
    'consultation': 'Consultation',
    
    // Sales & Proposals
    'proposal': 'Proposal',
    'contract_review': 'Contract Review',
    'deal_review': 'Deal Review',
    'closing': 'Closing',
    'lead_qualification': 'Lead Qualification',
    
    // Financial Activities
    'invoice_sent': 'Invoice Sent',
    'payment_follow_up': 'Payment Follow-up',
    'payment_received': 'Payment Received',
    
    // Administrative
    'document_review': 'Document Review',
    'reporting': 'Reporting',
    'planning': 'Planning',
    'research': 'Research',
    'documentation': 'Documentation',
    
    // Generic types
    'task': 'Task',
    'deal': 'Deal',
    'contact': 'Contact',
    'activity': 'Activity',
    'event': 'Event',
    'other': 'Other'
  };
  return typeLabels[type] || type;
};

// Helper functions for data transformation
const getActionLabel = (type: string, title: string) => {
  const actionMap: { [key: string]: string } = {
    'call': 'Called',
    'email': 'Email sent',
    'meeting': 'Meeting with',
    'follow_up': 'Follow-up with',
    'presentation': 'Presentation to',
    'demo': 'Demo for',
    'negotiation': 'Negotiating with',
    'site_visit': 'Site visit to',
    'consultation': 'Consultation with',
    'proposal': 'Proposal sent to',
    'contract_review': 'Contract reviewed for',
    'invoice_sent': 'Invoice sent to',
    'payment_follow_up': 'Payment follow-up for',
    'payment_received': 'Payment received from',
    'document_review': 'Document review for',
    'reporting': 'Report generated for'
  };
  return actionMap[type] || `Activity: ${title}`;
};

const getActivityIcon = (type: string) => {
  const iconMap: { [key: string]: any } = {
    'call': Phone,
    'email': Mail,
    'meeting': Calendar,
    'follow_up': Target,
    'presentation': Target,
    'demo': Target,
    'negotiation': Target,
    'site_visit': Users,
    'consultation': Users,
    'proposal': Mail,
    'contract_review': CheckCircle,
    'invoice_sent': Mail,
    'payment_follow_up': Phone,
    'payment_received': CheckCircle,
    'document_review': CheckCircle,
    'reporting': Target
  };
  return iconMap[type] || Activity;
};

const getActivityColor = (type: string) => {
  const colorMap: { [key: string]: string } = {
    'call': 'bg-blue-100 text-blue-800',
    'email': 'bg-purple-100 text-purple-800',
    'meeting': 'bg-green-100 text-green-800',
    'follow_up': 'bg-yellow-100 text-yellow-800',
    'presentation': 'bg-indigo-100 text-indigo-800',
    'demo': 'bg-teal-100 text-teal-800',
    'negotiation': 'bg-red-100 text-red-800',
    'site_visit': 'bg-emerald-100 text-emerald-800',
    'consultation': 'bg-violet-100 text-violet-800',
    'proposal': 'bg-orange-100 text-orange-800',
    'contract_review': 'bg-slate-100 text-slate-800',
    'invoice_sent': 'bg-green-100 text-green-800',
    'payment_follow_up': 'bg-amber-100 text-amber-800',
    'payment_received': 'bg-emerald-100 text-emerald-800',
    'document_review': 'bg-gray-100 text-gray-800',
    'reporting': 'bg-cyan-100 text-cyan-800'
  };
  return colorMap[type] || 'bg-gray-100 text-gray-800';
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

// Sample comprehensive activity data
const sampleActivities = [
  {
    id: 1,
    type: 'call',
    action: 'Called',
    contact: 'John Smith at TechCorp Solutions',
    description: 'Discussed enterprise CRM implementation timeline and pricing',
    time: '2 hours ago',
    date: '2025-01-17',
    fullDate: '2025-01-17 14:30:00',
    user: 'Current User',
    icon: Phone,
    color: 'bg-green-100 text-green-800',
    priority: 'High'
  },
  {
    id: 2,
    type: 'deal',
    action: 'Deal created',
    contact: 'Enterprise Package with Digital Corp',
    description: 'New deal worth ฿275,000 created in Lead stage',
    time: '4 hours ago',
    date: '2025-01-17',
    fullDate: '2025-01-17 12:15:00',
    user: 'Current User',
    icon: Target,
    color: 'bg-blue-100 text-blue-800',
    priority: 'Medium'
  },
  {
    id: 3,
    type: 'email',
    action: 'Email sent',
    contact: 'Follow-up to Sarah Johnson',
    description: 'Sent project proposal and implementation timeline',
    time: '1 day ago',
    date: '2025-01-16',
    fullDate: '2025-01-16 16:45:00',
    user: 'Current User',
    icon: Mail,
    color: 'bg-purple-100 text-purple-800',
    priority: 'Medium'
  },
  {
    id: 4,
    type: 'meeting',
    action: 'Meeting scheduled',
    contact: 'Demo with Innovation Labs',
    description: 'Product demonstration scheduled for next week',
    time: '2 days ago',
    date: '2025-01-15',
    fullDate: '2025-01-15 10:20:00',
    user: 'Current User',
    icon: Calendar,
    color: 'bg-orange-100 text-orange-800',
    priority: 'High'
  },
  {
    id: 5,
    type: 'task',
    action: 'Task completed',
    contact: 'Follow up with TechCorp Solutions',
    description: 'Completed call and updated deal status to Qualified',
    time: '2 days ago',
    date: '2025-01-15',
    fullDate: '2025-01-15 09:30:00',
    user: 'Current User',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
    priority: 'High'
  },
  {
    id: 6,
    type: 'contact',
    action: 'New contact added',
    contact: 'Mike Chen at Innovation Labs',
    description: 'Added new contact with complete profile information',
    time: '3 days ago',
    date: '2025-01-14',
    fullDate: '2025-01-14 15:10:00',
    user: 'Current User',
    icon: Users,
    color: 'bg-teal-100 text-teal-800',
    priority: 'Low'
  },
  {
    id: 7,
    type: 'call',
    action: 'Called',
    contact: 'Alex Rodriguez at Global Enterprise',
    description: 'Initial discovery call to understand requirements',
    time: '3 days ago',
    date: '2025-01-14',
    fullDate: '2025-01-14 11:00:00',
    user: 'Current User',
    icon: Phone,
    color: 'bg-green-100 text-green-800',
    priority: 'Medium'
  },
  {
    id: 8,
    type: 'deal',
    action: 'Deal updated',
    contact: 'StartupX CRM Package',
    description: 'Deal moved from Lead to Qualified stage',
    time: '4 days ago',
    date: '2025-01-13',
    fullDate: '2025-01-13 14:20:00',
    user: 'Current User',
    icon: Target,
    color: 'bg-blue-100 text-blue-800',
    priority: 'Medium'
  },
  {
    id: 9,
    type: 'email',
    action: 'Email sent',
    contact: 'Proposal to Digital Dynamics',
    description: 'Sent detailed proposal with pricing and timeline',
    time: '5 days ago',
    date: '2025-01-12',
    fullDate: '2025-01-12 13:45:00',
    user: 'Current User',
    icon: Mail,
    color: 'bg-purple-100 text-purple-800',
    priority: 'High'
  },
  {
    id: 10,
    type: 'meeting',
    action: 'Meeting completed',
    contact: 'Team sync with Sales Manager',
    description: 'Weekly team sync to discuss pipeline and priorities',
    time: '1 week ago',
    date: '2025-01-10',
    fullDate: '2025-01-10 09:00:00',
    user: 'Current User',
    icon: Calendar,
    color: 'bg-orange-100 text-orange-800',
    priority: 'Low'
  }
]

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([])
  const [filteredActivities, setFilteredActivities] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [viewType, setViewType] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Load real activities from database
  const loadActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user found')
        setIsLoading(false)
        return
      }

      // Fetch activities from calendar_events table
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error loading activities:', error)
        // Fallback to sample data if real data fails
        setActivities(sampleActivities)
        setFilteredActivities(sampleActivities)
      } else {
        // Transform database data to match activities page format
        const transformedActivities = data?.map((item, index) => {
          console.log('🔍 [ACTIVITIES] Transforming item:', item.title, 'Type:', item.type);
          return {
            id: item.id,
            type: item.type,
            action: getActionLabel(item.type, item.title),
            contact: item.title,
            description: item.description || '',
            time: formatRelativeTime(item.created_at),
            date: item.date,
            fullDate: item.created_at,
            user: 'Current User',
            icon: getActivityIcon(item.type),
            color: getActivityColor(item.type),
            priority: item.priority || 'Medium'
          };
        }) || []

        console.log('🔍 [ACTIVITIES] Loaded activities count:', transformedActivities.length)
        console.log('🔍 [ACTIVITIES] Transformed activities:', transformedActivities)
        
        // FORCE DEBUG: Log each invoice record specifically
        transformedActivities.forEach(activity => {
          if (activity.contact?.includes('Invoice') || activity.type === 'invoice_sent') {
            console.error('🎯 INVOICE ACTIVITY FOUND:');
            console.error('   ID:', activity.id);
            console.error('   Contact:', activity.contact);
            console.error('   Type:', activity.type);
            console.error('   Badge will be:', getActivityTypeLabel(activity.type));
          }
        });
        
        setActivities(transformedActivities)
        setFilteredActivities(transformedActivities)
      }
    } catch (error) {
      console.error('Error in loadActivities:', error)
      // Fallback to sample data
      setActivities(sampleActivities)
      setFilteredActivities(sampleActivities)
    } finally {
      setIsLoading(false)
    }
  }

  // Load activities on component mount
  useEffect(() => {
    loadActivities()
  }, [])

  // Handle URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const view = urlParams.get('view')
    setViewType(view)
  }, [])

  // Filter activities based on search and filters
  useEffect(() => {
    let filtered = activities

    // Text search filter
    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.action.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Card filter (quick filter from clicking summary cards)
    if (selectedCard) {
      switch (selectedCard) {
        case 'calls':
          filtered = filtered.filter(activity => activity.type === 'call')
          break
        case 'meetings':
          filtered = filtered.filter(activity => activity.type === 'meeting')
          break
        case 'deals':
          filtered = filtered.filter(activity => activity.type === 'deal')
          break
        case 'emails':
          filtered = filtered.filter(activity => activity.type === 'email')
          break
        case 'tasks':
          filtered = filtered.filter(activity => activity.type === 'task')
          break
        case 'contacts':
          filtered = filtered.filter(activity => activity.type === 'contact')
          break
      }
    }

    // Type filter (from dropdown)
    if (filterType !== 'all' && !selectedCard) {
      filtered = filtered.filter(activity => activity.type === filterType)
    }

    // Date filter
    if (filterDate !== 'all') {
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0) // Start of today
      const filterDate7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const filterDate30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      filtered = filtered.filter(activity => {
        const activityDate = new Date(activity.fullDate)
        switch (filterDate) {
          case 'today':
            return activityDate >= startOfToday && activityDate <= today
          case 'week':
            return activityDate >= filterDate7Days && activityDate <= today
          case 'month':
            return activityDate >= filterDate30Days && activityDate <= today
          default:
            return true
        }
      })
    }

    setFilteredActivities(filtered)
  }, [searchTerm, filterType, filterDate, activities, selectedCard])

  const getActivityStats = () => {
    // Use current filtered activities for stats calculation
    const baseActivities = filteredActivities
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    return {
      total: baseActivities.length,
      today: baseActivities.filter(a => {
        const activityDate = new Date(a.fullDate)
        return activityDate >= startOfToday && activityDate <= today
      }).length,
      thisWeek: baseActivities.filter(a => {
        const activityDate = new Date(a.fullDate)
        return activityDate >= thisWeek && activityDate <= today
      }).length,
      thisMonth: baseActivities.filter(a => {
        const activityDate = new Date(a.fullDate)
        return activityDate >= thisMonth && activityDate <= today
      }).length,
      calls: baseActivities.filter(a => a.type === 'call').length,
      meetings: baseActivities.filter(a => a.type === 'meeting').length,
      deals: baseActivities.filter(a => a.type === 'deal').length,
      emails: baseActivities.filter(a => a.type === 'email').length
    }
  }

  const stats = getActivityStats()

  // Handle card click for quick filtering
  const handleCardClick = (cardType: string) => {
    if (selectedCard === cardType) {
      // If already selected, deselect
      setSelectedCard(null)
      setFilterType('all')
    } else {
      // Select new card filter
      setSelectedCard(cardType)
      setFilterType('all') // Reset dropdown filter
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedCard(null)
    setFilterType('all')
    setFilterDate('all')
    setSearchTerm('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getPageTitle = () => {
    if (viewType === 'performance') {
      return 'Performance Summary'
    }
    return 'Activity Log'
  }

  const getPageDescription = () => {
    if (viewType === 'performance') {
      return 'Conversion rate analysis and performance metrics'
    }
    return 'Complete history of all activities, calls, meetings, and interactions'
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <PageHeader 
            title={getPageTitle()} 
            description={getPageDescription()}
            showBackButton={true}
          />
        </div>
        <Button 
          onClick={loadActivities}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
      
      <div className="space-y-6">
        {/* Activity Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-600">Total Activities</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
                <div className="text-xs text-gray-600">Today</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.thisWeek}</div>
                <div className="text-xs text-gray-600">This Week</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.thisMonth}</div>
                <div className="text-xs text-gray-600">This Month</div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedCard === 'calls' 
                ? 'ring-2 ring-green-500 ring-opacity-50 bg-green-50 border-green-200' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => handleCardClick('calls')}
          >
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.calls}</div>
                <div className="text-xs text-gray-600">Calls</div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedCard === 'meetings' 
                ? 'ring-2 ring-orange-500 ring-opacity-50 bg-orange-50 border-orange-200' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => handleCardClick('meetings')}
          >
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.meetings}</div>
                <div className="text-xs text-gray-600">Meetings</div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedCard === 'deals' 
                ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50 border-blue-200' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => handleCardClick('deals')}
          >
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.deals}</div>
                <div className="text-xs text-gray-600">Deals</div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedCard === 'emails' 
                ? 'ring-2 ring-purple-500 ring-opacity-50 bg-purple-50 border-purple-200' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => handleCardClick('emails')}
          >
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.emails}</div>
                <div className="text-xs text-gray-600">Emails</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Filters Display */}
        {(selectedCard || filterType !== 'all' || filterDate !== 'all' || searchTerm) && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Active Filters:</span>
            {selectedCard && (
              <Badge 
                variant="secondary" 
                className="flex items-center space-x-1 bg-blue-100 text-blue-800 border-blue-200"
              >
                <span>Activity Type: {selectedCard.charAt(0).toUpperCase() + selectedCard.slice(1)}</span>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filterType !== 'all' && !selectedCard && (
              <Badge 
                variant="secondary" 
                className="flex items-center space-x-1 bg-green-100 text-green-800 border-green-200"
              >
                <span>Type: {filterType.charAt(0).toUpperCase() + filterType.slice(1)}</span>
                <button
                  onClick={() => setFilterType('all')}
                  className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filterDate !== 'all' && (
              <Badge 
                variant="secondary" 
                className="flex items-center space-x-1 bg-purple-100 text-purple-800 border-purple-200"
              >
                <span>Date: {filterDate === 'today' ? 'Today' : filterDate === 'week' ? 'This Week' : 'This Month'}</span>
                <button
                  onClick={() => setFilterDate('all')}
                  className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {searchTerm && (
              <Badge 
                variant="secondary" 
                className="flex items-center space-x-1 bg-orange-100 text-orange-800 border-orange-200"
              >
                <span>Search: "{searchTerm}"</span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1 hover:bg-orange-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-gray-600 hover:text-gray-800"
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-teal-600" />
              <span>Filter Activities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Activity Type {selectedCard && <span className="text-xs text-blue-600">(Filtered by card selection)</span>}
                </label>
                <Select 
                  value={selectedCard ? selectedCard : filterType} 
                  onValueChange={(value) => {
                    if (!selectedCard) {
                      setFilterType(value)
                    }
                  }}
                  disabled={!!selectedCard}
                >
                  <SelectTrigger className={selectedCard ? 'opacity-50 cursor-not-allowed' : ''}>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="call">Calls</SelectItem>
                    <SelectItem value="meeting">Meetings</SelectItem>
                    <SelectItem value="email">Emails</SelectItem>
                    <SelectItem value="deal">Deals</SelectItem>
                    <SelectItem value="task">Tasks</SelectItem>
                    <SelectItem value="contact">Contacts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
                <Select value={filterDate} onValueChange={setFilterDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-teal-600" />
              <span>Activity History ({filteredActivities.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading activities...</p>
                  </div>
                </div>
              ) : filteredActivities.length > 0 ? (
                filteredActivities.map((activity) => {
                  const Icon = activity.icon
                  // Enhanced debugging for Activities page badge issue
                  console.log('🔍 [ACTIVITIES] Activity:', activity.contact || activity.title);
                  console.log('🔍 [ACTIVITIES] Raw Type:', activity.type);
                  console.log('🔍 [ACTIVITIES] getActivityTypeLabel result:', getActivityTypeLabel(activity.type));
                  console.log('🔍 [ACTIVITIES] ---');
                  return (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                            <Badge variant="outline" className="text-xs">
                              {(() => {
                                const result = getActivityTypeLabel(activity.type);
                                // SUPER DEBUG for the exact badge issue
                                if (activity.contact?.includes('Invoice') || activity.type === 'invoice_sent') {
                                  console.error('🚨 BADGE DEBUG - Invoice Record:');
                                  console.error('   Title:', activity.contact);
                                  console.error('   Raw Type:', activity.type);
                                  console.error('   Type typeof:', typeof activity.type);
                                  console.error('   Type length:', activity.type?.length);
                                  console.error('   Badge result:', result);
                                  console.error('   Expected: "Invoice Sent"');
                                  console.error('   Match?:', result === 'Invoice Sent');
                                }
                                return result;
                              })()}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${
                              activity.priority === 'High' ? 'border-red-200 text-red-700' : 
                              activity.priority === 'Medium' ? 'border-yellow-200 text-yellow-700' : 
                              'border-green-200 text-green-700'
                            }`}>
                              {activity.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{formatDate(activity.fullDate)}</span>
                            <span>•</span>
                            <span>{formatTime(activity.fullDate)}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm font-medium text-gray-900 mb-1">{activity.contact}</p>
                        <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">by {activity.user}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
                  <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
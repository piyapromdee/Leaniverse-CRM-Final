'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, Users, BarChart3, Download, MinusCircle, Briefcase, UserPlus, CheckCircle, XCircle, Building2, Target, PieChart, ArrowUpRight, ArrowDownRight, Award, Percent } from 'lucide-react'
import { isUserSuperAdmin } from '@/lib/roles'
import Link from 'next/link'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'

interface SalesMetrics {
  totalLeads: number
  totalContacts: number
  totalDeals: number
  wonDeals: number
  lostDeals: number
  totalRevenue: number
  conversionRate: number
}

interface Transaction {
  id: string
  amount: number
  status: string
  created_at: string
  customer_email?: string
  product_name?: string
}

interface MonthlyRevenue {
  month: string
  revenue: number
  deals: number
}

interface CategoryRevenue {
  category: string
  revenue: number
  deals: number
  color: string
}

interface SalesRepPerformance {
  id: string
  name: string
  email: string
  dealsWon: number
  revenue: number
  commission: number
}

// Category colors for the pie chart
const CATEGORY_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-yellow-500',
]

export default function FinancialDashboard() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Date range picker state - default to this year
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date()
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: now
    }
  })

  // Real data from database
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    totalLeads: 0,
    totalContacts: 0,
    totalDeals: 0,
    wonDeals: 0,
    lostDeals: 0,
    totalRevenue: 0,
    conversionRate: 0
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionStats, setTransactionStats] = useState({
    total: 0,
    successful: 0,
    pending: 0,
    successRate: 0
  })
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [cogsExpenses, setCogsExpenses] = useState(0)
  const [expensesByCategory, setExpensesByCategory] = useState<{category: string; amount: number; color: string}[]>([])
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<MonthlyRevenue[]>([])
  const [categoryRevenueData, setCategoryRevenueData] = useState<CategoryRevenue[]>([])
  const [topSalesReps, setTopSalesReps] = useState<SalesRepPerformance[]>([])
  const commissionRate = 10 // 10% commission rate

  const router = useRouter()
  const supabase = createClient()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `฿${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `฿${(amount / 1000).toFixed(0)}K`
    }
    return formatCurrency(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Calculate Gross Margin
  const grossMargin = useMemo(() => {
    if (salesMetrics.totalRevenue === 0) return 0
    const grossProfit = salesMetrics.totalRevenue - cogsExpenses
    return (grossProfit / salesMetrics.totalRevenue) * 100
  }, [salesMetrics.totalRevenue, cogsExpenses])

  // Calculate Net Profit
  const netProfit = useMemo(() => {
    return salesMetrics.totalRevenue - totalExpenses
  }, [salesMetrics.totalRevenue, totalExpenses])

  // Calculate Net Revenue After Commission
  const totalCommission = useMemo(() => {
    return (salesMetrics.totalRevenue * commissionRate) / 100
  }, [salesMetrics.totalRevenue, commissionRate])

  const netRevenueAfterCommission = useMemo(() => {
    return salesMetrics.totalRevenue - totalCommission
  }, [salesMetrics.totalRevenue, totalCommission])

  useEffect(() => {
    const checkOwnerAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/sign-in')
          return
        }

        // Get user email first - Super Admin check by email takes priority
        const userEmail = user.email || ''

        // Check if Super Admin by email FIRST (before database query)
        const isSuperAdminByEmail = isUserSuperAdmin(userEmail, undefined)
        if (isSuperAdminByEmail) {
          console.log('Super Admin access granted by email:', userEmail)
          setUserRole('owner')
          setIsLoading(false)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, email')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          // If Super Admin email but no profile, still allow access
          if (isSuperAdminByEmail) {
            setUserRole('owner')
            setIsLoading(false)
            return
          }
          router.push('/dashboard')
          return
        }

        const email = profile?.email || userEmail

        // Allow access for owner role OR Super Admin by email OR admin role
        const isSuperAdmin = isUserSuperAdmin(email, profile?.role)
        const isAdmin = profile?.role === 'admin'
        if (profile?.role !== 'owner' && !isSuperAdmin && !isAdmin) {
          router.push('/dashboard') // Redirect non-authorized users to sales dashboard
          return
        }

        setUserRole(profile?.role || 'owner')
        setIsLoading(false)
      } catch (error) {
        console.error('Error checking role:', error)
        router.push('/dashboard')
      }
    }

    checkOwnerAccess()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch data when dateRange changes
  useEffect(() => {
    if (!userRole) return // Wait for auth check to complete

    const fetchAllData = async () => {
      await Promise.all([
        fetchSalesMetrics(),
        fetchTransactions(),
        fetchExpenses(),
        fetchMonthlyRevenue(),
        fetchCategoryRevenue(),
        fetchTopSalesReps()
      ])
    }

    fetchAllData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, userRole])

  const fetchSalesMetrics = async () => {
    try {
      // Build date filter for queries
      const fromDate = dateRange?.from?.toISOString().split('T')[0]
      const toDate = dateRange?.to?.toISOString().split('T')[0]

      // Fetch leads count with date filter
      let leadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true })
      if (fromDate) leadsQuery = leadsQuery.gte('created_at', fromDate)
      if (toDate) leadsQuery = leadsQuery.lte('created_at', toDate + 'T23:59:59')
      const { count: leadsCount } = await leadsQuery

      // Fetch contacts count with date filter
      let contactsQuery = supabase.from('contacts').select('*', { count: 'exact', head: true })
      if (fromDate) contactsQuery = contactsQuery.gte('created_at', fromDate)
      if (toDate) contactsQuery = contactsQuery.lte('created_at', toDate + 'T23:59:59')
      const { count: contactsCount } = await contactsQuery

      // Fetch deals with stage info and date filter (using closed_date for won deals, created_at for others)
      let dealsQuery = supabase.from('deals').select('id, stage, value, closed_date, created_at')
      if (fromDate) dealsQuery = dealsQuery.gte('created_at', fromDate)
      if (toDate) dealsQuery = dealsQuery.lte('created_at', toDate + 'T23:59:59')
      const { data: deals } = await dealsQuery

      const wonDeals = deals?.filter(d => d.stage === 'won') || []
      const lostDeals = deals?.filter(d => d.stage === 'lost') || []
      const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)
      const totalDeals = deals?.length || 0
      const conversionRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0

      setSalesMetrics({
        totalLeads: leadsCount || 0,
        totalContacts: contactsCount || 0,
        totalDeals: totalDeals,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
        totalRevenue,
        conversionRate
      })
    } catch (error) {
      console.error('Error fetching sales metrics:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      // Build date filter for transactions
      const fromDate = dateRange?.from?.toISOString().split('T')[0]
      const toDate = dateRange?.to?.toISOString().split('T')[0]

      let txnQuery = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (fromDate) txnQuery = txnQuery.gte('created_at', fromDate)
      if (toDate) txnQuery = txnQuery.lte('created_at', toDate + 'T23:59:59')

      const { data: txns, count } = await txnQuery.limit(10)

      if (txns) {
        setTransactions(txns)
        const successful = txns.filter(t => t.status === 'succeeded' || t.status === 'completed').length
        const pending = txns.filter(t => t.status === 'pending').length
        setTransactionStats({
          total: count || txns.length,
          successful,
          pending,
          successRate: txns.length > 0 ? (successful / txns.length) * 100 : 0
        })
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const fetchExpenses = async () => {
    try {
      // Build date filter for expenses
      const fromDate = dateRange?.from?.toISOString().split('T')[0]
      const toDate = dateRange?.to?.toISOString().split('T')[0]

      let expenseQuery = supabase.from('expenses').select('amount, category, date')
      if (fromDate) expenseQuery = expenseQuery.gte('date', fromDate)
      if (toDate) expenseQuery = expenseQuery.lte('date', toDate)

      const { data: expenses } = await expenseQuery

      if (expenses && expenses.length > 0) {
        const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
        const cogs = expenses
          .filter(exp => exp.category === 'inventory')
          .reduce((sum, exp) => sum + (exp.amount || 0), 0)

        setTotalExpenses(total)
        setCogsExpenses(cogs)

        // Group expenses by category for pie chart
        const categoryMap: { [key: string]: number } = {}
        expenses.forEach(exp => {
          const cat = exp.category || 'other'
          categoryMap[cat] = (categoryMap[cat] || 0) + (exp.amount || 0)
        })

        // Expense category colors
        const expenseCategoryColors: { [key: string]: string } = {
          'marketing': 'bg-pink-500',
          'software': 'bg-blue-500',
          'office': 'bg-yellow-500',
          'travel': 'bg-purple-500',
          'professional': 'bg-indigo-500',
          'utilities': 'bg-green-500',
          'rent': 'bg-orange-500',
          'training': 'bg-teal-500',
          'inventory': 'bg-red-500',
          'other': 'bg-gray-500',
        }

        const categoryData = Object.entries(categoryMap)
          .map(([category, amount]) => ({
            category: category.charAt(0).toUpperCase() + category.slice(1),
            amount,
            color: expenseCategoryColors[category] || 'bg-gray-500'
          }))
          .sort((a, b) => b.amount - a.amount)

        setExpensesByCategory(categoryData)
      } else {
        setTotalExpenses(0)
        setCogsExpenses(0)
        setExpensesByCategory([])
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
      // Table may not exist yet
      setTotalExpenses(0)
      setCogsExpenses(0)
      setExpensesByCategory([])
    }
  }

  const fetchMonthlyRevenue = async () => {
    try {
      // Build date filter for monthly revenue
      const fromDate = dateRange?.from?.toISOString().split('T')[0]
      const toDate = dateRange?.to?.toISOString().split('T')[0]

      let dealsQuery = supabase
        .from('deals')
        .select('value, closed_date, stage')
        .eq('stage', 'won')
        .order('closed_date', { ascending: true })

      if (fromDate) dealsQuery = dealsQuery.gte('closed_date', fromDate)
      if (toDate) dealsQuery = dealsQuery.lte('closed_date', toDate)

      const { data: deals } = await dealsQuery

      if (deals && deals.length > 0) {
        // Group by month
        const monthlyData: { [key: string]: { revenue: number; deals: number } } = {}

        deals.forEach(deal => {
          if (deal.closed_date) {
            const date = new Date(deal.closed_date)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = { revenue: 0, deals: 0 }
            }
            monthlyData[monthKey].revenue += deal.value || 0
            monthlyData[monthKey].deals += 1
          }
        })

        // Convert to array and format
        const formattedData = Object.entries(monthlyData)
          .map(([month, data]) => ({
            month: new Date(month + '-01').toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
            revenue: data.revenue,
            deals: data.deals
          }))
          .slice(-12) // Last 12 months

        setMonthlyRevenueData(formattedData)
      } else {
        setMonthlyRevenueData([])
      }
    } catch (error) {
      console.error('Error fetching monthly revenue:', error)
    }
  }

  const fetchCategoryRevenue = async () => {
    try {
      // Build date filter for category revenue
      const fromDate = dateRange?.from?.toISOString().split('T')[0]
      const toDate = dateRange?.to?.toISOString().split('T')[0]

      // Using 'channel' field as the category since deals don't have a 'category' field
      let dealsQuery = supabase
        .from('deals')
        .select('value, stage, channel, closed_date')
        .eq('stage', 'won')

      if (fromDate) dealsQuery = dealsQuery.gte('closed_date', fromDate)
      if (toDate) dealsQuery = dealsQuery.lte('closed_date', toDate)

      const { data: deals } = await dealsQuery

      if (deals && deals.length > 0) {
        // Group by channel (used as category)
        const categoryData: { [key: string]: { revenue: number; deals: number } } = {}

        deals.forEach(deal => {
          // Normalize channel name for display
          const rawChannel = deal.channel || 'Other'
          const category = rawChannel.charAt(0).toUpperCase() + rawChannel.slice(1).toLowerCase()
          if (!categoryData[category]) {
            categoryData[category] = { revenue: 0, deals: 0 }
          }
          categoryData[category].revenue += deal.value || 0
          categoryData[category].deals += 1
        })

        // Convert to array with colors
        const formattedData: CategoryRevenue[] = Object.entries(categoryData)
          .map(([category, data], index) => ({
            category,
            revenue: data.revenue,
            deals: data.deals,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 6) // Top 6 categories

        setCategoryRevenueData(formattedData)
      } else {
        setCategoryRevenueData([])
      }
    } catch (error) {
      console.error('Error fetching category revenue:', error)
    }
  }

  const fetchTopSalesReps = async () => {
    try {
      // Build date filter for top sales reps
      const fromDate = dateRange?.from?.toISOString().split('T')[0]
      const toDate = dateRange?.to?.toISOString().split('T')[0]

      // Fetch won deals with assigned_to (sales rep who closed the deal)
      let dealsQuery = supabase
        .from('deals')
        .select('value, assigned_to, stage, closed_date')
        .eq('stage', 'won')

      if (fromDate) dealsQuery = dealsQuery.gte('closed_date', fromDate)
      if (toDate) dealsQuery = dealsQuery.lte('closed_date', toDate)

      const { data: deals } = await dealsQuery

      if (deals && deals.length > 0) {
        // Group by assigned_to (sales rep)
        const salesRepData: { [key: string]: { revenue: number; deals: number } } = {}

        deals.forEach(deal => {
          const salesRepId = deal.assigned_to || 'unknown'
          if (!salesRepData[salesRepId]) {
            salesRepData[salesRepId] = { revenue: 0, deals: 0 }
          }
          salesRepData[salesRepId].revenue += deal.value || 0
          salesRepData[salesRepId].deals += 1
        })

        // Get unique sales rep IDs
        const salesRepIds = Object.keys(salesRepData).filter(id => id !== 'unknown')

        // Fetch profiles for these sales reps (using first_name and last_name)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', salesRepIds)

        // Create performance data
        const performanceData: SalesRepPerformance[] = salesRepIds.map((repId: string) => {
          const profile = profiles?.find(p => p.id === repId)
          const data = salesRepData[repId]
          // Construct full name from first_name and last_name
          const fullName = profile
            ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown'
            : 'Unknown'
          return {
            id: repId,
            name: fullName,
            email: profile?.email || '',
            dealsWon: data.deals,
            revenue: data.revenue,
            commission: (data.revenue * commissionRate) / 100
          }
        })
          .sort((a: SalesRepPerformance, b: SalesRepPerformance) => b.revenue - a.revenue)
          .slice(0, 5) // Top 5

        setTopSalesReps(performanceData)
      } else {
        setTopSalesReps([])
      }
    } catch (error) {
      console.error('Error fetching top sales reps:', error)
    }
  }

  const handleExportCSV = () => {
    // Generate CSV data from real metrics
    const dateRangeStr = dateRange?.from && dateRange?.to
      ? `${dateRange.from.toISOString().split('T')[0]}_to_${dateRange.to.toISOString().split('T')[0]}`
      : 'all-time'

    const csvData = [
      ['Metric', 'Value'],
      ['Total Revenue', formatCurrency(salesMetrics.totalRevenue)],
      ['Total Expenses', formatCurrency(totalExpenses)],
      ['Net Profit', formatCurrency(netProfit)],
      ['Net Revenue After Commission', formatCurrency(netRevenueAfterCommission)],
      ['Gross Margin', `${grossMargin.toFixed(1)}%`],
      ['Won Deals', salesMetrics.wonDeals.toString()],
      ['Lost Deals', salesMetrics.lostDeals.toString()],
      ['Total Deals', salesMetrics.totalDeals.toString()],
      ['Conversion Rate', `${salesMetrics.conversionRate.toFixed(1)}%`],
      ['Total Leads', salesMetrics.totalLeads.toString()],
      ['Total Contacts', salesMetrics.totalContacts.toString()],
      ['Total Transactions', transactionStats.total.toString()],
      ['Successful Transactions', transactionStats.successful.toString()],
      ['Pending Transactions', transactionStats.pending.toString()],
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = `financial-dashboard-${dateRangeStr}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Get max revenue for chart scaling
  const maxRevenue = useMemo(() => {
    if (monthlyRevenueData.length === 0) return 100000
    return Math.max(...monthlyRevenueData.map(d => d.revenue)) * 1.1
  }, [monthlyRevenueData])

  // Calculate total category revenue for percentage
  const totalCategoryRevenue = useMemo(() => {
    return categoryRevenueData.reduce((sum, cat) => sum + cat.revenue, 0)
  }, [categoryRevenueData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  if (!userRole) {
    return null
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:px-12 lg:py-8 min-h-screen">
      {/* Header with Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Owner Financial Dashboard</h1>
          <p className="text-gray-600">Strategic overview of your business performance and financial health</p>
        </div>

        {/* Control Panel with Date Range Picker */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <DateRangePicker
            date={dateRange}
            onDateChange={setDateRange}
          />

          <Link href="/dashboard/expenses">
            <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
              <MinusCircle className="w-4 h-4 mr-2" />
              Manage Expenses
            </Button>
          </Link>

          <Button onClick={handleExportCSV} variant="outline" className="border-teal-500 text-teal-600 hover:bg-teal-50">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Financial KPI Cards - Responsive 4-column grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-green-700 uppercase tracking-wide">Revenue</span>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-lg md:text-xl font-bold text-green-900 truncate">{formatCurrency(salesMetrics.totalRevenue)}</div>
            <p className="text-xs text-green-600 mt-0.5">{salesMetrics.wonDeals} won deals</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-red-700 uppercase tracking-wide">Expenses</span>
              <MinusCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-lg md:text-xl font-bold text-red-900 truncate">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-red-600 mt-0.5">Total costs</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br shadow-sm ${netProfit >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-rose-50 to-rose-100 border-rose-200'}`}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium uppercase tracking-wide ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Net Profit</span>
              {netProfit >= 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-rose-600" />}
            </div>
            <div className={`text-lg md:text-xl font-bold truncate ${netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>{formatCurrency(netProfit)}</div>
            <p className={`text-xs mt-0.5 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{netProfit >= 0 ? 'Profitable' : 'Loss'}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-cyan-700 uppercase tracking-wide">After Commission</span>
              <Percent className="h-4 w-4 text-cyan-600" />
            </div>
            <div className="text-lg md:text-xl font-bold text-cyan-900 truncate">{formatCurrency(netRevenueAfterCommission)}</div>
            <p className="text-xs text-cyan-600 mt-0.5">{commissionRate}% commission</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">Gross Margin</span>
              <PieChart className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-lg md:text-xl font-bold text-purple-900">{grossMargin.toFixed(1)}%</div>
            <p className="text-xs text-purple-600 mt-0.5">After COGS</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Conversion</span>
              <Target className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-lg md:text-xl font-bold text-amber-900">{salesMetrics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-amber-600 mt-0.5">Deal win rate</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Total Deals</span>
              <Briefcase className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-lg md:text-xl font-bold text-indigo-900">{salesMetrics.totalDeals}</div>
            <p className="text-xs text-indigo-600 mt-0.5">{salesMetrics.wonDeals} won / {salesMetrics.lostDeals} lost</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-pink-700 uppercase tracking-wide">Commission</span>
              <Award className="h-4 w-4 text-pink-600" />
            </div>
            <div className="text-lg md:text-xl font-bold text-pink-900 truncate">{formatCurrency(totalCommission)}</div>
            <p className="text-xs text-pink-600 mt-0.5">{commissionRate}% of revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Over Time Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-teal-600" />
                Revenue Over Time
              </CardTitle>
              <CardDescription>Monthly revenue from won deals</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {monthlyRevenueData.length > 0 ? (
            <div className="space-y-4">
              {/* Simple Bar Chart - Fixed height container with proper bar scaling */}
              <div className="relative h-48 pt-4">
                <div className="absolute inset-0 flex items-end justify-between gap-2 px-1">
                  {monthlyRevenueData.map((data, index) => {
                    // Calculate bar height as pixels based on container height (h-48 = 192px, minus padding)
                    const containerHeight = 160 // Approximate usable height in pixels
                    const barHeight = maxRevenue > 0
                      ? Math.max((data.revenue / maxRevenue) * containerHeight, 8)
                      : 8

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div className="text-xs font-medium text-gray-700 hidden md:block mb-1">
                          {formatCompactCurrency(data.revenue)}
                        </div>
                        <div
                          className="w-full bg-gradient-to-t from-teal-500 to-teal-400 rounded-t-md transition-all duration-500 hover:from-teal-600 hover:to-teal-500 cursor-pointer relative group"
                          style={{ height: `${barHeight}px` }}
                        >
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {formatCurrency(data.revenue)}
                            <br />
                            {data.deals} deals
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate w-full text-center">{data.month}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(monthlyRevenueData.reduce((sum, d) => sum + d.revenue, 0))}
                  </div>
                  <div className="text-xs text-gray-500">Total Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {monthlyRevenueData.reduce((sum, d) => sum + d.deals, 0)}
                  </div>
                  <div className="text-xs text-gray-500">Total Deals</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(monthlyRevenueData.reduce((sum, d) => sum + d.revenue, 0) / Math.max(monthlyRevenueData.length, 1))}
                  </div>
                  <div className="text-xs text-gray-500">Avg Monthly</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No revenue data available</p>
              <p className="text-sm">Start closing deals to see revenue trends</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue by Category & Top Sales Reps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Channel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-teal-600" />
              <span>Revenue by Channel</span>
            </CardTitle>
            <CardDescription>Distribution of revenue across sales channels</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryRevenueData.length > 0 ? (
              <div className="space-y-4">
                {/* Visual Bar representation */}
                <div className="h-4 rounded-full overflow-hidden flex bg-gray-200">
                  {categoryRevenueData.map((cat) => (
                    <div
                      key={cat.category}
                      className={`${cat.color} transition-all duration-500`}
                      style={{ width: `${(cat.revenue / totalCategoryRevenue) * 100}%` }}
                      title={`${cat.category}: ${formatCurrency(cat.revenue)}`}
                    />
                  ))}
                </div>

                {/* Legend */}
                <div className="space-y-2 mt-4">
                  {categoryRevenueData.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                        <span className="font-medium text-gray-700">{cat.category}</span>
                        <span className="text-xs text-gray-500">({cat.deals} deals)</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{formatCurrency(cat.revenue)}</div>
                        <div className="text-xs text-gray-500">{((cat.revenue / totalCategoryRevenue) * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <PieChart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No channel data</p>
                <p className="text-sm">Close deals with assigned channels to see data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Sales Representatives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-teal-600" />
              <span>Top 5 Sales Representatives</span>
            </CardTitle>
            <CardDescription>Ranked by total revenue generated</CardDescription>
          </CardHeader>
          <CardContent>
            {topSalesReps.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-2 font-medium text-gray-700 text-sm">Rank</th>
                      <th className="text-left p-2 font-medium text-gray-700 text-sm">Name</th>
                      <th className="text-right p-2 font-medium text-gray-700 text-sm">Deals</th>
                      <th className="text-right p-2 font-medium text-gray-700 text-sm">Revenue</th>
                      <th className="text-right p-2 font-medium text-gray-700 text-sm">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSalesReps.map((rep, index) => (
                      <tr key={rep.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="font-medium text-gray-900">{rep.name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[150px]">{rep.email}</div>
                        </td>
                        <td className="p-2 text-right font-medium text-gray-700">{rep.dealsWon}</td>
                        <td className="p-2 text-right font-bold text-green-600">{formatCompactCurrency(rep.revenue)}</td>
                        <td className="p-2 text-right font-medium text-pink-600">{formatCompactCurrency(rep.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Award className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No sales data yet</p>
                <p className="text-sm">Assign owners to deals to track performance</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown by Category */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MinusCircle className="h-5 w-5 text-red-600" />
                Expense Breakdown by Category
              </CardTitle>
              <CardDescription>Distribution of expenses across categories</CardDescription>
            </div>
            <Link href="/dashboard/expenses">
              <Button variant="outline" size="sm" className="text-orange-600 border-orange-300 hover:bg-orange-50">
                Manage Expenses
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {expensesByCategory.length > 0 ? (
            <div className="space-y-4">
              {/* Visual Bar representation */}
              <div className="h-6 rounded-full overflow-hidden flex bg-gray-200">
                {expensesByCategory.map((cat) => (
                  <div
                    key={cat.category}
                    className={`${cat.color} transition-all duration-500`}
                    style={{ width: `${(cat.amount / totalExpenses) * 100}%` }}
                    title={`${cat.category}: ${formatCurrency(cat.amount)}`}
                  />
                ))}
              </div>

              {/* Legend with amounts */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                {expensesByCategory.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                      <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{formatCurrency(cat.amount)}</div>
                      <div className="text-xs text-gray-500">{((cat.amount / totalExpenses) * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="flex justify-between items-center pt-4 border-t mt-4">
                <div className="text-gray-600">Total Expenses</div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <MinusCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No expense data available</p>
              <p className="text-sm mb-4">Add expenses to see the breakdown</p>
              <Link href="/dashboard/expenses">
                <Button className="bg-orange-500 hover:bg-orange-600">
                  Add First Expense
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Results Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-teal-600" />
              <span>Sales Overview</span>
            </CardTitle>
            <CardDescription>High-level sales results summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <UserPlus className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Total Leads</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{salesMetrics.totalLeads}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5 text-indigo-500" />
                  <span className="font-medium">Total Contacts</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{salesMetrics.totalContacts}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Briefcase className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Total Deals</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{salesMetrics.totalDeals}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deals Won/Lost */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-teal-600" />
              <span>Deal Results</span>
            </CardTitle>
            <CardDescription>Won vs Lost deals breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <span className="font-medium text-green-800">Deals Won</span>
                    <p className="text-sm text-green-600">Successfully closed</p>
                  </div>
                </div>
                <span className="text-3xl font-bold text-green-700">{salesMetrics.wonDeals}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-3">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <span className="font-medium text-red-800">Deals Lost</span>
                    <p className="text-sm text-red-600">Did not close</p>
                  </div>
                </div>
                <span className="text-3xl font-bold text-red-700">{salesMetrics.lostDeals}</span>
              </div>

              {/* Win Rate Visual */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Win Rate</span>
                  <span className="font-medium">{salesMetrics.conversionRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(salesMetrics.conversionRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-teal-600" />
            <span>Recent Transactions</span>
          </CardTitle>
          <CardDescription>Latest transaction records from the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {transactions.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-4 font-medium text-gray-700">Customer</th>
                    <th className="text-left p-4 font-medium text-gray-700">Product</th>
                    <th className="text-left p-4 font-medium text-gray-700">Amount</th>
                    <th className="text-left p-4 font-medium text-gray-700">Status</th>
                    <th className="text-left p-4 font-medium text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">{transaction.customer_email || 'N/A'}</td>
                      <td className="p-4 text-gray-600">{transaction.product_name || 'N/A'}</td>
                      <td className="p-4 font-bold text-green-600">{formatCurrency(transaction.amount || 0)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'succeeded' || transaction.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : transaction.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600">{formatDate(transaction.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No transactions found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

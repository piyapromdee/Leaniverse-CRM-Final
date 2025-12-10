'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Target, TrendingUp, Award, Settings, DollarSign, UserPlus, Calendar, Loader2, Edit, FileUp, Trash2, Download } from 'lucide-react'
// Toast notifications removed - use alert for now

interface TeamMember {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  monthly_target?: number
  commission_rate?: number
  kpi_metrics?: any
  is_disabled?: boolean
}

export default function AdminSalesTeam() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState('2026_Q1')
  const [inviteUserDialogOpen, setInviteUserDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserFirstName, setNewUserFirstName] = useState('')
  const [newUserLastName, setNewUserLastName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [inviteUserLoading, setInviteUserLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [filterLoading, setFilterLoading] = useState(false)
  const [teamTargetDialogOpen, setTeamTargetDialogOpen] = useState(false)
  const [teamTargetInput, setTeamTargetInput] = useState('')
  const [savedTeamTarget, setSavedTeamTarget] = useState<number | null>(null)
  const [avgCommissionRate, setAvgCommissionRate] = useState<number>(0)
  const [commissionLoading, setCommissionLoading] = useState<boolean>(false)

  // Edit User States
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [editUserData, setEditUserData] = useState<{
    id: string
    first_name: string
    last_name: string
    email: string
    role: string
    is_disabled: boolean
  } | null>(null)
  const [editUserLoading, setEditUserLoading] = useState(false)

  // CSV Import States
  const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvImportLoading, setCsvImportLoading] = useState(false)

  // KPI Configuration
  const [kpiConfig, setKpiConfig] = useState({
    monthly_target: 0,
    commission_rate: 0,
    calls_target: 0,
    meetings_target: 0,
    conversion_target: 0
  })

  useEffect(() => {
    fetchTeamMembers()
    // Load saved team target from localStorage
    const saved = localStorage.getItem(`team_target_${timePeriod}`)
    if (saved) {
      setSavedTeamTarget(Number(saved))
    } else {
      setSavedTeamTarget(null)
    }
  }, [timePeriod])

  // Calculate commission after team members are loaded
  useEffect(() => {
    if (teamMembers.length > 0) {
      calculateAvgCommission()
    }
  }, [teamMembers, timePeriod])

  // Generate year options (2 years back, 5 years forward)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const startYear = currentYear - 2
    const endYear = currentYear + 5
    const years: string[] = []
    for (let year = endYear; year >= startYear; year--) {
      years.push(year.toString())
    }
    return years
  }

  // Parse current time period to get year and quarter
  const selectedYear = timePeriod.split('_')[0]
  const selectedQuarter = timePeriod.split('_')[1]

  // Helper function to convert time period to date range
  const getTimePeriodDateRange = (period: string) => {
    const [year, quarter] = period.split('_')
    const yearNum = parseInt(year)

    let startMonth = 0
    let endMonth = 2

    switch (quarter) {
      case 'Q1':
        startMonth = 0  // January
        endMonth = 2    // March
        break
      case 'Q2':
        startMonth = 3  // April
        endMonth = 5    // June
        break
      case 'Q3':
        startMonth = 6  // July
        endMonth = 8    // September
        break
      case 'Q4':
        startMonth = 9  // October
        endMonth = 11   // December
        break
    }

    const startDate = new Date(yearNum, startMonth, 1)
    const endDate = new Date(yearNum, endMonth + 1, 0, 23, 59, 59) // Last day of the month

    return { startDate, endDate }
  }

  // Handle year change with loading feedback
  const handleYearChange = (year: string) => {
    setFilterLoading(true)
    setTimePeriod(`${year}_${selectedQuarter}`)
    // Show loading for 800ms to provide visual feedback
    setTimeout(() => setFilterLoading(false), 800)
  }

  // Handle quarter change with loading feedback
  const handleQuarterChange = (quarter: string) => {
    setFilterLoading(true)
    setTimePeriod(`${selectedYear}_${quarter}`)
    // Show loading for 800ms to provide visual feedback
    setTimeout(() => setFilterLoading(false), 800)
  }

  const fetchTeamMembers = async () => {
    try {
      const supabase = createClient()
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['sales', 'admin'])
        .order('first_name')

      if (fetchError) {
        console.error('Supabase error:', fetchError)
        setError(`Failed to load team members: ${fetchError.message}`)
        setLoading(false)
        return
      }

      if (profiles) {
        setTeamMembers(profiles)
        setError('') // Clear any previous errors
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching team members:', error)
      setError('Failed to fetch team members. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const calculateAvgCommission = async () => {
    try {
      setCommissionLoading(true)
      const supabase = createClient()
      const { startDate, endDate } = getTimePeriodDateRange(timePeriod)

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📊 AVG COMMISSION CALCULATION STARTING')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📅 Time Period:', timePeriod)
      console.log('📅 Date Range:', startDate.toISOString(), 'to', endDate.toISOString())
      console.log('👥 Team Members Count:', teamMembers.length)
      console.log('👥 Team Members:', teamMembers.map(m => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name}`,
        commission_rate: m.commission_rate,
        kpi_commission_rate: m.kpi_metrics?.commission_rate
      })))
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Fetch all won deals in the selected time period
      // Use closed_date if available, otherwise fall back to updated_at
      const { data: wonDeals, error: dealsError } = await supabase
        .from('deals')
        .select('id, value, assigned_to, closed_date, updated_at, created_at')
        .eq('stage', 'won')

      if (dealsError) {
        console.error('❌ Error fetching deals for commission calculation:', dealsError)
        setError(`Failed to calculate commission: ${dealsError.message}`)
        setAvgCommissionRate(0)
        setCommissionLoading(false)
        return
      }

      console.log('📦 Total "won" deals in database:', wonDeals?.length || 0)

      if (wonDeals && wonDeals.length > 0) {
        console.log('📦 All Won Deals:', wonDeals.map(d => ({
          id: d.id,
          value: d.value,
          assigned_to: d.assigned_to,
          closed_date: d.closed_date,
          updated_at: d.updated_at,
          created_at: d.created_at
        })))
      }

      // Filter deals by time period (use closed_date, or updated_at, or created_at as fallback)
      const filteredDeals = wonDeals?.filter(deal => {
        const dealDate = new Date(deal.closed_date || deal.updated_at || deal.created_at)
        const isInRange = dealDate >= startDate && dealDate <= endDate
        console.log(`  Deal ${deal.id}: Date=${dealDate.toISOString()}, InRange=${isInRange}`)
        return isInRange
      }) || []

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('💰 FILTERED Won Deals in Period:', filteredDeals.length)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      if (filteredDeals.length === 0) {
        console.log('⚠️ No won deals found for this period')
        console.log('💡 Try selecting a different quarter/year with closed deals')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        setAvgCommissionRate(0)
        setCommissionLoading(false)
        return
      }

      // Calculate total commission and total revenue
      let totalRevenue = 0
      let totalCommission = 0
      let dealsWithoutAssignee = 0
      let dealsWithoutCommissionRate = 0

      filteredDeals.forEach(deal => {
        const dealRevenue = deal.value || 0
        totalRevenue += dealRevenue

        // Find the team member assigned to this deal
        const assignedMember = teamMembers.find(m => m.id === deal.assigned_to)

        if (!deal.assigned_to) {
          dealsWithoutAssignee++
          console.log(`  ⚠️ Deal ${deal.id}: No assignee - ฿${dealRevenue} revenue (no commission calculated)`)
        } else if (!assignedMember) {
          console.log(`  ⚠️ Deal ${deal.id}: Assigned to unknown user ${deal.assigned_to}`)
        } else {
          // Try to get commission_rate from kpi_metrics first, then fall back to profile-level commission_rate
          const commissionRate = assignedMember.kpi_metrics?.commission_rate || assignedMember.commission_rate || 0
          if (commissionRate === 0) {
            dealsWithoutCommissionRate++
          }
          const dealCommission = dealRevenue * (commissionRate / 100)
          totalCommission += dealCommission
          console.log(`  ✅ Deal ${deal.id}: ฿${dealRevenue.toLocaleString()} × ${commissionRate}% = ฿${dealCommission.toLocaleString()}`)
        }
      })

      if (dealsWithoutAssignee > 0) {
        console.log(`⚠️ Warning: ${dealsWithoutAssignee} deal(s) have no assignee`)
      }
      if (dealsWithoutCommissionRate > 0) {
        console.log(`⚠️ Warning: ${dealsWithoutCommissionRate} deal(s) have 0% commission rate`)
      }

      // Calculate average commission rate: (Total Commission / Total Revenue) × 100
      const avgRate = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('💵 FINAL CALCULATION SUMMARY')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('  📊 Total Deals:', filteredDeals.length)
      console.log('  💰 Total Revenue: ฿', totalRevenue.toLocaleString())
      console.log('  💸 Total Commission: ฿', totalCommission.toLocaleString())
      console.log('  📈 Average Commission Rate:', avgRate.toFixed(2) + '%')
      console.log('  ⚠️ Deals Without Assignee:', dealsWithoutAssignee)
      console.log('  ⚠️ Deals With 0% Commission:', dealsWithoutCommissionRate)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('✅ AVG COMMISSION CALCULATION COMPLETED')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      setAvgCommissionRate(avgRate)
      setError('') // Clear any previous errors
      setCommissionLoading(false)
    } catch (error) {
      console.error('❌ CRITICAL ERROR in commission calculation:', error)
      setError(`Commission calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setAvgCommissionRate(0)
      setCommissionLoading(false)
    }
  }

  const handleMemberConfig = (member: TeamMember) => {
    setSelectedMember(member)
    setKpiConfig({
      monthly_target: member.kpi_metrics?.monthly_target || member.monthly_target || 0,
      commission_rate: member.kpi_metrics?.commission_rate || member.commission_rate || 0,
      calls_target: member.kpi_metrics?.calls_target || 0,
      meetings_target: member.kpi_metrics?.meetings_target || 0,
      conversion_target: member.kpi_metrics?.conversion_target || 0
    })
    setConfigOpen(true)
  }

  const saveKpiConfig = async () => {
    if (!selectedMember) {
      alert('No member selected')
      return
    }

    try {
      console.log('💾 Saving KPI configuration via API:', {
        member: `${selectedMember.first_name} ${selectedMember.last_name}`,
        member_id: selectedMember.id,
        kpiConfig,
        timePeriod
      })

      const response = await fetch('/api/admin/save-kpi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          member_id: selectedMember.id,
          kpiConfig,
          timePeriod
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ API Error:', result)
        throw new Error(result.details || result.error || 'Failed to save KPI configuration')
      }

      console.log('✅ KPIs saved successfully:', result.data)
      alert(`✅ KPIs updated for ${selectedMember.first_name} ${selectedMember.last_name} for ${timePeriod}`)
      setConfigOpen(false)
      fetchTeamMembers() // Refresh data
    } catch (error: any) {
      console.error('❌ Error saving KPI config:', error)
      const errorMessage = error?.message || error?.toString() || 'Unknown error'
      alert(`❌ Failed to save KPI configuration\n\nError: ${errorMessage}\n\nPlease check browser console and server logs for details.`)
    }
  }

  const handleSaveTeamTarget = () => {
    const value = Number(teamTargetInput.replace(/,/g, ''))
    if (isNaN(value) || value < 0) {
      alert('Please enter a valid positive number')
      return
    }

    // Save to localStorage (keyed by time period)
    localStorage.setItem(`team_target_${timePeriod}`, value.toString())
    setSavedTeamTarget(value)
    setTeamTargetDialogOpen(false)
    setTeamTargetInput('')
    alert(`Team target set to ฿${value.toLocaleString()} for ${timePeriod.replace('_', ' ')}`)
  }

  const handleOpenTeamTargetDialog = () => {
    setTeamTargetInput(savedTeamTarget?.toString() || '')
    setTeamTargetDialogOpen(true)
  }

  const handleEditUser = (member: TeamMember) => {
    setEditUserData({
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      role: member.role,
      is_disabled: false // Assuming false if not set
    })
    setEditUserDialogOpen(true)
  }

  const handleSaveEditedUser = async () => {
    if (!editUserData) {
      alert('No user data to save')
      return
    }

    try {
      setEditUserLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: editUserData.first_name,
          last_name: editUserData.last_name,
          role: editUserData.role,
          is_disabled: editUserData.is_disabled
        })
        .eq('id', editUserData.id)
        .select()

      if (error) {
        console.error('Error updating user:', error)
        alert(`Failed to update user: ${error.message}`)
        setEditUserLoading(false)
        return
      }

      alert(`✅ Successfully updated ${editUserData.first_name} ${editUserData.last_name}`)
      setEditUserDialogOpen(false)
      setEditUserData(null)
      fetchTeamMembers() // Refresh the list
      setEditUserLoading(false)
    } catch (error: any) {
      console.error('Error updating user:', error)
      alert(`Failed to update user: ${error.message}`)
      setEditUserLoading(false)
    }
  }

  const handleDisableUser = async (member: TeamMember) => {
    const confirmMsg = member.is_disabled
      ? `Enable ${member.first_name} ${member.last_name}? They will be able to log in again.`
      : `Disable ${member.first_name} ${member.last_name}? They will not be able to log in.`

    if (!confirm(confirmMsg)) {
      return
    }

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('profiles')
        .update({
          is_disabled: !member.is_disabled
        })
        .eq('id', member.id)
        .select()

      if (error) {
        console.error('Error updating user:', error)
        alert(`Failed to update user: ${error.message}`)
        return
      }

      const action = member.is_disabled ? 'enabled' : 'disabled'
      alert(`✅ Successfully ${action} ${member.first_name} ${member.last_name}`)
      fetchTeamMembers() // Refresh the list
    } catch (error: any) {
      console.error('Error updating user:', error)
      alert(`Failed to update user: ${error.message}`)
    }
  }

  const downloadSampleCsv = () => {
    // Create sample CSV content
    const sampleCsv = `Name,Email,Role
John Doe,john.doe@example.com,sales
Jane Smith,jane.smith@example.com,admin
Mike Johnson,mike.johnson@example.com,sales`

    // Create a blob and download link
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', 'user_import_template.csv')
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log('✅ Sample CSV template downloaded')
  }

  const handleCsvImport = async () => {
    if (!csvFile) {
      alert('Please select a CSV file')
      return
    }

    try {
      setCsvImportLoading(true)
      const text = await csvFile.text()
      const lines = text.split('\n').filter(line => line.trim())

      // Skip header row
      const dataLines = lines.slice(1)

      let successCount = 0
      let errorCount = 0

      for (const line of dataLines) {
        const [name, email, role] = line.split(',').map(s => s.trim())

        if (!name || !email || !role) {
          errorCount++
          continue
        }

        // Split name into first and last
        const nameParts = name.split(' ')
        const first_name = nameParts[0] || ''
        const last_name = nameParts.slice(1).join(' ') || ''

        try {
          // Call API to create user
          const response = await fetch('/api/admin/invite-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              first_name,
              last_name,
              password: Math.random().toString(36).slice(-10), // Random temp password
              role: role.toLowerCase()
            })
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        } catch (err) {
          errorCount++
        }
      }

      alert(`✅ CSV Import Complete!\n\nSuccess: ${successCount} users\nFailed: ${errorCount} users`)
      setCsvImportDialogOpen(false)
      setCsvFile(null)
      fetchTeamMembers()
      setCsvImportLoading(false)
    } catch (error: any) {
      console.error('CSV Import error:', error)
      alert(`Failed to import CSV: ${error.message}`)
      setCsvImportLoading(false)
    }
  }

  const handleInviteUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserFirstName || !newUserLastName) {
      setError('All fields are required')
      return
    }

    setInviteUserLoading(true)
    setError('')
    setMessage('')

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            first_name: newUserFirstName,
            last_name: newUserLastName,
          },
        },
      })

      if (authError) {
        setError(`Failed to invite user: ${authError.message}`)
        return
      }

      if (data.user) {
        // Set user role to 'sales' by default
        await supabase
          .from('profiles')
          .update({ role: 'sales' })
          .eq('id', data.user.id)

        setMessage('Sales team member invited successfully!')
        setNewUserEmail('')
        setNewUserFirstName('')
        setNewUserLastName('')
        setNewUserPassword('')
        setInviteUserDialogOpen(false)

        // Refresh team members list
        await fetchTeamMembers()
      }
    } catch (error) {
      console.error('Error inviting user:', error)
      setError('An unexpected error occurred')
    } finally {
      setInviteUserLoading(false)
    }
  }

  const salesTeam = teamMembers.filter(m => m.role === 'sales')

  // Filter sales team members by selected time period
  // Only show members who have KPIs configured for the selected time period
  const filteredSalesTeam = salesTeam.filter(member => {
    return member.kpi_metrics?.time_period === timePeriod
  })

  // Use filtered team for metrics, but show all members in the list
  const metricsTeam = filteredSalesTeam.length > 0 ? filteredSalesTeam : salesTeam

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Team Management</h1>
            <p className="text-gray-600 mt-1">Configure individual KPIs, targets, and commission rates</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={inviteUserDialogOpen} onOpenChange={setInviteUserDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setError(''); setMessage(''); }}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite New User
                </Button>
              </DialogTrigger>
            </Dialog>
            <Button
              variant="outline"
              onClick={() => setCsvImportDialogOpen(true)}
            >
              <FileUp className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </div>
        </div>

        {/* Time Period Master Filter */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-lg text-blue-900">Time Period</CardTitle>
                  <p className="text-sm text-blue-700 mt-1">Select the period for KPI targets and tracking</p>
                </div>
              </div>
              <div className="flex gap-4">
                {/* Quarter Selector */}
                <Select value={selectedQuarter} onValueChange={handleQuarterChange}>
                  <SelectTrigger className="w-36 bg-white">
                    <SelectValue placeholder="Quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                    <SelectItem value="Q2">Q2 (Apr-Jun)</SelectItem>
                    <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                    <SelectItem value="Q4">Q4 (Oct-Dec)</SelectItem>
                  </SelectContent>
                </Select>
                {/* Year Selector */}
                <Select value={selectedYear} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-32 bg-white">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateYearOptions().map(year => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Global Messages */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</div>
        )}
        {message && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">{message}</div>
        )}

        {/* Team Overview Stats */}
        <div className="relative">
          {filterLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales Reps</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricsTeam.length}</div>
                <p className="text-xs text-muted-foreground">For {timePeriod.replace('_', ' ')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Target</CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenTeamTargetDialog}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    title="Edit team target"
                  >
                    <Edit className="h-4 w-4 text-blue-600" />
                  </button>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ฿{(savedTeamTarget !== null ? savedTeamTarget : metricsTeam.reduce((sum, m) => sum + (m.kpi_metrics?.monthly_target || m.monthly_target || 0), 0)).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {savedTeamTarget !== null ? 'Custom target' : 'Sum of individual targets'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Commission</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {commissionLoading ? (
                  <div className="text-2xl font-bold text-gray-400 animate-pulse">
                    Calculating...
                  </div>
                ) : (
                  <div className="text-2xl font-bold">
                    {avgCommissionRate.toFixed(2)}%
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Paid on closed deals for {timePeriod.replace('_', ' ')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reps with Targets Set</CardTitle>
                <Settings className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {filteredSalesTeam.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Have KPIs configured for {timePeriod.replace('_', ' ')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Team Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {salesTeam.map(member => (
                <Card key={member.id} className="border-2 hover:border-blue-300 hover:shadow-md transition-all duration-200 h-full flex flex-col">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 pb-3 px-5 pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-12 h-12 rounded-full ${member.role === 'admin' ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'} flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-white`}>
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-gray-900 truncate">
                              {member.first_name} {member.last_name}
                            </h3>
                            {member.role === 'admin' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-sm">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">{member.email}</p>
                        </div>
                      </div>
                      {((member.kpi_metrics?.monthly_target || member.monthly_target || 0) > 0) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 ml-2 flex-shrink-0">
                          <Target className="mr-1 h-3 w-3" />
                          Active
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 flex-1 flex flex-col">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg min-h-[60px]">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700">Monthly Target</span>
                        </div>
                        {(() => {
                          const monthlyTarget = member.kpi_metrics?.monthly_target || member.monthly_target || 0
                          return monthlyTarget > 0 ? (
                            <span className="text-base font-bold text-blue-600 whitespace-nowrap">
                              ฿{monthlyTarget.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 italic whitespace-nowrap">Not set</span>
                          )
                        })()}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg min-h-[60px]">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700">Commission Rate</span>
                        </div>
                        {(() => {
                          const commissionRate = member.kpi_metrics?.commission_rate || member.commission_rate || 0
                          return commissionRate > 0 ? (
                            <span className="text-base font-bold text-green-600 whitespace-nowrap">
                              {commissionRate}%
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 italic whitespace-nowrap">Not set</span>
                          )
                        })()}
                      </div>
                    </div>

                    {/* KPI Configuration Button */}
                    <div className="mt-4">
                      <Button
                        onClick={() => {
                          console.log('🔧 Configure KPIs clicked for:', member.first_name, member.last_name)
                          handleMemberConfig(member)
                        }}
                        className="w-full"
                        variant={(() => {
                          const hasMonthlyTarget = (member.kpi_metrics?.monthly_target || member.monthly_target || 0) > 0
                          const hasCommissionRate = (member.kpi_metrics?.commission_rate || member.commission_rate || 0) > 0
                          return (hasMonthlyTarget || hasCommissionRate) ? "outline" : "default"
                        })()}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        {(() => {
                          const hasMonthlyTarget = (member.kpi_metrics?.monthly_target || member.monthly_target || 0) > 0
                          const hasCommissionRate = (member.kpi_metrics?.commission_rate || member.commission_rate || 0) > 0
                          return (hasMonthlyTarget || hasCommissionRate) ? 'Update KPIs' : 'Set Targets'
                        })()}
                      </Button>
                    </div>

                    {/* ACTION BUTTONS - Edit and Disable */}
                    <div className="mt-3 flex gap-2 border-t pt-3">
                      <Button
                        onClick={() => {
                          console.log('✏️ Edit button clicked for:', member.first_name, member.last_name)
                          handleEditUser(member)
                        }}
                        variant="default"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit User
                      </Button>
                      <Button
                        onClick={() => {
                          console.log('🗑️ Disable button clicked for:', member.first_name, member.last_name)
                          handleDisableUser(member)
                        }}
                        variant="destructive"
                        className="flex-1"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {member.is_disabled ? 'Enable' : 'Disable'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {salesTeam.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No sales team members found</p>
                  <p className="text-sm mt-1">Click "Invite New User" to add team members</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPI Configuration Dialog */}
        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Configure KPIs for {selectedMember?.first_name} {selectedMember?.last_name}
              </DialogTitle>
              <DialogDescription>
                Setting targets for: <span className="font-semibold text-blue-600">{timePeriod.replace('_', ' ')}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Monthly Sales Target (฿)</Label>
                <Input
                  type="number"
                  value={kpiConfig.monthly_target}
                  onChange={(e) => setKpiConfig({...kpiConfig, monthly_target: Number(e.target.value)})}
                  onFocus={(e) => e.target.select()}
                  placeholder="e.g. 100000"
                />
              </div>

              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  value={kpiConfig.commission_rate}
                  onChange={(e) => setKpiConfig({...kpiConfig, commission_rate: Number(e.target.value)})}
                  onFocus={(e) => e.target.select()}
                  placeholder="e.g. 10"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <Label>Monthly Calls Target</Label>
                <Input
                  type="number"
                  value={kpiConfig.calls_target}
                  onChange={(e) => setKpiConfig({...kpiConfig, calls_target: Number(e.target.value)})}
                  onFocus={(e) => e.target.select()}
                  placeholder="e.g. 100"
                />
              </div>

              <div className="space-y-2">
                <Label>Monthly Meetings Target</Label>
                <Input
                  type="number"
                  value={kpiConfig.meetings_target}
                  onChange={(e) => setKpiConfig({...kpiConfig, meetings_target: Number(e.target.value)})}
                  onFocus={(e) => e.target.select()}
                  placeholder="e.g. 20"
                />
              </div>

              <div className="space-y-2">
                <Label>Conversion Rate Target (%)</Label>
                <Input
                  type="number"
                  value={kpiConfig.conversion_target}
                  onChange={(e) => setKpiConfig({...kpiConfig, conversion_target: Number(e.target.value)})}
                  onFocus={(e) => e.target.select()}
                  placeholder="e.g. 25"
                  max="100"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setConfigOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveKpiConfig}>
                Save Configuration
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invite User Dialog */}
        <Dialog open={inviteUserDialogOpen} onOpenChange={setInviteUserDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite New Sales Team Member</DialogTitle>
              <DialogDescription>
                Add a new member to your sales team. They will receive an email confirmation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="john.doe@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</div>
              )}
              {message && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">{message}</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteUser} disabled={inviteUserLoading}>
                {inviteUserLoading ? 'Inviting...' : 'Invite User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Team Target Edit Dialog */}
        <Dialog open={teamTargetDialogOpen} onOpenChange={setTeamTargetDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Set Team Target</DialogTitle>
              <DialogDescription>
                Enter the monthly financial target for {timePeriod.replace('_', ' ')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="teamTarget">Team Target (฿)</Label>
                <Input
                  id="teamTarget"
                  type="text"
                  value={teamTargetInput}
                  onChange={(e) => {
                    // Allow only numbers and commas
                    const value = e.target.value.replace(/[^\d,]/g, '')
                    setTeamTargetInput(value)
                  }}
                  placeholder="e.g., 1,000,000"
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the total monthly target amount for the team
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTeamTargetDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTeamTarget}>
                Save Target
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user details, role, or account status
              </DialogDescription>
            </DialogHeader>
            {editUserData && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">First Name</Label>
                    <Input
                      id="editFirstName"
                      value={editUserData.first_name}
                      onChange={(e) => setEditUserData({...editUserData, first_name: e.target.value})}
                      placeholder="First Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Last Name</Label>
                    <Input
                      id="editLastName"
                      value={editUserData.last_name}
                      onChange={(e) => setEditUserData({...editUserData, last_name: e.target.value})}
                      placeholder="Last Name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    value={editUserData.email}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editRole">Role</Label>
                  <Select
                    value={editUserData.role}
                    onValueChange={(value) => setEditUserData({...editUserData, role: value})}
                  >
                    <SelectTrigger id="editRole">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales Rep</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="editDisabled"
                    checked={editUserData.is_disabled}
                    onChange={(e) => setEditUserData({...editUserData, is_disabled: e.target.checked})}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="editDisabled" className="cursor-pointer">
                    Disable account (user cannot log in)
                  </Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUserDialogOpen(false)} disabled={editUserLoading}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditedUser} disabled={editUserLoading}>
                {editUserLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSV Import Dialog */}
        <Dialog open={csvImportDialogOpen} onOpenChange={setCsvImportDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Users from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV file with user information to bulk import team members
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Download Sample Template - Prominent Section */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Need a Template?
                    </h4>
                    <p className="text-sm text-blue-700">
                      Download our sample CSV file to see the exact format required for import
                    </p>
                  </div>
                  <Button
                    onClick={downloadSampleCsv}
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Sample
                  </Button>
                </div>
              </div>

              {/* Required Format Instructions */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold mb-3 text-gray-900">Required CSV Format:</p>
                <code className="text-xs block bg-white p-3 rounded border border-gray-300 mb-3 font-mono">
                  Name,Email,Role<br />
                  John Doe,john.doe@example.com,sales<br />
                  Jane Smith,jane.smith@example.com,admin<br />
                  Mike Johnson,mike.johnson@example.com,sales
                </code>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Column Definitions:</p>
                  <ul className="text-xs text-gray-600 space-y-1 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold min-w-[60px]">Name:</span>
                      <span>Full name (e.g., "John Doe"). Will be automatically split into first and last name.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold min-w-[60px]">Email:</span>
                      <span>Valid email address. Must be unique for each user.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold min-w-[60px]">Role:</span>
                      <span>Either "sales" or "admin" (case-insensitive).</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="csvFile" className="text-base font-semibold">
                  Upload Your CSV File
                </Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                {csvFile && (
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <FileUp className="h-4 w-4" />
                    Selected: {csvFile.name}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCsvImportDialogOpen(false)
                  setCsvFile(null)
                }}
                disabled={csvImportLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleCsvImport} disabled={csvImportLoading || !csvFile}>
                {csvImportLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    Import Users
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
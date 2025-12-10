'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  MinusCircle,
  Plus,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  DollarSign,
  Calendar,
  Tag,
  TrendingDown,
  ArrowLeft
} from 'lucide-react'
import { isUserSuperAdmin } from '@/lib/roles'
import Link from 'next/link'

interface Expense {
  id: string
  category: string
  amount: number
  description: string
  date: string
  created_at: string
  user_id: string
}

const EXPENSE_CATEGORIES = [
  { value: 'marketing', label: 'Marketing & Advertising', color: 'bg-pink-100 text-pink-800' },
  { value: 'software', label: 'Software & Tools', color: 'bg-blue-100 text-blue-800' },
  { value: 'office', label: 'Office Supplies', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'travel', label: 'Travel & Entertainment', color: 'bg-purple-100 text-purple-800' },
  { value: 'professional', label: 'Professional Services', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'utilities', label: 'Utilities', color: 'bg-green-100 text-green-800' },
  { value: 'rent', label: 'Rent & Facilities', color: 'bg-orange-100 text-orange-800' },
  { value: 'training', label: 'Training & Development', color: 'bg-teal-100 text-teal-800' },
  { value: 'inventory', label: 'Inventory & COGS', color: 'bg-red-100 text-red-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
]

export default function ExpenseManagementPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  const router = useRouter()
  const supabase = createClient()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/sign-in')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, email')
          .eq('id', user.id)
          .single()

        const email = profile?.email || user.email || ''
        const isSuperAdmin = isUserSuperAdmin(email, profile?.role)
        const isAdmin = profile?.role === 'admin'

        if (profile?.role !== 'owner' && !isSuperAdmin && !isAdmin) {
          router.push('/dashboard')
          return
        }

        await fetchExpenses()
        setIsLoading(false)
      } catch (error) {
        console.error('Error checking access:', error)
        router.push('/dashboard')
      }
    }

    checkAccess()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })

      if (error) {
        // If table doesn't exist, show empty state
        console.log('Expenses table may not exist:', error)
        setExpenses([])
        setFilteredExpenses([])
        return
      }

      setExpenses(data || [])
      setFilteredExpenses(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
      setExpenses([])
      setFilteredExpenses([])
    }
  }

  useEffect(() => {
    let filtered = [...expenses]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(exp =>
        exp.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(exp => exp.category === categoryFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (dateFilter) {
        case 'this-month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'last-month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          break
        case 'this-quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          break
        case 'this-year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(0)
      }

      filtered = filtered.filter(exp => new Date(exp.date) >= startDate)
    }

    setFilteredExpenses(filtered)
  }, [expenses, searchQuery, categoryFilter, dateFilter])

  const handleAddExpense = async () => {
    if (!formData.category || !formData.amount || !formData.date) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const expenseData = {
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        user_id: user.id
      }

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)

        if (error) {
          console.error('Supabase update error:', error.message, error.code, error.details)
          throw new Error(error.message || 'Failed to update expense')
        }
      } else {
        const { data, error } = await supabase
          .from('expenses')
          .insert([expenseData])
          .select()

        if (error) {
          console.error('Supabase insert error:', error.message, error.code, error.details)
          // Check if table doesn't exist
          if (error.code === '42P01') {
            throw new Error('Expenses table does not exist. Please contact administrator to set up the database.')
          }
          // Check for RLS policy issues
          if (error.code === '42501' || error.message?.includes('policy')) {
            throw new Error('Permission denied. Please check database access policies.')
          }
          throw new Error(error.message || 'Failed to save expense')
        }
        console.log('Expense created:', data)
      }

      await fetchExpenses()
      resetForm()
      setIsModalOpen(false)
    } catch (error: any) {
      console.error('Error saving expense:', error)
      alert(error.message || 'Failed to save expense. Please try again.')
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Failed to delete expense')
    }
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description || '',
      date: expense.date
    })
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    })
    setEditingExpense(null)
  }

  const handleExportCSV = () => {
    const csvData = [
      ['Date', 'Category', 'Amount', 'Description'],
      ...filteredExpenses.map(exp => [
        exp.date,
        EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label || exp.category,
        exp.amount.toString(),
        exp.description || ''
      ])
    ]

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getCategoryInfo = (category: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  }

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const avgExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0

  // Calculate expenses by category
  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: filteredExpenses.filter(exp => exp.category === cat.value).reduce((sum, exp) => sum + exp.amount, 0)
  })).filter(cat => cat.total > 0).sort((a, b) => b.total - a.total)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:px-12 lg:py-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/financial" className="text-gray-500 hover:text-teal-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          </div>
          <p className="text-gray-600">Track, categorize, and manage all business expenses</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="border-teal-500 text-teal-600 hover:bg-teal-50">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-red-700 uppercase tracking-wide">Total Expenses</span>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-red-900">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-red-600 mt-1">{filteredExpenses.length} transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-orange-700 uppercase tracking-wide">Avg Expense</span>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-orange-900">{formatCurrency(avgExpense)}</div>
            <p className="text-xs text-orange-600 mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Categories</span>
              <Tag className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-blue-900">{expensesByCategory.length}</div>
            <p className="text-xs text-blue-600 mt-1">Active categories</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">This Month</span>
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-purple-900">
              {formatCurrency(expenses.filter(exp => {
                const expDate = new Date(exp.date)
                const now = new Date()
                return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
              }).reduce((sum, exp) => sum + exp.amount, 0))}
            </div>
            <p className="text-xs text-purple-600 mt-1">Current month</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {expensesByCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expensesByCategory.slice(0, 5).map((cat) => (
                <div key={cat.value} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={cat.color}>{cat.label}</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${(cat.total / totalExpenses) * 100}%` }}
                      />
                    </div>
                    <span className="font-semibold text-gray-900 w-28 text-right">{formatCurrency(cat.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="this-quarter">This Quarter</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MinusCircle className="h-5 w-5 text-orange-600" />
            Expense Records
          </CardTitle>
          <CardDescription>All recorded business expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {filteredExpenses.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-medium text-gray-700">Date</th>
                    <th className="text-left p-3 font-medium text-gray-700">Category</th>
                    <th className="text-left p-3 font-medium text-gray-700">Description</th>
                    <th className="text-right p-3 font-medium text-gray-700">Amount</th>
                    <th className="text-right p-3 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => {
                    const catInfo = getCategoryInfo(expense.category)
                    return (
                      <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 text-gray-600">{formatDate(expense.date)}</td>
                        <td className="p-3">
                          <Badge className={catInfo.color}>{catInfo.label}</Badge>
                        </td>
                        <td className="p-3 text-gray-700 max-w-xs truncate">{expense.description || '-'}</td>
                        <td className="p-3 text-right font-bold text-red-600">{formatCurrency(expense.amount)}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditExpense(expense)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="h-8 w-8 p-0 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <MinusCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No expenses found</p>
                <p className="text-sm">Add your first expense to start tracking</p>
                <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="mt-4 bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Expense
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Expense Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsModalOpen(open); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="pb-2 mb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <MinusCircle className="w-5 h-5 text-orange-600" />
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Update expense details' : 'Record a new business expense'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Category and Amount Row */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="amount" className="text-sm font-medium text-gray-700">Amount (THB) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="5000"
                  className="w-full h-10"
                />
              </div>
            </div>

            {/* Date Field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="date" className="text-sm font-medium text-gray-700">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full h-10"
              />
            </div>

            {/* Description Field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the expense"
                rows={3}
                className="w-full resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 mt-2 border-t">
              <Button onClick={() => { resetForm(); setIsModalOpen(false); }} variant="outline" className="flex-1 h-10">
                Cancel
              </Button>
              <Button onClick={handleAddExpense} className="flex-1 h-10 bg-orange-500 hover:bg-orange-600">
                {editingExpense ? 'Update Expense' : 'Add Expense'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

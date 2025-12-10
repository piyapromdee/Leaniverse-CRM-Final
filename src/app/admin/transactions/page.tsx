'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus,
  TrendingUp,
  CreditCard,
  Calendar,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  AlertTriangle,
  Banknote,
  QrCode,
  Building2,
  Download
} from 'lucide-react'

interface ManualTransaction {
  id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  amount: number
  currency: string
  payment_method: 'bank_transfer' | 'qr_promptpay' | 'cash' | 'other'
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  reference_number?: string
  notes?: string
  product_name?: string
  created_at: string
  updated_at: string
}

interface TransactionStats {
  totalTransactions: number
  completedTransactions: number
  pendingTransactions: number
  totalRevenue: number
  recentTransactions: number
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<ManualTransaction[]>([])
  const [stats, setStats] = useState<TransactionStats>({
    totalTransactions: 0,
    completedTransactions: 0,
    pendingTransactions: 0,
    totalRevenue: 0,
    recentTransactions: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<ManualTransaction | null>(null)
  const [deleteConfirmTransaction, setDeleteConfirmTransaction] = useState<ManualTransaction | null>(null)
  const [viewTransaction, setViewTransaction] = useState<ManualTransaction | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    amount: '',
    currency: 'THB',
    payment_method: 'bank_transfer' as ManualTransaction['payment_method'],
    status: 'completed' as ManualTransaction['status'],
    reference_number: '',
    notes: '',
    product_name: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Load transactions from localStorage
  useEffect(() => {
    const loadTransactions = () => {
      try {
        const stored = localStorage.getItem('manual_transactions')
        if (stored) {
          const loadedTransactions = JSON.parse(stored)
          setTransactions(loadedTransactions)
          calculateStats(loadedTransactions)
        }
      } catch (error) {
        console.error('Error loading transactions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [])

  // Calculate stats
  const calculateStats = (txns: ManualTransaction[]) => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const completedTxns = txns.filter(t => t.status === 'completed')
    const pendingTxns = txns.filter(t => t.status === 'pending')
    const recentTxns = txns.filter(t => new Date(t.created_at) >= thirtyDaysAgo)

    setStats({
      totalTransactions: txns.length,
      completedTransactions: completedTxns.length,
      pendingTransactions: pendingTxns.length,
      totalRevenue: completedTxns.reduce((sum, t) => sum + t.amount, 0),
      recentTransactions: recentTxns.length
    })
  }

  // Save transactions to localStorage
  const saveTransactions = (updatedTransactions: ManualTransaction[]) => {
    localStorage.setItem('manual_transactions', JSON.stringify(updatedTransactions))
    setTransactions(updatedTransactions)
    calculateStats(updatedTransactions)
  }

  // Filter transactions
  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch =
      txn.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (txn.customer_email && txn.customer_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (txn.reference_number && txn.reference_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (txn.product_name && txn.product_name.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || txn.status === statusFilter
    const matchesPaymentMethod = paymentMethodFilter === 'all' || txn.payment_method === paymentMethodFilter

    return matchesSearch && matchesStatus && matchesPaymentMethod
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Open modal for new transaction
  const handleNewTransaction = () => {
    setEditingTransaction(null)
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      amount: '',
      currency: 'THB',
      payment_method: 'bank_transfer',
      status: 'completed',
      reference_number: '',
      notes: '',
      product_name: ''
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Open modal for editing
  const handleEditTransaction = (txn: ManualTransaction) => {
    setEditingTransaction(txn)
    setFormData({
      customer_name: txn.customer_name,
      customer_email: txn.customer_email || '',
      customer_phone: txn.customer_phone || '',
      amount: txn.amount.toString(),
      currency: txn.currency,
      payment_method: txn.payment_method,
      status: txn.status,
      reference_number: txn.reference_number || '',
      notes: txn.notes || '',
      product_name: txn.product_name || ''
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.customer_name.trim()) {
      errors.customer_name = 'Customer name is required'
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Valid amount is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Save transaction
  const handleSaveTransaction = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      const now = new Date().toISOString()

      if (editingTransaction) {
        const updatedTransactions = transactions.map(t =>
          t.id === editingTransaction.id
            ? {
                ...t,
                customer_name: formData.customer_name.trim(),
                customer_email: formData.customer_email.trim() || undefined,
                customer_phone: formData.customer_phone.trim() || undefined,
                amount: parseFloat(formData.amount),
                currency: formData.currency,
                payment_method: formData.payment_method,
                status: formData.status,
                reference_number: formData.reference_number.trim() || undefined,
                notes: formData.notes.trim() || undefined,
                product_name: formData.product_name.trim() || undefined,
                updated_at: now
              }
            : t
        )
        saveTransactions(updatedTransactions)
      } else {
        const newTransaction: ManualTransaction = {
          id: `TXN-${Date.now()}`,
          customer_name: formData.customer_name.trim(),
          customer_email: formData.customer_email.trim() || undefined,
          customer_phone: formData.customer_phone.trim() || undefined,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          payment_method: formData.payment_method,
          status: formData.status,
          reference_number: formData.reference_number.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          product_name: formData.product_name.trim() || undefined,
          created_at: now,
          updated_at: now
        }
        saveTransactions([...transactions, newTransaction])
      }

      setIsModalOpen(false)
    } catch (error) {
      console.error('Error saving transaction:', error)
    } finally {
      setSaving(false)
    }
  }

  // Delete transaction
  const handleDeleteTransaction = () => {
    if (!deleteConfirmTransaction) return

    const updatedTransactions = transactions.filter(t => t.id !== deleteConfirmTransaction.id)
    saveTransactions(updatedTransactions)
    setDeleteConfirmTransaction(null)
  }

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Customer', 'Email', 'Phone', 'Product', 'Amount', 'Currency', 'Payment Method', 'Status', 'Reference', 'Date', 'Notes']
    const rows = filteredTransactions.map(txn => [
      txn.id,
      `"${txn.customer_name.replace(/"/g, '""')}"`,
      txn.customer_email || '',
      txn.customer_phone || '',
      txn.product_name || '',
      txn.amount.toString(),
      txn.currency,
      txn.payment_method,
      txn.status,
      txn.reference_number || '',
      new Date(txn.created_at).toLocaleString(),
      txn.notes ? `"${txn.notes.replace(/"/g, '""')}"` : ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'THB') => {
    if (currency === 'THB') {
      return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    }
    return `${currency} ${amount.toLocaleString()}`
  }

  // Get status badge
  const getStatusBadge = (status: ManualTransaction['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'pending':
        return <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'refunded':
        return <Badge variant="secondary">Refunded</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Get payment method icon and label
  const getPaymentMethodDisplay = (method: ManualTransaction['payment_method']) => {
    switch (method) {
      case 'bank_transfer':
        return { icon: Building2, label: 'Bank Transfer' }
      case 'qr_promptpay':
        return { icon: QrCode, label: 'QR / PromptPay' }
      case 'cash':
        return { icon: Banknote, label: 'Cash' }
      default:
        return { icon: CreditCard, label: 'Other' }
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <CreditCard className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading transactions...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-gray-600">
              Log and manage manual transactions (QR/Bank Transfer/Cash payments)
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={handleNewTransaction} className="gap-2">
              <Plus className="h-4 w-4" />
              Log Manual Transaction
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                From {stats.completedTransactions} completed transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                All recorded transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingTransactions}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting confirmation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentTransactions}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by customer, email, reference, or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="qr_promptpay">QR / PromptPay</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Records ({filteredTransactions.length})</CardTitle>
            <CardDescription>
              All manual payment transactions logged by admin
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || statusFilter !== 'all' || paymentMethodFilter !== 'all'
                    ? 'No transactions match your search criteria.'
                    : 'Start logging manual transactions to track offline payments.'}
                </p>
                {!searchQuery && statusFilter === 'all' && paymentMethodFilter === 'all' && (
                  <Button onClick={handleNewTransaction} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Log Your First Transaction
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Transaction</th>
                      <th className="text-left py-3 px-4 font-medium">Customer</th>
                      <th className="text-left py-3 px-4 font-medium">Product</th>
                      <th className="text-left py-3 px-4 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 font-medium">Payment</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((txn) => {
                      const paymentDisplay = getPaymentMethodDisplay(txn.payment_method)
                      const PaymentIcon = paymentDisplay.icon
                      return (
                        <tr key={txn.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <p className="font-mono text-sm">{txn.id}</p>
                              {txn.reference_number && (
                                <p className="text-xs text-gray-500">Ref: {txn.reference_number}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{txn.customer_name}</p>
                              {txn.customer_email && (
                                <p className="text-xs text-gray-500">{txn.customer_email}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm">{txn.product_name || '-'}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-green-600">
                              {formatCurrency(txn.amount, txn.currency)}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <PaymentIcon className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{paymentDisplay.label}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(txn.status)}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm">{formatDate(txn.created_at)}</p>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewTransaction(txn)}
                                className="h-8 w-8 p-0"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTransaction(txn)}
                                className="h-8 w-8 p-0"
                                title="Edit"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmTransaction(txn)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Transaction Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Edit Transaction' : 'Log Manual Transaction'}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction
                ? 'Update the transaction details below.'
                : 'Record a manual payment received via QR, bank transfer, or cash.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                placeholder="e.g., John Doe"
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                className={formErrors.customer_name ? 'border-red-500' : ''}
              />
              {formErrors.customer_name && (
                <p className="text-xs text-red-500">{formErrors.customer_name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_email">Email (Optional)</Label>
                <Input
                  id="customer_email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.customer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Phone (Optional)</Label>
                <Input
                  id="customer_phone"
                  placeholder="08x-xxx-xxxx"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_name">Product/Service (Optional)</Label>
              <Input
                id="product_name"
                placeholder="e.g., CRM Implementation Package"
                value={formData.product_name}
                onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-400">฿</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className={`pl-8 ${formErrors.amount ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.amount && (
                  <p className="text-xs text-red-500">{formErrors.amount}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value as ManualTransaction['payment_method'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="qr_promptpay">QR / PromptPay</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as ManualTransaction['status'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  placeholder="e.g., TRX123456"
                  value={formData.reference_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this transaction..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTransaction} disabled={saving}>
              {saving ? 'Saving...' : editingTransaction ? 'Update Transaction' : 'Log Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Transaction Modal */}
      <Dialog open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {viewTransaction && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Transaction ID</p>
                  <p className="font-mono text-sm">{viewTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(viewTransaction.status)}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{viewTransaction.customer_name}</p>
                {viewTransaction.customer_email && (
                  <p className="text-sm text-gray-600">{viewTransaction.customer_email}</p>
                )}
                {viewTransaction.customer_phone && (
                  <p className="text-sm text-gray-600">{viewTransaction.customer_phone}</p>
                )}
              </div>
              {viewTransaction.product_name && (
                <div>
                  <p className="text-sm text-gray-500">Product/Service</p>
                  <p>{viewTransaction.product_name}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(viewTransaction.amount, viewTransaction.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p>{getPaymentMethodDisplay(viewTransaction.payment_method).label}</p>
                </div>
              </div>
              {viewTransaction.reference_number && (
                <div>
                  <p className="text-sm text-gray-500">Reference Number</p>
                  <p className="font-mono">{viewTransaction.reference_number}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p>{formatDate(viewTransaction.created_at)}</p>
              </div>
              {viewTransaction.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-sm bg-gray-50 p-2 rounded">{viewTransaction.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTransaction(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (viewTransaction) {
                handleEditTransaction(viewTransaction)
                setViewTransaction(null)
              }
            }}>
              Edit Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmTransaction} onOpenChange={() => setDeleteConfirmTransaction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Transaction
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete transaction "{deleteConfirmTransaction?.id}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmTransaction(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTransaction}>
              Delete Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

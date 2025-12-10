'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FileText,
  Plus,
  Edit,
  Send,
  DollarSign,
  Eye,
  Calendar,
  Download,
  Settings,
  Copy,
  Trash2,
  LayoutTemplate,
  Receipt,
  X,
  Search,
  Filter,
  Package,
  CheckCircle2,
  User,
  Building2,
  Mail,
  ChevronRight,
  ArrowLeft,
  ChevronsUpDown,
  Check,
  Loader2
} from 'lucide-react'
import { downloadQuotePDF as downloadPDF } from '@/lib/pdf/quote-pdf'

interface QuoteTemplate {
  id: string
  name: string
  description: string
  content: string
  default_valid_days: number
  created_at: string
  updated_at: string
}

interface Quote {
  id: string
  quote_number: string
  client_name: string
  client_email: string
  client_company: string
  client_phone?: string
  client_address?: string
  template_id?: string
  template_name?: string
  total_amount: number
  currency: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'
  valid_until: string
  created_at: string
  updated_at: string
  items?: QuoteItem[]
  notes?: string
  terms?: string
}

interface QuoteItem {
  id: string
  product_id?: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Product {
  id: string
  name: string
  description: string
  unit_price: number
  category: string
  sku?: string
  is_active: boolean
}

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  position: string | null
  company_id: string | null
  companies: { id: string; name: string } | null
}

export default function AdminQuotes() {
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('templates')

  // Contact lookup state
  const [contactSearchOpen, setContactSearchOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [loadingContacts, setLoadingContacts] = useState(false)

  // Template modals
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<QuoteTemplate | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<QuoteTemplate | null>(null)

  // Quote modals
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [newQuoteModalOpen, setNewQuoteModalOpen] = useState(false)
  const [newQuoteStep, setNewQuoteStep] = useState<'customer' | 'template' | 'items'>('customer')
  const [newQuoteData, setNewQuoteData] = useState({
    client_name: '',
    client_email: '',
    client_company: '',
    template_id: '',
    valid_days: 30
  })
  const [newQuoteItems, setNewQuoteItems] = useState<QuoteItem[]>([])
  const [newQuoteErrors, setNewQuoteErrors] = useState<Record<string, string>>({})
  const [savingQuote, setSavingQuote] = useState(false)

  // Quote action modals
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null)
  const [previewQuoteOpen, setPreviewQuoteOpen] = useState(false)
  const [sendQuoteOpen, setSendQuoteOpen] = useState(false)
  const [sendingQuote, setSendingQuote] = useState<Quote | null>(null)
  const [sendEmailTo, setSendEmailTo] = useState('')
  const [sendEmailSubject, setSendEmailSubject] = useState('')
  const [sendEmailMessage, setSendEmailMessage] = useState('')
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  const [editQuoteOpen, setEditQuoteOpen] = useState(false)

  // Quotations filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all')

  // Template form with line items from product catalog
  const [templateLineItems, setTemplateLineItems] = useState<QuoteItem[]>([])

  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    content: '',
    default_valid_days: 30
  })

  const [quoteForm, setQuoteForm] = useState({
    client_name: '',
    client_email: '',
    client_company: '',
    template_id: '',
    items: [] as QuoteItem[],
    notes: '',
    valid_days: 30
  })

  useEffect(() => {
    fetchData()
    loadProducts()
    fetchContacts()
  }, [])

  // Persist quotes to localStorage whenever they change
  useEffect(() => {
    if (quotes.length > 0) {
      localStorage.setItem('quotation_system_quotes', JSON.stringify(quotes))
    }
  }, [quotes])

  // Persist templates to localStorage whenever they change
  useEffect(() => {
    if (templates.length > 0) {
      localStorage.setItem('quotation_system_templates', JSON.stringify(templates))
    }
  }, [templates])

  // Fetch contacts from API
  const fetchContacts = async () => {
    try {
      setLoadingContacts(true)
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      } else {
        console.error('Failed to fetch contacts')
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoadingContacts(false)
    }
  }

  // Load products from localStorage
  const loadProducts = () => {
    try {
      const stored = localStorage.getItem('product_catalog')
      if (stored) {
        const allProducts = JSON.parse(stored)
        // Only show active products
        setProducts(allProducts.filter((p: Product) => p.is_active))
      }
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      // Default templates
      const defaultTemplates: QuoteTemplate[] = [
        {
          id: '1',
          name: 'Standard CRM Implementation',
          description: 'Basic CRM setup and configuration package',
          content: 'CRM Implementation Package includes:\n- Initial setup and configuration\n- User training sessions\n- Data migration support\n- 30 days support',
          default_valid_days: 30,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Enterprise CRM Solution',
          description: 'Complete enterprise CRM solution with customization',
          content: 'Enterprise CRM Package includes:\n- Full system customization\n- Advanced integrations\n- Dedicated project manager\n- 90 days premium support\n- Training for up to 50 users',
          default_valid_days: 45,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      // Default sample quotes
      const defaultQuotes: Quote[] = [
        {
          id: '4',
          quote_number: 'Q-2024-004',
          client_name: 'roong',
          client_email: 'piyapromdee@gmail.com',
          client_company: 'Dummi & Co',
          total_amount: 150000,
          currency: 'THB',
          status: 'draft',
          valid_until: '2025-01-15',
          created_at: '2024-12-03T10:00:00Z',
          updated_at: '2024-12-03T10:00:00Z',
          items: [
            {
              id: 'item-1',
              description: 'CRM Implementation Service',
              quantity: 1,
              unit_price: 100000,
              total: 100000
            },
            {
              id: 'item-2',
              description: 'Training & Support',
              quantity: 1,
              unit_price: 50000,
              total: 50000
            }
          ]
        },
        {
          id: '1',
          quote_number: 'Q-2024-001',
          client_name: 'John Smith',
          client_email: 'john@techcorp.com',
          client_company: 'TechCorp Solutions',
          template_id: '1',
          template_name: 'Standard CRM Implementation',
          total_amount: 85000,
          currency: 'THB',
          status: 'sent',
          valid_until: '2024-12-31',
          created_at: '2024-11-01T10:00:00Z',
          updated_at: '2024-11-01T10:00:00Z'
        },
        {
          id: '2',
          quote_number: 'Q-2024-002',
          client_name: 'Sarah Johnson',
          client_email: 'sarah@innovate.co.th',
          client_company: 'Innovate Co Ltd',
          template_id: '2',
          template_name: 'Enterprise CRM Solution',
          total_amount: 250000,
          currency: 'THB',
          status: 'accepted',
          valid_until: '2024-12-15',
          created_at: '2024-11-05T14:30:00Z',
          updated_at: '2024-11-10T09:15:00Z'
        },
        {
          id: '3',
          quote_number: 'Q-2024-003',
          client_name: 'Michael Chen',
          client_email: 'michael@startup.com',
          client_company: 'Digital Startup Inc',
          total_amount: 45000,
          currency: 'THB',
          status: 'viewed',
          valid_until: '2024-11-30',
          created_at: '2024-11-08T16:45:00Z',
          updated_at: '2024-11-09T11:20:00Z'
        }
      ]

      // Load quotes from localStorage (persisted quotes)
      const storedQuotes = localStorage.getItem('quotation_system_quotes')
      const storedTemplates = localStorage.getItem('quotation_system_templates')

      // Check if roong's quote exists, if not reset to defaults
      if (storedQuotes) {
        const parsedQuotes = JSON.parse(storedQuotes)
        const hasRoongQuote = parsedQuotes.some((q: Quote) => q.client_email === 'piyapromdee@gmail.com')
        if (hasRoongQuote) {
          setQuotes(parsedQuotes)
        } else {
          // Reset to include roong's quote
          setQuotes(defaultQuotes)
          localStorage.setItem('quotation_system_quotes', JSON.stringify(defaultQuotes))
        }
      } else {
        setQuotes(defaultQuotes)
        localStorage.setItem('quotation_system_quotes', JSON.stringify(defaultQuotes))
      }

      if (storedTemplates) {
        setTemplates(JSON.parse(storedTemplates))
      } else {
        setTemplates(defaultTemplates)
        localStorage.setItem('quotation_system_templates', JSON.stringify(defaultTemplates))
      }
    } catch (error) {
      console.error('Error fetching quotes data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      const newTemplate: QuoteTemplate = {
        id: Date.now().toString(),
        ...templateForm,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      setTemplates([...templates, newTemplate])
      setTemplateForm({ name: '', description: '', content: '', default_valid_days: 30 })
      setTemplateDialogOpen(false)
      alert('Quote template created successfully')
    } catch (error) {
      console.error('Error creating template:', error)
      alert('Failed to create quote template')
    }
  }

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return

    try {
      const updatedTemplate = {
        ...editingTemplate,
        ...templateForm,
        updated_at: new Date().toISOString()
      }

      setTemplates(templates.map(t => t.id === editingTemplate.id ? updatedTemplate : t))
      setEditingTemplate(null)
      setTemplateForm({ name: '', description: '', content: '', default_valid_days: 30 })
      setTemplateDialogOpen(false)
      alert('Quote template updated successfully')
    } catch (error) {
      console.error('Error updating template:', error)
      alert('Failed to update quote template')
    }
  }

  const openEditTemplate = (template: QuoteTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      description: template.description,
      content: template.content,
      default_valid_days: template.default_valid_days
    })
    setTemplateDialogOpen(true)
  }

  const openPreviewTemplate = (template: QuoteTemplate) => {
    setPreviewTemplate(template)
    setPreviewDialogOpen(true)
  }

  const duplicateTemplate = (template: QuoteTemplate) => {
    const newTemplate: QuoteTemplate = {
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      description: template.description,
      content: template.content,
      default_valid_days: template.default_valid_days,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setTemplates([...templates, newTemplate])
    alert('Template duplicated successfully')
  }

  const openDeleteConfirm = (template: QuoteTemplate) => {
    setTemplateToDelete(template)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteTemplate = () => {
    if (!templateToDelete) return
    setTemplates(templates.filter(t => t.id !== templateToDelete.id))
    setDeleteConfirmOpen(false)
    setTemplateToDelete(null)
  }

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'viewed': return 'bg-yellow-100 text-yellow-800'
      case 'declined': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Update quote status - this will automatically update dashboard metrics
  const updateQuoteStatus = (quoteId: string, newStatus: Quote['status']) => {
    setQuotes(prevQuotes =>
      prevQuotes.map(quote =>
        quote.id === quoteId
          ? { ...quote, status: newStatus, updated_at: new Date().toISOString() }
          : quote
      )
    )
    // TODO: In production, also save to database via API
    console.log(`Quote ${quoteId} status updated to: ${newStatus}`)
  }

  // Quote Action Handlers
  const openQuotePreview = (quote: Quote) => {
    setPreviewQuote(quote)
    setPreviewQuoteOpen(true)
  }

  const handleDownloadPDF = (quote: Quote) => {
    try {
      // Use the PDF generation utility
      downloadPDF({
        quote_number: quote.quote_number,
        client_name: quote.client_name,
        client_company: quote.client_company,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        client_address: quote.client_address,
        total_amount: quote.total_amount,
        valid_until: quote.valid_until,
        created_at: quote.created_at,
        status: quote.status,
        items: quote.items,
        notes: quote.notes,
        terms: quote.terms
      })
      console.log(`Downloaded PDF for quote: ${quote.quote_number}`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  const openSendQuoteModal = (quote: Quote) => {
    setSendingQuote(quote)
    setSendEmailTo(quote.client_email)
    setSendEmailSubject(`Quotation ${quote.quote_number} from Dummi & Co`)
    setSendEmailMessage(`Dear ${quote.client_name},\n\nPlease find attached our quotation ${quote.quote_number} for your review.\n\nTotal Amount: ${formatCurrency(quote.total_amount)}\nValid Until: ${new Date(quote.valid_until).toLocaleDateString()}\n\nPlease don't hesitate to contact us if you have any questions.\n\nBest regards,\nDummi & Co Team`)
    setSendQuoteOpen(true)
  }

  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const sendQuoteEmail = async () => {
    if (!sendingQuote) return

    setIsSendingEmail(true)

    try {
      console.log('📧 Sending quote email:', {
        to: sendEmailTo,
        subject: sendEmailSubject,
        quoteId: sendingQuote.id
      })

      const response = await fetch('/api/quotes/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId: sendingQuote.id,
          to: sendEmailTo,
          subject: sendEmailSubject,
          message: sendEmailMessage,
          quoteData: {
            quote_number: sendingQuote.quote_number,
            client_name: sendingQuote.client_name,
            total_amount: sendingQuote.total_amount,
            valid_until: sendingQuote.valid_until,
            items: sendingQuote.items
          }
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      console.log('✅ Email sent successfully:', data)

      // Update quote status to 'sent'
      updateQuoteStatus(sendingQuote.id, 'sent')

      // Close modal and reset
      setSendQuoteOpen(false)
      setSendingQuote(null)
      setSendEmailTo('')
      setSendEmailSubject('')
      setSendEmailMessage('')

      alert(`Quote ${sendingQuote.quote_number} sent successfully to ${sendEmailTo}!`)
    } catch (error) {
      console.error('❌ Failed to send email:', error)
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSendingEmail(false)
    }
  }

  const openEditQuote = (quote: Quote) => {
    setEditingQuote(quote)
    setEditQuoteOpen(true)
  }

  const saveEditedQuote = (updatedQuote: Partial<Quote>) => {
    if (!editingQuote) return

    setQuotes(prevQuotes =>
      prevQuotes.map(q =>
        q.id === editingQuote.id
          ? { ...q, ...updatedQuote, updated_at: new Date().toISOString() }
          : q
      )
    )

    setEditQuoteOpen(false)
    setEditingQuote(null)
    console.log('Quote updated:', editingQuote.quote_number)
  }

  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString()}`
  }

  const totalQuoteValue = quotes
    .filter(q => q.status === 'accepted')
    .reduce((sum, q) => sum + q.total_amount, 0)

  const avgQuoteValue = quotes.length > 0
    ? Math.round(quotes.reduce((sum, q) => sum + q.total_amount, 0) / quotes.length)
    : 0

  // Filter quotations based on search, status, and date range
  const filteredQuotes = quotes.filter(quote => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.client_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.client_email.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter

    // Date range filter
    let matchesDateRange = true
    if (dateRangeFilter !== 'all') {
      const createdDate = new Date(quote.created_at)
      const now = new Date()

      switch (dateRangeFilter) {
        case 'this_month':
          matchesDateRange = createdDate.getMonth() === now.getMonth() &&
                            createdDate.getFullYear() === now.getFullYear()
          break
        case 'last_month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          matchesDateRange = createdDate.getMonth() === lastMonth.getMonth() &&
                            createdDate.getFullYear() === lastMonth.getFullYear()
          break
        case 'this_quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3)
          const quoteQuarter = Math.floor(createdDate.getMonth() / 3)
          matchesDateRange = quoteQuarter === currentQuarter &&
                            createdDate.getFullYear() === now.getFullYear()
          break
        case 'last_quarter':
          const lastQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0)
          const lastQuarterStart = new Date(lastQuarterEnd.getFullYear(), lastQuarterEnd.getMonth() - 2, 1)
          matchesDateRange = createdDate >= lastQuarterStart && createdDate <= lastQuarterEnd
          break
        case 'this_year':
          matchesDateRange = createdDate.getFullYear() === now.getFullYear()
          break
      }
    }

    return matchesSearch && matchesStatus && matchesDateRange
  })

  // Add product to template line items
  const handleAddProductToTemplate = (product: Product) => {
    const existingItem = templateLineItems.find(item => item.product_id === product.id)

    if (existingItem) {
      // Increase quantity if already exists
      setTemplateLineItems(templateLineItems.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
          : item
      ))
    } else {
      // Add new line item
      const newItem: QuoteItem = {
        id: Date.now().toString(),
        product_id: product.id,
        description: product.name,
        quantity: 1,
        unit_price: product.unit_price,
        total: product.unit_price
      }
      setTemplateLineItems([...templateLineItems, newItem])
    }
  }

  // Update line item quantity
  const handleUpdateLineItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setTemplateLineItems(templateLineItems.filter(item => item.id !== itemId))
    } else {
      setTemplateLineItems(templateLineItems.map(item =>
        item.id === itemId
          ? { ...item, quantity, total: quantity * item.unit_price }
          : item
      ))
    }
  }

  // Remove line item
  const handleRemoveLineItem = (itemId: string) => {
    setTemplateLineItems(templateLineItems.filter(item => item.id !== itemId))
  }

  // Calculate template total
  const templateTotal = templateLineItems.reduce((sum, item) => sum + item.total, 0)

  // Format THB currency
  const formatTHB = (amount: number) => {
    return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }

  // New Quote Creation Functions
  const openNewQuoteModal = () => {
    setNewQuoteData({
      client_name: '',
      client_email: '',
      client_company: '',
      template_id: '',
      valid_days: 30
    })
    setNewQuoteItems([])
    setNewQuoteErrors({})
    setNewQuoteStep('customer')
    setSelectedContact(null)
    setContactSearchOpen(false)
    setNewQuoteModalOpen(true)
  }

  // Handle contact selection from lookup
  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact)
    setNewQuoteData(prev => ({
      ...prev,
      client_name: contact.name,
      client_email: contact.email || '',
      client_company: contact.companies?.name || ''
    }))
    setContactSearchOpen(false)
    // Clear any previous errors
    setNewQuoteErrors({})
  }

  // Clear selected contact
  const clearSelectedContact = () => {
    setSelectedContact(null)
    setNewQuoteData(prev => ({
      ...prev,
      client_name: '',
      client_email: '',
      client_company: ''
    }))
  }

  const validateCustomerStep = () => {
    const errors: Record<string, string> = {}
    if (!newQuoteData.client_name.trim()) {
      errors.client_name = 'Customer name is required'
    }
    if (!newQuoteData.client_email.trim()) {
      errors.client_email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newQuoteData.client_email)) {
      errors.client_email = 'Invalid email format'
    }
    setNewQuoteErrors(errors)
    return Object.keys(errors).length === 0
  }

  const goToTemplateStep = () => {
    if (validateCustomerStep()) {
      setNewQuoteStep('template')
    }
  }

  const selectTemplateForQuote = (template: QuoteTemplate) => {
    setNewQuoteData(prev => ({ ...prev, template_id: template.id }))
    // Pre-populate items from template line items if any
    setNewQuoteStep('items')
  }

  const skipTemplateSelection = () => {
    setNewQuoteData(prev => ({ ...prev, template_id: '' }))
    setNewQuoteStep('items')
  }

  const addProductToNewQuote = (product: Product) => {
    const existingItem = newQuoteItems.find(item => item.product_id === product.id)
    if (existingItem) {
      // Increase quantity if already exists
      setNewQuoteItems(prev => prev.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
          : item
      ))
    } else {
      // Add new item
      const newItem: QuoteItem = {
        id: Date.now().toString(),
        product_id: product.id,
        description: product.name,
        quantity: 1,
        unit_price: product.unit_price,
        total: product.unit_price
      }
      setNewQuoteItems(prev => [...prev, newItem])
    }
  }

  const updateNewQuoteItemQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return
    setNewQuoteItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, quantity, total: quantity * item.unit_price }
        : item
    ))
  }

  const removeNewQuoteItem = (itemId: string) => {
    setNewQuoteItems(prev => prev.filter(item => item.id !== itemId))
  }

  const calculateNewQuoteTotal = () => {
    return newQuoteItems.reduce((sum, item) => sum + item.total, 0)
  }

  const generateQuoteNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `QT-${year}${month}-${random}`
  }

  const saveNewQuote = () => {
    if (newQuoteItems.length === 0) {
      alert('Please add at least one item to the quote')
      return
    }

    setSavingQuote(true)

    try {
      const now = new Date()
      const validUntil = new Date(now)
      validUntil.setDate(validUntil.getDate() + newQuoteData.valid_days)

      const selectedTemplate = templates.find(t => t.id === newQuoteData.template_id)

      const newQuote: Quote = {
        id: Date.now().toString(),
        quote_number: generateQuoteNumber(),
        client_name: newQuoteData.client_name.trim(),
        client_email: newQuoteData.client_email.trim(),
        client_company: newQuoteData.client_company.trim(),
        template_id: newQuoteData.template_id || undefined,
        template_name: selectedTemplate?.name,
        total_amount: calculateNewQuoteTotal(),
        currency: 'THB',
        status: 'draft',
        valid_until: validUntil.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }

      setQuotes(prev => [newQuote, ...prev])
      setNewQuoteModalOpen(false)

      // Switch to quotations tab to show the new quote
      setActiveTab('quotations')
    } catch (error) {
      console.error('Error saving quote:', error)
      alert('Error saving quote. Please try again.')
    } finally {
      setSavingQuote(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotation System</h1>
          <p className="text-gray-600">
            Create, manage and track quotations for your CRM implementation services.
          </p>
        </div>

        {/* Stats Cards - Always visible above tabs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quotes.length}</div>
              <p className="text-xs text-muted-foreground">All quotes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {quotes.filter(q => q.status === 'accepted').length}
              </div>
              <p className="text-xs text-muted-foreground">Won quotes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalQuoteValue)}
              </div>
              <p className="text-xs text-muted-foreground">Accepted quotes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Quote Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(avgQuoteValue)}
              </div>
              <p className="text-xs text-muted-foreground">Average value</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs - Templates vs Quotations */}
        <Tabs defaultValue="templates" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
            <TabsTrigger value="templates" className="flex items-center gap-2 text-sm py-2">
              <LayoutTemplate className="w-4 h-4" />
              Quote Templates
              <Badge variant="secondary" className="ml-1 text-xs">{templates.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="quotations" className="flex items-center gap-2 text-sm py-2">
              <Receipt className="w-4 h-4" />
              Recent Quotations
              <Badge variant="secondary" className="ml-1 text-xs">{quotes.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Quote Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Quote Templates</CardTitle>
                    <CardDescription>
                      Create reusable templates for different types of CRM implementation packages.
                    </CardDescription>
                  </div>
                  <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingTemplate(null)
                        setTemplateForm({ name: '', description: '', content: '', default_valid_days: 30 })
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingTemplate ? 'Edit Template' : 'Create New Template'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingTemplate
                            ? 'Modify the template details below and click Update to save changes.'
                            : 'Fill in the template details below to create a reusable quote template.'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="template-name">Template Name</Label>
                            <Input
                              id="template-name"
                              value={templateForm.name}
                              onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                              placeholder="e.g. Standard CRM Package"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="valid-days">Default Valid Days</Label>
                            <Input
                              id="valid-days"
                              type="number"
                              value={templateForm.default_valid_days}
                              onChange={(e) => setTemplateForm({...templateForm, default_valid_days: Number(e.target.value)})}
                              placeholder="30"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="template-description">Description</Label>
                          <Input
                            id="template-description"
                            value={templateForm.description}
                            onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                            placeholder="Brief description of this template"
                          />
                        </div>

                        {/* Product Catalog Section */}
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-blue-600" />
                              Add Products from Catalog
                            </Label>
                            {products.length === 0 && (
                              <span className="text-xs text-amber-600">
                                No products available. Add products in Product Catalog first.
                              </span>
                            )}
                          </div>

                          {products.length > 0 && (
                            <div className="border rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                              <div className="grid grid-cols-2 gap-2">
                                {products.map(product => {
                                  const isAdded = templateLineItems.some(item => item.product_id === product.id)
                                  return (
                                    <div
                                      key={product.id}
                                      className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                                        isAdded
                                          ? 'bg-green-50 border-green-200'
                                          : 'bg-white hover:bg-blue-50 border-gray-200'
                                      }`}
                                      onClick={() => handleAddProductToTemplate(product)}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{product.name}</p>
                                        <p className="text-xs text-gray-500">{formatTHB(product.unit_price)}</p>
                                      </div>
                                      {isAdded ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-600 ml-2" />
                                      ) : (
                                        <Plus className="h-4 w-4 text-blue-600 ml-2" />
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Selected Line Items */}
                          {templateLineItems.length > 0 && (
                            <div className="space-y-2">
                              <Label>Selected Items</Label>
                              <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="text-left px-3 py-2 font-medium">Item</th>
                                      <th className="text-center px-3 py-2 font-medium w-24">Qty</th>
                                      <th className="text-right px-3 py-2 font-medium w-28">Unit Price</th>
                                      <th className="text-right px-3 py-2 font-medium w-28">Total</th>
                                      <th className="w-10"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {templateLineItems.map(item => (
                                      <tr key={item.id} className="border-t">
                                        <td className="px-3 py-2">{item.description}</td>
                                        <td className="px-3 py-2 text-center">
                                          <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleUpdateLineItemQuantity(item.id, parseInt(e.target.value) || 0)}
                                            className="w-16 h-8 text-center mx-auto"
                                          />
                                        </td>
                                        <td className="px-3 py-2 text-right">{formatTHB(item.unit_price)}</td>
                                        <td className="px-3 py-2 text-right font-medium">{formatTHB(item.total)}</td>
                                        <td className="px-2 py-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                            onClick={() => handleRemoveLineItem(item.id)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-gray-50 border-t-2">
                                    <tr>
                                      <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total:</td>
                                      <td className="px-3 py-2 text-right font-bold text-green-600">{formatTHB(templateTotal)}</td>
                                      <td></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="template-content">Additional Notes / Terms</Label>
                          <Textarea
                            id="template-content"
                            value={templateForm.content}
                            onChange={(e) => setTemplateForm({...templateForm, content: e.target.value})}
                            placeholder="Describe what's included in this package, terms and conditions..."
                            rows={6}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                          setTemplateDialogOpen(false)
                          setTemplateLineItems([])
                        }}>
                          Cancel
                        </Button>
                        <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
                          {editingTemplate ? 'Update Template' : 'Create Template'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {templates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <LayoutTemplate className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No quote templates found</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setEditingTemplate(null)
                          setTemplateForm({ name: '', description: '', content: '', default_valid_days: 30 })
                          setTemplateDialogOpen(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Template
                      </Button>
                    </div>
                  ) : (
                    templates.map(template => (
                      <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <h3 className="font-semibold">{template.name}</h3>
                          <p className="text-sm text-gray-600 mb-1">{template.description}</p>
                          <p className="text-xs text-gray-500">
                            Valid for {template.default_valid_days} days by default
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPreviewTemplate(template)}
                            title="Preview Template"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateTemplate(template)}
                            title="Duplicate Template"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditTemplate(template)}
                            title="Edit Template"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteConfirm(template)}
                            title="Delete Template"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Quotations Tab */}
          <TabsContent value="quotations">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Quotations</CardTitle>
                    <CardDescription>
                      Manage and track all your quotations.
                    </CardDescription>
                  </div>
                  <Button onClick={openNewQuoteModal} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Quote
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 pb-4 border-b">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by Quote ID, Customer Name, Company or Email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="viewed">Viewed</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Date Range Filter */}
                  <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="this_quarter">This Quarter</SelectItem>
                      <SelectItem value="last_quarter">Last Quarter</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Filters Indicator */}
                {(searchQuery || statusFilter !== 'all' || dateRangeFilter !== 'all') && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-gray-500">Active filters:</span>
                    {searchQuery && (
                      <Badge variant="secondary" className="gap-1">
                        Search: "{searchQuery}"
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                      </Badge>
                    )}
                    {statusFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        Status: {statusFilter}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter('all')} />
                      </Badge>
                    )}
                    {dateRangeFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        Date: {dateRangeFilter.replace('_', ' ')}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setDateRangeFilter('all')} />
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        setSearchQuery('')
                        setStatusFilter('all')
                        setDateRangeFilter('all')
                      }}
                    >
                      Clear all
                    </Button>
                  </div>
                )}

                {/* Results Count */}
                <div className="text-sm text-gray-500 mb-4">
                  Showing {filteredQuotes.length} of {quotes.length} quotations
                </div>

                <div className="space-y-4">
                  {filteredQuotes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      {quotes.length === 0 ? (
                        <>
                          <p>No quotations found</p>
                          <Button variant="outline" className="mt-4">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Quote
                          </Button>
                        </>
                      ) : (
                        <>
                          <p>No quotations match your filters</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => {
                              setSearchQuery('')
                              setStatusFilter('all')
                              setDateRangeFilter('all')
                            }}
                          >
                            Clear Filters
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredQuotes.map(quote => (
                      <div key={quote.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold">{quote.quote_number}</h3>
                            {/* Status Dropdown - Click to change status */}
                            <Select
                              value={quote.status}
                              onValueChange={(value: Quote['status']) => updateQuoteStatus(quote.id, value)}
                            >
                              <SelectTrigger className={`w-[130px] h-7 text-xs font-medium ${getStatusColor(quote.status)} border-0`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                    Draft
                                  </span>
                                </SelectItem>
                                <SelectItem value="sent">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Sent
                                  </span>
                                </SelectItem>
                                <SelectItem value="viewed">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                    Viewed
                                  </span>
                                </SelectItem>
                                <SelectItem value="accepted">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Accepted
                                  </span>
                                </SelectItem>
                                <SelectItem value="declined">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Declined
                                  </span>
                                </SelectItem>
                                <SelectItem value="expired">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                    Expired
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">
                                <strong>{quote.client_name}</strong> - {quote.client_company}
                              </p>
                              <p className="text-gray-500">{quote.client_email}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">
                                Amount: <strong>{formatCurrency(quote.total_amount)}</strong>
                              </p>
                              <p className="text-gray-500">
                                Valid until: {new Date(quote.valid_until).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Preview Quote"
                            onClick={() => openQuotePreview(quote)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Download PDF"
                            onClick={() => handleDownloadPDF(quote)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Send Quote"
                            onClick={() => openSendQuoteModal(quote)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit Quote"
                            onClick={() => openEditQuote(quote)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Template Modal */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-teal-600" />
                Preview: {previewTemplate?.name}
              </DialogTitle>
              <DialogDescription>
                Preview this quote template&apos;s content
              </DialogDescription>
            </DialogHeader>
            {previewTemplate && (
              <div className="space-y-4">
                {/* Template Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Template Name:</span>
                    <span className="text-sm text-gray-900 font-semibold">{previewTemplate.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Description:</span>
                    <span className="text-sm text-gray-900">{previewTemplate.description}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Default Validity:</span>
                    <Badge variant="outline">{previewTemplate.default_valid_days} days</Badge>
                  </div>
                </div>

                {/* Template Content */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b">
                    <span className="text-sm font-medium text-gray-600">Template Content</span>
                  </div>
                  <div className="p-4 bg-white whitespace-pre-wrap text-sm text-gray-800 min-h-[200px]">
                    {previewTemplate.content}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setPreviewDialogOpen(false)
                    openEditTemplate(previewTemplate)
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Template
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Template
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this template? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {templateToDelete && (
              <div className="py-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium">{templateToDelete.name}</h4>
                  <p className="text-sm text-gray-600">{templateToDelete.description}</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteTemplate}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* New Quote Creation Modal */}
        <Dialog open={newQuoteModalOpen} onOpenChange={setNewQuoteModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                Create New Quote
              </DialogTitle>
              <DialogDescription>
                {newQuoteStep === 'customer' && 'Step 1: Enter customer information'}
                {newQuoteStep === 'template' && 'Step 2: Select a template (optional)'}
                {newQuoteStep === 'items' && 'Step 3: Add products and finalize quote'}
              </DialogDescription>
            </DialogHeader>

            {/* Step Indicators */}
            <div className="flex items-center gap-2 py-4 border-b">
              <div className={`flex items-center gap-2 ${newQuoteStep === 'customer' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${newQuoteStep === 'customer' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                  {newQuoteStep !== 'customer' ? <CheckCircle2 className="h-5 w-5" /> : '1'}
                </div>
                <span className="hidden sm:inline">Customer</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
              <div className={`flex items-center gap-2 ${newQuoteStep === 'template' ? 'text-blue-600 font-medium' : newQuoteStep === 'items' ? 'text-gray-400' : 'text-gray-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${newQuoteStep === 'template' ? 'bg-blue-100 text-blue-600' : newQuoteStep === 'items' ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
                  {newQuoteStep === 'items' ? <CheckCircle2 className="h-5 w-5" /> : '2'}
                </div>
                <span className="hidden sm:inline">Template</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
              <div className={`flex items-center gap-2 ${newQuoteStep === 'items' ? 'text-blue-600 font-medium' : 'text-gray-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${newQuoteStep === 'items' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>
                  3
                </div>
                <span className="hidden sm:inline">Items</span>
              </div>
            </div>

            {/* Step 1: Customer Information - Contact Lookup */}
            {newQuoteStep === 'customer' && (
              <div className="space-y-4 py-4">
                {/* Contact Search/Lookup Field */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-base font-semibold">
                    <Search className="h-4 w-4 text-blue-600" />
                    Search Contact *
                  </Label>
                  <p className="text-sm text-gray-500 mb-2">
                    Search and select an existing contact from your CRM database
                  </p>

                  {/* Selected Contact Display */}
                  {selectedContact ? (
                    <div
                      className={`w-full p-3 border-2 rounded-lg border-green-500 bg-green-50 cursor-pointer`}
                      onClick={() => setContactSearchOpen(!contactSearchOpen)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{selectedContact.name}</span>
                          {selectedContact.companies?.name && (
                            <span className="text-gray-500">• {selectedContact.companies.name}</span>
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            clearSelectedContact()
                            setContactSearchOpen(true)
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setContactSearchOpen(!contactSearchOpen)}
                      className={`w-full justify-between h-12 text-left font-normal ${
                        newQuoteErrors.client_name ? 'border-red-500' : ''
                      }`}
                    >
                      {loadingContacts ? (
                        <span className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading contacts...
                        </span>
                      ) : (
                        <span className="text-gray-500">Click to select a contact...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  )}

                  {/* Inline Contact List - Shows when expanded */}
                  {contactSearchOpen && !selectedContact && (
                    <div className="border rounded-lg mt-2 bg-white shadow-sm">
                      {/* Search Input */}
                      <div className="flex items-center border-b px-3 py-2">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                          type="text"
                          placeholder="Type to filter contacts..."
                          className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          autoFocus
                        />
                      </div>

                      {/* Contact List Header */}
                      <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b bg-gray-50">
                        {contacts.length} contacts available
                      </div>

                      {/* Scrollable Contact List */}
                      <div
                        className="overflow-y-auto"
                        style={{ maxHeight: '200px' }}
                      >
                        {loadingContacts ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                            <span className="ml-2 text-gray-500">Loading contacts...</span>
                          </div>
                        ) : contacts.length === 0 ? (
                          <div className="py-4 text-center">
                            <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-gray-500">No contacts found in CRM.</p>
                          </div>
                        ) : (
                          contacts.map((contact) => (
                            <div
                              key={contact.id}
                              onClick={() => handleContactSelect(contact)}
                              className="flex cursor-pointer items-center px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    {contact.email && (
                                      <span className="flex items-center gap-1 truncate">
                                        <Mail className="h-3 w-3" />
                                        {contact.email}
                                      </span>
                                    )}
                                    {contact.companies?.name && (
                                      <span className="flex items-center gap-1 truncate">
                                        <Building2 className="h-3 w-3" />
                                        {contact.companies.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {newQuoteErrors.client_name && (
                    <p className="text-xs text-red-500">{newQuoteErrors.client_name}</p>
                  )}
                </div>

                {/* Selected Contact Details - Read-Only Auto-populated Fields */}
                {selectedContact && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Selected Contact Details
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSelectedContact}
                        className="text-gray-500 hover:text-red-600 h-7 px-2"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {/* Customer Name - Read Only */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Contact Name
                        </Label>
                        <Input
                          value={newQuoteData.client_name}
                          readOnly
                          className="bg-white border-gray-200 text-gray-700 cursor-not-allowed"
                        />
                      </div>

                      {/* Email Address - Read Only */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email Address
                        </Label>
                        <Input
                          value={newQuoteData.client_email || 'No email available'}
                          readOnly
                          className={`bg-white border-gray-200 cursor-not-allowed ${
                            !newQuoteData.client_email ? 'text-gray-400 italic' : 'text-gray-700'
                          }`}
                        />
                      </div>

                      {/* Company Name - Read Only */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Company Name
                        </Label>
                        <Input
                          value={newQuoteData.client_company || 'No company associated'}
                          readOnly
                          className={`bg-white border-gray-200 cursor-not-allowed ${
                            !newQuoteData.client_company ? 'text-gray-400 italic' : 'text-gray-700'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Quote Validity */}
                <div className="space-y-2 pt-2">
                  <Label htmlFor="nq_valid_days">Quote Validity (Days)</Label>
                  <Select
                    value={newQuoteData.valid_days.toString()}
                    onValueChange={(value) => setNewQuoteData(prev => ({ ...prev, valid_days: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="45">45 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setNewQuoteModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={goToTemplateStep}
                    disabled={!selectedContact}
                  >
                    Next: Select Template
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Template Selection */}
            {newQuoteStep === 'template' && (
              <div className="space-y-4 py-4">
                <p className="text-sm text-gray-600">
                  Select a template to pre-configure your quote, or skip to add items manually.
                </p>

                <div className="grid gap-3 max-h-[300px] overflow-y-auto">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => selectTemplateForQuote(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setNewQuoteStep('customer')}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button variant="secondary" onClick={skipTemplateSelection}>
                    Skip Template
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Add Items */}
            {newQuoteStep === 'items' && (
              <div className="space-y-4 py-4">
                {/* Customer Summary */}
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-medium">{newQuoteData.client_name}</span>
                    <span className="text-gray-500">{newQuoteData.client_email}</span>
                    {newQuoteData.client_company && (
                      <span className="text-gray-500">{newQuoteData.client_company}</span>
                    )}
                  </div>
                </div>

                {/* Product Selection */}
                <div className="space-y-2">
                  <Label>Add Products from Catalog</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[150px] overflow-y-auto border rounded-lg p-2">
                    {products.length === 0 ? (
                      <p className="col-span-full text-center text-gray-500 text-sm py-4">
                        No products available. Add products in the Product Catalog first.
                      </p>
                    ) : (
                      products.map((product) => {
                        const isAdded = newQuoteItems.some(item => item.product_id === product.id)
                        return (
                          <div
                            key={product.id}
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              isAdded
                                ? 'bg-green-50 border-green-200'
                                : 'hover:bg-blue-50 hover:border-blue-200'
                            }`}
                            onClick={() => addProductToNewQuote(product)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{product.name}</p>
                              <p className="text-xs text-gray-500">{formatTHB(product.unit_price)}</p>
                            </div>
                            {isAdded ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <Plus className="h-4 w-4 text-blue-600 shrink-0" />
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Selected Items Table */}
                {newQuoteItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>Quote Items</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Item</th>
                            <th className="text-center px-3 py-2 font-medium w-24">Qty</th>
                            <th className="text-right px-3 py-2 font-medium w-28">Unit Price</th>
                            <th className="text-right px-3 py-2 font-medium w-28">Total</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {newQuoteItems.map(item => (
                            <tr key={item.id} className="border-t">
                              <td className="px-3 py-2">{item.description}</td>
                              <td className="px-3 py-2 text-center">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateNewQuoteItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                  className="w-16 h-8 text-center mx-auto"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">{formatTHB(item.unit_price)}</td>
                              <td className="px-3 py-2 text-right font-medium">{formatTHB(item.total)}</td>
                              <td className="px-2 py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  onClick={() => removeNewQuoteItem(item.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2">
                          <tr>
                            <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total:</td>
                            <td className="px-3 py-2 text-right font-bold text-green-600">{formatTHB(calculateNewQuoteTotal())}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-between gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setNewQuoteStep('template')}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={saveNewQuote}
                    disabled={savingQuote || newQuoteItems.length === 0}
                    className="gap-2"
                  >
                    {savingQuote ? 'Saving...' : 'Create Quote'}
                    <Receipt className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Quote Preview Modal */}
        <Dialog open={previewQuoteOpen} onOpenChange={setPreviewQuoteOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                Quote Preview: {previewQuote?.quote_number}
              </DialogTitle>
              <DialogDescription>
                Preview quotation details
              </DialogDescription>
            </DialogHeader>
            {previewQuote && (
              <div className="space-y-4">
                {/* Quote Header */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{previewQuote.quote_number}</h3>
                      <p className="text-sm text-gray-500">Created: {new Date(previewQuote.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className={getStatusColor(previewQuote.status)}>
                      {previewQuote.status}
                    </Badge>
                  </div>
                </div>

                {/* Client Info */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Bill To
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{previewQuote.client_name}</p>
                    <p className="text-gray-600">{previewQuote.client_company}</p>
                    <p className="text-gray-500">{previewQuote.client_email}</p>
                  </div>
                </div>

                {/* Amount */}
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total Amount</span>
                    <span className="text-2xl font-bold text-green-600">{formatCurrency(previewQuote.total_amount)}</span>
                  </div>
                </div>

                {/* Validity */}
                <div className="flex items-center justify-between text-sm text-gray-600 border-t pt-4">
                  <span>Valid Until:</span>
                  <span className="font-medium">{new Date(previewQuote.valid_until).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setPreviewQuoteOpen(false)}>
                    Close
                  </Button>
                  <Button variant="outline" onClick={() => handleDownloadPDF(previewQuote)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button onClick={() => {
                    setPreviewQuoteOpen(false)
                    openSendQuoteModal(previewQuote)
                  }}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Quote
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Send Quote Modal */}
        <Dialog open={sendQuoteOpen} onOpenChange={setSendQuoteOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-600" />
                Send Quote: {sendingQuote?.quote_number}
              </DialogTitle>
              <DialogDescription>
                Send this quotation via email
              </DialogDescription>
            </DialogHeader>
            {sendingQuote && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sendTo">Recipient Email *</Label>
                  <Input
                    id="sendTo"
                    type="email"
                    value={sendEmailTo}
                    onChange={(e) => setSendEmailTo(e.target.value)}
                    placeholder="recipient@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={sendEmailSubject}
                    onChange={(e) => setSendEmailSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={sendEmailMessage}
                    onChange={(e) => setSendEmailMessage(e.target.value)}
                    rows={6}
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-gray-600">
                    <strong>Amount:</strong> {formatCurrency(sendingQuote.total_amount)}
                  </p>
                  <p className="text-gray-600">
                    <strong>Valid Until:</strong> {new Date(sendingQuote.valid_until).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSendQuoteOpen(false)} disabled={isSendingEmail}>
                    Cancel
                  </Button>
                  <Button onClick={sendQuoteEmail} disabled={!sendEmailTo || isSendingEmail}>
                    {isSendingEmail ? (
                      <>
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Quote Modal */}
        <Dialog open={editQuoteOpen} onOpenChange={setEditQuoteOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                Edit Quote: {editingQuote?.quote_number}
              </DialogTitle>
              <DialogDescription>
                Update quotation details
              </DialogDescription>
            </DialogHeader>
            {editingQuote && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editClientName">Client Name</Label>
                  <Input
                    id="editClientName"
                    value={editingQuote.client_name}
                    onChange={(e) => setEditingQuote({...editingQuote, client_name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editClientCompany">Company</Label>
                  <Input
                    id="editClientCompany"
                    value={editingQuote.client_company}
                    onChange={(e) => setEditingQuote({...editingQuote, client_company: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editClientEmail">Email</Label>
                  <Input
                    id="editClientEmail"
                    type="email"
                    value={editingQuote.client_email}
                    onChange={(e) => setEditingQuote({...editingQuote, client_email: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editAmount">Total Amount (฿)</Label>
                  <Input
                    id="editAmount"
                    type="number"
                    value={editingQuote.total_amount}
                    onChange={(e) => setEditingQuote({...editingQuote, total_amount: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editValidUntil">Valid Until</Label>
                  <Input
                    id="editValidUntil"
                    type="date"
                    value={editingQuote.valid_until.split('T')[0]}
                    onChange={(e) => setEditingQuote({...editingQuote, valid_until: e.target.value})}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setEditQuoteOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => saveEditedQuote(editingQuote)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}

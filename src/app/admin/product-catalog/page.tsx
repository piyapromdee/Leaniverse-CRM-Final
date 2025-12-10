'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Tag,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  FolderCog,
  Check,
  X
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  unit_price: number
  category: string
  sku?: string
  is_active: boolean
  payment_instructions?: string
  created_at: string
  updated_at: string
}

const DEFAULT_CATEGORIES = [
  'CRM Implementation',
  'Consulting',
  'Training',
  'Support',
  'Customization',
  'Integration',
  'License',
  'Other'
]

export default function ProductCatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Sorting state
  const [sortField, setSortField] = useState<'name' | 'unit_price' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit_price: '',
    category: '',
    sku: '',
    is_active: true,
    payment_instructions: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Category management state
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)

  // Load products from localStorage (simulating database)
  useEffect(() => {
    const loadProducts = () => {
      try {
        const stored = localStorage.getItem('product_catalog')
        if (stored) {
          setProducts(JSON.parse(stored))
        } else {
          // Initialize with sample products
          const sampleProducts: Product[] = [
            {
              id: '1',
              name: 'CRM Basic Implementation',
              description: 'Basic CRM system setup including user configuration, data migration, and initial training.',
              unit_price: 5000,
              category: 'CRM Implementation',
              sku: 'CRM-BASIC-001',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '2',
              name: 'CRM Advanced Implementation',
              description: 'Full CRM implementation with custom workflows, advanced reporting, and API integrations.',
              unit_price: 15000,
              category: 'CRM Implementation',
              sku: 'CRM-ADV-001',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '3',
              name: 'Hourly Consulting',
              description: 'Expert consulting services for CRM strategy, process optimization, and best practices.',
              unit_price: 150,
              category: 'Consulting',
              sku: 'CONS-HR-001',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '4',
              name: 'User Training Session',
              description: 'Half-day training session for up to 10 users covering core CRM functionality.',
              unit_price: 800,
              category: 'Training',
              sku: 'TRAIN-HALF-001',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '5',
              name: 'Monthly Support Package',
              description: 'Priority email and phone support with 4-hour response time guarantee.',
              unit_price: 500,
              category: 'Support',
              sku: 'SUP-MONTH-001',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '6',
              name: 'Custom Integration',
              description: 'Integration with third-party systems including API development and testing.',
              unit_price: 3000,
              category: 'Integration',
              sku: 'INT-CUSTOM-001',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
          setProducts(sampleProducts)
          localStorage.setItem('product_catalog', JSON.stringify(sampleProducts))
        }
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setLoading(false)
      }
    }

    // Load custom categories
    const loadCategories = () => {
      try {
        const stored = localStorage.getItem('product_categories')
        if (stored) {
          setCustomCategories(JSON.parse(stored))
        } else {
          // Initialize with default categories
          localStorage.setItem('product_categories', JSON.stringify(DEFAULT_CATEGORIES))
          setCustomCategories(DEFAULT_CATEGORIES)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
        setCustomCategories(DEFAULT_CATEGORIES)
      }
    }

    loadProducts()
    loadCategories()
  }, [])

  // Save products to localStorage
  const saveProducts = (updatedProducts: Product[]) => {
    localStorage.setItem('product_catalog', JSON.stringify(updatedProducts))
    setProducts(updatedProducts)
  }

  // Save categories to localStorage
  const saveCategories = (updatedCategories: string[]) => {
    localStorage.setItem('product_categories', JSON.stringify(updatedCategories))
    setCustomCategories(updatedCategories)
  }

  // Add new category
  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) return

    // Check for duplicates (case-insensitive)
    if (customCategories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
      alert('This category already exists')
      return
    }

    const updatedCategories = [...customCategories, trimmedName].sort()
    saveCategories(updatedCategories)
    setNewCategoryName('')
  }

  // Start editing a category
  const handleStartEditCategory = (index: number) => {
    setEditingCategoryIndex(index)
    setEditingCategoryName(customCategories[index])
  }

  // Save edited category
  const handleSaveEditCategory = () => {
    if (editingCategoryIndex === null) return

    const trimmedName = editingCategoryName.trim()
    if (!trimmedName) return

    const oldCategoryName = customCategories[editingCategoryIndex]

    // Check for duplicates (excluding current category)
    if (customCategories.some((cat, idx) =>
      idx !== editingCategoryIndex && cat.toLowerCase() === trimmedName.toLowerCase()
    )) {
      alert('This category already exists')
      return
    }

    // Update category in list
    const updatedCategories = customCategories.map((cat, idx) =>
      idx === editingCategoryIndex ? trimmedName : cat
    ).sort()
    saveCategories(updatedCategories)

    // Update products with the old category name
    if (oldCategoryName !== trimmedName) {
      const updatedProducts = products.map(p =>
        p.category === oldCategoryName
          ? { ...p, category: trimmedName, updated_at: new Date().toISOString() }
          : p
      )
      saveProducts(updatedProducts)
    }

    setEditingCategoryIndex(null)
    setEditingCategoryName('')
  }

  // Cancel editing
  const handleCancelEditCategory = () => {
    setEditingCategoryIndex(null)
    setEditingCategoryName('')
  }

  // Delete category
  const handleDeleteCategory = () => {
    if (!categoryToDelete) return

    // Check if any products use this category
    const productsUsingCategory = products.filter(p => p.category === categoryToDelete)
    if (productsUsingCategory.length > 0) {
      alert(`Cannot delete "${categoryToDelete}" - ${productsUsingCategory.length} product(s) are using this category. Please reassign them first.`)
      setCategoryToDelete(null)
      return
    }

    const updatedCategories = customCategories.filter(cat => cat !== categoryToDelete)
    saveCategories(updatedCategories)
    setCategoryToDelete(null)
  }

  // Get count of products per category
  const getCategoryProductCount = (category: string) => {
    return products.filter(p => p.category === category).length
  }

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  // Sort filtered products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortField) return 0

    let comparison = 0
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name)
    } else if (sortField === 'unit_price') {
      comparison = a.unit_price - b.unit_price
    }

    return sortDirection === 'desc' ? -comparison : comparison
  })

  // Handle sort toggle
  const handleSort = (field: 'name' | 'unit_price') => {
    if (sortField === field) {
      // Toggle direction if same field, or clear if already desc
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        // Clear sorting
        setSortField(null)
        setSortDirection('asc')
      }
    } else {
      // New field, start with ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Export to CSV function
  const handleExportCSV = () => {
    const headers = ['Name', 'Description', 'Unit Price (THB)', 'Category', 'SKU', 'Status']
    const rows = sortedProducts.map(product => [
      `"${product.name.replace(/"/g, '""')}"`,
      `"${product.description.replace(/"/g, '""')}"`,
      product.unit_price.toString(),
      product.category,
      product.sku || '',
      product.is_active ? 'Active' : 'Inactive'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `product-catalog-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Get unique categories from products
  const categories = [...new Set(products.map(p => p.category))].sort()

  // Stats
  const totalProducts = products.length
  const activeProducts = products.filter(p => p.is_active).length
  const totalCategories = categories.length
  const avgPrice = products.length > 0
    ? products.reduce((sum, p) => sum + p.unit_price, 0) / products.length
    : 0

  // Open modal for new product
  const handleNewProduct = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      unit_price: '',
      category: '',
      sku: '',
      is_active: true,
      payment_instructions: ''
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Open modal for editing product
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      unit_price: product.unit_price.toString(),
      category: product.category,
      sku: product.sku || '',
      is_active: product.is_active,
      payment_instructions: product.payment_instructions || ''
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = 'Product name is required'
    }

    if (!formData.unit_price || parseFloat(formData.unit_price) <= 0) {
      errors.unit_price = 'Valid unit price is required'
    }

    if (!formData.category) {
      errors.category = 'Category is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Save product (create or update)
  const handleSaveProduct = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      const now = new Date().toISOString()

      if (editingProduct) {
        // Update existing product
        const updatedProducts = products.map(p =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: formData.name.trim(),
                description: formData.description.trim(),
                unit_price: parseFloat(formData.unit_price),
                category: formData.category,
                sku: formData.sku.trim() || undefined,
                is_active: formData.is_active,
                payment_instructions: formData.payment_instructions.trim() || undefined,
                updated_at: now
              }
            : p
        )
        saveProducts(updatedProducts)
      } else {
        // Create new product
        const newProduct: Product = {
          id: Date.now().toString(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          unit_price: parseFloat(formData.unit_price),
          category: formData.category,
          sku: formData.sku.trim() || undefined,
          is_active: formData.is_active,
          payment_instructions: formData.payment_instructions.trim() || undefined,
          created_at: now,
          updated_at: now
        }
        saveProducts([...products, newProduct])
      }

      setIsModalOpen(false)
    } catch (error) {
      console.error('Error saving product:', error)
    } finally {
      setSaving(false)
    }
  }

  // Delete product
  const handleDeleteProduct = () => {
    if (!deleteConfirmProduct) return

    const updatedProducts = products.filter(p => p.id !== deleteConfirmProduct.id)
    saveProducts(updatedProducts)
    setDeleteConfirmProduct(null)
  }

  // Format currency in THB
  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading product catalog...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
            <p className="text-gray-600">
              Manage products and services for your quotations.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)} className="gap-2">
              <FolderCog className="h-4 w-4" />
              Manage Categories
            </Button>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={handleNewProduct} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">In catalog</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
              <Tag className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeProducts}</div>
              <p className="text-xs text-muted-foreground">Available for quotes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Tag className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCategories}</div>
              <p className="text-xs text-muted-foreground">Product categories</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Price</CardTitle>
              <span className="text-sm font-medium text-muted-foreground">฿</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(avgPrice)}</div>
              <p className="text-xs text-muted-foreground">Per product</p>
            </CardContent>
          </Card>
        </div>

        {/* Search, Filters, and Sorting */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search and Category Filter Row */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products by name, description, or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sorting Row */}
              <div className="flex items-center gap-2 border-t pt-4">
                <span className="text-sm text-gray-500 mr-2">Sort by:</span>
                <Button
                  variant={sortField === 'name' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="gap-1"
                >
                  Name
                  {sortField === 'name' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  )}
                </Button>
                <Button
                  variant={sortField === 'unit_price' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('unit_price')}
                  className="gap-1"
                >
                  Unit Price
                  {sortField === 'unit_price' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  )}
                </Button>
                {sortField && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSortField(null)
                      setSortDirection('asc')
                    }}
                    className="text-gray-500 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        <Card>
          <CardHeader>
            <CardTitle>Products ({sortedProducts.length})</CardTitle>
            <CardDescription>
              Click on a product to edit or use the action buttons.
              {sortField && (
                <span className="ml-2 text-xs text-blue-600">
                  Sorted by {sortField === 'name' ? 'Name' : 'Unit Price'} ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'No products match your search criteria.'
                    : 'No products in catalog yet.'}
                </p>
                {!searchQuery && categoryFilter === 'all' && (
                  <Button onClick={handleNewProduct} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Your First Product
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                      !product.is_active ? 'opacity-60 bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                          {!product.is_active && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <EyeOff className="h-3 w-3" />
                              Hidden
                            </Badge>
                          )}
                        </div>
                        {product.sku && (
                          <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {product.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(product.unit_price)}
                          </p>
                          <p className="text-xs text-gray-500">per unit</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                            className="h-8 w-8 p-0"
                            title="Edit Product"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmProduct(product)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Product Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Update the product details below.'
                : 'Enter the details for the new product or service.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                placeholder="e.g., CRM Implementation Package"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={formErrors.name ? 'border-red-500' : ''}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the product or service..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price (THB) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-400">฿</span>
                  <Input
                    id="unit_price"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={formData.unit_price}
                    onChange={(e) => {
                      const value = e.target.value
                      // Only allow numeric values
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFormData(prev => ({ ...prev, unit_price: value }))
                      }
                    }}
                    onKeyDown={(e) => {
                      // Prevent non-numeric characters except backspace, delete, arrows, decimal
                      if (!/[\d.]/.test(e.key) &&
                          !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault()
                      }
                      // Prevent multiple decimal points
                      if (e.key === '.' && formData.unit_price.includes('.')) {
                        e.preventDefault()
                      }
                    }}
                    className={`pl-8 ${formErrors.unit_price ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.unit_price && (
                  <p className="text-xs text-red-500">{formErrors.unit_price}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className={formErrors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {customCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.category && (
                  <p className="text-xs text-red-500">{formErrors.category}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU (Optional)</Label>
              <Input
                id="sku"
                placeholder="e.g., CRM-IMPL-001"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
              />
              <p className="text-xs text-gray-500">Stock Keeping Unit for internal reference</p>
            </div>

            {/* Local Payment Instructions */}
            <div className="space-y-2">
              <Label htmlFor="payment_instructions">Local Payment Instructions (Optional)</Label>
              <Textarea
                id="payment_instructions"
                placeholder="e.g., Bank: SCB, Account: 123-456-7890, Name: Company Ltd.&#10;Or provide QR Code URL for PromptPay"
                value={formData.payment_instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_instructions: e.target.value }))}
                rows={3}
              />
              <p className="text-xs text-gray-500">
                Enter bank transfer details or QR code payment link for local payments (QR/Bank Transfer)
              </p>
            </div>

            {/* Visibility Toggle */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {formData.is_active ? (
                    <Eye className="h-5 w-5 text-green-600" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <Label htmlFor="is_active" className="cursor-pointer font-medium">
                      Visible to Sales Reps
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formData.is_active
                        ? 'This product will appear in quote template selection'
                        : 'This product is hidden from quote templates'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct} disabled={saving}>
              {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmProduct} onOpenChange={() => setDeleteConfirmProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Product
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmProduct?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmProduct(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Management Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderCog className="h-5 w-5 text-blue-600" />
              Manage Categories
            </DialogTitle>
            <DialogDescription>
              Create, edit, or delete product categories. Categories with products assigned cannot be deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Add New Category */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter new category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCategory()
                  }
                }}
                className="flex-1"
              />
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Category List */}
            <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
              {customCategories.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No categories yet. Add your first category above.</p>
                </div>
              ) : (
                customCategories.map((category, index) => {
                  const productCount = getCategoryProductCount(category)
                  const isEditing = editingCategoryIndex === index

                  return (
                    <div
                      key={category}
                      className="flex items-center justify-between p-3 hover:bg-gray-50"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveEditCategory()
                              } else if (e.key === 'Escape') {
                                handleCancelEditCategory()
                              }
                            }}
                            className="h-8"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveEditCategory}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEditCategory}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <Tag className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{category}</span>
                            <Badge variant="secondary" className="text-xs">
                              {productCount} product{productCount !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditCategory(index)}
                              className="h-8 w-8 p-0"
                              title="Edit Category"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCategoryToDelete(category)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Category"
                              disabled={productCount > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <p className="text-xs text-gray-500">
              Note: Categories with products cannot be deleted. Reassign products first or edit the category name.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Modal */}
      <Dialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Category
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the category "{categoryToDelete}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

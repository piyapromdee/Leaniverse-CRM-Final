'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Plus, 
  Package,
  ExternalLink,
  Loader2,
  Edit,
  Trash2,
  AlertCircle,
  Banknote,
  Eye,
  ShoppingBag,
  Link as LinkIcon,
  Unlink,
  Settings,
  DollarSign,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react'
import { SUPPORTED_CURRENCIES, getCurrencyInfo, formatCurrency, convertToStripeAmount, validateCurrencyAmount } from '@/lib/currency'

interface Product {
  id: string
  stripe_product_id: string | null
  name: string
  description: string | null
  short_description: string | null
  features: string[] | null
  images: string[]
  active: boolean
  public_visible: boolean
  prices: Price[]
  created_at: string
  stripe_linked: boolean
  stripe_link_status: string
}

interface Price {
  id: string
  stripe_price_id: string | null
  unit_amount: number
  currency: string
  type: 'one_time' | 'recurring'
  interval: string | null
  interval_count: number | null
  active: boolean
  stripe_linked: boolean
  stripe_link_status: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState<string | null>(null)
  const [showAddPriceDialog, setShowAddPriceDialog] = useState(false)
  const [showEditPriceDialog, setShowEditPriceDialog] = useState(false)
  const [showEditProductDialog, setShowEditProductDialog] = useState(false)
  const [showDeletePriceDialog, setShowDeletePriceDialog] = useState(false)
  const [selectedProductForPrice, setSelectedProductForPrice] = useState<string | null>(null)
  const [selectedPriceForEdit, setSelectedPriceForEdit] = useState<Price | null>(null)
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null)
  const [selectedPriceForDelete, setSelectedPriceForDelete] = useState<{ priceId: string; productId: string; price: Price } | null>(null)
  const [linkingProducts, setLinkingProducts] = useState<Set<string>>(new Set())
  const [unlinkingProducts, setUnlinkingProducts] = useState<Set<string>>(new Set())
  const [updatingPrice, setUpdatingPrice] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  // Edit dialog image states
  const [editSelectedImages, setEditSelectedImages] = useState<File[]>([])
  const [editImagePreviewUrls, setEditImagePreviewUrls] = useState<string[]>([])
  const [editExistingImageUrls, setEditExistingImageUrls] = useState<string[]>([])
  const [editImagesToDelete, setEditImagesToDelete] = useState<string[]>([])
  const [editUploadingImages, setEditUploadingImages] = useState(false)
  const [editUploadProgress, setEditUploadProgress] = useState<{ [key: string]: number }>({})

  // Form state for creating new product
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    short_description: '',
    features: '',
    price: '',
    currency: 'usd',
    type: 'one_time' as 'one_time' | 'recurring',
    interval: 'month',
    public_visible: false
  })

  // Form state for adding new price
  const [newPrice, setNewPrice] = useState({
    unit_amount: '',
    currency: 'usd',
    type: 'one_time' as 'one_time' | 'recurring',
    interval: 'month'
  })

  // Form state for editing existing price
  const [editPrice, setEditPrice] = useState({
    unit_amount: '',
    currency: 'usd',
    type: 'one_time' as 'one_time' | 'recurring',
    interval: 'month'
  })

  // Form state for editing existing product
  const [editProduct, setEditProduct] = useState({
    name: '',
    description: '',
    short_description: '',
    features: '',
    public_visible: false
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/stripe/products')
      const result = await response.json()

      if (response.ok) {
        setProducts(result.products || [])
      } else {
        setError(result.error || 'Failed to fetch products')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    
    // Validate price amount
    const priceAmount = parseFloat(newProduct.price)
    const validation = validateCurrencyAmount(priceAmount, newProduct.currency)
    
    if (!validation.valid) {
      setError(validation.error || 'Invalid price amount')
      setCreating(false)
      return
    }
    
    try {
      // Upload images first if any are selected
      let imageUrls: string[] = []
      if (selectedImages.length > 0) {
        try {
          imageUrls = await uploadImages()
        } catch (uploadError) {
          setError('Failed to upload images. Please try again.')
          setCreating(false)
          return
        }
      }

      const response = await fetch('/api/stripe/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description || undefined,
          short_description: newProduct.short_description || undefined,
          features: newProduct.features ? newProduct.features.split(',').map(f => f.trim()).filter(f => f) : [],
          images: imageUrls,
          public_visible: newProduct.public_visible,
          price: {
            unit_amount: convertToStripeAmount(priceAmount, newProduct.currency),
            currency: newProduct.currency,
            type: newProduct.type,
            interval: newProduct.type === 'recurring' ? newProduct.interval : undefined
          }
        })
      })
      
      const result = await response.json()

      if (response.ok) {
        setMessage('Product created successfully')
        setShowCreateDialog(false)
        setNewProduct({
          name: '',
          description: '',
          short_description: '',
          features: '',
          price: '',
          currency: 'usd',
          type: 'one_time',
          interval: 'month',
          public_visible: false
        })
        // Clear image state
        setSelectedImages([])
        imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
        setImagePreviewUrls([])
        
        await fetchProducts() // Refresh the list
      } else {
        setError(result.error || 'Failed to create product')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error creating product:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleGeneratePaymentLink = async (priceId: string) => {
    setGeneratingPaymentLink(priceId)
    setError('')
    
    try {
      const response = await fetch('/api/stripe/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId })
      })
      
      const result = await response.json()

      if (response.ok) {
        // Try to copy payment link to clipboard with fallback
        try {
          await navigator.clipboard.writeText(result.paymentLink.url)
          setMessage('Payment link generated and copied to clipboard!')
        } catch (clipboardError) {
          // Fallback: Just show the link and open in new tab
          setMessage(`Payment link generated: ${result.paymentLink.url}`)
          window.open(result.paymentLink.url, '_blank')
        }
      } else {
        setError(result.error || 'Failed to generate payment link')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error generating payment link:', error)
    } finally {
      setGeneratingPaymentLink(null)
    }
  }

  const formatPrice = (price: Price) => {
    const formatted = formatCurrency(price.unit_amount, price.currency)

    if (price.type === 'recurring') {
      const interval = price.interval_count === 1 
        ? price.interval 
        : `${price.interval_count} ${price.interval}s`
      return `${formatted} / ${interval}`
    }
    
    return formatted
  }

  const getPriceRange = (prices: Price[]) => {
    const activePrices = prices.filter(p => p.active)
    if (activePrices.length === 0) return 'No pricing'
    if (activePrices.length === 1) return formatPrice(activePrices[0])
    
    const amounts = activePrices.map(p => p.unit_amount).sort((a, b) => a - b)
    const minFormatted = formatCurrency(amounts[0], activePrices[0].currency)
    const maxFormatted = formatCurrency(amounts[amounts.length - 1], activePrices[0].currency)
    
    return `${minFormatted} - ${maxFormatted}, ${activePrices.length} options`
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select only image files')
      return
    }
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    // Clear previous images and set new one
    setSelectedImages([file])
    
    // Clear previous preview URLs
    imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
    setImagePreviewUrls([URL.createObjectURL(file)])
  }

  const removeImage = () => {
    imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
    setSelectedImages([])
    setImagePreviewUrls([])
  }

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return []

    setUploadingImages(true)
    const uploadedUrls: string[] = []

    try {
      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `product-images/${fileName}`

        // Update progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))

        // Upload to Supabase Storage
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: filePath,
            fileType: file.type,
            fileData: await fileToBase64(file)
          })
        })

        const result = await response.json()

        if (response.ok) {
          uploadedUrls.push(result.publicUrl)
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
        } else {
          throw new Error(result.error || 'Failed to upload image')
        }
      }

      return uploadedUrls
    } catch (error) {
      console.error('Image upload error:', error)
      throw error
    } finally {
      setUploadingImages(false)
      setUploadProgress({})
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result
        if (!result) {
          reject(new Error('Failed to read file'))
          return
        }
        
        const base64 = result as string
        // Remove the data:image/jpeg;base64, prefix
        const commaIndex = base64.indexOf(',')
        if (commaIndex === -1) {
          reject(new Error('Invalid base64 data format'))
          return
        }
        
        const base64Data = base64.substring(commaIndex + 1)
        if (!base64Data) {
          reject(new Error('Empty base64 data'))
          return
        }
        
        resolve(base64Data)
      }
      reader.onerror = error => reject(error)
    })
  }

  // Edit dialog image functions
  const handleEditImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select only image files')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    // Clear previous new images and set new one
    editImagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
    setEditSelectedImages([file])
    setEditImagePreviewUrls([URL.createObjectURL(file)])
  }

  const removeEditImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      // Mark existing image for deletion
      const imageToDelete = editExistingImageUrls[0]
      if (imageToDelete) {
        setEditImagesToDelete(prev => [...prev, imageToDelete])
      }
      setEditExistingImageUrls([])
    } else {
      editImagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
      setEditSelectedImages([])
      setEditImagePreviewUrls([])
    }
  }

  const uploadEditImages = async (): Promise<string[]> => {
    if (editSelectedImages.length === 0) return []

    setEditUploadingImages(true)
    const uploadedUrls: string[] = []

    try {
      for (let i = 0; i < editSelectedImages.length; i++) {
        const file = editSelectedImages[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `product-images/${fileName}`

        setEditUploadProgress(prev => ({ ...prev, [file.name]: 0 }))

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: filePath,
            fileType: file.type,
            fileData: await fileToBase64(file)
          })
        })

        const result = await response.json()

        if (response.ok) {
          uploadedUrls.push(result.publicUrl)
          setEditUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
        } else {
          throw new Error(result.error || 'Failed to upload image')
        }
      }

      return uploadedUrls
    } catch (error) {
      console.error('Image upload error:', error)
      throw error
    } finally {
      setEditUploadingImages(false)
      setEditUploadProgress({})
    }
  }

  const handleAddPrice = async (productId: string) => {
    setSelectedProductForPrice(productId)
    setShowAddPriceDialog(true)
  }

  const handleEditPrice = async (price: Price, productId: string) => {
    setSelectedPriceForEdit(price)
    setSelectedProductForPrice(productId)
    setEditPrice({
      unit_amount: (price.unit_amount / 100).toString(),
      currency: price.currency,
      type: price.type,
      interval: price.interval || 'month'
    })
    setShowEditPriceDialog(true)
  }

  const handleDeletePrice = (priceId: string, productId: string, price: Price) => {
    setSelectedPriceForDelete({ priceId, productId, price })
    setShowDeletePriceDialog(true)
  }

  const confirmDeletePrice = async () => {
    if (!selectedPriceForDelete) return

    const { priceId, productId } = selectedPriceForDelete
    
    setUpdatingPrice(true)
    setError('')
    
    try {
      const response = await fetch(`/api/user/products/${productId}/prices/${priceId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()

      if (response.ok) {
        setMessage(result.message || 'Price deleted successfully')
        setShowDeletePriceDialog(false)
        setSelectedPriceForDelete(null)
        await fetchProducts()
      } else {
        setError(result.error || 'Failed to delete price')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error deleting price:', error)
    } finally {
      setUpdatingPrice(false)
    }
  }

  const handleCreatePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductForPrice) return
    
    setCreating(true)
    setError('')
    
    const unitAmount = Math.round(parseFloat(newPrice.unit_amount) * 100)
    
    try {
      const response = await fetch(`/api/user/products/${selectedProductForPrice}/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_amount: unitAmount,
          currency: newPrice.currency,
          type: newPrice.type,
          interval: newPrice.type === 'recurring' ? newPrice.interval : undefined
        })
      })
      
      const result = await response.json()

      if (response.ok) {
        setMessage('Price added successfully')
        setShowAddPriceDialog(false)
        setNewPrice({
          unit_amount: '',
          currency: 'usd',
          type: 'one_time',
          interval: 'month'
        })
        await fetchProducts()
      } else {
        setError(result.error || 'Failed to add price')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error adding price:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductForPrice || !selectedPriceForEdit) return
    
    setUpdatingPrice(true)
    setError('')
    
    const unitAmount = Math.round(parseFloat(editPrice.unit_amount) * 100)
    
    try {
      const response = await fetch(`/api/user/products/${selectedProductForPrice}/prices/${selectedPriceForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_amount: unitAmount,
          currency: editPrice.currency,
          type: editPrice.type,
          interval: editPrice.type === 'recurring' ? editPrice.interval : undefined
        })
      })
      
      const result = await response.json()

      if (response.ok) {
        setMessage('Price updated successfully')
        setShowEditPriceDialog(false)
        setSelectedPriceForEdit(null)
        setEditPrice({
          unit_amount: '',
          currency: 'usd',
          type: 'one_time',
          interval: 'month'
        })
        await fetchProducts()
      } else {
        setError(result.error || 'Failed to update price')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error updating price:', error)
    } finally {
      setUpdatingPrice(false)
    }
  }

  const handleLinkProduct = async (productId: string) => {
    setLinkingProducts(prev => new Set([...prev, productId]))
    setError('')
    
    try {
      const response = await fetch('/api/user/products/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })
      
      const result = await response.json()

      if (response.ok) {
        setMessage(result.message || 'Product linked successfully')
        await fetchProducts()
      } else {
        setError(result.error || 'Failed to link product')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error linking product:', error)
    } finally {
      setLinkingProducts(prev => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  const handleUnlinkProduct = async (productId: string) => {
    setUnlinkingProducts(prev => new Set([...prev, productId]))
    setError('')
    
    try {
      const response = await fetch('/api/user/products/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })
      
      const result = await response.json()

      if (response.ok) {
        setMessage(result.message || 'Product unlinked successfully')
        await fetchProducts()
      } else {
        setError(result.error || 'Failed to unlink product')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error unlinking product:', error)
    } finally {
      setUnlinkingProducts(prev => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProductForEdit(product)
    setEditProduct({
      name: product.name,
      description: product.description || '',
      short_description: product.short_description || '',
      features: product.features ? product.features.join(', ') : '',
      public_visible: product.public_visible || false
    })
    // Set existing image (only first one if multiple exist)
    setEditExistingImageUrls(product.images && product.images.length > 0 ? [product.images[0]] : [])
    setEditSelectedImages([])
    setEditImagePreviewUrls([])
    setEditImagesToDelete([])
    setShowEditProductDialog(true)
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductForEdit) return
    
    setCreating(true)
    setError('')
    
    try {
      // Upload new images first if any are selected
      let newImageUrls: string[] = []
      if (editSelectedImages.length > 0) {
        try {
          newImageUrls = await uploadEditImages()
          
          // Delete old image if new one was uploaded successfully and old one exists
          if (newImageUrls.length > 0 && editExistingImageUrls.length > 0) {
            try {
              await fetch('/api/upload/image/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: editExistingImageUrls[0] })
              })
              // Don't fail the update if old image deletion fails - just log it
            } catch (deleteError) {
              console.warn('Failed to delete old image:', deleteError)
            }
          }
        } catch (uploadError) {
          setError('Failed to upload images. Please try again.')
          setCreating(false)
          return
        }
      }

      // Use new image if uploaded, otherwise keep existing image
      const allImageUrls = newImageUrls.length > 0 ? newImageUrls : editExistingImageUrls

      const response = await fetch(`/api/user/products/${selectedProductForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editProduct.name,
          description: editProduct.description || undefined,
          short_description: editProduct.short_description || undefined,
          features: editProduct.features ? editProduct.features.split(',').map(f => f.trim()).filter(f => f) : [],
          images: allImageUrls,
          public_visible: editProduct.public_visible
        })
      })
      
      const result = await response.json()

      if (response.ok) {
        // Delete images that were marked for deletion after successful update
        if (editImagesToDelete.length > 0) {
          for (const imageUrl of editImagesToDelete) {
            try {
              await fetch('/api/upload/image/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl })
              })
            } catch (deleteError) {
              console.warn('Failed to delete old image:', deleteError)
            }
          }
        }
        
        setMessage('Product updated successfully')
        setShowEditProductDialog(false)
        setSelectedProductForEdit(null)
        await fetchProducts()
      } else {
        setError(result.error || 'Failed to update product')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error updating product:', error)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading products...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">Create and manage products for your platform</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/products" target="_blank" rel="noopener noreferrer">
                <Eye className="mr-2 h-4 w-4" />
                View Public Catalog
              </Link>
            </Button>
            {products.some(p => !p.stripe_linked) && (
              <Button variant="outline" asChild>
                <Link href="/admin/stripe/bulk-link">
                  <Settings className="mr-2 h-4 w-4" />
                  Bulk Link ({products.filter(p => !p.stripe_linked).length})
                </Link>
              </Button>
            )}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Product
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
                <DialogDescription>
                  Add a new product that users can purchase on your platform
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateProduct} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Product Name
                  </Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter product name"
                    className="mt-1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="short_description" className="text-sm font-medium text-gray-700">
                    Short Description
                  </Label>
                  <Input
                    id="short_description"
                    value={newProduct.short_description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, short_description: e.target.value }))}
                    placeholder="Brief description for catalog"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be shown in the product catalog
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Full Description
                    <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                  </Label>
                  <textarea
                    id="description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed product description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Detailed description for the product page
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="features" className="text-sm font-medium text-gray-700">
                    Features
                    <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                  </Label>
                  <Input
                    id="features"
                    value={newProduct.features}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, features: e.target.value }))}
                    placeholder="Feature 1, Feature 2, Feature 3"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate features with commas
                  </p>
                </div>

                {/* Image Upload Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Product Image
                    <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                  </Label>
                  
                  {/* Image Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Upload product image
                          </span>
                          <span className="mt-1 block text-sm text-gray-500">
                            PNG, JPG, GIF up to 5MB
                          </span>
                        </label>
                        <input
                          id="image-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleImageSelect}
                        />
                      </div>
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('image-upload')?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Choose Image
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Image Preview */}
                  {imagePreviewUrls.length > 0 && (
                    <div className="mt-4">
                      <div className="relative group w-48 mx-auto">
                        <img
                          src={imagePreviewUrls[0]}
                          alt="Product image preview"
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage()}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {uploadingImages && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Uploading images...</p>
                      {Object.entries(uploadProgress).map(([fileName, progress]) => (
                        <div key={fileName} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">{fileName}</span>
                            <span className="text-gray-600">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    This image will be used as the main product image
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                      Price
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1"
                      required
                    />
                    {newProduct.currency && (
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum: {formatCurrency(getCurrencyInfo(newProduct.currency).minimumAmount, newProduct.currency)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-sm font-medium text-gray-700">
                      Currency
                    </Label>
                    <select
                      id="currency"
                      value={newProduct.currency}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, currency: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    >
                      {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                        <option key={code} value={code}>
                          {info.code} ({info.symbol}) - {info.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                    Billing Type
                  </Label>
                  <select
                    id="type"
                    value={newProduct.type}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, type: e.target.value as 'one_time' | 'recurring' }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                  >
                    <option value="one_time">One-time Payment</option>
                    <option value="recurring">Subscription</option>
                  </select>
                </div>

                {newProduct.type === 'recurring' && (
                  <div className="space-y-2">
                    <Label htmlFor="interval" className="text-sm font-medium text-gray-700">
                      Billing Interval
                    </Label>
                    <select
                      id="interval"
                      value={newProduct.interval}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, interval: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="public_visible" className="text-sm font-medium text-gray-700">
                      Public Visibility
                    </Label>
                    <p className="text-xs text-gray-500">
                      Make this product visible in the public catalog
                    </p>
                  </div>
                  <Switch
                    id="public_visible"
                    checked={newProduct.public_visible}
                    onCheckedChange={(checked) => setNewProduct(prev => ({ ...prev, public_visible: checked }))}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Product'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Price Dialog */}
          <Dialog open={showAddPriceDialog} onOpenChange={setShowAddPriceDialog}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Price</DialogTitle>
                <DialogDescription>
                  Add an additional pricing option for this product
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePrice} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price_amount" className="text-sm font-medium text-gray-700">
                      Price
                    </Label>
                    <Input
                      id="price_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPrice.unit_amount}
                      onChange={(e) => setNewPrice(prev => ({ ...prev, unit_amount: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1"
                      required
                    />
                    {newPrice.currency && (
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum: {formatCurrency(getCurrencyInfo(newPrice.currency).minimumAmount, newPrice.currency)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_currency" className="text-sm font-medium text-gray-700">
                      Currency
                    </Label>
                    <select
                      id="price_currency"
                      value={newPrice.currency}
                      onChange={(e) => setNewPrice(prev => ({ ...prev, currency: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    >
                      {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                        <option key={code} value={code}>
                          {info.code} ({info.symbol}) - {info.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_type" className="text-sm font-medium text-gray-700">
                    Billing Type
                  </Label>
                  <select
                    id="price_type"
                    value={newPrice.type}
                    onChange={(e) => setNewPrice(prev => ({ ...prev, type: e.target.value as 'one_time' | 'recurring' }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                  >
                    <option value="one_time">One-time Payment</option>
                    <option value="recurring">Subscription</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose how customers will be charged for this price option
                  </p>
                </div>

                {newPrice.type === 'recurring' && (
                  <div className="space-y-2">
                    <Label htmlFor="price_interval" className="text-sm font-medium text-gray-700">
                      Billing Interval
                    </Label>
                    <select
                      id="price_interval"
                      value={newPrice.interval}
                      onChange={(e) => setNewPrice(prev => ({ ...prev, interval: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      How often customers will be charged
                    </p>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddPriceDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Price'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Price Dialog */}
          <Dialog open={showEditPriceDialog} onOpenChange={setShowEditPriceDialog}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Price</DialogTitle>
                <DialogDescription>
                  Update this pricing option. Note: This creates a new Stripe price since Stripe prices are immutable.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdatePrice} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_price_amount" className="text-sm font-medium text-gray-700">
                      Price
                    </Label>
                    <Input
                      id="edit_price_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPrice.unit_amount}
                      onChange={(e) => setEditPrice(prev => ({ ...prev, unit_amount: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1"
                      required
                    />
                    {editPrice.currency && (
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum: {formatCurrency(getCurrencyInfo(editPrice.currency).minimumAmount, editPrice.currency)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_price_currency" className="text-sm font-medium text-gray-700">
                      Currency
                    </Label>
                    <select
                      id="edit_price_currency"
                      value={editPrice.currency}
                      onChange={(e) => setEditPrice(prev => ({ ...prev, currency: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    >
                      {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                        <option key={code} value={code}>
                          {info.code} ({info.symbol}) - {info.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_price_type" className="text-sm font-medium text-gray-700">
                    Billing Type
                  </Label>
                  <select
                    id="edit_price_type"
                    value={editPrice.type}
                    onChange={(e) => setEditPrice(prev => ({ ...prev, type: e.target.value as 'one_time' | 'recurring' }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                  >
                    <option value="one_time">One-time Payment</option>
                    <option value="recurring">Subscription</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose how customers will be charged for this price option
                  </p>
                </div>

                {editPrice.type === 'recurring' && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_price_interval" className="text-sm font-medium text-gray-700">
                      Billing Interval
                    </Label>
                    <select
                      id="edit_price_interval"
                      value={editPrice.interval}
                      onChange={(e) => setEditPrice(prev => ({ ...prev, interval: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      How often customers will be charged
                    </p>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Important: Price Update Behavior
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>• A new Stripe price will be created (Stripe prices are immutable)</p>
                        <p>• The old price will be deactivated automatically</p>
                        <p>• Existing customers on subscriptions will continue with the old price</p>
                        <p>• New customers will see the updated price</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEditPriceDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updatingPrice}>
                    {updatingPrice ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Price'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Product Dialog */}
          <Dialog open={showEditProductDialog} onOpenChange={setShowEditProductDialog}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogDescription>
                  Update the product information and settings
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateProduct} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="edit_product_name" className="text-sm font-medium text-gray-700">
                    Product Name *
                  </Label>
                  <Input
                    id="edit_product_name"
                    type="text"
                    value={editProduct.name}
                    onChange={(e) => setEditProduct(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter product name"
                    className="mt-1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_product_description" className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <textarea
                    id="edit_product_description"
                    value={editProduct.description}
                    onChange={(e) => setEditProduct(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed product description"
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_product_short_description" className="text-sm font-medium text-gray-700">
                    Short Description
                  </Label>
                  <Input
                    id="edit_product_short_description"
                    type="text"
                    value={editProduct.short_description}
                    onChange={(e) => setEditProduct(prev => ({ ...prev, short_description: e.target.value }))}
                    placeholder="Brief product summary"
                    className="mt-1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_product_features" className="text-sm font-medium text-gray-700">
                    Features
                  </Label>
                  <Input
                    id="edit_product_features"
                    type="text"
                    value={editProduct.features}
                    onChange={(e) => setEditProduct(prev => ({ ...prev, features: e.target.value }))}
                    placeholder="Feature 1, Feature 2, Feature 3..."
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate features with commas
                  </p>
                </div>

                {/* Image Upload Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Product Image
                    <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                  </Label>
                  
                  {/* Existing Image */}
                  {editExistingImageUrls.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Current Image:</p>
                      <div className="w-48 mx-auto">
                        <div className="relative group">
                          <img
                            src={editExistingImageUrls[0]}
                            alt="Current product image"
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removeEditImage(0, true)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label htmlFor="edit-image-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            {editExistingImageUrls.length > 0 ? 'Replace image' : 'Upload image'}
                          </span>
                          <span className="mt-1 block text-sm text-gray-500">
                            PNG, JPG, GIF up to 5MB
                          </span>
                        </label>
                        <input
                          id="edit-image-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleEditImageSelect}
                        />
                      </div>
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('edit-image-upload')?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {editExistingImageUrls.length > 0 ? 'Choose New Image' : 'Choose Image'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* New Image Preview */}
                  {editImagePreviewUrls.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">New Image to Upload:</p>
                      <div className="w-48 mx-auto">
                        <div className="relative group">
                          <img
                            src={editImagePreviewUrls[0]}
                            alt="New image preview"
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removeEditImage(0, false)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {editUploadingImages && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Uploading images...</p>
                      {Object.entries(editUploadProgress).map(([fileName, progress]) => (
                        <div key={fileName} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">{fileName}</span>
                            <span className="text-gray-600">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    This image will be used as the main product image
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_product_public_visible"
                    checked={editProduct.public_visible}
                    onCheckedChange={(checked) => setEditProduct(prev => ({ ...prev, public_visible: checked }))}
                  />
                  <Label htmlFor="edit_product_public_visible" className="text-sm font-medium text-gray-700">
                    Publicly Visible
                  </Label>
                  <p className="text-xs text-gray-500 ml-2">
                    Show this product in the public catalog
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEditProductDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Product'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Price Confirmation Dialog */}
          <Dialog open={showDeletePriceDialog} onOpenChange={setShowDeletePriceDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  Delete Price
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this price? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              {selectedPriceForDelete && (
                <div className="py-4">
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center space-x-3">
                      <Banknote className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {formatPrice(selectedPriceForDelete.price)}
                      </span>
                      <Badge variant={selectedPriceForDelete.price.active ? 'default' : 'secondary'} className="text-xs">
                        {selectedPriceForDelete.price.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                      <div className="ml-2">
                        <p className="text-sm text-red-800">
                          This will permanently delete the price and deactivate it in Stripe if linked.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDeletePriceDialog(false)}
                  disabled={updatingPrice}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={confirmDeletePrice}
                  disabled={updatingPrice}
                >
                  {updatingPrice ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Price
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Global Messages */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}
        {message && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md flex items-center">
            <Package className="h-4 w-4 mr-2" />
            {message}
          </div>
        )}

        {/* Products List */}
        {products.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first product to start accepting payments from users on your platform.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Product
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/products" target="_blank" rel="noopener noreferrer">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Preview Public Catalog
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {products.map((product) => (
              <Card key={product.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5" />
                      <CardTitle>{product.name}</CardTitle>
                      <Badge variant={product.active ? 'default' : 'secondary'}>
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant={product.stripe_linked ? 'default' : 'outline'} className="text-xs">
                        {product.stripe_linked ? (
                          <>
                            <LinkIcon className="w-3 h-3 mr-1" />
                            Linked
                          </>
                        ) : (
                          <>
                            <Unlink className="w-3 h-3 mr-1" />
                            Unlinked
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      {product.stripe_linked && product.stripe_product_id && (
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={`https://dashboard.stripe.com/products/${product.stripe_product_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View in Stripe Dashboard"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link 
                          href={`/products/${product.id}/checkout`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {product.stripe_linked ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUnlinkProduct(product.id)}
                          disabled={unlinkingProducts.has(product.id)}
                        >
                          {unlinkingProducts.has(product.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Unlink className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleLinkProduct(product.id)}
                          disabled={linkingProducts.has(product.id)}
                        >
                          {linkingProducts.has(product.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LinkIcon className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {product.description && (
                    <CardDescription>{product.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Pricing Information */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">Pricing</h4>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAddPrice(product.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600">
                          {getPriceRange(product.prices)}
                        </div>
                      </div>
                      {product.prices.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-gray-300 rounded-md">
                          <DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 mb-3">No pricing configured</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAddPrice(product.id)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add First Price
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {product.prices.map((price) => (
                            <div key={price.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                              <div className="flex items-center space-x-3">
                                <Banknote className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{formatPrice(price)}</span>
                                <Badge variant={price.active ? 'default' : 'secondary'} className="text-xs">
                                  {price.active ? 'Active' : 'Inactive'}
                                </Badge>
                                <Badge variant={price.stripe_linked ? 'default' : 'outline'} className="text-xs">
                                  {price.stripe_linked ? (
                                    <>
                                      <LinkIcon className="w-3 h-3 mr-1" />
                                      Linked
                                    </>
                                  ) : (
                                    <>
                                      <Unlink className="w-3 h-3 mr-1" />
                                      Unlinked
                                    </>
                                  )}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditPrice(price, product.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeletePrice(price.id, product.id, price)}
                                  disabled={updatingPrice}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {price.stripe_linked && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleGeneratePaymentLink(price.id)}
                                    disabled={generatingPaymentLink === price.id}
                                  >
                                    {generatingPaymentLink === price.id ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      'Generate Payment Link'
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Product Meta */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Product ID:</span> {product.stripe_product_id}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {new Date(product.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
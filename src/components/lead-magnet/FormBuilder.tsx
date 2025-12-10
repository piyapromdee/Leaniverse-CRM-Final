'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, GripVertical, Type, Mail, Phone, Calendar, List, CheckSquare, Hash } from 'lucide-react'

export interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'radio'
  label: string
  placeholder?: string
  required: boolean
  options?: string[] | { label: string; value: string }[] // For select, radio, checkbox - support both formats
  order: number
}

interface FormBuilderProps {
  fields: FormField[]
  onChange: (fields: FormField[]) => void
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input', icon: Type },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone Number', icon: Phone },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'textarea', label: 'Long Text', icon: Type },
  { value: 'select', label: 'Dropdown', icon: List },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'radio', label: 'Radio Buttons', icon: CheckSquare }
]

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
  const [editingField, setEditingField] = useState<string | null>(null)

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: `New ${type} field`,
      placeholder: '',
      required: false,
      options: type === 'select' || type === 'radio' || type === 'checkbox' ? ['Option 1', 'Option 2'] : undefined,
      order: fields.length
    }
    onChange([...fields, newField])
    setEditingField(newField.id)
  }

  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ))
  }

  const deleteField = (id: string) => {
    onChange(fields.filter(field => field.id !== id))
    setEditingField(null)
  }

  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(f => f.id === id)
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) {
      return
    }
    
    const newFields = [...fields]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]]
    
    // Update order
    newFields.forEach((field, i) => field.order = i)
    onChange(newFields)
  }

  const addOption = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId)
    if (field && field.options) {
      const isObjectFormat = field.options.length > 0 && typeof field.options[0] === 'object'
      const newOption = isObjectFormat 
        ? { label: `Option ${field.options.length + 1}`, value: `option_${field.options.length + 1}` }
        : `Option ${field.options.length + 1}`
      updateField(fieldId, {
        options: [...field.options, newOption] as any
      })
    }
  }

  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    const field = fields.find(f => f.id === fieldId)
    if (field && field.options) {
      const newOptions = [...field.options]
      if (typeof newOptions[optionIndex] === 'object') {
        // For object format, update the label and value
        newOptions[optionIndex] = { label: value, value: value.toLowerCase().replace(/\s+/g, '_') }
      } else {
        // For string format, just update the string
        newOptions[optionIndex] = value
      }
      updateField(fieldId, { options: newOptions as any })
    }
  }

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find(f => f.id === fieldId)
    if (field && field.options && field.options.length > 1) {
      const newOptions = field.options.filter((_, i) => i !== optionIndex)
      updateField(fieldId, { options: newOptions as any })
    }
  }

  const renderFieldPreview = (field: FormField) => {
    const isEditing = editingField === field.id

    return (
      <Card key={field.id} className={`mb-4 ${isEditing ? 'ring-2 ring-blue-500' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
              <span className="font-medium">{field.label}</span>
              {field.required && <span className="text-red-500">*</span>}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveField(field.id, 'up')}
                disabled={field.order === 0}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveField(field.id, 'down')}
                disabled={field.order === fields.length - 1}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingField(isEditing ? null : field.id)}
              >
                {isEditing ? 'Done' : 'Edit'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteField(field.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isEditing ? (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-gray-700">Field Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder="Enter field label"
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700">Placeholder Text</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                  placeholder="Enter placeholder text"
                  className="mt-2 placeholder:text-gray-400"
                />
              </div>
              
              <div className="flex items-center space-x-3 pt-2">
                <Switch
                  checked={field.required}
                  onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                />
                <Label className="text-sm font-medium text-gray-700">Required field</Label>
              </div>
              
              {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Options</Label>
                  <div className="space-y-3 mt-3">
                    {field.options?.map((option, index) => {
                      const optionValue = typeof option === 'string' ? option : option.label
                      return (
                        <div key={index} className="flex items-center space-x-3">
                          <Input
                            value={optionValue}
                            onChange={(e) => updateOption(field.id, index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className="placeholder:text-gray-400"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(field.id, index)}
                            disabled={field.options?.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(field.id)}
                      className="mt-3"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Option
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Preview of the field */}
              {field.type === 'text' && (
                <Input placeholder={field.placeholder} disabled />
              )}
              {field.type === 'email' && (
                <Input type="email" placeholder={field.placeholder} disabled />
              )}
              {field.type === 'phone' && (
                <Input type="tel" placeholder={field.placeholder} disabled />
              )}
              {field.type === 'number' && (
                <Input type="number" placeholder={field.placeholder} disabled />
              )}
              {field.type === 'date' && (
                <Input type="date" disabled />
              )}
              {field.type === 'textarea' && (
                <Textarea placeholder={field.placeholder} disabled rows={3} />
              )}
              {field.type === 'select' && (
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder || 'Select an option'} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option, index) => {
                      const value = typeof option === 'string' ? option : option.value
                      const label = typeof option === 'string' ? option : option.label
                      return (
                        <SelectItem key={index} value={value}>{label}</SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
              {field.type === 'radio' && (
                <div className="space-y-2">
                  {field.options?.map((option, index) => {
                    const value = typeof option === 'string' ? option : option.value
                    const label = typeof option === 'string' ? option : option.label
                    return (
                      <div key={index} className="flex items-center space-x-2">
                        <input type="radio" name={field.id} disabled />
                        <label>{label}</label>
                      </div>
                    )
                  })}
                </div>
              )}
              {field.type === 'checkbox' && (
                <div className="space-y-2">
                  {field.options?.map((option, index) => {
                    const value = typeof option === 'string' ? option : option.value
                    const label = typeof option === 'string' ? option : option.label
                    return (
                      <div key={index} className="flex items-center space-x-2">
                        <input type="checkbox" disabled />
                        <label>{label}</label>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Form Fields</h3>
        
        {/* Add Field Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {FIELD_TYPES.map((fieldType) => {
            const Icon = fieldType.icon
            return (
              <Button
                key={fieldType.value}
                variant="outline"
                size="sm"
                onClick={() => addField(fieldType.value as FormField['type'])}
                className="flex items-center justify-start space-x-2"
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs">{fieldType.label}</span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Form Fields */}
      <div>
        {fields.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-gray-500 mb-4">No custom fields added yet</p>
            <p className="text-sm text-gray-400">
              Click the buttons above to add custom fields to your lead form
            </p>
          </Card>
        ) : (
          <div>
            {fields
              .sort((a, b) => a.order - b.order)
              .map(renderFieldPreview)}
          </div>
        )}
      </div>

      {/* Default Fields Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-800 mb-2">Default Fields</h4>
          <p className="text-sm text-blue-700">
            Name and Email are always included automatically. Add custom fields above to collect additional information.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
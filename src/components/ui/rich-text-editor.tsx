'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Bold,
  Italic,
  Underline,
  Link,
  Image,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Quote,
  Palette,
  Type,
  User,
  Building,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ content = '', onChange, placeholder, className }: RichTextEditorProps) {
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')

  const editorRef = useRef<HTMLDivElement>(null)

  // Personalization variables available for insertion
  const personalizationVars = [
    { label: 'First Name', value: '{{first_name}}', icon: User },
    { label: 'Last Name', value: '{{last_name}}', icon: User },
    { label: 'Full Name', value: '{{name}}', icon: User },
    { label: 'Email', value: '{{email}}', icon: Mail },
    { label: 'Company Name', value: '{{company_name}}', icon: Building },
    { label: 'Position', value: '{{position}}', icon: Building },
    { label: 'Phone', value: '{{phone}}', icon: Phone },
    { label: 'Location', value: '{{location}}', icon: MapPin }
  ]

  // Strip template styling but keep basic formatting when content changes
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      // Check if content contains full HTML template (has <html>, <body>, or complex CSS)
      const isFullTemplate = content.includes('<html>') || content.includes('<body>') ||
                             content.includes('<style>') || content.includes('background-color') ||
                             content.includes('font-family') || content.includes('max-width')

      if (isFullTemplate) {
        // Extract just the body content and strip complex styling for editing
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = content

        // Try to get body content first
        const bodyContent = tempDiv.querySelector('body')?.innerHTML || content

        // Strip inline styles but keep basic formatting tags
        const cleanedContent = bodyContent
          .replace(/style="[^"]*"/gi, '') // Remove all inline styles
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style blocks
          .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '') // Remove head sections
          .replace(/(<[^>]+)\sclass="[^"]*"/gi, '$1') // Remove class attributes

        editorRef.current.innerHTML = cleanedContent
      } else {
        // Normal content, use as is
        editorRef.current.innerHTML = content
      }
    }
  }, [content])

  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      // Pass the edited content back to parent
      onChange(editorRef.current.innerHTML)
    }
  }

  const insertPersonalizationVar = (variable: string) => {
    if (!editorRef.current) return

    // Focus the editor first
    editorRef.current.focus()

    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)

      // Insert plain text instead of styled span
      const textNode = document.createTextNode(variable)
      range.deleteContents()
      range.insertNode(textNode)

      // Move cursor after the inserted text
      range.setStartAfter(textNode)
      range.setEndAfter(textNode)
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      // If no selection, append to the end
      const textNode = document.createTextNode(variable)
      editorRef.current.appendChild(textNode)

      // Move cursor to the end
      const newRange = document.createRange()
      newRange.setStartAfter(textNode)
      newRange.setEndAfter(textNode)
      selection?.removeAllRanges()
      selection?.addRange(newRange)
    }

    // Trigger onChange with updated content
    onChange(editorRef.current.innerHTML)
  }

  const insertLink = () => {
    if (linkUrl && linkText) {
      const linkHtml = `<a href="${linkUrl}" style="color: #3b82f6; text-decoration: underline;">${linkText}</a>`
      handleCommand('insertHTML', linkHtml)
      setLinkUrl('')
      setLinkText('')
      setIsLinkPopoverOpen(false)
    }
  }

  const insertImage = () => {
    if (imageUrl) {
      const imgHtml = `<img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;" />`
      handleCommand('insertHTML', imgHtml)
      setImageUrl('')
      setImageAlt('')
      setIsImagePopoverOpen(false)
    }
  }

  const formatButton = (command: string, icon: React.ReactNode, value?: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => handleCommand(command, value)}
      className="h-8 w-8 p-0"
    >
      {icon}
    </Button>
  )

  return (
    <div className={`border rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap items-center gap-2">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 border-r pr-2">
          {formatButton('bold', <Bold className="h-4 w-4" />)}
          {formatButton('italic', <Italic className="h-4 w-4" />)}
          {formatButton('underline', <Underline className="h-4 w-4" />)}
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 border-r pr-2">
          {formatButton('justifyLeft', <AlignLeft className="h-4 w-4" />)}
          {formatButton('justifyCenter', <AlignCenter className="h-4 w-4" />)}
          {formatButton('justifyRight', <AlignRight className="h-4 w-4" />)}
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r pr-2">
          {formatButton('insertUnorderedList', <List className="h-4 w-4" />)}
          {formatButton('insertOrderedList', <ListOrdered className="h-4 w-4" />)}
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Select onValueChange={(value) => handleCommand('fontSize', value)}>
            <SelectTrigger className="w-16 h-8">
              <Type className="h-4 w-4" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Small</SelectItem>
              <SelectItem value="3">Normal</SelectItem>
              <SelectItem value="4">Large</SelectItem>
              <SelectItem value="6">Huge</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="grid grid-cols-6 gap-2">
                {['#000000', '#e11d48', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: color }}
                    onClick={() => handleCommand('foreColor', color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Link */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0">
                <Link className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="link-text">Link Text</Label>
                  <Input
                    id="link-text"
                    placeholder="Click here"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-url">URL</Label>
                  <Input
                    id="link-url"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>
                <Button onClick={insertLink} size="sm" className="w-full">
                  Insert Link
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Image */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Popover open={isImagePopoverOpen} onOpenChange={setIsImagePopoverOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0">
                <Image className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="image-url">Image URL</Label>
                  <Input
                    id="image-url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image-alt">Alt Text (Optional)</Label>
                  <Input
                    id="image-alt"
                    placeholder="Description of the image"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                  />
                </div>
                <Button onClick={insertImage} size="sm" className="w-full">
                  Insert Image
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Personalization Variables */}
        <div className="flex items-center gap-1">
          <Select onValueChange={insertPersonalizationVar}>
            <SelectTrigger className="w-36 h-8">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                <span className="text-xs">Variables</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {personalizationVars.map((variable) => {
                const IconComponent = variable.icon
                return (
                  <SelectItem key={variable.value} value={variable.value}>
                    <div className="flex items-center">
                      <IconComponent className="h-4 w-4 mr-2" />
                      <span>{variable.label}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[300px] p-4 focus:outline-none overflow-y-auto"
        style={{
          fontSize: '14px',
          lineHeight: '1.5',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: '100%'
        }}
        suppressContentEditableWarning
      >
        {!content && (
          <div className="text-gray-400 pointer-events-none">
            {placeholder || "Start typing your email content..."}
          </div>
        )}
      </div>

      {/* Helper text */}
      <div className="border-t p-2 text-xs text-gray-500">
        <p>
          Use the toolbar above to format your email. Click "Variables" to insert personalized content like {`{{first_name}}`}.
          Variables will be replaced with actual contact data when emails are sent.
        </p>
      </div>
    </div>
  )
}
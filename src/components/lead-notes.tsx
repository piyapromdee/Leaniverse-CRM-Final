'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
// Simplified version - removed complex dependencies for now
// TODO: Add back ScrollArea, Command, and Popover components after proper setup
import { MessageSquare, Send, AtSign, Clock, User, Bot, Edit2, Trash2, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format, formatDistanceToNow } from 'date-fns'

interface Note {
  id: string
  lead_id: string
  user_id: string
  note_content: string
  mentions: any[]
  is_system_note: boolean
  created_at: string
  updated_at: string
  profiles: {
    first_name: string
    last_name: string
    avatar_url?: string
  }
}

interface User {
  id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  role: string
  avatar_url?: string
  mention_key: string
}

interface LeadNotesProps {
  leadId: string
  leadName: string
}

export default function LeadNotes({ leadId, leadName }: LeadNotesProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionUsers, setMentionUsers] = useState<User[]>([])
  const [mentionPosition, setMentionPosition] = useState<{ start: number; end: number } | null>(null)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  
  useEffect(() => {
    fetchNotes()
  }, [leadId])

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/notes`)
      const data = await response.json()
      
      if (response.ok) {
        setNotes(data.notes || [])
        if (data.message) {
          console.log('Notes status:', data.message)
        }
      } else {
        console.error('Failed to fetch notes:', data.error || response.statusText)
        // If table doesn't exist, just show empty notes
        if (data.error?.includes('table not created')) {
          console.log('Notes table not yet created. Run the migration in Supabase.')
        }
        setNotes([])
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
      setNotes([]) // Set empty notes on error
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setMentionUsers([])
      return
    }

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      
      if (response.ok) {
        const data = await response.json()
        setMentionUsers(data.users || [])
      } else {
        console.error('User search failed:', response.status)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPosition = e.target.selectionStart
    
    setNewNote(value)

    // Check for @ mentions
    const beforeCursor = value.substring(0, cursorPosition)
    const mentionMatch = beforeCursor.match(/@(\w*)$/)
    
    if (mentionMatch) {
      const [fullMatch, query] = mentionMatch
      const mentionStart = beforeCursor.length - fullMatch.length
      
      setMentionQuery(query)
      setMentionPosition({
        start: mentionStart,
        end: mentionStart + fullMatch.length
      })
      setShowMentionSuggestions(true)
      searchUsers(query)
    } else {
      setShowMentionSuggestions(false)
      setMentionQuery('')
      setMentionPosition(null)
    }
  }

  const selectUser = (user: User) => {
    if (!mentionPosition) return

    const before = newNote.substring(0, mentionPosition.start)
    const after = newNote.substring(mentionPosition.end)
    const mentionText = `@${user.mention_key}`
    
    setNewNote(before + mentionText + after)
    setShowMentionSuggestions(false)
    setMentionQuery('')
    setMentionPosition(null)
    
    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus()
      const newCursorPosition = before.length + mentionText.length
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
        }
      }, 0)
    }
  }

  const submitNote = async () => {
    if (!newNote.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          note_content: newNote.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        setNotes(prev => [...prev, data.note])
        setNewNote('')
        toast.success('Note added successfully')
        
        // Show mention notifications if any
        if (data.note.mentions && data.note.mentions.length > 0) {
          const mentionCount = data.note.mentions.length
          toast.info(`${mentionCount} user${mentionCount > 1 ? 's' : ''} mentioned and notified`)
        }
      } else {
        const errorData = await response.json()
        toast.error('Failed to add note: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error submitting note:', error)
      toast.error('Failed to add note')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      submitNote()
    }
    
    if (e.key === 'Escape' && showMentionSuggestions) {
      setShowMentionSuggestions(false)
    }
  }

  const startEditing = (note: Note) => {
    setEditingNote(note.id)
    setEditContent(note.note_content)
  }

  const cancelEditing = () => {
    setEditingNote(null)
    setEditContent('')
  }

  const saveEdit = async (noteId: string) => {
    if (!editContent.trim()) return

    try {
      const response = await fetch(`/api/leads/${leadId}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          note_content: editContent.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        setNotes(prev => prev.map(note => 
          note.id === noteId ? { ...note, note_content: editContent.trim(), updated_at: new Date().toISOString() } : note
        ))
        setEditingNote(null)
        setEditContent('')
        toast.success('Note updated successfully')
      } else {
        const errorData = await response.json()
        toast.error('Failed to update note: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating note:', error)
      toast.error('Failed to update note')
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/leads/${leadId}/notes/${noteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId))
        toast.success('Note deleted successfully')
      } else {
        const errorData = await response.json()
        toast.error('Failed to delete note: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      toast.error('Failed to delete note')
    }
  }

  const formatNoteContent = (content: string, mentions: any[]) => {
    if (!mentions || mentions.length === 0) {
      return content
    }

    let formattedContent = content
    mentions.forEach(mention => {
      const mentionRegex = new RegExp(`@${mention.username}\\b`, 'g')
      formattedContent = formattedContent.replace(
        mentionRegex,
        `<span class="bg-blue-100 text-blue-800 px-1 rounded">@${mention.username}</span>`
      )
    })
    
    return formattedContent
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Activity & Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Activity & Notes
        </CardTitle>
        <CardDescription>
          Internal communication and activity log for {leadName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notes List */}
        <div className="h-64 overflow-y-auto border rounded-md p-3">
          <div className="space-y-4">
            {notes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notes yet. Add the first note below.</p>
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="flex gap-3 group">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={note.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {note.is_system_note ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        `${note.profiles?.first_name?.[0] || ''}${note.profiles?.last_name?.[0] || ''}`
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {note.is_system_note ? (
                          <span className="flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            System
                          </span>
                        ) : (
                          `${note.profiles?.first_name} ${note.profiles?.last_name}`
                        )}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </span>
                      {note.is_system_note && (
                        <Badge variant="secondary" className="text-xs">
                          System
                        </Badge>
                      )}
                      
                      {/* Edit/Delete Actions - only for non-system notes from current user */}
                      {!note.is_system_note && (
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEditing(note)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteNote(note.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                    
                    {/* Note Content - either editable or display */}
                    {editingNote === note.id ? (
                      <div className="space-y-2">
                        <Textarea
                          ref={editTextareaRef}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(note.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="text-sm text-gray-700 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: formatNoteContent(note.note_content, note.mentions) 
                        }}
                      />
                    )}
                    
                    {note.mentions && note.mentions.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <AtSign className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          Mentioned {note.mentions.length} user{note.mentions.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Add Note Input */}
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Add a note... Use @username to mention team members"
              value={newNote}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] pr-12"
              disabled={submitting}
            />
            
            {/* Mention Suggestions - shown as dropdown list */}
            {showMentionSuggestions && mentionUsers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-[9999] max-h-40 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-gray-500 mb-2">Team Members</div>
                  {mentionUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => selectUser(user)}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer rounded-md"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {user.first_name[0]}{user.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{user.full_name}</div>
                        <div className="text-xs text-gray-500">@{user.mention_key} · {user.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Press Ctrl+Enter to send • Use @ to mention team members
            </p>
            <Button 
              onClick={submitNote} 
              disabled={!newNote.trim() || submitting}
              size="sm"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Add Note
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
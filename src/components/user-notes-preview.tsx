'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MessageSquare, 
  Loader2, 
  AlertCircle,
  Calendar,
  User,
  Paperclip,
  FileIcon,
  Image as ImageIcon,
  ExternalLink,
  Download
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface NoteAttachment {
  id: string
  name: string
  type: string
  size: number
  path: string
  url?: string
  uploadedAt: string
  uploadedBy: string
}

interface UserNote {
  id: string
  content: string
  attachments: NoteAttachment[]
  created_at: string
  updated_at: string
  admin: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
}

interface UserNotesPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  notesCount: number
}

export default function UserNotesPreview({ 
  open, 
  onOpenChange, 
  userId, 
  userName, 
  notesCount 
}: UserNotesPreviewProps) {
  const router = useRouter()
  const [notes, setNotes] = useState<UserNote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && userId) {
      fetchNotes()
    }
  }, [open, userId])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/users/${userId}/notes`)
      const result = await response.json()

      if (response.ok) {
        setNotes(result.notes || [])
      } else {
        setError(result.error || 'Failed to fetch notes')
      }
    } catch (err) {
      setError('An unexpected error occurred while fetching notes')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatAdminName = (admin: UserNote['admin']) => {
    const fullName = [admin.first_name, admin.last_name].filter(Boolean).join(' ')
    return fullName || admin.email
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />
    }
    return <FileIcon className="h-4 w-4" />
  }

  const downloadAttachment = (attachment: NoteAttachment) => {
    if (attachment.url) {
      window.open(attachment.url, '_blank')
    }
  }

  const handleViewAllNotes = () => {
    onOpenChange(false)
    router.push(`/admin/users/${userId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notes for {userName}
          </DialogTitle>
          <DialogDescription>
            {notesCount === 0 
              ? 'This user has no notes yet'
              : `Showing ${Math.min(notes.length, 3)} of ${notesCount} note${notesCount === 1 ? '' : 's'}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : notes.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
              <p className="text-gray-600 mb-4">This user doesn't have any administrative notes.</p>
              <Button onClick={handleViewAllNotes}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Add First Note
              </Button>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2">
              {notes.slice(0, 3).map((note, index) => (
                <div key={note.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {(note.admin.first_name?.[0] || '') + (note.admin.last_name?.[0] || '') || note.admin.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{formatAdminName(note.admin)}</div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(note.created_at)}
                          </span>
                          {note.updated_at !== note.created_at && (
                            <span className="text-gray-400">
                              (edited)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {index === 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Latest
                      </Badge>
                    )}
                  </div>

                  <div className="prose prose-sm max-w-none mb-3">
                    <p className="whitespace-pre-wrap text-gray-900 line-clamp-4">
                      {note.content.length > 200 
                        ? `${note.content.substring(0, 200)}...` 
                        : note.content
                      }
                    </p>
                  </div>

                  {/* Attachments */}
                  {note.attachments && note.attachments.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Paperclip className="h-4 w-4" />
                        <span>{note.attachments.length} attachment{note.attachments.length === 1 ? '' : 's'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {note.attachments.slice(0, 3).map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-2 bg-gray-100 rounded-md px-3 py-2 text-sm"
                          >
                            {getFileIcon(attachment.type)}
                            <span className="truncate max-w-[150px]">{attachment.name}</span>
                            <span className="text-xs text-gray-500">
                              ({formatFileSize(attachment.size)})
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadAttachment(attachment)}
                              className="h-6 w-6 p-0"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {note.attachments.length > 3 && (
                          <div className="flex items-center gap-2 bg-gray-100 rounded-md px-3 py-2 text-sm text-gray-600">
                            +{note.attachments.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Show truncation notice if there are more notes */}
              {notes.length > 3 && (
                <div className="text-center py-4 border-t">
                  <p className="text-sm text-gray-600 mb-3">
                    Showing first 3 notes. {notesCount - 3} more note{notesCount - 3 === 1 ? '' : 's'} available.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with action buttons */}
        <div className="flex-shrink-0 border-t pt-4 flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleViewAllNotes}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {notes.length === 0 ? 'Add Notes' : 'View All Notes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
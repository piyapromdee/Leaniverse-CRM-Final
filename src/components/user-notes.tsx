'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  MessageSquare, 
  Plus, 
  Edit3, 
  Trash2, 
  FileText, 
  Download, 
  Eye, 
  Upload,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  Paperclip,
  Image as ImageIcon,
  FileIcon,
  PlusCircle
} from 'lucide-react'

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

interface UserNotesProps {
  userId: string
  userName: string
}

export default function UserNotes({ userId, userName }: UserNotesProps) {
  const [notes, setNotes] = useState<UserNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Note creation/editing state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<UserNote | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [noteAttachments, setNoteAttachments] = useState<NoteAttachment[]>([])
  const [savingNote, setSavingNote] = useState(false)

  // File upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<UserNote | null>(null)
  const [deletingNote, setDeletingNote] = useState(false)

  useEffect(() => {
    fetchNotes()
  }, [userId])

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

  const handleCreateNote = () => {
    setEditingNote(null)
    setNoteContent('')
    setNoteAttachments([])
    setNoteDialogOpen(true)
    setError(null)
    setMessage(null)
  }

  const handleEditNote = (note: UserNote) => {
    setEditingNote(note)
    setNoteContent(note.content)
    setNoteAttachments(note.attachments || [])
    setNoteDialogOpen(true)
    setError(null)
    setMessage(null)
  }

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      setError('Note content is required')
      return
    }

    setSavingNote(true)
    setError(null)
    setMessage(null)

    try {
      const isEditing = !!editingNote
      const url = isEditing 
        ? `/api/admin/users/${userId}/notes/${editingNote.id}`
        : `/api/admin/users/${userId}/notes`
      
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: noteContent.trim(),
          attachments: noteAttachments
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(isEditing ? 'Note updated successfully!' : 'Note created successfully!')
        setNoteDialogOpen(false)
        setNoteContent('')
        setNoteAttachments([])
        setEditingNote(null)
        await fetchNotes()
        
        // Auto-clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000)
      } else {
        setError(result.error || `Failed to ${isEditing ? 'update' : 'create'} note`)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSavingNote(false)
    }
  }

  const handleDeleteNote = (note: UserNote) => {
    setNoteToDelete(note)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return

    setDeletingNote(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/users/${userId}/notes/${noteToDelete.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('Note deleted successfully!')
        setDeleteDialogOpen(false)
        setNoteToDelete(null)
        await fetchNotes()
        
        // Auto-clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000)
      } else {
        setError(result.error || 'Failed to delete note')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setDeletingNote(false)
    }
  }

  const handleFileUpload = () => {
    setSelectedFiles([])
    setUploadDialogOpen(true)
  }

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
  }

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select files to upload')
      return
    }

    setUploadingFiles(true)
    setError(null)

    try {
      const uploadedAttachments: NoteAttachment[] = []

      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`/api/admin/users/${userId}/notes/attachments`, {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (response.ok) {
          uploadedAttachments.push(result.attachment)
        } else {
          throw new Error(result.error || `Failed to upload ${file.name}`)
        }
      }

      // Add uploaded attachments to current note attachments
      setNoteAttachments(prev => [...prev, ...uploadedAttachments])
      setUploadDialogOpen(false)
      setSelectedFiles([])
      setMessage(`${uploadedAttachments.length} file(s) uploaded successfully!`)
      
      // Auto-clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files')
    } finally {
      setUploadingFiles(false)
    }
  }

  const removeAttachment = async (attachment: NoteAttachment) => {
    try {
      // If this is during note creation/editing, just remove from local state
      setNoteAttachments(prev => prev.filter(a => a.id !== attachment.id))

      // If the attachment exists on server, delete it
      if (attachment.path) {
        await fetch(`/api/admin/users/${userId}/notes/attachments`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: attachment.path }),
        })
      }
    } catch (err) {
      console.error('Error removing attachment:', err)
    }
  }

  const downloadAttachment = (attachment: NoteAttachment) => {
    if (attachment.url) {
      window.open(attachment.url, '_blank')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Admin Notes
            </CardTitle>
            <CardDescription>
              Administrative notes and attachments for {userName}
            </CardDescription>
          </div>
          <Button onClick={handleCreateNote} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Messages */}
        {(error || message) && (
          <div className="space-y-2 mb-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert>
                <AlertDescription className="text-green-800">{message}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
            <p className="text-gray-600 mb-4">Start documenting information about this user.</p>
            <Button onClick={handleCreateNote}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Note
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
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
                            (edited {formatDate(note.updated_at)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditNote(note)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none mb-3">
                  <p className="whitespace-pre-wrap text-gray-900">{note.content}</p>
                </div>

                {/* Attachments */}
                {note.attachments && note.attachments.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Paperclip className="h-4 w-4" />
                      <span>{note.attachments.length} attachment{note.attachments.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {note.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-2 bg-gray-100 rounded-md px-3 py-2 text-sm"
                        >
                          {getFileIcon(attachment.type)}
                          <span className="truncate max-w-[200px]">{attachment.name}</span>
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
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Note Creation/Editing Dialog */}
        <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingNote ? 'Edit Note' : 'Add Note'}
              </DialogTitle>
              <DialogDescription>
                {editingNote ? 'Update the note content and attachments.' : 'Add a new administrative note for this user.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="noteContent">Note Content *</Label>
                <Textarea
                  id="noteContent"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter your note here..."
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Attachments</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFileUpload}
                    type="button"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Files
                  </Button>
                </div>

                {noteAttachments.length > 0 && (
                  <div className="space-y-2">
                    {noteAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          {getFileIcon(attachment.type)}
                          <span className="text-sm truncate max-w-[300px]">{attachment.name}</span>
                          <span className="text-xs text-gray-500">
                            ({formatFileSize(attachment.size)})
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(attachment)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setNoteDialogOpen(false)
                  setError(null)
                }}
                disabled={savingNote}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveNote}
                disabled={savingNote || !noteContent.trim()}
              >
                {savingNote ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingNote ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    {editingNote ? 'Update Note' : 'Create Note'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* File Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload Files</DialogTitle>
              <DialogDescription>
                Select files to attach to this note. Supported formats: images, PDF, text, Word, Excel files (max 10MB each).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fileUpload">Select Files</Label>
                <input
                  id="fileUpload"
                  type="file"
                  multiple
                  onChange={handleFilesSelected}
                  accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx"
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files:</Label>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setUploadDialogOpen(false)
                  setSelectedFiles([])
                  setError(null)
                }}
                disabled={uploadingFiles}
              >
                Cancel
              </Button>
              <Button 
                onClick={uploadFiles}
                disabled={uploadingFiles || selectedFiles.length === 0}
              >
                {uploadingFiles ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Files
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-red-700">Delete Note</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the note and all its attachments.
              </DialogDescription>
            </DialogHeader>
            {noteToDelete && (
              <div className="py-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium mb-2">Note by {formatAdminName(noteToDelete.admin)}</div>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {noteToDelete.content.substring(0, 150)}...
                  </p>
                  {noteToDelete.attachments && noteToDelete.attachments.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {noteToDelete.attachments.length} attachment(s) will also be deleted
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setNoteToDelete(null)
                }}
                disabled={deletingNote}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteNote}
                disabled={deletingNote}
              >
                {deletingNote ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Note
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
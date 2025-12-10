'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Calendar, User, Building, CheckCircle2, Clock, AlertCircle, Edit, Plus, Trash2, Save, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ActivityLogger } from '@/lib/activity-logger'
import Link from 'next/link'

interface Task {
  id: number
  title: string
  description: string
  date: string
  start_time?: string
  priority: string
  status: string
  deal_id?: string
  company_id?: string
  contact_id?: string
  assigned_to?: string
  created_at: string
  user_id: string
  type: string
}

interface TaskNote {
  id: number
  content: string
  timestamp: string
  author: string
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const taskId = parseInt(params?.id as string)
  const [task, setTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [companies, setCompanies] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [availableTeamMembers, setAvailableTeamMembers] = useState<any[]>([])
  
  // Edit states
  const [isEditingDueDate, setIsEditingDueDate] = useState(false)
  const [isEditingAssignee, setIsEditingAssignee] = useState(false)
  const [editDueDate, setEditDueDate] = useState('')
  const [editAssignee, setEditAssignee] = useState('')
  
  // Notes states
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [notes, setNotes] = useState<TaskNote[]>([])
  
  // Reschedule modal
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [rescheduleForm, setRescheduleForm] = useState({
    date: '',
    time: '',
    reason: ''
  })

  const loadTask = async () => {
    try {
      setIsLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      // Load task data
      const { data: taskData, error: taskError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', taskId)
        .or('type.eq.task,type.eq.meeting')
        .single()

      if (taskError) {
        console.error('Error loading task:', taskError)
        return
      }

      if (taskData) {
        setTask(taskData)
        setEditDueDate(taskData.date || '')
        setEditAssignee(taskData.assigned_to || '')
        setRescheduleForm({
          date: taskData.date || '',
          time: taskData.start_time ? taskData.start_time.slice(11, 16) : '',
          reason: ''
        })
      }

      // Load reference data
      const [companiesRes, contactsRes, dealsRes, teamRes] = await Promise.all([
        supabase.from('companies').select('id, name'),
        supabase.from('contacts').select('id, name, company_id'),
        supabase.from('deals').select('id, title'),
        supabase.from('profiles').select('id, first_name, last_name')
      ])

      setCompanies(companiesRes.data || [])
      setContacts(contactsRes.data || [])
      setDeals(dealsRes.data || [])
      setAvailableTeamMembers(teamRes.data || [])

    } catch (error) {
      console.error('Error loading task:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (taskId) {
      loadTask()
    }
  }, [taskId])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleMarkComplete = async () => {
    if (!task) return
    
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ status: 'completed' })
        .eq('id', task.id)

      if (error) {
        console.error('Error updating task:', error)
        alert('Error marking task as complete: ' + error.message)
        return
      }

      setTask({ ...task, status: 'completed' })
      
      // Log activity
      try {
        await ActivityLogger.taskCompleted(
          task.id.toString(),
          task.title,
          {}
        )
      } catch (logError) {
        console.error('Error logging task completion:', logError)
      }
      
      // Add completion note
      const completionNote = {
        id: Date.now(),
        content: 'Task marked as completed',
        timestamp: new Date().toLocaleString(),
        author: 'Current User'
      }
      setNotes([...notes, completionNote])
      
      alert('Task marked as completed!')
    } catch (error) {
      console.error('Error marking task complete:', error)
      alert('Error marking task as complete')
    }
  }

  const handleSaveDueDate = async () => {
    if (!task || !editDueDate) return
    
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ date: editDueDate })
        .eq('id', task.id)

      if (error) {
        console.error('Error updating due date:', error)
        alert('Error updating due date: ' + error.message)
        return
      }

      setTask({ ...task, date: editDueDate })
      setIsEditingDueDate(false)
      
      // Log activity
      try {
        await ActivityLogger.taskUpdated(
          task.id.toString(),
          task.title,
          { field: 'due_date', old_value: task.date, new_value: editDueDate }
        )
      } catch (logError) {
        console.error('Error logging due date update:', logError)
      }
      
      // Add update note
      const updateNote = {
        id: Date.now(),
        content: `Due date updated to ${new Date(editDueDate).toLocaleDateString()}`,
        timestamp: new Date().toLocaleString(),
        author: 'Current User'
      }
      setNotes([...notes, updateNote])
    } catch (error) {
      console.error('Error updating due date:', error)
      alert('Error updating due date')
    }
  }

  const handleSaveAssignee = async () => {
    if (!task || !editAssignee) return
    
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ assigned_to: editAssignee })
        .eq('id', task.id)

      if (error) {
        console.error('Error updating assignee:', error)
        alert('Error updating assignee: ' + error.message)
        return
      }

      setTask({ ...task, assigned_to: editAssignee })
      setIsEditingAssignee(false)
      
      // Log activity
      try {
        await ActivityLogger.taskUpdated(
          task.id.toString(),
          task.title,
          { field: 'assignee', old_value: task.assigned_to, new_value: editAssignee }
        )
      } catch (logError) {
        console.error('Error logging assignee update:', logError)
      }
      
      // Add update note
      const updateNote = {
        id: Date.now(),
        content: `Task reassigned to ${editAssignee}`,
        timestamp: new Date().toLocaleString(),
        author: 'Current User'
      }
      setNotes([...notes, updateNote])
    } catch (error) {
      console.error('Error updating assignee:', error)
      alert('Error updating assignee')
    }
  }

  const handleAddNote = () => {
    if (newNote.trim()) {
      const note = {
        id: Date.now(),
        content: newNote.trim(),
        timestamp: new Date().toLocaleString(),
        author: 'Current User'
      }
      setNotes([...notes, note])
      setNewNote('')
      setIsAddingNote(false)
    }
  }

  const handleDeleteNote = (noteId: number) => {
    if (confirm('Are you sure you want to delete this note?')) {
      setNotes(notes.filter(note => note.id !== noteId))
    }
  }

  const handleReschedule = async () => {
    if (!task || !rescheduleForm.date) return
    
    try {
      const updateData: any = { date: rescheduleForm.date }
      if (rescheduleForm.time) {
        updateData.start_time = `${rescheduleForm.date}T${rescheduleForm.time}:00`
        updateData.end_time = `${rescheduleForm.date}T${rescheduleForm.time}:00`
      }

      const { error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', task.id)

      if (error) {
        console.error('Error rescheduling task:', error)
        alert('Error rescheduling task: ' + error.message)
        return
      }

      setTask({ 
        ...task, 
        date: rescheduleForm.date,
        start_time: rescheduleForm.time ? `${rescheduleForm.date}T${rescheduleForm.time}:00` : task.start_time
      })
      
      // Log activity
      try {
        await ActivityLogger.taskUpdated(
          task.id.toString(),
          task.title,
          { 
            field: 'schedule', 
            old_value: `${task.date}${task.start_time ? ` ${task.start_time}` : ''}`, 
            new_value: `${rescheduleForm.date}${rescheduleForm.time ? ` ${rescheduleForm.time}` : ''}`,
            reason: rescheduleForm.reason 
          }
        )
      } catch (logError) {
        console.error('Error logging reschedule:', logError)
      }
      
      // Add reschedule note
      const rescheduleNote = {
        id: Date.now(),
        content: `Task rescheduled to ${new Date(rescheduleForm.date).toLocaleDateString()}${rescheduleForm.time ? ` at ${rescheduleForm.time}` : ''}${rescheduleForm.reason ? ` - Reason: ${rescheduleForm.reason}` : ''}`,
        timestamp: new Date().toLocaleString(),
        author: 'Current User'
      }
      setNotes([...notes, rescheduleNote])
      setIsRescheduleModalOpen(false)
      setRescheduleForm({ date: '', time: '', reason: '' })
    } catch (error) {
      console.error('Error rescheduling task:', error)
      alert('Error rescheduling task')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Task Not Found</h1>
        <p className="text-gray-600 mb-6">The task you're looking for doesn't exist.</p>
        <Link href="/dashboard/tasks">
          <Button variant="outline" className="border-teal-500 text-teal-500 hover:bg-teal-50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
        </Link>
      </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/tasks">
              <Button variant="outline" size="sm" className="border-teal-500 text-teal-500 hover:bg-teal-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tasks
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Task Details</h1>
              <p className="text-gray-600">View and manage task information</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {task.status !== 'completed' && (
              <>
                <Button 
                  onClick={() => setIsRescheduleModalOpen(true)}
                  variant="outline" 
                  className="border-blue-500 text-blue-500 hover:bg-blue-50"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Reschedule
                </Button>
                <Button onClick={handleMarkComplete} className="bg-green-500 hover:bg-green-600">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Complete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Task Information Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">{task.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {task.description}
                </CardDescription>
              </div>
              <div className="flex space-x-2 ml-4">
                <Badge className={getPriorityColor(task.priority)} variant="outline">
                  {task.priority} Priority
                </Badge>
                <Badge className={getStatusColor(task.status)} variant="outline">
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Editable Due Date */}
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Due Date</p>
                    {isEditingDueDate ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="text-sm"
                        />
                        <Button size="sm" onClick={handleSaveDueDate} className="bg-green-500 hover:bg-green-600">
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsEditingDueDate(false)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-600">
                          {new Date(task.date).toLocaleDateString()} 
                          {task.start_time && ` at ${new Date(task.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                        </p>
                        {task.status !== 'completed' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setIsEditingDueDate(true)}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Editable Assignee */}
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Assigned To</p>
                    {isEditingAssignee ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <Select value={editAssignee} onValueChange={setEditAssignee}>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTeamMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.first_name} {member.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={handleSaveAssignee} className="bg-green-500 hover:bg-green-600">
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsEditingAssignee(false)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-600">{task.assigned_to || 'Unassigned'}</p>
                        {task.status !== 'completed' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setIsEditingAssignee(true)}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Related To</p>
                    <p className="text-sm text-gray-600">
                      {task.deal_id ? `Deal ID: ${task.deal_id}` : 
                       task.company_id ? `Company ID: ${task.company_id}` :
                       task.contact_id ? `Contact ID: ${task.contact_id}` : 'No relation'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-sm text-gray-600">{new Date(task.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Task Notes */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Task Notes & Updates</CardTitle>
                <CardDescription>Track progress and important updates for this task</CardDescription>
              </div>
              {!isAddingNote && (
                <Button 
                  onClick={() => setIsAddingNote(true)}
                  size="sm" 
                  className="bg-teal-500 hover:bg-teal-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Add Note Form */}
              {isAddingNote && (
                <div className="p-4 border border-teal-200 rounded-lg bg-teal-50">
                  <Label htmlFor="newNote" className="text-sm font-medium">Add New Note</Label>
                  <Textarea
                    id="newNote"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter your note here..."
                    className="mt-2"
                    rows={3}
                  />
                  <div className="flex space-x-2 mt-3">
                    <Button onClick={handleAddNote} size="sm" className="bg-teal-500 hover:bg-teal-600">
                      <Plus className="w-3 h-3 mr-1" />
                      Add Note
                    </Button>
                    <Button 
                      onClick={() => {
                        setIsAddingNote(false)
                        setNewNote('')
                      }} 
                      variant="outline" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes List */}
              {notes && notes.length > 0 ? (
                notes.map((note) => (
                  <div key={note.id} className="flex space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                    <div className="w-3 h-3 bg-teal-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 leading-relaxed">{note.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          {note.timestamp} • by {note.author}
                        </p>
                        <Button
                          onClick={() => handleDeleteNote(note.id)}
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notes available for this task.</p>
                  <p className="text-xs">Add your first note to track progress.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reschedule Modal */}
        <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Reschedule Task</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{task.title}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Current due: {new Date(task.date).toLocaleDateString()} 
                  {task.start_time && ` at ${new Date(task.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rescheduleDate">New Date *</Label>
                  <Input
                    id="rescheduleDate"
                    type="date"
                    value={rescheduleForm.date}
                    onChange={(e) => setRescheduleForm({...rescheduleForm, date: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="rescheduleTime">Time</Label>
                  <Input
                    id="rescheduleTime"
                    type="time"
                    value={rescheduleForm.time}
                    onChange={(e) => setRescheduleForm({...rescheduleForm, time: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rescheduleReason">Reason (optional)</Label>
                <Textarea
                  id="rescheduleReason"
                  value={rescheduleForm.reason}
                  onChange={(e) => setRescheduleForm({...rescheduleForm, reason: e.target.value})}
                  placeholder="Why are you rescheduling this task?"
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={() => setIsRescheduleModalOpen(false)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleReschedule} 
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                  disabled={!rescheduleForm.date}
                >
                  Reschedule Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  )
}
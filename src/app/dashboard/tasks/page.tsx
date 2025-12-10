'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckSquare, Plus, Edit, Trash2, Calendar, CheckCircle2, List, LayoutGrid, Phone, Mail, FileText, GripVertical, Users, Target, Coffee, MessageSquare, BarChart3, Handshake, Clock, MapPin, CreditCard, Receipt, FileCheck, Calculator, FolderOpen, DollarSign, TrendingUp, Archive, Activity, User } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { ActivityLogger } from '@/lib/activity-logger'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, DragStartEvent, DragEndEvent, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// --- ESSENTIAL CRM ACTIVITY TYPES ---
const TASK_TYPES = { 
  // Core CRM Activities
  call: { icon: Phone, label: 'Call' }, 
  email: { icon: Mail, label: 'Email' }, 
  meeting: { icon: Calendar, label: 'Meeting' },
  follow_up: { icon: Clock, label: 'Follow-up' },
  presentation: { icon: BarChart3, label: 'Presentation' },
  demo: { icon: Target, label: 'Demo' },
  negotiation: { icon: Handshake, label: 'Negotiation' },
  site_visit: { icon: MapPin, label: 'Site Visit' },
  consultation: { icon: MessageSquare, label: 'Consultation' },
  
  // Sales & Proposals
  proposal: { icon: FileText, label: 'Proposal' },
  contract_review: { icon: FileCheck, label: 'Contract Review' },
  
  // Financial Activities (Streamlined)
  invoice_sent: { icon: Receipt, label: 'Invoice Sent' },
  payment_follow_up: { icon: DollarSign, label: 'Payment Follow-up' },
  payment_received: { icon: CheckCircle2, label: 'Payment Received' },
  
  // Administrative (Essential only)
  document_review: { icon: FileCheck, label: 'Document Review' },
  reporting: { icon: BarChart3, label: 'Reporting' },
  
  // Generic types
  task: { icon: CheckSquare, label: 'Task' },
  activity: { icon: Activity, label: 'Activity' },
  event: { icon: Calendar, label: 'Event' }
};
const TASK_STAGES = [ { id: 'pending', title: 'To Do' }, { id: 'in_progress', title: 'In Progress' }, { id: 'completed', title: 'Completed' } ];
const formatDateDisplay = (dateString: string | null) => { if (!dateString) return 'No due date'; const date = new Date(`${dateString}T00:00:00`); if (isNaN(date.getTime())) return 'No due date'; return format(date, 'MMM dd, yyyy'); };

// Get display label for activity type (fallback for types not in TASK_TYPES)
const getActivityTypeLabel = (type: string) => {
  console.log('🔍 [getActivityTypeLabel] Input type:', type);
  
  // Handle null/undefined/empty types
  if (!type || typeof type !== 'string') {
    console.warn('⚠️ [TASKS] Invalid type received:', type);
    return 'Activity';
  }
  
  const typeLabels: { [key: string]: string } = {
    // Core CRM Activities
    'call': 'Call',
    'email': 'Email',
    'meeting': 'Meeting',
    'follow_up': 'Follow-up',
    'presentation': 'Presentation',
    'demo': 'Demo',
    'negotiation': 'Negotiation',
    'site_visit': 'Site Visit',
    'consultation': 'Consultation',
    
    // Sales & Proposals
    'proposal': 'Proposal',
    'contract_review': 'Contract Review',
    
    // Financial Activities
    'invoice_sent': 'Invoice Sent',
    'payment_follow_up': 'Payment Follow-up',
    'payment_received': 'Payment Received',
    
    // Administrative
    'document_review': 'Document Review',
    'reporting': 'Reporting',
    
    // Generic types
    'task': 'Task',
    'activity': 'Activity',
    'event': 'Event',
    'other': 'Other'
  };
  const result = typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  console.log('🔍 [getActivityTypeLabel] Result for', type, ':', result);
  return result;
};

// Priority color styling matching Deals section
const getPriorityColor = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'bg-red-100 text-red-600 px-2 py-1 rounded-md text-xs font-medium'
    case 'medium': return 'bg-yellow-100 text-yellow-600 px-2 py-1 rounded-md text-xs font-medium'
    case 'low': return 'bg-green-100 text-green-600 px-2 py-1 rounded-md text-xs font-medium'
    default: return 'bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium'
  }
};

const getPriorityLabel = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'High'
    case 'medium': return 'Medium'
    case 'low': return 'Low'
    default: return priority
  }
};

// Note: Task types are now stored in description metadata as __UI_TYPE__:type_name
// This allows unlimited type flexibility without database constraints

// Extract UI type from description metadata
// Clean description by removing metadata
const cleanDescription = (description: string) => {
  if (!description) return '';
  return description.replace(/\n__UI_TYPE__:[a-z_]+$/, '').trim();
};

// Activity type color styling (streamlined)
const getActivityTypeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    // Core CRM Activities
    case 'call': return 'bg-blue-100 text-blue-600 px-2 py-1 rounded-md text-xs font-medium'
    case 'email': return 'bg-purple-100 text-purple-600 px-2 py-1 rounded-md text-xs font-medium'
    case 'meeting': return 'bg-green-100 text-green-600 px-2 py-1 rounded-md text-xs font-medium'
    case 'follow_up': return 'bg-yellow-100 text-yellow-600 px-2 py-1 rounded-md text-xs font-medium'
    case 'presentation': return 'bg-indigo-100 text-indigo-600 px-2 py-1 rounded-md text-xs font-medium'
    case 'demo': return 'bg-teal-100 text-teal-600 px-2 py-1 rounded-md text-xs font-medium'
    case 'negotiation': return 'bg-red-100 text-red-600 px-2 py-1 rounded-md text-xs font-medium'
    case 'site_visit': return 'bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md text-xs font-medium'
    case 'consultation': return 'bg-violet-100 text-violet-600 px-2 py-1 rounded-md text-xs font-medium'
    
    // Sales & Proposals
    case 'proposal': return 'bg-orange-100 text-orange-600 px-2 py-1 rounded-md text-xs font-medium'
    case 'contract_review': return 'bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-medium'
    
    // Financial Activities
    case 'invoice_sent': return 'bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-medium'
    case 'payment_follow_up': return 'bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-medium'
    case 'payment_received': return 'bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-medium'
    
    // Administrative
    case 'document_review': return 'bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium'
    case 'reporting': return 'bg-cyan-100 text-cyan-700 px-2 py-1 rounded-md text-xs font-medium'
    
    default: return 'bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium'
  }
};

// Helper function to get user initials
function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return '?'
}

// Main Component Wrapper
export default function TasksPageWithSuspense() { 
  return ( 
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
      <TasksPage />
    </Suspense> 
  ) 
}

function TasksPage() {
  const [allTasks, setAllTasks]          = useState<any[]>([])
  const [currentUser, setCurrentUser]    = useState<any>(null)
  const [userProfile, setUserProfile]    = useState<any>(null)
  const [isLoading, setIsLoading]       = useState(true)
  const [searchTerm, setSearchTerm]       = useState('')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [typeFilter, setTypeFilter]       = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState<'me' | 'all'>('me') // Default to "Me"
  const [dateRange, setDateRange]         = useState<DateRange | undefined>(undefined)
  const [viewMode, setViewMode]         = useState<'list' | 'kanban'>('list')
  const [isModalOpen, setIsModalOpen]     = useState(false)
  const [editingTask, setEditingTask]     = useState<any>(null)
  const [activeDragId, setActiveDragId]   = useState<string | null>(null)
  const [sortBy, setSortBy] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tasks-sortBy') || 'created_at'
    }
    return 'created_at'
  })
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('tasks-sortOrder') as 'asc' | 'desc') || 'desc'
    }
    return 'desc'
  })
  const [newTask, setNewTask]           = useState({ title: '', description: '', date: '', priority: 'Medium', status: 'pending', type: 'call', deal_id: null as string | null, company_id: null as string | null, contact_id: null as string | null, assigned_to: '' })
  const [companies, setCompanies]       = useState<any[]>([])
  const [contacts, setContacts]         = useState<any[]>([])
  const [deals, setDeals]              = useState<any[]>([])
  const [teamMembers, setTeamMembers]     = useState<any[]>([])
  
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { 
        distance: 10
      },
    })
  );

  const loadData = async () => {
    setIsLoading(true);
    console.log('🚀 [TASKS] Starting loadData at:', new Date().toISOString());
    
    try {
      console.log('🔍 [TASKS] Step 1: Getting authenticated user...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('🔥 [TASKS] Auth error:', authError);
        setAllTasks([]);
        setIsLoading(false);
        return;
      }
      
      if (!user) {
        console.log('🔥 [TASKS] No user found - setting empty data and stopping');
        setAllTasks([]);
        setCompanies([]);
        setContacts([]);
        setDeals([]);
        setTeamMembers([]);
        setIsLoading(false);
        return;
      }

      console.log('✅ [TASKS] User authenticated:', user.id);

      console.log('🔍 [TASKS] Step 2: Loading user profile...');
      const profileRes = await supabase.from('profiles').select('*, role').eq('id', user.id).single();
      if (profileRes.error) {
        console.error('🔥 [TASKS] Profile error:', profileRes.error);
        // Don't throw - just continue with default data
        setUserProfile({ id: user.id, role: 'user' });
      } else {
        setUserProfile(profileRes.data);
        console.log('✅ [TASKS] Profile loaded:', profileRes.data?.role);
      }

      // STEP 3: Load tasks from API endpoint (same as dashboard)
      console.log('🔍 [TASKS] Step 3: Loading tasks from API...');
      let tasksToUse = [];
      
      try {
        console.log('🔍 [TASKS] Fetching tasks from /api/tasks endpoint...');
        const tasksResponse = await fetch('/api/tasks');
        const tasksData = await tasksResponse.json();

        console.log('🔍 [TASKS] API response:', {
          status: tasksResponse.status,
          ok: tasksResponse.ok,
          success: tasksData.success,
          hasData: !!tasksData.data,
          hasTasks: !!tasksData.data?.tasks,
          tasksCount: tasksData.data?.tasks?.length || 0,
          fullResponse: tasksData
        });

        // API returns { success: true, data: { tasks: [...] } }
        if (tasksResponse.ok && tasksData.success && tasksData.data?.tasks) {
          console.log('✅ [TASKS] Successfully loaded tasks from API');
          console.log('🔍 [TASKS] Tasks data:', tasksData.data.tasks);

          // Process the tasks to match the format expected by the UI
          tasksToUse = tasksData.data.tasks.map((task: any) => {
            const processedTask = {
              ...task,
              status: task.status || 'pending',
              priority: task.priority || 'Medium',
              type: task.type || 'task',
              due_date: task.date,
              assigned_to: task.assigned_to || null,
              // Ensure consistency with UI expectations
              title: task.title || 'Untitled Task',
              description: task.description || ''
            };
            console.log('🔍 [TASKS] Processed task:', processedTask.id, processedTask.title, 'Status:', processedTask.status, 'Date:', processedTask.date, 'Assigned to:', processedTask.assigned_to);
            return processedTask;
          });
          
          console.log('✅ [TASKS] Using API tasks:', tasksToUse.length);
          console.log('✅ [TASKS] All tasks:', tasksToUse);
        } else {
          // Handle API errors
          const errorMessage = tasksData.error || tasksData.message || 'Unknown error';
          const errorDetails = tasksData.details || '';
          console.error('🔥 [TASKS] Failed to load tasks from API:');
          console.error('  - Status:', tasksResponse.status);
          console.error('  - Message:', errorMessage);
          console.error('  - Details:', errorDetails);
          console.error('  - Full response:', tasksData);
          tasksToUse = [];
        }
      } catch (taskError) {
        console.error('🔥 [TASKS] Task loading failed:', taskError);
        tasksToUse = [];
      }
      
      console.log('🔍 [TASKS] Step 4: Setting tasks data...');
      
      // Don't create sample tasks - we have real data from the API
      if (tasksToUse.length === 0) {
        console.log('⚠️ [TASKS] No tasks found in API');
      }
      
      setAllTasks(tasksToUse);
      console.log('✅ [TASKS] Tasks set:', tasksToUse.length);

      // STEP 5: Load reference data (simplified and with error handling)
      try {
        console.log('🔍 [TASKS] Loading reference data (companies, contacts, deals, team)...');
        const [companiesRes, contactsRes, dealsRes, teamRes] = await Promise.all([
          supabase.from('companies').select('id, name'),
          supabase.from('contacts').select('id, name, company_id'),
          supabase.from('deals').select('id, title'),
          supabase.from('profiles').select('id, first_name, last_name')
        ]);

        console.log('🔍 [TASKS] Reference data queries completed');
        console.log('🔍 [TASKS] Companies:', companiesRes.data?.length || 0);
        console.log('🔍 [TASKS] Contacts:', contactsRes.data?.length || 0);
        console.log('🔍 [TASKS] Deals:', dealsRes.data?.length || 0);
        console.log('🔍 [TASKS] Team members:', teamRes.data?.length || 0);

        setCompanies(companiesRes.data || []);
        setContacts(contactsRes.data || []);
        setDeals(dealsRes.data || []);
        setTeamMembers(teamRes.data || []);
        console.log('✅ [TASKS] Reference data loaded and state updated');
      } catch (refError) {
        console.error('⚠️ [TASKS] Reference data error (non-critical):', refError);
        // Set empty arrays as fallback
        setCompanies([]);
        setContacts([]);
        setDeals([]);
        setTeamMembers([]);
      }
      
      console.log('✅ [TASKS] All data loading completed successfully');

    } catch (error: any) {
      console.error("🔥 [TASKS] Critical error:", error.message || error);
      console.error("🔥 [TASKS] Error stack:", error.stack);
      console.error("🔥 [TASKS] Full error object:", JSON.stringify(error, null, 2));
      // Set empty data to prevent crashes
      setAllTasks([]);
      setCompanies([]);
      setContacts([]);
      setDeals([]);
      setTeamMembers([]);
    } finally {
      console.log('🏁 [TASKS] LoadData finally block - setting loading to false');
      setIsLoading(false);
      console.log('🏁 [TASKS] LoadData completed');
    }
  };

  useEffect(() => { loadData(); }, []);
  
  useEffect(() => { 
    const urlStatus = searchParams.get('status') || 'all';
    console.log('🔍 [TASKS] URL status filter:', urlStatus);
    setStatusFilter(urlStatus); 
  }, [searchParams]);


  useEffect(() => {
    localStorage.setItem('tasks-sortBy', sortBy)
    localStorage.setItem('tasks-sortOrder', sortOrder)
  }, [sortBy, sortOrder])

  const handleStatusChange = (newStatus: string) => { setStatusFilter(newStatus); router.push(`/dashboard/tasks?status=${newStatus}`); }

  const filteredTasks = React.useMemo(() => {
    console.log('🔍 [TASKS] Filtering and sorting tasks...');
    console.log('🔍 [TASKS] All tasks count:', allTasks?.length || 0);
    console.log('🔍 [TASKS] Assignee filter:', assigneeFilter);
    console.log('🔍 [TASKS] Status filter:', statusFilter);
    console.log('🔍 [TASKS] Search term:', searchTerm);
    console.log('🔍 [TASKS] Type filter:', typeFilter);
    console.log('🔍 [TASKS] Sort by:', sortBy, 'Sort order:', sortOrder);

    if (!allTasks || allTasks.length === 0) {
      console.log('🔍 [TASKS] No tasks to filter - returning empty array');
      return [];
    }

    // Filter tasks by assignee, search, status, type, and date
    const filtered = allTasks.filter(task => {
      // Basic safety checks
      if (!task || typeof task !== 'object') {
        return false;
      }

      if (!task.title) {
        return false;
      }

      // Assignee filter (applied first)
      if (assigneeFilter === 'me') {
        // Only show tasks assigned to current user
        if (!userProfile?.id || task.assigned_to !== userProfile.id) {
          return false;
        }
      }
      // If assigneeFilter === 'all', show all tasks (no filtering needed)

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesSearch = (
          task.title?.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.type?.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
          // Check if task is overdue (has date, past due, and not completed)
          if (!task.date) return false;
          try {
            const date = new Date(task.date);
            const isOverdue = isPast(date) && !isToday(date) && (task.status || 'pending') !== 'completed';
            if (!isOverdue) return false;
          } catch {
            return false;
          }
        } else {
          const taskStatus = task.status || 'pending';
          if (taskStatus !== statusFilter) return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all') {
        if (task.type !== typeFilter) return false;
      }

      return true;
    });

    // Sort filtered tasks
    const sorted = [...filtered].sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'title':
          valueA = a.title?.toLowerCase() || '';
          valueB = b.title?.toLowerCase() || '';
          break;
        case 'date':
        case 'due_date':
          valueA = a.date ? new Date(a.date).getTime() : 0;
          valueB = b.date ? new Date(b.date).getTime() : 0;
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          valueA = priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] || 0;
          valueB = priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] || 0;
          break;
        case 'status':
          const statusOrder = { pending: 1, in_progress: 2, completed: 3 };
          valueA = statusOrder[a.status as keyof typeof statusOrder] || 0;
          valueB = statusOrder[b.status as keyof typeof statusOrder] || 0;
          break;
        case 'type':
          valueA = a.type?.toLowerCase() || '';
          valueB = b.type?.toLowerCase() || '';
          break;
        case 'created_at':
        default:
          valueA = a.created_at ? new Date(a.created_at).getTime() : 0;
          valueB = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    console.log('🔍 [TASKS] Filtered and sorted tasks count:', sorted.length);
    if (sorted.length > 0) {
      console.log('🔍 [TASKS] First sorted task:', sorted[0]);
    }

    return sorted;
  }, [allTasks, assigneeFilter, userProfile, statusFilter, searchTerm, typeFilter, dateRange, sortBy, sortOrder]);

  const stats = React.useMemo(() => {
    if (!allTasks || allTasks.length === 0) {
      return { pending: 0, in_progress: 0, completed: 0, overdue: 0, total: 0 };
    }

    // Apply assignee filter first to get base set of tasks
    let tasksForStats = allTasks.filter(t => t && typeof t === 'object');

    if (assigneeFilter === 'me' && userProfile?.id) {
      tasksForStats = tasksForStats.filter(t => t.assigned_to === userProfile.id);
    }

    const stats = {
      pending: tasksForStats.filter(t => (t.status || 'pending') === 'pending').length,
      in_progress: tasksForStats.filter(t => (t.status || 'pending') === 'in_progress').length,
      completed: tasksForStats.filter(t => (t.status || 'pending') === 'completed').length,
      overdue: tasksForStats.filter(t => {
        if (!t.date) return false;
        try {
          const date = new Date(t.date);
          return isPast(date) && !isToday(date) && (t.status || 'pending') !== 'completed';
        } catch {
          return false;
        }
      }).length,
      total: tasksForStats.length
    };

    console.log('🔍 [TASKS] Calculated stats:', stats);
    return stats;
  }, [allTasks, assigneeFilter, userProfile]);

  const handleOpenModal = (task: any | null = null) => {
    if (task) {
      setEditingTask(task);
      const uiType = task.type; // Use the actual database type field
      const cleanDesc = cleanDescription(task.description || '');
      setNewTask({ 
        title: task.title, 
        description: cleanDesc, 
        date: task.date || '', 
        priority: task.priority || 'Medium', 
        status: task.status || 'pending',
        type: uiType, 
        deal_id: task.deal_id, 
        company_id: task.company_id, 
        contact_id: task.contact_id, 
        assigned_to: task.assigned_to || '' 
      });
    } else {
      setEditingTask(null);
      setNewTask({ 
        title: '', 
        description: '', 
        date: '', 
        priority: 'Medium', 
        status: 'pending',
        type: 'call', 
        deal_id: null, 
        company_id: null, 
        contact_id: null, 
        assigned_to: userProfile?.id || '' 
      });
    }
    setIsModalOpen(true);
  }

  const handleSaveTask = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Basic validation
    if (!newTask.title.trim()) {
      alert("Please enter a title for the task.");
      return;
    }
    
    // Check if we're trying to edit test data
    if (editingTask && editingTask.isTestData) {
      alert("Cannot edit test data. Please create a new task or contact your administrator to set up the database properly.");
      return;
    }
    
    // Prepare data for calendar_events table
    console.log('🔍 [TASKS] Preparing task data for calendar_events table');
    
    // Helper function to map UI types to database-allowed types
    const mapActivityType = (uiType: string | undefined) => {
      if (!uiType) return 'activity';
      
      const normalizedType = uiType.toLowerCase().replace(/[\s\-]+/g, '_');
      
      const typeMapping: { [key: string]: string } = {
        'call': 'call',
        'meeting': 'meeting',
        'task': 'task',
        'appointment': 'appointment',
        'site_visit': 'site_visit',
        'site visit': 'site_visit',
        'traveling': 'traveling',
        'email': 'email',
        'follow_up': 'follow_up',
        'follow up': 'follow_up',
        'presentation': 'presentation',
        'negotiation': 'negotiation',
        'proposal': 'proposal',
        'demo': 'demo',
        'training': 'training',
        'planning': 'planning',
        'research': 'research',
        'documentation': 'documentation',
        'reporting': 'reporting',
        
        // Financial Activities - FIX for user's issue
        'invoice_sent': 'invoice_sent',
        'invoice sent': 'invoice_sent',
        'payment_follow_up': 'payment_follow_up',
        'payment_follow-up': 'payment_follow_up',
        'payment follow-up': 'payment_follow_up',
        'payment follow up': 'payment_follow_up',
        'payment_received': 'payment_received',
        'payment received': 'payment_received',
        'consultation': 'consultation',
        'contract_review': 'contract_review',
        'contract review': 'contract_review',
        'document_review': 'document_review',
        'document review': 'document_review',
        'deal_review': 'deal_review',
        'deal review': 'deal_review',
        'closing': 'closing',
        'lead_qualification': 'lead_qualification',
        'lead qualification': 'lead_qualification'
      };
      
      return typeMapping[normalizedType] || 'activity';
    };

    // Map the UI type to database-allowed type
    const mappedType = mapActivityType(newTask.type);
    console.log(`✅ [TASKS] Type mapping: ${newTask.type} → ${mappedType}`);

    // Map to calendar_events schema (id, user_id, title, description, type, date, start_time, end_time, status, priority, etc.)
    const taskData: any = { 
        title: newTask.title.trim(),
        user_id: user.id, 
        status: newTask.status || 'pending',
        date: newTask.date, // calendar_events uses 'date'
        priority: newTask.priority || 'Medium',
        type: mappedType, // Use the mapped type that's safe for database
        start_time: `${newTask.date || new Date().toISOString().split('T')[0]}T09:00:00`, // Full timestamp format
        end_time: `${newTask.date || new Date().toISOString().split('T')[0]}T10:00:00`, // Full timestamp format
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // Add description (clean, without metadata)
    taskData.description = newTask.description && newTask.description.trim() ? newTask.description.trim() : '';
    
    // Add foreign key relationships if specified
    if (newTask.deal_id && newTask.deal_id !== 'none') {
        taskData.deal_id = newTask.deal_id;
    }
    if (newTask.company_id && newTask.company_id !== 'none') {
        taskData.company_id = newTask.company_id;
    }
    if (newTask.contact_id && newTask.contact_id !== 'none') {
        taskData.contact_id = newTask.contact_id;
    }
    if (newTask.assigned_to && newTask.assigned_to !== 'none' && newTask.assigned_to !== '') {
        taskData.assigned_to = newTask.assigned_to;
    }

    console.log("🔍 [TASKS] Saving task with data:", JSON.stringify(taskData, null, 2));
    console.log("🔍 [TASKS] Is editing existing task:", !!editingTask);
    if (editingTask) {
      console.log("🔍 [TASKS] Editing task ID:", editingTask.id, "Type:", typeof editingTask.id);
    }
    console.log("🔍 [TASKS] Raw form data:", JSON.stringify(newTask, null, 2));
    
    // Test database access first
    console.log("🔍 [TASKS] Testing database access...");
    const testQuery = await supabase.from('calendar_events').select('count');
    console.log("🔍 [TASKS] Database test result:", testQuery);
    
    try {
      const result = editingTask ? 
        await supabase.from('calendar_events').update(taskData).eq('id', editingTask.id).select() : 
        await supabase.from('calendar_events').insert([taskData]).select();
      
      if (result.error) {
        console.error("🔥 [TASKS] Save error:", result.error);
        console.error("🔥 [TASKS] Error details:", JSON.stringify(result.error, null, 2));
        console.error("🔥 [TASKS] Error message:", result.error.message);
        console.error("🔥 [TASKS] Error code:", result.error.code);
        console.error("🔥 [TASKS] Error hint:", result.error.hint);
        console.error("🔥 [TASKS] Task data being saved:", JSON.stringify(taskData, null, 2));
        console.error("🔥 [TASKS] Original type from form:", newTask.type);
        console.error("🔥 [TASKS] Mapped type for database:", mappedType);
        
        if (result.error.message?.includes('calendar_events_type_check')) {
          alert(`Database constraint error!\n\nOriginal type: "${newTask.type}"\nMapped type: "${mappedType}"\n\nPlease run the IMMEDIATE_FIX.sql script in Supabase to fix this permanently.\n\nError: ${result.error.message}`);
        } else {
          alert("Error saving task: " + (result.error.message || "Unknown error. Check console for details."));
        }
      } else {
        console.log("✅ [TASKS] Task saved successfully:", result.data);
        
        // Force refresh the tasks list to show the new activity
        console.log("🔄 [TASKS] Refreshing tasks list to show new activity...");
        await loadData(); // Reload the tasks
        
        // Log activity
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (editingTask) {
            const updatedTask = result.data?.[0]
            await ActivityLogger.taskUpdated(
              editingTask.id.toString(), 
              taskData.title,
              { previous_data: editingTask, new_data: updatedTask, user_id: user?.id }
            )
          } else {
            const createdTask = result.data?.[0]
            await ActivityLogger.taskCreated(
              createdTask?.id?.toString() || 'unknown', 
              taskData.title,
              { status: taskData.status, type: taskData.type, user_id: user?.id }
            )
          }
        } catch (logError) {
          console.warn('⚠️ [TASKS] Activity logging failed (non-critical):', logError)
        }
        
        // Reset form and close modal
        setNewTask({ title: '', description: '', date: '', priority: 'Medium', status: 'pending', type: 'call', deal_id: null, company_id: null, contact_id: null, assigned_to: '' });
        setEditingTask(null);
        setIsModalOpen(false);
        // Data already reloaded above
      }
    } catch (error: any) {
      console.error("🔥 [TASKS] Unexpected save error:", error);
      alert("Unexpected error saving task: " + error.message);
    }
  }

  const handleDeleteTask = async (taskId: number) => { 
    const task = allTasks.find(t => t.id === taskId);
    if (task && task.isTestData) {
      alert("Cannot delete test data. Please contact your administrator to set up the database properly.");
      return;
    }
    
    const taskTitle = task?.title || 'Unknown Task'
    
    if (window.confirm("Are you sure?")) { 
      const { error } = await supabase.from('calendar_events').delete().eq('id', taskId); 
      if (error) {
        alert("Error deleting task: " + error.message);
      } else {
        // Log activity
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await ActivityLogger.taskDeleted(taskId.toString(), taskTitle, {
            status: task?.status,
            type: task?.type,
            user_id: user?.id
          })
        } catch (logError) {
          console.warn('⚠️ [TASKS] Activity logging failed (non-critical):', logError)
        }
        
        loadData();
      }
    } 
  };
  
  const handleToggleComplete = async (task: any) => { 
    console.log('🔍 [TASKS] Toggle Complete clicked for task:', task.title, 'Current status:', task.status);
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    console.log('🔍 [TASKS] New status will be:', newStatus);
    
    if (task.isTestData) {
      console.log('⚠️ [TASKS] Attempting to toggle test data - will try to create real data instead');
      
      // Try to create a real task in the database based on the test data
      // Start with minimal required fields
      const realTaskData: any = {
        title: task.title || 'Untitled Task',
        status: newStatus,
        user_id: task.user_id
      };
      
      // Add optional fields only if they exist
      if (task.description) realTaskData.description = task.description;
      if (task.date) realTaskData.date = task.date; // Use 'date' field for calendar_events table
      
      if (task.priority) {
        realTaskData.priority = task.priority;
        console.log('🔍 [TASKS] Using priority in toggle:', task.priority);
      }
      
      // Note: 'type' is stored in description metadata, not as separate field
      // Note: tasks table doesn't have start_time/end_time, only due_date
      
      const { data: newTask, error: createError } = await supabase
        .from('calendar_events')
        .insert([realTaskData])
        .select()
        .single();
      
      if (createError) {
        console.error('🔥 [TASKS] Failed to create real task in toggle:');
        console.error('🔥 [TASKS] Error message:', createError.message);
        console.error('🔥 [TASKS] Error code:', createError.code);
        console.error('🔥 [TASKS] Error details:', createError.details);
        console.error('🔥 [TASKS] Error hint:', createError.hint);
        console.error('🔥 [TASKS] Full error object:', JSON.stringify(createError, null, 2));
        console.error('🔥 [TASKS] Task data being inserted:', JSON.stringify(realTaskData, null, 2));
        alert(`Database error: ${createError.message || 'Unknown error'}. Check console for details.`);
      } else {
        console.log('✅ [TASKS] Successfully created real task:', newTask);
        loadData(); // Reload to show real data
      }
      return;
    }
    
    // Handle real data - use API for admin/owner to bypass RLS
    console.log('🔍 [TASKS] Updating task ID:', task.id, 'to status:', newStatus);

    let error = null;
    if (userProfile?.role === 'admin' || userProfile?.role === 'owner') {
      // Admin/Owner - use API to bypass RLS
      console.log('🔄 [TASKS] Admin/Owner user - using API to update task');
      try {
        const response = await fetch(`/api/admin/team-calendar/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          error = { message: errorData.error || 'Failed to update task' };
        } else {
          console.log('✅ [TASKS] Task updated via API');
        }
      } catch (fetchError: any) {
        error = { message: fetchError.message || 'Network error' };
      }
    } else {
      // Regular user - use client-side Supabase
      console.log('🔄 [TASKS] Regular user - using client-side update');
      const result = await supabase.from('calendar_events').update({ status: newStatus }).eq('id', task.id);
      error = result.error;
    }

    if (error) {
      console.error('🔥 [TASKS] Error updating task status:', error);
      alert("Error updating task status: " + error.message);
    } else {
      console.log('✅ [TASKS] Successfully toggled task status from', task.status, 'to', newStatus);

      // Log activity
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (newStatus === 'completed') {
          await ActivityLogger.taskCompleted(task.id.toString(), task.title, { user_id: user?.id })
        } else {
          await ActivityLogger.taskStatusChanged(
            task.id.toString(),
            task.title,
            task.status,
            newStatus,
            { user_id: user?.id }
          )
        }
      } catch (logError) {
        console.warn('⚠️ [TASKS] Activity logging failed (non-critical):', logError)
      }

      loadData();
    }
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    
    console.log('🔍 [DRAG END] Active:', active.id, 'Over:', over?.id);
    
    if (!over || !active.id) {
      console.log('🔍 [DRAG END] No valid drop target');
      return;
    }
    
    // Find the task being dragged
    const task = allTasks.find(t => String(t.id) === String(active.id));
    if (!task) {
      console.error('🔥 [DRAG END] Task not found:', active.id);
      return;
    }
    
    // Determine the new status based on what we're dropping over
    let newStatus: string;
    
    // Check if we're dropping over a column (droppable) or another task (sortable)
    if (over.data.current?.sortable) {
      // Dropped over another task - find which column that task is in
      const overTask = allTasks.find(t => String(t.id) === String(over.id));
      if (!overTask) {
        console.error('🔥 [DRAG END] Over task not found:', over.id);
        return;
      }
      newStatus = overTask.status;
      console.log('🔍 [DRAG END] Dropped over task:', overTask.title, 'in status:', newStatus);
    } else {
      // Dropped over a column directly
      newStatus = String(over.id);
      console.log('🔍 [DRAG END] Dropped in column:', newStatus);
    }
    
    // Check if status actually changed
    if (task.status === newStatus) {
      console.log('🔍 [DRAG END] Status unchanged');
      return;
    }
    
    console.log('🔍 [DRAG END] Updating task:', task.title, 'from', task.status, 'to', newStatus);
    
    // Validate the new status
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(newStatus)) {
      console.error('🔥 [DRAG END] Invalid status:', newStatus);
      return;
    }
    
    // Optimistically update the UI
    setAllTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: newStatus } : t
    ));
    
    // Update in database
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ status: newStatus })
        .eq('id', task.id);
      
      if (error) {
        console.error('🔥 [DRAG END] Database error:', error);
        // Revert optimistic update
        setAllTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, status: task.status } : t
        ));
        alert('Failed to update task status. Please try again.');
        return;
      }
      
      console.log('✅ [DRAG END] Successfully updated task status');
      
      // Log activity
      try {
        const statusNames = {
          'pending': 'To Do',
          'in_progress': 'In Progress',
          'completed': 'Completed'
        };
        
        const { data: { user } } = await supabase.auth.getUser();
        await ActivityLogger.taskMoved(
          task.id.toString(),
          task.title || 'Unknown Task',
          statusNames[newStatus as keyof typeof statusNames] || newStatus,
          { user_id: user?.id }
        );
      } catch (logError) {
        console.warn('⚠️ [DRAG END] Activity logging failed:', logError);
      }
      
      // Refresh data to ensure consistency
      loadData();
    } catch (err) {
      console.error('🔥 [DRAG END] Unexpected error:', err);
      // Revert optimistic update
      setAllTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: task.status } : t
      ));
    }
  }
  
  const handleDragStart = (event: DragStartEvent) => { 
    setActiveDragId(String(event.active.id)); 
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
      <div className="space-y-6 p-4 md:p-6 lg:px-12 lg:py-8 min-h-screen">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
                <p className="text-gray-600">Manage your to-do list and sales activities</p>
            </div>
            <div className="flex items-center gap-2">
                <div className="bg-white border rounded-lg p-1 flex items-center">
                    <Button variant={viewMode === 'list' ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode('list')}>
                        <List className="w-4 h-4" />
                    </Button>
                    <Button variant={viewMode === 'kanban' ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode('kanban')}>
                        <LayoutGrid className="w-4 h-4" />
                    </Button>
                </div>
                <Button onClick={() => handleOpenModal(null)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Activity
                </Button>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <Card onClick={() => handleStatusChange('pending')} className="cursor-pointer hover:border-blue-400"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">To Do</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.pending}</div></CardContent></Card>
          <Card onClick={() => handleStatusChange('in_progress')} className="cursor-pointer hover:border-orange-400"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">In Progress</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.in_progress}</div></CardContent></Card>
          <Card onClick={() => handleStatusChange('completed')} className="cursor-pointer hover:border-green-400"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.completed}</div></CardContent></Card>
          <Card onClick={() => handleStatusChange('overdue')} className="cursor-pointer hover:border-red-400"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Overdue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{stats.overdue}</div></CardContent></Card>
          <Card onClick={() => handleStatusChange('all')} className="cursor-pointer hover:border-gray-400"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative">
            <CheckSquare className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[200px]"
            />
          </div>

          <Select value={assigneeFilter} onValueChange={(value) => setAssigneeFilter(value as 'me' | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">Me (My Tasks)</SelectItem>
              <SelectItem value="all">All Team Members</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(TASK_TYPES).map(([key, {label}]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Created Date</SelectItem>
              <SelectItem value="date">Due Date</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              {(sortBy === 'title' || sortBy === 'type') ? (
                <>
                  <SelectItem value="asc">A to Z</SelectItem>
                  <SelectItem value="desc">Z to A</SelectItem>
                </>
              ) : sortBy === 'priority' ? (
                <>
                  <SelectItem value="desc">High to Low</SelectItem>
                  <SelectItem value="asc">Low to High</SelectItem>
                </>
              ) : sortBy === 'status' ? (
                <>
                  <SelectItem value="asc">To Do First</SelectItem>
                  <SelectItem value="desc">Completed First</SelectItem>
                </>
              ) : sortBy === 'date' ? (
                <>
                  <SelectItem value="asc">Due Soon</SelectItem>
                  <SelectItem value="desc">Due Later</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        </div>

        {viewMode === 'list' ? (
        <Card>
          <CardHeader><CardTitle>Activity List ({filteredTasks.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
                {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => {
                        const uiType = task.type; // Use the actual database type field
                        const TaskIcon = TASK_TYPES[uiType as keyof typeof TASK_TYPES]?.icon || CheckSquare;
                        const displayLabel = TASK_TYPES[uiType as keyof typeof TASK_TYPES]?.label || getActivityTypeLabel(uiType);
                        // Enhanced debugging for ALL tasks to understand badge issue
                        console.log('🔍 [TASK DEBUG] Task:', task.title);
                        console.log('🔍 [TASK DEBUG] Raw Type:', task.type);
                        console.log('🔍 [TASK DEBUG] UI Type:', uiType);
                        console.log('🔍 [TASK DEBUG] Display Label:', displayLabel);
                        console.log('🔍 [TASK DEBUG] In TASK_TYPES?', !!TASK_TYPES[uiType as keyof typeof TASK_TYPES]);
                        console.log('🔍 [TASK DEBUG] TASK_TYPES entry:', TASK_TYPES[uiType as keyof typeof TASK_TYPES]);
                        console.log('🔍 [TASK DEBUG] getActivityTypeLabel result:', getActivityTypeLabel(uiType));
                        console.log('🔍 [TASK DEBUG] Final badge will show:', displayLabel);
                        console.log('🔍 [TASK DEBUG] ---')
                        console.log('🔍 [TASKS] Rendering task:', task.title, 'UI Type:', uiType, 'Display Label:', displayLabel, 'Status:', task.status);
                        return (
                        <div key={task.id} className={`p-4 border rounded-lg flex items-start justify-between ${task.status === 'completed' ? 'bg-gray-50' : 'bg-white'}`}>
                            <div className="flex items-start gap-4">
                                <button onClick={() => handleToggleComplete(task)} className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${task.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-500'}`}>{task.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}</button>
                                <div className="flex-1">
                                    <div className="flex items-center flex-wrap gap-2">
                                        <p className={`font-medium flex items-center ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                            <TaskIcon className="w-4 h-4 mr-2 text-gray-500" />{task.title}
                                        </p>
                                        {task.contact && (
                                            <>
                                                <span className="text-gray-400 text-sm">with</span>
                                                <Link
                                                    href={`/dashboard/contacts/${task.contact.id}`}
                                                    className="text-sm text-teal-600 hover:underline font-normal"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {task.contact.name}
                                                </Link>
                                            </>
                                        )}
                                        {!task.contact && task.contact_id && (
                                            <span className="text-xs text-gray-400">Unknown Contact</span>
                                        )}
                                    </div>
                                    <div className="flex items-center flex-wrap gap-3 text-sm text-gray-500 mt-2">
                                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span className={(task.date && isPast(new Date(task.date)) && !isToday(new Date(task.date)) && task.status !== 'completed') ? 'text-red-600 font-semibold' : ''}>{formatDateDisplay(task.date)}</span></div>
                                        {uiType && (
                                            <span className={getActivityTypeColor(uiType)}>
                                                {TASK_TYPES[uiType as keyof typeof TASK_TYPES]?.label || getActivityTypeLabel(uiType)}
                                            </span>
                                        )}
                                        {task.priority && (
                                            <span className={getPriorityColor(task.priority)}>
                                                {getPriorityLabel(task.priority)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {task.assignee && (
                                    <div
                                        className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-medium cursor-help"
                                        title={`Assigned to: ${task.assignee.first_name || ''} ${task.assignee.last_name || ''} ${task.assignee.email || ''}`.trim()}
                                    >
                                        {getInitials(task.assignee.first_name, task.assignee.last_name, task.assignee.email)}
                                    </div>
                                )}
                                <Button size="sm" variant="outline" onClick={() => handleOpenModal(task)}><Edit className="w-4 h-4" /></Button>
                                <Button size="sm" variant="outline" onClick={() => handleDeleteTask(task.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    )})
                ) : (<div className="text-center py-16"><CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium">No activities found</h3><p className="text-gray-500">Try adjusting your filters or create a new activity.</p></div>)}
            </div>
          </CardContent>
        </Card>
        ) : (
        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {TASK_STAGES.map(stage => {
                    const stageTasks = filteredTasks.filter(t => t.status === stage.id);
                    return (
                        <KanbanColumn key={stage.id} stage={stage} tasks={stageTasks} onEdit={handleOpenModal} />
                    );
                })}
            </div>
             <DragOverlay>
                {activeDragId ? (
                    <TaskCard 
                        task={allTasks.find(t => String(t.id) === String(activeDragId))} 
                        onEdit={handleOpenModal} 
                    />
                ) : null}
             </DragOverlay>
        </DndContext>
        )}
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-2xl bg-white">
                <DialogHeader className="pb-4">
                    <DialogTitle className="text-xl font-semibold text-gray-800">{editingTask ? 'Edit Activity' : 'Add New Activity'}</DialogTitle>
                    <DialogDescription className="text-gray-600 mt-2">Fill in the details for your sales activity.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Title *</Label>
                        <Input 
                            value={newTask.title} 
                            onChange={(e) => setNewTask({...newTask, title: e.target.value})} 
                            className="mt-1 border-gray-200 focus:border-blue-300 focus:ring-blue-100"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Description</Label>
                        <Textarea 
                            value={newTask.description} 
                            onChange={(e) => setNewTask({...newTask, description: e.target.value})} 
                            className="mt-1 min-h-[80px] border-gray-200 focus:border-blue-300 focus:ring-blue-100"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Type</Label>
                            <Select value={newTask.type} onValueChange={(v) => setNewTask({...newTask, type: v})}>
                                <SelectTrigger className="mt-1 border-gray-200">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(TASK_TYPES).map(([key, {label}]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Status</Label>
                            <Select value={newTask.status} onValueChange={(v) => setNewTask({...newTask, status: v})}>
                                <SelectTrigger className="mt-1 border-gray-200">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">To Do</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Due Date</Label>
                            <Input 
                                type="date" 
                                value={newTask.date} 
                                onChange={(e) => setNewTask({...newTask, date: e.target.value})} 
                                className="mt-1 border-gray-200 focus:border-blue-300 focus:ring-blue-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Priority</Label>
                            <Select value={newTask.priority} onValueChange={(v) => setNewTask({...newTask, priority: v})}>
                                <SelectTrigger className="mt-1 border-gray-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Company</Label>
                            <Select value={newTask.company_id || 'none'} onValueChange={(v) => {
                                // When company changes, clear the contact selection if it's not from the new company
                                const newCompanyId = v === 'none' ? null : v;
                                let newContactId = newTask.contact_id;
                                
                                // If a contact is selected and we're changing company
                                if (newTask.contact_id && newCompanyId) {
                                    const selectedContact = contacts.find(c => c.id === newTask.contact_id);
                                    // If the selected contact doesn't belong to the new company, clear it
                                    if (selectedContact && selectedContact.company_id !== newCompanyId) {
                                        newContactId = null;
                                    }
                                } else if (!newCompanyId) {
                                    // If no company selected, keep the contact (show all contacts)
                                    newContactId = newTask.contact_id;
                                }
                                
                                setNewTask({...newTask, company_id: newCompanyId, contact_id: newContactId});
                            }}>
                                <SelectTrigger className="mt-1 border-gray-200">
                                    <SelectValue placeholder="Select company..."/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Company</SelectItem>
                                    {companies.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Contact</Label>
                            <Select value={newTask.contact_id || 'none'} onValueChange={(v) => {
                                const newContactId = v === 'none' ? null : v;
                                let newCompanyId = newTask.company_id;
                                
                                // If a contact is selected, auto-select its company (if no company is currently selected)
                                if (newContactId && (!newTask.company_id || newTask.company_id === 'none')) {
                                    const selectedContact = contacts.find(c => c.id === newContactId);
                                    if (selectedContact && selectedContact.company_id) {
                                        newCompanyId = selectedContact.company_id;
                                    }
                                }
                                
                                setNewTask({...newTask, contact_id: newContactId, company_id: newCompanyId});
                            }}>
                                <SelectTrigger className="mt-1 border-gray-200">
                                    <SelectValue placeholder="Select contact..."/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Contact</SelectItem>
                                    {contacts
                                        .filter(c => {
                                            // If no company selected, show all contacts
                                            if (!newTask.company_id || newTask.company_id === 'none') {
                                                return true;
                                            }
                                            // If company selected, only show contacts from that company
                                            return c.company_id === newTask.company_id;
                                        })
                                        .map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Deal</Label>
                            <Select value={newTask.deal_id || 'none'} onValueChange={(v) => setNewTask({...newTask, deal_id: v === 'none' ? null : v})}>
                                <SelectTrigger className="mt-1 border-gray-200">
                                    <SelectValue placeholder="Select deal..."/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Deal</SelectItem>
                                    {deals.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Assign To</Label>
                            <Select value={newTask.assigned_to || userProfile?.id || ''} onValueChange={(v) => setNewTask({...newTask, assigned_to: v})}>
                                <SelectTrigger className="mt-1 border-gray-200">
                                    <SelectValue placeholder="Select assignee"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {teamMembers.map(m => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.first_name} {m.last_name}
                                            {m.id === userProfile?.id ? ' (Me)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setNewTask({ title: '', description: '', date: '', priority: 'Medium', status: 'pending', type: 'call', deal_id: null, company_id: null, contact_id: null, assigned_to: '' });
                      setEditingTask(null);
                      setIsModalOpen(false);
                    }}>Cancel</Button>
                    <Button onClick={handleSaveTask}>{editingTask ? 'Save Changes' : 'Create Activity'}</Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>
  )
}

// --- KANBAN VIEW COMPONENTS ---
const KanbanColumn = ({ stage, tasks, onEdit }: { stage: any, tasks: any[], onEdit: (t:any)=>void }) => {
    const { setNodeRef, isOver } = useDroppable({ id: stage.id });
    
    return (
        <div 
            ref={setNodeRef} 
            className={`bg-gray-50/50 p-4 rounded-lg border-2 transition-all duration-200 ${
                isOver ? 'border-blue-400 bg-blue-50/50 shadow-lg scale-[1.02]' : 'border-gray-200'
            }`}
        >
            <h3 className="font-semibold text-gray-800 mb-4">
                {stage.title} 
                <Badge variant="secondary" className="ml-2">{tasks.length}</Badge>
            </h3>
            <div className="space-y-3 min-h-[400px]">
                <SortableContext items={tasks.map(t => String(t.id))} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => <TaskCard key={task.id} task={task} onEdit={onEdit} />)}
                </SortableContext>
                {tasks.length === 0 && (
                    <div className="text-center pt-20 text-sm text-gray-400">
                        Drop activities here
                    </div>
                )}
            </div>
        </div>
    )
}

const TaskCard = ({ task, onEdit }: { task: any, onEdit?: (t:any)=>void }) => {
    const supabase = createClient()
    const [assignedUser, setAssignedUser] = React.useState<any>(null)
    const [teamMembers] = React.useState<any[]>([])
    
    if (!task) return null;
    
    // Load assigned user data and team members
    React.useEffect(() => {
        const loadData = async () => {
            if (task.assigned_to) {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name')
                    .eq('id', task.assigned_to)
                    .single()
                if (data) {
                    setAssignedUser(data)
                }
            }
        }
        loadData()
    }, [task.assigned_to])
    
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id: String(task.id),
        data: {
            type: 'task',
            task: task
        }
    });
    
    const style = { 
        transform: CSS.Transform.toString(transform), 
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab'
    };
    
    const uiType = task.type;
    const TaskIcon = TASK_TYPES[uiType as keyof typeof TASK_TYPES]?.icon || CheckSquare;
    
    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className={`${isDragging ? 'z-50' : ''}`}
            {...attributes}
            {...listeners}
        >
            <Card className="bg-white shadow-sm hover:shadow-md">
                <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                        <p 
                            className="font-semibold text-sm text-gray-800 flex-grow pr-2 flex items-center"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit && onEdit(task);
                            }}
                        >
                            <TaskIcon className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0"/>
                            {task.title}
                        </p>
                        <div className="flex items-center flex-shrink-0">
                            <GripVertical className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>
                    <div className="space-y-2 mt-3">
                        <div className="text-xs text-gray-500">
                            <span className={`font-semibold ${(task.date && isPast(new Date(task.date)) && !isToday(new Date(task.date)) && task.status !== 'completed') ? 'text-red-600' : ''}`}>{formatDateDisplay(task.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {uiType && (
                                <span className={getActivityTypeColor(uiType)}>
                                    {TASK_TYPES[uiType as keyof typeof TASK_TYPES]?.label || getActivityTypeLabel(uiType)}
                                </span>
                            )}
                            {task.priority && (
                                <span className={getPriorityColor(task.priority)}>
                                    {getPriorityLabel(task.priority)}
                                </span>
                            )}
                            {/* Assignee Display */}
                            {(task.assigned_to || assignedUser) && (
                                <div className="flex items-center gap-1.5">
                                    {assignedUser ? (
                                        <>
                                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 text-white text-[10px] font-medium">
                                                {assignedUser.first_name?.[0]}{assignedUser.last_name?.[0]}
                                            </div>
                                            <span className="text-xs text-gray-600">
                                                {assignedUser.first_name} {assignedUser.last_name}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="text-xs text-gray-500">Assigned</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}// Trigger recompile

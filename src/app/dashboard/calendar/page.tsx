'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/page-header'
import { Plus, Clock, Calendar as CalendarIcon, Trash2, Edit, User } from 'lucide-react'

// Interface for new event form
interface NewEventForm {
  title: string;
  event_type: string;
  priority: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string;
  contact: string;
  company: string;
  create_task: boolean;
}

// Extract UI type from description metadata  
const extractUIType = (description: string) => {
  if (!description) return 'meeting';
  // Support both 2 and 3 underscore patterns for compatibility
  const match = description.match(/___?UI_TYPE___?:([a-z_]+)/);
  return match ? match[1] : 'meeting';
};

// Clean description by removing metadata
const cleanDescription = (description: string) => {
  if (!description) return '';
  // Remove metadata patterns and clean up
  return description
    .replace(/___?UI_TYPE___?:[a-z_]+/g, '') // Remove UI type metadata (2 or 3 underscores)
    .replace(/\n+/g, ' ') // Replace multiple newlines with space
    .trim(); // Remove leading/trailing whitespace
};

// Map UI types to database-allowed types (comprehensive constraint supports all CRM activity types)
const mapTypeForDatabase = (uiType: string | undefined | null) => {
  // Handle null/undefined inputs safely
  if (!uiType || typeof uiType !== 'string') {
    console.warn(`⚠️ [CALENDAR] Invalid uiType received: ${uiType}, defaulting to 'activity'`);
    return 'activity';
  }
  
  // Normalize the input to handle different formats (spaces AND hyphens to underscores)
  const normalizedType = uiType.toLowerCase().replace(/[\s\-]+/g, '_');
  
  const typeMapping: { [key: string]: string } = {
    // Core calendar types - direct mapping
    'task': 'task',
    'appointment': 'appointment', 
    'meeting': 'meeting',
    'call': 'call',
    
    // CRM activity types - direct mapping
    'site_visit': 'site_visit',
    'traveling': 'traveling',
    'email': 'email',
    'follow_up': 'follow_up',
    'presentation': 'presentation',
    'negotiation': 'negotiation',
    'proposal': 'proposal',
    'demo': 'demo',
    'training': 'training',
    
    // Sales activity types - direct mapping
    'lead_qualification': 'lead_qualification',
    'deal_review': 'deal_review',
    'contract_review': 'contract_review',
    'closing': 'closing',
    
    // Administrative types - direct mapping
    'planning': 'planning',
    'research': 'research',
    'documentation': 'documentation',
    'reporting': 'reporting',
    
    // Financial activity types - direct mapping
    'invoice_sent': 'invoice_sent',
    'payment_follow_up': 'payment_follow_up',
    'payment_received': 'payment_received',
    'document_review': 'document_review',
    
    // Handle common variations and alternative names
    'phone_call': 'call',
    'phone': 'call',
    'site visit': 'site_visit',
    'follow up': 'follow_up',
    'networking': 'meeting',
    'lunch_meeting': 'meeting',
    'consultation': 'consultation',
    'interview': 'meeting',
    'review': 'deal_review'
  };
  
  // Get the mapped type or default to 'activity'
  const mappedType = typeMapping[normalizedType] || 'activity';
  
  // Comprehensive list of allowed types (matching our database constraint)
  const allowedTypes = [
    'task', 'appointment', 'meeting', 'call',
    'site_visit', 'traveling', 'email', 'follow_up',
    'presentation', 'negotiation', 'proposal', 'demo',
    'training', 'consultation', 'lead_qualification', 'deal_review',
    'contract_review', 'closing', 'planning', 'research',
    'documentation', 'reporting', 'invoice_sent', 'payment_follow_up',
    'payment_received', 'document_review', 'activity', 'event', 'other'
  ];
  
  if (!allowedTypes.includes(mappedType)) {
    console.warn(`⚠️ [CALENDAR] Type mapping error: ${uiType} → ${mappedType} (not allowed), defaulting to 'activity'`);
    return 'activity';
  }
  
  console.log(`✅ [CALENDAR] Type mapping: ${uiType} → ${mappedType}`);
  return mappedType;
};

// Normalize priority values to match database constraint
const normalizePriority = (priority: string | null | undefined): string => {
  if (!priority || typeof priority !== 'string') {
    return 'Medium'; // Default fallback
  }
  
  // Convert any priority value to the correct capitalized format
  const normalized = priority.toLowerCase().trim();
  switch (normalized) {
    case 'low':
    case 'l':
      return 'Low';
    case 'medium':
    case 'med':
    case 'm':
      return 'Medium';
    case 'high':
    case 'h':
      return 'High';
    default:
      // If already capitalized correctly, keep it
      if (['Low', 'Medium', 'High'].includes(priority)) {
        return priority;
      }
      console.warn(`⚠️ [CALENDAR] Invalid priority value: ${priority}, defaulting to Medium`);
      return 'Medium';
  }
};

// Get display label for UI type (streamlined)
const getUITypeLabel = (uiType: string) => {
  const typeLabels: { [key: string]: string } = {
    // Core CRM Activities
    'meeting': '📅 Meeting',
    'call': '📞 Call', 
    'email': '✉️ Email',
    'follow_up': '🔄 Follow Up',
    'presentation': '🎯 Presentation', 
    'demo': '🎮 Demo',
    'negotiation': '🤝 Negotiation',
    'site_visit': '🏢 Site Visit',
    'consultation': '💬 Consultation',
    
    // Sales & Proposals
    'proposal': '📋 Proposal',
    'contract_review': '📄 Contract Review',
    
    // Financial Activities
    'invoice_sent': '📤 Invoice Sent',
    'payment_follow_up': '💰 Payment Follow-up',
    'payment_received': '✅ Payment Received',
    
    // Administrative
    'document_review': '📑 Document Review',
    'reporting': '📊 Reporting',
    'task': '✅ Task'
  };
  return typeLabels[uiType] || '📅 Meeting';
};


export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([])
  const [allEvents, setAllEvents] = useState<any[]>([]) // Store all events for filtering
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [calendarKey, setCalendarKey] = useState(0); // Force re-render when events change
  const [isSaving, setIsSaving] = useState(false); // Prevent double submission
  const [userRole, setUserRole] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all')
  const [newEvent, setNewEvent] = useState<NewEventForm>({
    title: '',
    event_type: 'meeting',
    priority: 'Medium',
    date: '',
    start_time: '09:00',
    end_time: '10:00',
    description: '',
    contact: '',
    company: '',
    create_task: false
  })

  const supabase = createClient()

  // Fetch user role and users list on mount
  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        setUserRole(profile?.role || 'sales')
      }
    }

    async function fetchUsers() {
      try {
        const response = await fetch('/api/admin/users-list')
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    fetchUserRole()
    fetchUsers()
  }, [])

  // Generate consistent color for each assignee
  const getAssigneeColor = (assigneeId: string | null | undefined) => {
    if (!assigneeId) {
      return { bg: '#9ca3af', border: '#6b7280' } // Gray for unassigned
    }

    // Predefined colors for different assignees
    const colors = [
      { bg: '#3b82f6', border: '#1d4ed8' }, // Blue
      { bg: '#10b981', border: '#059669' }, // Green
      { bg: '#f59e0b', border: '#d97706' }, // Amber
      { bg: '#8b5cf6', border: '#7c3aed' }, // Purple
      { bg: '#ec4899', border: '#db2777' }, // Pink
      { bg: '#14b8a6', border: '#0d9488' }, // Teal
      { bg: '#f97316', border: '#ea580c' }, // Orange
      { bg: '#6366f1', border: '#4f46e5' }, // Indigo
    ]

    // Use hash of assigneeId to consistently assign a color
    let hash = 0
    for (let i = 0; i < assigneeId.length; i++) {
      hash = ((hash << 5) - hash) + assigneeId.charCodeAt(i)
      hash = hash & hash
    }
    const index = Math.abs(hash) % colors.length

    return colors[index]
  }

  const loadEvents = useCallback(async () => {
    try {
      let allEvents: any[] = []
      let error: any = null

      // If user is admin/owner, fetch team events via API (bypasses RLS)
      if (userRole === 'admin' || userRole === 'owner') {
        console.log('🔍 [CALENDAR] Admin user detected - loading team calendar events via API...')
        const response = await fetch('/api/admin/team-calendar')
        if (response.ok) {
          const data = await response.json()
          allEvents = data.events || []
          console.log('🔍 [CALENDAR] Loaded team events from API:', allEvents.length)
        } else {
          console.error('Error loading team calendar events:', await response.text())
          return
        }
      } else {
        // Regular user - load only their own events via Supabase client
        console.log('🔍 [CALENDAR] Regular user - loading personal calendar events...')
        const result = await supabase
          .from('calendar_events')
          .select('*')
          .not('date', 'is', null)
          .order('start_time', { ascending: true })

        allEvents = result.data || []
        error = result.error

        if (error) {
          console.error("Error loading calendar events:", error)
          return
        }

        console.log('🔍 [CALENDAR] Loaded personal events:', allEvents.length)
      }

      console.log('🔍 [CALENDAR] Sample event:', allEvents?.[0]);
      
      // Remove duplicates based on ID
      const uniqueEvents = allEvents ? Array.from(new Map(allEvents.map(event => [event.id, event])).values()) : [];
      console.log('🔍 [CALENDAR] After deduplication:', uniqueEvents.length, 'unique events');
      
      // Filter out completed events if needed
      const filteredData = uniqueEvents.filter(event => {
        // Show all events except completed tasks (optionally)
        if (event.status === 'completed' && event.type === 'task') {
          return false; // Hide completed tasks from calendar
        }
        return true;
      });
      console.log('🔍 [CALENDAR] Combined events:', filteredData);
      
    const formattedEvents = filteredData.map(event => {
      let startDateTime, endDateTime;
      
      // Extract UI type and clean description
      const uiType = extractUIType(event.description || '');
      const cleanDesc = cleanDescription(event.description || '');
      
      
      // Helper function to create FullCalendar datetime from various timestamp formats
      const createDateTime = (timestamptz: string) => {
        try {
          if (!timestamptz) {
            console.warn('Missing timestamptz:', timestamptz);
            return new Date().toISOString().slice(0, 19); // Remove Z suffix
          }
          
          // Clean the timestamp - remove any duplicate 'T' characters that might have been concatenated
          let cleanTimestamp = timestamptz.toString().trim();
          
          // Fix double T issue: "2025-07-20T10:24:39.058094+00:00T09:00:00" -> use first part only
          if (cleanTimestamp.includes('T') && cleanTimestamp.lastIndexOf('T') !== cleanTimestamp.indexOf('T')) {
            console.warn('🔧 [CALENDAR] Fixing malformed timestamp with multiple T:', cleanTimestamp);
            // Take only the part before the second T
            const firstTIndex = cleanTimestamp.indexOf('T');
            const secondTIndex = cleanTimestamp.indexOf('T', firstTIndex + 1);
            if (secondTIndex !== -1) {
              cleanTimestamp = cleanTimestamp.substring(0, secondTIndex);
              console.log('🔧 [CALENDAR] Fixed timestamp:', cleanTimestamp);
            }
          }
          
          // If it's already in the format we want (YYYY-MM-DDTHH:MM:SS), use it directly
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(cleanTimestamp)) {
            console.log('🔍 [CALENDAR] Using datetime as-is:', cleanTimestamp);
            return cleanTimestamp;
          }
          
          // Parse and format to avoid timezone conversion issues
          const date = new Date(cleanTimestamp);
          if (isNaN(date.getTime())) {
            console.error('🔥 [CALENDAR] Invalid timestamp after cleaning:', cleanTimestamp, 'original:', timestamptz);
            // Return a fallback based on today
            const now = new Date();
            const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T09:00:00`;
            console.log('🔧 [CALENDAR] Using fallback:', fallback);
            return fallback;
          }
          
          // Create local datetime string for FullCalendar (avoid timezone conversion)
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          
          const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
          console.log('🔍 [CALENDAR] Created local datetime:', localDateTime, 'from cleaned:', cleanTimestamp);
          return localDateTime;
        } catch (error) {
          console.error('🔥 [CALENDAR] Error creating datetime:', error, { timestamptz });
          // Return safe fallback
          const now = new Date();
          const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T09:00:00`;
          return fallback;
        }
      };
      
      startDateTime = createDateTime(event.start_time);
      endDateTime = createDateTime(event.end_time);

      // Get color based on assignee
      const assigneeColors = getAssigneeColor(event.assigned_to)

      // Get assignee name and initials
      const assigneeName = event.assignee
        ? `${event.assignee.first_name || ''} ${event.assignee.last_name || ''}`.trim()
        : 'Unassigned'

      const assigneeInitials = event.assignee
        ? `${event.assignee.first_name?.[0] || ''}${event.assignee.last_name?.[0] || ''}`.toUpperCase()
        : '?'

      console.log('🎨 [CALENDAR EVENT]', {
        title: event.title,
        assigned_to: event.assigned_to,
        assignee: event.assignee,
        assigneeInitials,
        finalTitle: `${event.title} - (${assigneeInitials})`
      })

      const calendarEvent = {
        id: event.id,
        title: `${event.title} - (${assigneeInitials})`, // Show title with initials
        start: startDateTime,
        end: endDateTime,
        allDay: false,
        backgroundColor: assigneeColors.bg,
        borderColor: assigneeColors.border,
        extendedProps: {
          ...event,
          description: cleanDesc, // Use cleaned description
          ui_type: uiType, // Store UI type separately
          // Format times for display from TIMESTAMPTZ (proper formatting)
          display_time: event.start_time ? new Date(event.start_time).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }) : 'No time',
          display_end_time: event.end_time ? new Date(event.end_time).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit', 
            hour12: true
          }) : 'No time',
          source: event.source || 'calendar', // Track source
          start_time: event.start_time, // Keep original for editing
          end_time: event.end_time
        }
      };
      
      console.log('🔍 [CALENDAR] Created calendar event:', {
        id: event.id,
        title: event.title,
        start_time: event.start_time,
        display_start: startDateTime,
        display_time: calendarEvent.extendedProps.display_time
      });
      
      return calendarEvent;
    });
    
    console.log('🔍 [CALENDAR] Setting formatted events:', formattedEvents.length, 'events');
    console.log('🔍 [CALENDAR] Sample event data:', formattedEvents.slice(0, 2));

    // Store all events for filtering
    setAllEvents(formattedEvents);
    // Initially show all events
    setEvents(formattedEvents);
    // Force calendar re-render by updating key
    setCalendarKey(prev => prev + 1);
    console.log('✅ [CALENDAR] Events updated and calendar re-rendered');

    // Return the formatted events for immediate use
    return formattedEvents;

    } catch (error) {
      console.error("Error loading events:", error);
      return [];
    }
  }, [supabase, userRole]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Filter events when assignee filter changes
  useEffect(() => {
    if (selectedAssignee === 'all') {
      setEvents(allEvents)
    } else {
      const filtered = allEvents.filter(event =>
        event.extendedProps?.assigned_to === selectedAssignee
      )
      setEvents(filtered)
    }
    setCalendarKey(prev => prev + 1) // Force calendar re-render
  }, [selectedAssignee, allEvents]);

  const handleDateClick = (arg: any) => {
    setNewEvent({
        title: '',
        event_type: 'meeting',
        priority: 'Medium',
        date: arg.dateStr,
        start_time: '09:00',
        end_time: '10:00',
        description: '',
        contact: '',
        company: '',
        create_task: false
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event.extendedProps);
    setIsDetailModalOpen(true);
    setIsEditMode(false);
  };

  const handleEditEvent = () => {
    // Extract date/time from TIMESTAMPTZ for editing - using local timezone
    console.log('🔍 [CALENDAR] Raw event data:', {
      start_time: selectedEvent.start_time,
      end_time: selectedEvent.end_time,
      date: selectedEvent.date
    });
    
    const startDate = selectedEvent.start_time ? new Date(selectedEvent.start_time) : new Date();
    const endDate = selectedEvent.end_time ? new Date(selectedEvent.end_time) : new Date();
    
    const date = startDate.toISOString().split('T')[0];
    const startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
    
    console.log('🔍 [CALENDAR] Time extraction details:', {
      originalStartTime: selectedEvent.start_time,
      parsedStartDate: startDate,
      extractedStartTime: startTime,
      originalEndTime: selectedEvent.end_time,
      parsedEndDate: endDate,
      extractedEndTime: endTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    setEditEvent({
      ...selectedEvent,
      event_type: selectedEvent.type || 'meeting', // Map 'type' to 'event_type' for UI
      priority: selectedEvent.priority || 'Medium', // FIX: Preserve priority field
      date: date,
      start_time: startTime,
      end_time: endTime,
    });
    setIsEditMode(true);
  };

  const handleUpdateEvent = async () => {
    try {
      if (!editEvent.title.trim()) {
        alert('Please enter an event title');
        return;
      }

      // Add UI type metadata to description for consistency with tasks
      let finalDescription = editEvent.description || '';
      if (editEvent.event_type && editEvent.event_type !== 'meeting') {
        finalDescription = finalDescription + (finalDescription ? '\n' : '') + `__UI_TYPE__:${editEvent.event_type}`;
      }

      // Create proper TIMESTAMPTZ values for the database (force local timezone)
      // Use local timezone offset to prevent UTC conversion issues
      const localOffset = new Date().getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(localOffset) / 60);
      const offsetMinutes = Math.abs(localOffset) % 60;
      const offsetSign = localOffset <= 0 ? '+' : '-';
      const timezoneOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
      
      const startDateTime = `${editEvent.date}T${editEvent.start_time}:00${timezoneOffset}`;
      const endDateTime = `${editEvent.date}T${editEvent.end_time}:00${timezoneOffset}`;
      
      console.log('🕐 [CALENDAR] Time with timezone:', {
        inputStartTime: editEvent.start_time,
        inputEndTime: editEvent.end_time,
        localTimezoneOffset: localOffset,
        formattedOffset: timezoneOffset,
        finalStartDateTime: startDateTime,
        finalEndDateTime: endDateTime
      });
      
      console.log('🔍 [CALENDAR] Time update details:', {
        original_date: selectedEvent.date,
        original_start: selectedEvent.start_time,
        original_end: selectedEvent.end_time,
        new_date: editEvent.date,
        new_start_time: editEvent.start_time,
        new_end_time: editEvent.end_time,
        computed_start_datetime: startDateTime,
        computed_end_datetime: endDateTime
      });
      
      const eventToUpdate: any = {
        title: editEvent.title,
        type: mapTypeForDatabase(editEvent.event_type), // Use proper type mapping
        description: finalDescription,
        date: editEvent.date, // Required date field
        start_time: startDateTime, // TIMESTAMPTZ format
        end_time: endDateTime, // TIMESTAMPTZ format
        priority: normalizePriority(editEvent.priority) || 'Medium', // Normalize priority to match constraint
        status: editEvent.status?.toLowerCase()?.replace(/\s+/g, '_') || 'pending' // Fix: normalize status to database format
      };
      
      console.log('🔍 [CALENDAR] Updating event with data:', eventToUpdate);
      console.log('🔍 [CALENDAR] Original editEvent priority:', editEvent.priority);
      console.log('🔍 [CALENDAR] Normalized priority:', eventToUpdate.priority);
      
      // Only add optional fields if they have values
      if (editEvent.contact && editEvent.contact.trim()) {
        eventToUpdate.contact = editEvent.contact;
      }
      if (editEvent.company && editEvent.company.trim()) {
        eventToUpdate.company = editEvent.company;
      }

      // Update calendar event - use API for admin/owner to bypass RLS
      if (userRole === 'admin' || userRole === 'owner') {
        console.log('🔄 [CALENDAR] Admin user - using API to update event');
        const response = await fetch(`/api/admin/team-calendar/${selectedEvent.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventToUpdate),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("API error:", errorData);
          throw new Error(errorData.error || 'Failed to update event');
        }

        const { event: updatedEvent } = await response.json();
        console.log('✅ [CALENDAR] Event updated via API:', updatedEvent);
      } else {
        // Regular user - use client-side Supabase
        console.log('🔄 [CALENDAR] Regular user - using client-side update');
        const { error } = await supabase
          .from('calendar_events')
          .update(eventToUpdate)
          .eq('id', selectedEvent.id);

        if (error) {
          console.error("Database error:", error);
          throw error;
        }
      }

      // The calendar event has already been updated above, no additional sync needed
      // Task-type events in calendar_events table are self-contained
      alert('Event updated successfully!');

      console.log('✅ [CALENDAR] Event update successful, refreshing data...');

      // Force a complete refresh by reloading all events
      const refreshedEvents = await loadEvents();

      // Find the updated event from the refreshed events array
      // This avoids RLS issues for admin users viewing other users' events
      const updatedEventFromArray = refreshedEvents?.find(e => e.extendedProps?.id === selectedEvent.id);

      if (updatedEventFromArray?.extendedProps) {
        console.log('🔍 [CALENDAR] Fresh event data from refreshed array:', {
          id: updatedEventFromArray.id,
          title: updatedEventFromArray.title,
          start_time: updatedEventFromArray.extendedProps.start_time,
          end_time: updatedEventFromArray.extendedProps.end_time
        });

        // Update selected event with fresh data from extendedProps
        // The extendedProps already contains display_time and display_end_time
        const refreshedEvent = {
          ...updatedEventFromArray.extendedProps
        };

        console.log('🔍 [CALENDAR] Updated selected event with fresh data:', {
          display_time: refreshedEvent.display_time,
          display_end_time: refreshedEvent.display_end_time
        });

        setSelectedEvent(refreshedEvent);
      } else {
        console.warn('🔥 [CALENDAR] Could not find updated event in refreshed array');
      }
      
      setIsEditMode(false);
      // Keep detail modal open to show updated information
    } catch (error: any) {
      console.error("Error updating event:", error);
      // Handle different types of errors
      let errorMessage = 'Unknown error occurred';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        errorMessage = `Database error (${error.code}): ${error.hint || 'Please try again'}`;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error - please check your connection and try again';
      }
      alert(`Failed to update event: ${errorMessage}`);
    }
  };

  const handleAddEvent = async () => {
    // Prevent double submission
    if (isSaving) {
      console.log('⚠️ [CALENDAR] Already saving, preventing double submission');
      return;
    }
    
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      if (!newEvent.title.trim()) {
        alert('Please enter an event title');
        setIsSaving(false);
        return;
      }

      // Add UI type metadata to description for consistency with tasks
      let finalDescription = newEvent.description || '';
      if (newEvent.event_type && newEvent.event_type !== 'meeting') {
        finalDescription = finalDescription + (finalDescription ? '\n' : '') + `__UI_TYPE__:${newEvent.event_type}`;
      }
      
      // Create proper TIMESTAMPTZ values for the database (force local timezone)
      const localOffset = new Date().getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(localOffset) / 60);
      const offsetMinutes = Math.abs(localOffset) % 60;
      const offsetSign = localOffset <= 0 ? '+' : '-';
      const timezoneOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
      
      const startDateTime = `${newEvent.date}T${newEvent.start_time}:00${timezoneOffset}`;
      const endDateTime = `${newEvent.date}T${newEvent.end_time}:00${timezoneOffset}`;
      
      console.log('🕐 [CALENDAR] New event time with timezone:', {
        inputStartTime: newEvent.start_time,
        inputEndTime: newEvent.end_time,
        timezoneOffset,
        finalStartDateTime: startDateTime,
        finalEndDateTime: endDateTime
      });
      
      // Debug the type mapping before saving
      const uiType = newEvent.event_type;
      const dbType = mapTypeForDatabase(uiType);
      
      console.log('🔍 [CALENDAR] Type mapping debug:', {
        uiType: uiType,
        mappedDbType: dbType,
        allowedTypes: ['task', 'appointment', 'meeting', 'call'],
        isAllowed: ['task', 'appointment', 'meeting', 'call'].includes(dbType)
      });
      
      // Debug priority values
      console.log('🔍 [CALENDAR] Priority value:', newEvent.priority);

      const eventToSave: any = {
        title: newEvent.title,
        type: dbType, // Use properly mapped and validated type
        description: finalDescription,
        date: newEvent.date, // Required date field
        start_time: startDateTime, // TIMESTAMPTZ format
        end_time: endDateTime, // TIMESTAMPTZ format
        priority: normalizePriority(newEvent.priority), // Normalize priority to match constraint
        status: 'pending', // Default status for new events
        user_id: user.id
      };
      
      console.log('🔍 [CALENDAR] Saving event with exact times:', {
        date: newEvent.date,
        start_time: newEvent.start_time,
        end_time: newEvent.end_time
      });
      
      // Only add optional fields if they exist in schema and have values
      if (newEvent.contact && newEvent.contact.trim()) {
        eventToSave.contact = newEvent.contact;
      }
      if (newEvent.company && newEvent.company.trim()) {
        eventToSave.company = newEvent.company;
      }
      
      console.log("🔍 [CALENDAR] Attempting to save event:", eventToSave);
      console.log("🔍 [CALENDAR] Event type being saved:", eventToSave.type);
      console.log("🔍 [CALENDAR] Priority being saved:", eventToSave.priority);
      console.log("🔍 [CALENDAR] Type is allowed:", ['task', 'appointment', 'meeting', 'call'].includes(eventToSave.type));
      console.log("🔍 [CALENDAR] Priority is allowed:", ['low', 'medium', 'high'].includes(eventToSave.priority));
      
      const { data, error } = await supabase.from('calendar_events').insert([eventToSave]).select();
      
      if (error) {
        console.error("🔥 [CALENDAR] Database error details:", error);
        console.error("🔥 [CALENDAR] Error code:", error.code);
        console.error("🔥 [CALENDAR] Error message:", error.message);
        
        // Check if it's a constraint violation for type
        if (error.code === '23514' && error.message?.includes('calendar_events_type_check')) {
          console.warn("⚠️ [CALENDAR] Database constraint doesn't support type:", eventToSave.type);
          console.warn("⚠️ [CALENDAR] Attempting fallback to 'email' type...");
          
          // Try again with email type as fallback
          const fallbackEvent = { ...eventToSave, type: 'email' };
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('calendar_events')
            .insert([fallbackEvent])
            .select();
          
          if (fallbackError) {
            console.error("🔥 [CALENDAR] Fallback also failed:", fallbackError);
            throw fallbackError;
          }
          
          console.log("✅ [CALENDAR] Event saved with fallback type 'email':", fallbackData);
          return fallbackData;
        }
        
        throw error;
      }
      
      console.log("✅ [CALENDAR] Event saved successfully:", data);
      
      // Create task if requested
      if (newEvent.create_task) {
        // Convert date to TIMESTAMPTZ for tasks table
        const taskDueDate = `${newEvent.date}T${newEvent.end_time}:00`;
        
        const taskToSave = {
          title: newEvent.title,
          priority: newEvent.priority,
          due_date: taskDueDate, // Full timestamp for tasks table
          description: finalDescription,
          status: 'pending', // Fixed: changed 'stage' to 'status'
          user_id: user.id
          // Removed 'type' field as tasks table doesn't have it
        };
        
        console.log('🔍 [CALENDAR] Creating task with data:', taskToSave);
        
        const { error: taskError } = await supabase.from('tasks').insert([taskToSave]);
        if (taskError) {
          console.error('🔥 [CALENDAR] Error creating task:', taskError);
          console.error('🔥 [CALENDAR] Task error details:', {
            code: taskError.code,
            message: taskError.message,
            hint: taskError.hint,
            details: taskError.details
          });
          alert(`Event created but failed to create task: ${taskError.message}`);
        } else {
          console.log('✅ [CALENDAR] Task created successfully');
          alert('Event and task created successfully!');
        }
      } else {
        alert('Event added successfully!');
      }
      
      setIsModalOpen(false);
      // Reset form
      setNewEvent({
        title: '',
        event_type: 'meeting',
        priority: 'Medium',
        date: '',
        start_time: '09:00',
        end_time: '10:00',
        description: '',
        contact: '',
        company: '',
        create_task: false
      });
      await loadEvents();
      setIsSaving(false);
    } catch (error: any) {
      console.error("Error saving event:", error);
      setIsSaving(false);
      // Handle different types of errors
      let errorMessage = 'Unknown error occurred';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        errorMessage = `Database error (${error.code}): ${error.hint || 'Please try again'}`;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error - please check your connection and try again';
      }
      alert(`Failed to save event: ${errorMessage}`);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
      if (error) throw error;
      
      alert('Event deleted successfully!');
      setIsDetailModalOpen(false);
      await loadEvents();
    } catch (error: any) {
      console.error("Error deleting event:", error);
      // Handle different types of errors
      let errorMessage = 'Unknown error occurred';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        errorMessage = `Database error (${error.code}): ${error.hint || 'Please try again'}`;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error - please check your connection and try again';
      }
      alert(`Failed to delete event: ${errorMessage}`);
    }
  };

  return (
    <>
      <PageHeader title="Calendar" description="View and manage your tasks, meetings, and appointments">
        <div className="flex space-x-3">
          <Button 
            onClick={() => {
              console.log('🔄 [CALENDAR] Manual refresh triggered');
              loadEvents();
            }} 
            variant="outline" 
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            🔄 Refresh
          </Button>
          <Button onClick={() => handleDateClick({ date: new Date(), dateStr: new Date().toISOString().split('T')[0] })} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
          </Button>
        </div>
      </PageHeader>

      {/* Filter Bar - Only show for admin/owner users */}
      {(userRole === 'admin' || userRole === 'owner') && users.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            <User className="h-5 w-5 text-blue-600" />
            <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Filter by Sales Rep:
            </Label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="w-64 bg-white">
                <SelectValue placeholder="All Team Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {users
                  .filter(u => u.role === 'sales')
                  .map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">
              Showing {events.length} of {allEvents.length} events
            </span>
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <FullCalendar
          key={calendarKey}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          editable={true}
          selectable={true}
          height="auto"
          contentHeight="600px"
          timeZone="local"
          eventDisplay="block"
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short',
            omitZeroMinute: false
          }}
          slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
          }}
          displayEventTime={true}
          displayEventEnd={true}
          forceEventDuration={true}
          eventDidMount={(info) => {
            console.log('🔍 [CALENDAR] Event mounted:', {
              id: info.event.id,
              title: info.event.title,
              start: info.event.start,
              end: info.event.end
            });
          }}
        />
      </div>
      
      <style jsx global>{`
        .fc {
          font-family: 'Inter', sans-serif;
        }
        .fc-toolbar {
          margin-bottom: 2rem !important;
          padding: 1rem 0 !important;
        }
        .fc-toolbar-chunk {
          margin: 0 0.75rem !important;
        }
        .fc-toolbar-title {
          font-size: 1.75rem !important;
          font-weight: 700 !important;
          color: #333333 !important;
        }
        .fc-button {
          background: #3b82f6 !important;
          border: none !important;
          padding: 0.75rem 1.25rem !important;
          border-radius: 0.75rem !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
          margin: 0 0.5rem !important;
          font-size: 0.875rem !important;
        }
        .fc-button:hover {
          background: #1d4ed8 !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2) !important;
        }
        .fc-button:disabled {
          opacity: 0.5 !important;
          transform: none !important;
        }
        .fc-button-active {
          background: #1d4ed8 !important;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
        }
        .fc-button-group .fc-button {
          margin: 0 2px !important;
        }
        .fc-daygrid-day {
          border: 1px solid #e5e7eb !important;
        }
        .fc-daygrid-day:hover {
          background-color: #f9fafb !important;
        }
        .fc-day-today {
          background: #eff6ff !important;
          border-color: #3b82f6 !important;
        }
        .fc-event {
          background: #3b82f6 !important;
          border: none !important;
          border-radius: 0.5rem !important;
          padding: 0.25rem 0.5rem !important;
          font-weight: 600 !important;
          color: white !important;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3) !important;
          transition: all 0.2s ease !important;
          white-space: normal !important;
          overflow: visible !important;
          height: auto !important;
          min-height: 24px !important;
        }
        .fc-event:hover {
          background: #1d4ed8 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4) !important;
        }
        .fc-event-title {
          font-weight: 600 !important;
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          line-height: 1.2 !important;
        }
        .fc-event-time {
          white-space: normal !important;
          word-wrap: break-word !important;
        }
        .fc-daygrid-event {
          white-space: normal !important;
          overflow: visible !important;
          height: auto !important;
          min-height: 20px !important;
        }
        .fc-timegrid-slot {
          border-color: #f3f4f6 !important;
        }
        .fc-col-header {
          background: #f9fafb !important;
          font-weight: 700 !important;
          color: #374151 !important;
          padding: 0.75rem 0 !important;
        }
        .fc-scrollgrid {
          border: 1px solid #e5e7eb !important;
          border-radius: 0.75rem !important;
          overflow: hidden !important;
          background: white !important;
        }
      `}</style>

      {/* Add New Event Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader className="bg-blue-50 -m-6 mb-6 p-6 rounded-t-lg border-b border-blue-100">
            <DialogTitle className="flex items-center space-x-3 text-xl text-blue-700">
              <div className="p-2 bg-white rounded-full shadow-sm">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <span>Add New Event</span>
            </DialogTitle>
            <DialogDescription className="text-blue-600 mt-2">
              Create a new calendar event and set up details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="md:col-span-2">
              <Label className="mb-2 block text-sm font-semibold text-[#333333]">Event Title</Label>
              <Input 
                value={newEvent.title} 
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} 
                className="h-11 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter event title..."
              />
            </div>
            
            <div>
              <Label className="mb-2 block text-sm font-semibold text-[#333333]">Event Type</Label>
              <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent({ ...newEvent, event_type: v })}>
                <SelectTrigger className="h-11 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Core CRM Activities */}
                  <SelectItem value="meeting" className="py-2">📅 Meeting</SelectItem>
                  <SelectItem value="call" className="py-2">📞 Call</SelectItem>
                  <SelectItem value="email" className="py-2">✉️ Email</SelectItem>
                  <SelectItem value="follow_up" className="py-2">🔄 Follow Up</SelectItem>
                  <SelectItem value="presentation" className="py-2">🎯 Presentation</SelectItem>
                  <SelectItem value="demo" className="py-2">🎮 Demo</SelectItem>
                  <SelectItem value="negotiation" className="py-2">🤝 Negotiation</SelectItem>
                  <SelectItem value="site_visit" className="py-2">🏢 Site Visit</SelectItem>
                  <SelectItem value="consultation" className="py-2">💬 Consultation</SelectItem>
                  
                  {/* Sales & Proposals */}
                  <SelectItem value="proposal" className="py-2">📋 Proposal</SelectItem>
                  <SelectItem value="contract_review" className="py-2">📄 Contract Review</SelectItem>
                  
                  {/* Financial Activities */}
                  <SelectItem value="invoice_sent" className="py-2">📤 Invoice Sent</SelectItem>
                  <SelectItem value="payment_follow_up" className="py-2">💰 Payment Follow-up</SelectItem>
                  <SelectItem value="payment_received" className="py-2">✅ Payment Received</SelectItem>
                  
                  {/* Administrative */}
                  <SelectItem value="document_review" className="py-2">📑 Document Review</SelectItem>
                  <SelectItem value="reporting" className="py-2">📊 Reporting</SelectItem>
                  <SelectItem value="task" className="py-2">✅ Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-2 block text-sm font-semibold text-[#333333]">Priority</Label>
              <Select value={newEvent.priority} onValueChange={(v) => setNewEvent({ ...newEvent, priority: v })}>
                <SelectTrigger className="h-11 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low" className="py-2">🟢 Low Priority</SelectItem>
                  <SelectItem value="Medium" className="py-2">🟡 Medium Priority</SelectItem>
                  <SelectItem value="High" className="py-2">🔴 High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block text-sm font-semibold text-[#333333]">Date</Label>
              <Input 
                type="date" 
                value={newEvent.date} 
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} 
                className="h-11 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block text-sm font-semibold text-[#333333]">Start Time</Label>
                <Input 
                  type="time" 
                  value={newEvent.start_time} 
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })} 
                  className="h-11 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-[#333333]">End Time</Label>
                <Input 
                  type="time" 
                  value={newEvent.end_time} 
                  onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })} 
                  className="h-11 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <Label className="mb-2 block text-sm font-semibold text-[#333333]">Description</Label>
              <Textarea 
                value={newEvent.description} 
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} 
                className="min-h-[100px] border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                placeholder="Add event description..."
              />
            </div>
            
            {/* Option to create task */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <input 
                  type="checkbox" 
                  id="create_task" 
                  checked={newEvent.create_task}
                  onChange={(e) => setNewEvent({ ...newEvent, create_task: e.target.checked })}
                  className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="create_task" className="text-sm text-blue-700 font-medium cursor-pointer">
                  Also create this as a task in Tasks section
                </Label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-[#333333]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddEvent}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Adding...' : 'Add Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Event Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-xl bg-white">
          <DialogHeader className="bg-blue-50 -m-6 mb-6 p-6 rounded-t-lg border-b border-blue-100">
            <DialogTitle className="flex items-center space-x-3 text-xl text-blue-700">
              <div className="p-2 bg-white rounded-full shadow-sm">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <span>{selectedEvent?.title}</span>
            </DialogTitle>
            <DialogDescription className="text-blue-600 mt-2">
              Event Details & Information
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="p-2 bg-white rounded-full shadow-sm">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Date</p>
                    <p className="font-semibold text-[#333333]">{selectedEvent.date ? new Date(selectedEvent.date + 'T00:00:00').toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'No date'}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="p-2 bg-white rounded-full shadow-sm">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Time</p>
                    <p className="font-semibold text-[#333333]">{selectedEvent.display_time} - {selectedEvent.display_end_time}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedEvent.ui_type && (
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-xs text-indigo-600 font-medium mb-2">Event Type</p>
                    <Badge className="bg-indigo-100 text-indigo-800 font-semibold px-3 py-1">
                      {getUITypeLabel(selectedEvent.ui_type)}
                    </Badge>
                  </div>
                )}
                
                {selectedEvent.priority && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-600 font-medium mb-2">Priority Level</p>
                    <Badge className={`font-semibold px-3 py-1 ${
                      selectedEvent.priority === 'High' ? 'bg-red-100 text-red-800' :
                      selectedEvent.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedEvent.priority === 'High' ? '🔴 High Priority' :
                       selectedEvent.priority === 'Medium' ? '🟡 Medium Priority' : '🟢 Low Priority'}
                    </Badge>
                  </div>
                )}
              </div>
              
              {selectedEvent.description && selectedEvent.description.trim() && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-[#333333] mb-3">Description</p>
                  <p className="text-gray-600 leading-relaxed bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => handleDeleteEvent(selectedEvent?.id)}
              className="px-6 py-2 border border-red-300 hover:bg-red-50 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Event
            </Button>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleEditEvent}
                className="px-6 py-2 border border-blue-300 hover:bg-blue-50 text-blue-600 hover:text-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Event
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-[#333333]"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={isEditMode} onOpenChange={setIsEditMode}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader className="bg-blue-50 -m-6 mb-6 p-6 rounded-t-lg border-b border-blue-100">
            <DialogTitle className="flex items-center space-x-3 text-xl text-blue-700">
              <div className="p-2 bg-white rounded-full shadow-sm">
                <Edit className="w-5 h-5 text-blue-600" />
              </div>
              <span>Edit Event</span>
            </DialogTitle>
            <DialogDescription className="text-blue-600 mt-2">
              Update event details and information.
            </DialogDescription>
          </DialogHeader>
          
          {editEvent && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="md:col-span-2">
                <Label className="mb-2 block text-sm font-semibold text-[#333333]">Event Title</Label>
                <Input 
                  value={editEvent.title} 
                  onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })} 
                  className="h-11 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter event title..."
                />
              </div>
              
              <div>
                <Label className="mb-2 block text-sm font-semibold text-[#333333]">Event Type</Label>
                <Select value={editEvent.event_type} onValueChange={(v) => setEditEvent({ ...editEvent, event_type: v })}>
                  <SelectTrigger className="h-11 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting" className="py-2">📅 Meeting</SelectItem>
                    <SelectItem value="call" className="py-2">📞 Call</SelectItem>
                    <SelectItem value="site_visit" className="py-2">🏢 Site Visit</SelectItem>
                    <SelectItem value="presentation" className="py-2">🎯 Presentation</SelectItem>
                    <SelectItem value="demo" className="py-2">🎮 Demo</SelectItem>
                    <SelectItem value="consultation" className="py-2">💬 Consultation</SelectItem>
                    <SelectItem value="follow_up" className="py-2">🔄 Follow Up</SelectItem>
                    <SelectItem value="training" className="py-2">🎓 Training</SelectItem>
                    <SelectItem value="interview" className="py-2">👤 Interview</SelectItem>
                    <SelectItem value="review" className="py-2">📄 Review</SelectItem>
                    <SelectItem value="email" className="py-2">✉️ Email</SelectItem>
                    <SelectItem value="task" className="py-2">✅ Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="mb-2 block text-sm font-semibold text-[#333333]">Priority</Label>
                <Select value={editEvent.priority} onValueChange={(v) => setEditEvent({ ...editEvent, priority: v })}>
                  <SelectTrigger className="h-11 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low" className="py-2">🟢 Low Priority</SelectItem>
                    <SelectItem value="Medium" className="py-2">🟡 Medium Priority</SelectItem>
                    <SelectItem value="High" className="py-2">🔴 High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="mb-2 block text-sm font-semibold text-[#333333]">Date</Label>
                <Input 
                  type="date" 
                  value={editEvent.date} 
                  onChange={(e) => setEditEvent({ ...editEvent, date: e.target.value })} 
                  className="h-11 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-[#333333]">Start Time</Label>
                  <Input 
                    type="time" 
                    value={editEvent.start_time} 
                    onChange={(e) => setEditEvent({ ...editEvent, start_time: e.target.value })} 
                    className="h-11 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-[#333333]">End Time</Label>
                  <Input 
                    type="time" 
                    value={editEvent.end_time} 
                    onChange={(e) => setEditEvent({ ...editEvent, end_time: e.target.value })} 
                    className="h-11 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="md:col-span-2">
                <Label className="mb-2 block text-sm font-semibold text-[#333333]">Description</Label>
                <Textarea 
                  value={editEvent.description} 
                  onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })} 
                  className="min-h-[100px] border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="Add event description..."
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setIsEditMode(false)}
              className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-[#333333]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateEvent}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

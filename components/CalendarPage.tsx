
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Clock, Copy, MoreHorizontal, Calendar, Video, Check, X, 
  ChevronLeft, ChevronRight, Settings, Users, Globe, Phone, MapPin, 
  Filter, Download, ChevronDown, Trash2, AlertCircle, ExternalLink, Mail, User,
  CalendarDays, RotateCcw, Edit3, Layout, Link as LinkIcon, ArrowLeft, Globe2, ArrowRight, List
} from 'lucide-react';
import { isValidDate, formatDate, getInitials } from '../utils';
import { RichTextEditor } from './RichTextEditor';

export const CalendarPage = ({ 
    eventTypes, scheduledEvents, onCreateEventType, onUpdateEventType, onDeleteEventType, 
    isGoogleConnected, onConnectGoogle, onDisconnectGoogle, googleEvents, todos, onBookMeeting,
    onNavigateToSettings, onCompose, contacts, onNavigate, onUpdateScheduledEvent, onDeleteScheduledEvent,
    teamMembers = [], 
    bookingPages = [], onCreateBookingPage, onUpdateBookingPage, onDeleteBookingPage,
    initialBooking, onClearInitialBooking
}: any) => {
  // Main Navigation
  const [activeSection, setActiveSection] = useState<'meetings' | 'scheduling' | 'booking_pages' | 'availability'>('meetings');
  
  // Availability Sub-navigation
  const [availabilityTab, setAvailabilityTab] = useState<'schedules' | 'calendar_settings' | 'advanced'>('schedules');
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);

  // Meetings Filter & View Mode
  const [meetingsFilter, setMeetingsFilter] = useState<'today' | 'past' | 'range'>('today');
  const [meetingsViewMode, setMeetingsViewMode] = useState<'list' | 'calendar'>('list');
  const [meetingsCalendarDate, setMeetingsCalendarDate] = useState(new Date());
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  // Event Type Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [formEventType, setFormEventType] = useState('One-on-One');

  // Booking Page Modal State
  const [isBookingPageModalOpen, setIsBookingPageModalOpen] = useState(false);
  const [editingBookingPage, setEditingBookingPage] = useState<any>(null);
  const [bookingPageFormData, setBookingPageFormData] = useState({
      title: '',
      description: '',
      slug: '',
      includedEventTypeIds: [] as string[],
      avatar: ''
  });

  // Booking & Offer Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState<Date | null>(new Date());
  const [bookingTime, setBookingTime] = useState<string | null>(null);
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [guests, setGuests] = useState<string[]>([]);
  const [showGuestInput, setShowGuestInput] = useState(false);
  
  // Calendar Visual State
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  // Meeting Details State
  const [viewingMeeting, setViewingMeeting] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  // Availability State (Global Defaults)
  const [weeklyHours, setWeeklyHours] = useState<any>({
      'Mon': { active: true, start: '09:00', end: '17:00' },
      'Tue': { active: true, start: '09:00', end: '17:00' },
      'Wed': { active: true, start: '09:00', end: '17:00' },
      'Thu': { active: true, start: '09:00', end: '17:00' },
      'Fri': { active: true, start: '09:00', end: '17:00' },
      'Sat': { active: false, start: '09:00', end: '17:00' },
      'Sun': { active: false, start: '09:00', end: '17:00' },
  });

  const [dateSpecificHours, setDateSpecificHours] = useState<any[]>([]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideFormData, setOverrideFormData] = useState({
      startDate: '', endDate: '', active: true, start: '09:00', end: '17:00'
  });
  
  const [meetingLimit, setMeetingLimit] = useState(5);
  const [formData, setFormData] = useState({
    title: '', duration: '30', description: '', slug: '', color: 'bg-blue-500', location: 'Zoom', hosts: ['1'] as string[]
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Handle deep linking for booking
  useEffect(() => {
      if (initialBooking) {
          const defaultType = eventTypes.length > 0 ? eventTypes[0] : {
              id: 'custom-booking',
              title: '30 Minute Meeting',
              duration: '30',
              location: 'Zoom',
              color: 'bg-blue-500'
          };
          
          setSelectedEventType(defaultType);
          setInviteeName(initialBooking.name || '');
          setInviteeEmail(initialBooking.email || '');
          setBookingDate(new Date());
          setBookingTime(null);
          setShowBookingModal(true);
          
          if (onClearInitialBooking) onClearInitialBooking();
      }
  }, [initialBooking, eventTypes]);

  // --- Helpers ---
  const getEffectiveAvailability = (eventType: any) => {
      if (eventType && eventType.customAvailability) {
          return {
              weekly: eventType.customAvailability.weekly,
              dates: eventType.customAvailability.dates || []
          };
      }
      return { weekly: weeklyHours, dates: dateSpecificHours };
  };

  const normalizeOverrides = (existingOverrides: any[], newOverride?: any) => {
      const dayMap = new Map();
      const processRange = (rule: any) => {
          const start = rule.startDate || rule.date;
          const end = rule.endDate || rule.date;
          if (!start) return;
          let curr = new Date(start);
          const last = new Date(end);
          const maxDays = 365 * 2; 
          let count = 0;
          while (curr <= last && count < maxDays) {
              const dStr = curr.toISOString().split('T')[0];
              dayMap.set(dStr, { active: rule.active, start: rule.start, end: rule.end });
              curr.setDate(curr.getDate() + 1);
              count++;
          }
      };
      existingOverrides.forEach(processRange);
      if (newOverride) processRange(newOverride);
      const sortedDates = Array.from(dayMap.keys()).sort();
      if (sortedDates.length === 0) return [];
      const result = [];
      let currentRange: any = null;
      for (const dateStr of sortedDates) {
          const config = dayMap.get(dateStr);
          if (!currentRange) {
              currentRange = { startDate: dateStr, endDate: dateStr, active: config.active, start: config.start, end: config.end };
              continue;
          }
          const prevEnd = new Date(currentRange.endDate);
          prevEnd.setDate(prevEnd.getDate() + 1);
          const expectedNext = prevEnd.toISOString().split('T')[0];
          const isNextDay = expectedNext === dateStr;
          const isConfigSame = config.active === currentRange.active && config.start === currentRange.start && config.end === currentRange.end;
          if (isNextDay && isConfigSame) {
              currentRange.endDate = dateStr;
          } else {
              result.push(currentRange);
              currentRange = { startDate: dateStr, endDate: dateStr, active: config.active, start: config.start, end: config.end };
          }
      }
      if (currentRange) result.push(currentRange);
      return result;
  };

  const generateCalendarDays = (date: Date) => {
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(null);
      for (let i = 1; i <= daysInMonth; i++) days.push(new Date(date.getFullYear(), date.getMonth(), i));
      return days;
  };

  const checkAvailability = (date: Date) => {
      const config = getEffectiveAvailability(selectedEventType);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const override = config.dates.find((o: any) => {
          const start = o.startDate || o.date;
          const end = o.endDate || o.date;
          return dateStr >= start && dateStr <= end;
      });
      if (override) return override.active;
      return config.weekly[dayName]?.active;
  };

  const handleDateClick = (date: Date) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      if (date < today || !checkAvailability(date)) return;
      setBookingDate(date);
      setBookingTime(null);
  };

  const generateTimeSlots = (date: Date) => {
      if (!selectedEventType) return [];
      const config = getEffectiveAvailability(selectedEventType);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const override = config.dates.find((o: any) => {
          const start = o.startDate || o.date;
          const end = o.endDate || o.date;
          return dateStr >= start && dateStr <= end;
      });
      let dayConfig = override || config.weekly[dayName];
      if (!dayConfig || !dayConfig.active) return [];
      const slots = [];
      const duration = parseInt(selectedEventType.duration);
      const [startH, startM] = dayConfig.start.split(':').map(Number);
      const [endH, endM] = dayConfig.end.split(':').map(Number);
      let current = new Date(date);
      current.setHours(startH, startM, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(endH, endM, 0, 0);
      const now = new Date();
      if (date.toDateString() === now.toDateString() && current < now) {
          current = new Date(now);
          current.setMinutes(current.getMinutes() + (15 - (current.getMinutes() % 15)));
      }
      const dailyConflicts = [
          ...(scheduledEvents || []).map((e: any) => ({
              start: new Date(e.startTime.seconds * 1000),
              end: new Date((e.startTime.seconds * 1000) + (parseInt(e.duration || 30) * 60000))
          })),
          ...(googleEvents || []).map((e: any) => ({
              start: new Date(e.start),
              end: new Date(e.end)
          }))
      ].filter(conf => conf.start.toDateString() === date.toDateString());
      while (current.getTime() + duration * 60000 <= endOfDay.getTime()) {
          const slotStart = new Date(current);
          const slotEnd = new Date(slotStart.getTime() + duration * 60000);
          const isConflicting = dailyConflicts.some(conf => 
              slotStart < conf.end && slotEnd > conf.start
          );
          if (!isConflicting) {
              slots.push(current.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase());
          }
          current.setMinutes(current.getMinutes() + 15);
      }
      return slots;
  };

  const handleOpenModal = (type: any = null, mode: string = 'One-on-One') => {
    if (type) {
      setEditingType(type);
      setFormEventType(type.type || 'One-on-One');
      setFormData({
        title: type.title, duration: type.duration, description: type.description,
        slug: type.slug, color: type.color, location: type.location || 'Zoom', hosts: type.hosts || ['1']
      });
    } else {
      setEditingType(null);
      setFormEventType(mode);
      setFormData({ title: '', duration: '30', description: '', slug: '', color: 'bg-blue-500', location: 'Zoom', hosts: ['1'] });
    }
    setIsModalOpen(true);
  };

  const handleOpenBookingPageModal = (page: any = null) => {
      if (page) {
          setEditingBookingPage(page);
          setBookingPageFormData({
              title: page.title, description: page.description || '', slug: page.slug || '',
              includedEventTypeIds: page.includedEventTypeIds || [], avatar: page.avatar || ''
          });
      } else {
          setEditingBookingPage(null);
          setBookingPageFormData({ title: '', description: '', slug: '', includedEventTypeIds: [], avatar: '' });
      }
      setIsBookingPageModalOpen(true);
  };

  const handleSubmitEventType = (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingType) onUpdateEventType(editingType.id, formData);
    else onCreateEventType(formData);
    setIsModalOpen(false);
    setEditingType(null);
  };

  const handleSubmitBookingPage = (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingBookingPage) onUpdateBookingPage(editingBookingPage.id, bookingPageFormData);
    else onCreateBookingPage(bookingPageFormData);
    setIsBookingPageModalOpen(false);
    setEditingBookingPage(null);
  };

  const handleBookMeeting = () => {
      if (!selectedEventType || !bookingDate || !bookingTime || !inviteeName || !inviteeEmail) return;
      const [time, period] = bookingTime.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let adjustedHours = hours;
      if (period === 'pm' && hours !== 12) adjustedHours += 12;
      if (period === 'am' && hours === 12) adjustedHours = 0;
      const startTime = new Date(bookingDate);
      startTime.setHours(adjustedHours, minutes);
      const eventData = {
          eventTypeTitle: selectedEventType.title,
          attendeeName: inviteeName,
          attendeeEmail: inviteeEmail,
          guests,
          startTime: { seconds: Math.floor(startTime.getTime() / 1000) },
          duration: selectedEventType.duration,
          location: selectedEventType.location,
          status: 'confirmed'
      };
      if (editingEventId) onUpdateScheduledEvent(editingEventId, eventData);
      else if (onBookMeeting) onBookMeeting(eventData);
      setShowBookingModal(false);
      setEditingEventId(null);
  };

  const handleSaveOverride = (e: React.FormEvent) => {
      e.preventDefault();
      if (!overrideFormData.startDate) return;
      const activeEventType = activeScheduleId ? eventTypes.find((t: any) => t.id === activeScheduleId) : null;
      const currentDates = activeScheduleId ? (activeEventType?.customAvailability?.dates || []) : dateSpecificHours;
      const newOverride = {
          startDate: overrideFormData.startDate,
          endDate: overrideFormData.endDate || overrideFormData.startDate,
          active: overrideFormData.active,
          start: overrideFormData.start,
          end: overrideFormData.end
      };
      const updated = normalizeOverrides(currentDates, newOverride);
      if (!activeScheduleId) setDateSpecificHours(updated);
      else if (activeEventType) {
          onUpdateEventType(activeScheduleId, {
              customAvailability: {
                  weekly: activeEventType.customAvailability?.weekly || weeklyHours,
                  dates: updated
              }
          });
      }
      setShowOverrideModal(false);
      setOverrideFormData({ startDate: '', endDate: '', active: true, start: '09:00', end: '17:00' });
  };

  const toggleDayActive = (day: string) => {
      const activeEventType = activeScheduleId ? eventTypes.find((t: any) => t.id === activeScheduleId) : null;
      const currentWeekly = activeScheduleId ? (activeEventType?.customAvailability?.weekly || weeklyHours) : weeklyHours;
      const newWeekly = { ...currentWeekly, [day]: { ...currentWeekly[day], active: !currentWeekly[day].active } };
      if (!activeScheduleId) setWeeklyHours(newWeekly);
      else if (activeEventType) {
          onUpdateEventType(activeScheduleId, {
              customAvailability: { weekly: newWeekly, dates: activeEventType.customAvailability?.dates || [] }
          });
      }
  };

  const updateDayTime = (day: string, field: string, value: string) => {
      const activeEventType = activeScheduleId ? eventTypes.find((t: any) => t.id === activeScheduleId) : null;
      const currentWeekly = activeScheduleId ? (activeEventType?.customAvailability?.weekly || weeklyHours) : weeklyHours;
      const newWeekly = { ...currentWeekly, [day]: { ...currentWeekly[day], [field]: value } };
      if (!activeScheduleId) setWeeklyHours(newWeekly);
      else if (activeEventType) {
          onUpdateEventType(activeScheduleId, {
              customAvailability: { weekly: newWeekly, dates: activeEventType.customAvailability?.dates || [] }
          });
      }
  };

  const copyLink = (slug: string, id: string) => {
      navigator.clipboard.writeText(`https://simplecrm.com/meet/${slug}`);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEditMeeting = () => {
      if (!viewingMeeting) return;
      const evtType = eventTypes.find((et: any) => et.title === viewingMeeting.eventTypeTitle) || {
          title: viewingMeeting.eventTypeTitle,
          duration: viewingMeeting.duration || 30,
          location: viewingMeeting.location || 'Zoom',
          color: 'bg-blue-500',
          slug: 'custom'
      };
      setSelectedEventType(evtType);
      const startDate = new Date(viewingMeeting.startTime.seconds * 1000);
      setBookingDate(startDate);
      setCalendarViewDate(startDate);
      const hours = startDate.getHours();
      const minutes = startDate.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
      setBookingTime(`${formattedHours}:${formattedMinutes} ${ampm}`);
      setInviteeName(viewingMeeting.attendeeName);
      setInviteeEmail(viewingMeeting.attendeeEmail);
      setEditingEventId(viewingMeeting.id);
      setViewingMeeting(null);
      setShowBookingModal(true);
  };

  const handleCancelMeeting = () => setIsCancelling(true);

  const handleConfirmCancel = () => {
      if (viewingMeeting) {
          onDeleteScheduledEvent(viewingMeeting.id);
          setViewingMeeting(null);
          setIsCancelling(false);
          setCancelReason('');
      }
  };

  const handleEnableCustom = () => {
      if (!activeScheduleId) return;
      const et = eventTypes.find((t: any) => t.id === activeScheduleId);
      if (et) {
          onUpdateEventType(et.id, {
              customAvailability: {
                  weekly: JSON.parse(JSON.stringify(weeklyHours)),
                  dates: []
              }
          });
      }
  };

  const handleDisableCustom = () => {
      if (!activeScheduleId) return;
      const et = eventTypes.find((t: any) => t.id === activeScheduleId);
      if (et) onUpdateEventType(et.id, { customAvailability: null });
  };

  const handleDeleteOverride = (idx: number) => {
      const activeEventType = activeScheduleId ? eventTypes.find((t: any) => t.id === activeScheduleId) : null;
      const currentDates = activeScheduleId ? (activeEventType?.customAvailability?.dates || []) : dateSpecificHours;
      const updated = currentDates.filter((_: any, i: number) => i !== idx);
      if (!activeScheduleId) setDateSpecificHours(updated);
      else if (activeEventType) {
          onUpdateEventType(activeScheduleId, {
              customAvailability: { weekly: activeEventType.customAvailability?.weekly || weeklyHours, dates: updated }
          });
      }
  };

  const toggleHost = (memberId: string) => {
      setFormData(prev => {
          const hosts = [...prev.hosts];
          if (hosts.includes(memberId)) {
              if (hosts.length > 1) return { ...prev, hosts: hosts.filter(h => h !== memberId) };
              return prev;
          } else return { ...prev, hosts: [...hosts, memberId] };
      });
  };

  // --- Render Sections ---
  const renderSchedules = () => {
      const activeEventType = activeScheduleId ? eventTypes.find((t: any) => t.id === activeScheduleId) : null;
      const isCustom = !!activeEventType?.customAvailability;
      const displayWeekly = activeScheduleId ? (isCustom ? activeEventType.customAvailability.weekly : null) : weeklyHours;
      const displayDates = activeScheduleId ? (isCustom ? activeEventType.customAvailability.dates : null) : dateSpecificHours;
      return (
          <div className="space-y-6">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                  <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Configure Availability For</label>
                      <div className="relative">
                          <select className="w-full sm:w-64 font-bold text-slate-800 bg-transparent outline-none border-b border-slate-300 pb-1" value={activeScheduleId || ''} onChange={(e) => setActiveScheduleId(e.target.value || null)}>
                              <option value="">Global Default</option>
                              <optgroup label="Event Types">
                                  {eventTypes.map((et: any) => (<option key={et.id} value={et.id}>{et.title}</option>))}
                              </optgroup>
                          </select>
                      </div>
                  </div>
                  {activeScheduleId && (<div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 hidden sm:inline">{isCustom ? 'Custom Schedule Active' : 'Using Global Default'}</span>
                      {isCustom ? (<button onClick={handleDisableCustom} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold transition-colors">Revert to Global</button>) : (<button onClick={handleEnableCustom} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-bold transition-colors">Customize</button>)}
                  </div>)}
              </div>
              {(!activeScheduleId || isCustom) ? (<>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">{activeScheduleId ? `Weekly Hours for ${activeEventType.title}` : 'Global Weekly Hours'}</h3>
                      <div className="space-y-2">
                          {Object.entries(displayWeekly).map(([day, config]: any) => (
                              <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-50 last:border-0">
                                  <div className="flex items-center gap-4 min-w-[120px]">
                                      <div className="w-10 font-bold text-slate-700 uppercase text-xs">{day}</div>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                          <input type="checkbox" className="sr-only peer" checked={config.active} onChange={() => toggleDayActive(day)} />
                                          <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                      </label>
                                  </div>
                                  {config.active ? (
                                      <div className="flex items-center gap-2 text-sm">
                                          <input type="time" className="border rounded-lg px-2 py-1.5 bg-slate-50 text-slate-700 outline-none focus:ring-1 focus:ring-blue-500" value={config.start} onChange={e => updateDayTime(day, 'start', e.target.value)} />
                                          <span className="text-slate-400">to</span>
                                          <input type="time" className="border rounded-lg px-2 py-1.5 bg-slate-50 text-slate-700 outline-none focus:ring-1 focus:ring-blue-500" value={config.end} onChange={e => updateDayTime(day, 'end', e.target.value)} />
                                      </div>
                                  ) : (<span className="text-xs text-slate-400 italic">Unavailable</span>)}
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-bold text-slate-800">Date Overrides</h3>
                          <button onClick={() => { setOverrideFormData({ startDate: '', endDate: '', active: true, start: '09:00', end: '17:00' }); setShowOverrideModal(true); }} className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
                              <Plus className="w-3 h-3" /> Add Override
                          </button>
                      </div>
                      <div className="space-y-3">
                          {displayDates.map((o: any, i: number) => {
                              const startDate = o.startDate || o.date;
                              const endDate = o.endDate || o.date;
                              const isRange = startDate !== endDate;
                              return (
                                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                      <div className="text-sm flex-1">
                                          <div className="flex items-center gap-2">
                                              <span className="font-bold text-slate-800">{startDate}</span>
                                              {isRange && (<><ArrowRight className="w-3 h-3 text-slate-400" /><span className="font-bold text-slate-800">{endDate}</span></>)}
                                              <span className="mx-2 text-slate-400">|</span>
                                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${o.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                  {o.active ? `${o.start} - ${o.end}` : 'Blocked'}
                                              </span>
                                          </div>
                                      </div>
                                      <button onClick={() => handleDeleteOverride(i)} className="text-slate-400 hover:text-red-500 ml-4"><X className="w-4 h-4" /></button>
                                  </div>
                              );
                          })}
                          {displayDates.length === 0 && <p className="text-center text-xs text-slate-400 py-4 italic">No date-specific rules added.</p>}
                      </div>
                  </div>
              </>) : (
                  <div className="text-center py-20 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-slate-600 font-bold mb-1">Using Global Availability</h3>
                      <p className="text-sm text-slate-400 mb-4">This event type currently follows your global schedule.</p>
                      <button onClick={handleEnableCustom} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors">Enable Custom Schedule</button>
                  </div>
              )}
          </div>
      );
  };

  const renderMeetings = () => {
      const now = new Date();
      // Merge Google Calendar events into the list with a compatible format
      const googleAsCrm = (googleEvents || []).map((e: any) => ({
          id: e.id,
          attendeeName: e.title,
          eventTypeTitle: 'Google Calendar',
          startTime: { seconds: Math.floor(new Date(e.start).getTime() / 1000) },
          duration: e.end ? Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000).toString() : '60',
          color: 'bg-green-500',
          source: 'google',
      }));
      let filtered = [...(scheduledEvents || []), ...googleAsCrm];
      
      if (meetingsFilter === 'today') {
          const todayStr = new Date().toDateString();
          filtered = filtered.filter((e) => e.startTime && new Date(e.startTime.seconds * 1000).toDateString() === todayStr);
      }
      else if (meetingsFilter === 'past') {
          filtered = filtered.filter((e) => e.startTime && new Date(e.startTime.seconds * 1000) < now);
      }
      else if (meetingsFilter === 'range') {
          if (dateRangeStart) {
              const [sy, sm, sd] = dateRangeStart.split('-').map(Number);
              const start = new Date(sy, sm - 1, sd); 
              filtered = filtered.filter((e) => e.startTime && new Date(e.startTime.seconds * 1000) >= start);
          }
          if (dateRangeEnd) {
              const [ey, em, ed] = dateRangeEnd.split('-').map(Number);
              const end = new Date(ey, em - 1, ed);
              end.setHours(23, 59, 59, 999);
              filtered = filtered.filter((e) => e.startTime && new Date(e.startTime.seconds * 1000) <= end);
          }
      }
      filtered.sort((a, b) => (a.startTime?.seconds || 0) - (b.startTime?.seconds || 0));
      
      return (
          <div className="p-4 sm:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg w-fit shrink-0">
                        {['today', 'past', 'range'].map(f => (
                            <button key={f} onClick={() => setMeetingsFilter(f as any)} className={`px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${meetingsFilter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {f === 'today' ? 'Today' : f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    {meetingsFilter === 'range' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                            <input type="date" className="text-xs border border-slate-200 rounded-lg py-1 px-2 outline-none focus:ring-1 focus:ring-blue-500 bg-white" value={dateRangeStart} onChange={e => setDateRangeStart(e.target.value)} />
                            <span className="text-slate-400 text-xs">to</span>
                            <input type="date" className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 bg-white" value={dateRangeEnd} onChange={e => setDateRangeEnd(e.target.value)} />
                        </div>
                    )}
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-lg shrink-0">
                      <button 
                        onClick={() => setMeetingsViewMode('list')} 
                        className={`p-1.5 rounded-md transition-all ${meetingsViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} 
                        title="List View"
                      >
                          <List className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setMeetingsViewMode('calendar')} 
                        className={`p-1.5 rounded-md transition-all ${meetingsViewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} 
                        title="Calendar View"
                      >
                          <CalendarDays className="w-4 h-4" />
                      </button>
                  </div>
              </div>

              {meetingsViewMode === 'list' ? (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm divide-y">
                      {filtered.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 italic">No meetings found for this filter.</div>
                      ) : (
                          filtered.map((event) => {
                              const date = new Date(event.startTime.seconds * 1000);
                              return (
                                  <div key={event.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 group gap-4 transition-colors">
                                      <div className="flex items-center gap-4">
                                          <div className={`w-1.5 h-12 ${event.color || 'bg-blue-500'} rounded-full shrink-0`}></div>
                                          <div>
                                              <div className="text-sm font-bold text-slate-800">
                                                  {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                              </div>
                                              <div className="text-xs text-slate-500 font-medium">{date.toDateString()}</div>
                                          </div>
                                      </div>
                                      <div className="flex-1">
                                          <div className="font-bold text-slate-800">{event.attendeeName}</div>
                                          <div className="text-xs text-slate-500">{event.eventTypeTitle}</div>
                                      </div>
                                      <button 
                                        onClick={() => { 
                                            setViewingMeeting(event); 
                                            setNoteContent(event.notes || ''); 
                                            setIsAddingNote(false); 
                                            setIsCancelling(false); 
                                        }}
                                        className="text-blue-600 text-xs font-bold hover:underline opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          Details
                                      </button>
                                  </div>
                              );
                          })
                      )}
                  </div>
              ) : (
                  renderCalendarView()
              )}
          </div>
      );
  };

  const renderCalendarView = () => {
      const days = generateCalendarDays(meetingsCalendarDate);
      const year = meetingsCalendarDate.getFullYear();
      const month = meetingsCalendarDate.getMonth();
      
      const prevMonth = () => setMeetingsCalendarDate(new Date(year, month - 1, 1));
      const nextMonth = () => setMeetingsCalendarDate(new Date(year, month + 1, 1));
      const goToToday = () => setMeetingsCalendarDate(new Date());

      return (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in duration-300">
              <div className="p-4 flex items-center justify-between border-b bg-slate-50/50">
                  <div className="flex items-center gap-4">
                      <h3 className="text-lg font-bold text-slate-800 min-w-[150px]">
                          {meetingsCalendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                      </h3>
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                          <button onClick={prevMonth} className="p-2 hover:bg-slate-50 text-slate-600 border-r transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                          <button onClick={goToToday} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 border-r transition-colors">Today</button>
                          <button onClick={nextMonth} className="p-2 hover:bg-slate-50 text-slate-600 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                  </div>
              </div>
              
              <div className="flex-1 overflow-auto bg-slate-100">
                  <div className="grid grid-cols-7 border-b bg-white">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                          <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r last:border-0">{d}</div>
                      ))}
                  </div>
                  <div className="grid grid-cols-7 border-l border-t">
                      {days.map((date, idx) => {
                          if (!date) return <div key={idx} className="min-h-[140px] bg-slate-50/50 border-r border-b"></div>;
                          
                          const dStr = date.toDateString();
                          const isToday = new Date().toDateString() === dStr;
                          const dayEvents = (scheduledEvents || []).filter((e: any) =>
                              e.startTime && new Date(e.startTime.seconds * 1000).toDateString() === dStr
                          );
                          const dayGoogleEvents = (googleEvents || []).filter((e: any) =>
                              e.start && new Date(e.start).toDateString() === dStr
                          );

                          return (
                              <div key={idx} className={`min-h-[140px] bg-white border-r border-b p-2 flex flex-col group/day transition-colors ${isToday ? 'bg-blue-50/20' : 'hover:bg-slate-50/30'}`}>
                                  <div className={`flex justify-between items-center mb-1.5`}>
                                      <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700'}`}>
                                          {date.getDate()}
                                      </span>
                                  </div>
                                  <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                                      {dayGoogleEvents.map((event: any) => (
                                          <button
                                              key={event.id}
                                              onClick={() => { setViewingMeeting(event); setIsCancelling(false); }}
                                              className="w-full text-left p-1.5 rounded border text-[10px] font-bold truncate bg-green-50 border-green-200 text-green-700 shadow-sm transition-all hover:brightness-95 cursor-pointer"
                                              title={`${new Date(event.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${event.title}`}
                                          >
                                              <span className="opacity-70 mr-1.5">{new Date(event.start).toLocaleTimeString([], {hour:'numeric', minute:'2-digit', hour12: false})}</span>
                                              {event.title}
                                          </button>
                                      ))}
                                      {dayEvents.map((event: any) => (
                                          <button
                                              key={event.id}
                                              onClick={() => {
                                                  setViewingMeeting(event);
                                                  setNoteContent(event.notes || '');
                                                  setIsAddingNote(false);
                                                  setIsCancelling(false);
                                              }}
                                              className={`w-full text-left p-1.5 rounded border text-[10px] font-bold truncate transition-all hover:brightness-95 shadow-sm ${event.color || 'bg-blue-50 border-blue-200 text-blue-700'}`}
                                              title={`${new Date(event.startTime.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${event.attendeeName}`}
                                          >
                                              <span className="opacity-70 mr-1.5">{new Date(event.startTime.seconds * 1000).toLocaleTimeString([], {hour:'numeric', minute:'2-digit', hour12: false})}</span>
                                              {event.attendeeName}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-screen pb-10">
      {/* Header & Tabs */}
      <header className="flex justify-between items-center bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Calendar</h2>
          {activeSection !== 'meetings' && (
              <button 
                onClick={() => activeSection === 'booking_pages' ? handleOpenBookingPageModal() : handleOpenModal(null, 'One-on-One')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm flex items-center gap-2"
              >
                  <Plus className="w-4 h-4" /> 
                  <span className="hidden sm:inline">{activeSection === 'booking_pages' ? 'New Booking Page' : 'Create Event'}</span>
                  <span className="sm:hidden">{activeSection === 'booking_pages' ? 'Page' : 'Event'}</span>
              </button>
          )}
      </header>

      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 shrink-0">
          <div className="flex gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
              {['meetings', 'scheduling', 'booking_pages', 'availability'].map(sec => (
                  <button 
                    key={sec} 
                    onClick={() => setActiveSection(sec as any)}
                    className={`pb-4 pt-1 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === sec ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                      {sec.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
              ))}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto">
          {activeSection === 'scheduling' && (
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {eventTypes.map((type: any) => (
                      <div key={type.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
                          <div className={`h-2 w-full ${type.color}`}></div>
                          <div className="p-5 flex-1 flex flex-col">
                              <div className="flex justify-between items-start mb-4">
                                  <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{type.title}</h3>
                                  <div className="relative group/menu">
                                      <button className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100">
                                          <MoreHorizontal className="w-5 h-5" />
                                      </button>
                                      <div className="hidden group-hover/menu:block absolute right-0 top-full bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10 w-32">
                                          <button onClick={() => handleOpenModal(type)} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
                                          <button onClick={() => onDeleteEventType(type.id)} className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50">Delete</button>
                                      </div>
                              </div>
                              </div>
                              <div className="space-y-2 mb-6">
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                      <Clock className="w-4 h-4" /> <span>{type.duration} min</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                      <Video className="w-4 h-4 text-blue-500" /> <span>{type.location || 'Zoom'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                      <Users className="w-4 h-4" />
                                      <div className="flex -space-x-1.5 overflow-hidden">
                                          {(type.hosts || ['1']).map((hostId: string) => {
                                              const member = teamMembers.find((m: any) => m.id === hostId);
                                              return (
                                                  <div key={hostId} className="inline-block h-5 w-5 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 uppercase" title={member?.name || 'User'}>
                                                      {getInitials(member?.name || 'U')}
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              </div>
                              <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
                                  <button 
                                    onClick={() => copyLink(type.slug, type.id)}
                                    className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1"
                                  >
                                      {copiedId === type.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copiedId === type.id ? 'Copied' : 'Copy link'}
                                  </button>
                                  <div className="flex gap-1">
                                      <button onClick={() => { setSelectedEventType(type); setShowBookingModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 rounded-full">
                                          <ExternalLink className="w-4 h-4" />
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {activeSection === 'meetings' && renderMeetings()}

          {activeSection === 'booking_pages' && (
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bookingPages.map((page: any) => (
                      <div key={page.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                          <div className="h-2 w-full bg-slate-800"></div>
                          <div className="p-5 flex-1 flex flex-col">
                              <h3 className="font-bold text-slate-800 text-lg mb-2">{page.title}</h3>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg w-fit mb-4">
                                  <Layout className="w-3 h-3" /> {(page.includedEventTypeIds?.length || 0)} Events
                              </div>
                              <div className="mt-auto pt-4 border-t flex justify-between items-center">
                                  <button onClick={() => copyLink(page.slug, page.id)} className="text-blue-600 text-xs font-bold flex items-center gap-1">
                                      <Copy className="w-3 h-3" /> Copy Link
                                  </button>
                                  <button onClick={() => onDeleteBookingPage(page.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                              </div>
                          </div>
                      </div>
                  ))}
                  {bookingPages.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-400 bg-white border-2 border-dashed rounded-xl border-slate-200">
                          <p className="mb-4">No booking pages yet.</p>
                          <button onClick={() => handleOpenBookingPageModal()} className="text-blue-600 font-bold hover:underline">Create First Page</button>
                      </div>
                  )}
              </div>
          )}

          {activeSection === 'availability' && (
              <div className="p-4 sm:p-6 max-w-4xl mx-auto">
                  <div className="bg-white border-b border-slate-200 mb-6 shrink-0 rounded-xl overflow-hidden shadow-sm">
                      <div className="flex overflow-x-auto no-scrollbar">
                          {[
                              { id: 'schedules', label: 'Schedules', icon: Clock },
                              { id: 'calendar_settings', label: 'Calendar Connections', icon: Calendar },
                              { id: 'advanced', label: 'Advanced', icon: Settings }
                          ].map(tab => (
                              <button 
                                key={tab.id} 
                                onClick={() => setAvailabilityTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${availabilityTab === tab.id ? 'bg-slate-50 text-slate-900 border-blue-600' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
                              >
                                  <tab.icon className="w-4 h-4" />
                                  {tab.label}
                              </button>
                          ))}
                      </div>
                  </div>
                  {availabilityTab === 'schedules' && renderSchedules()}
                  {availabilityTab === 'calendar_settings' && (
                      <div className="bg-white border rounded-xl p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-slate-800 mb-2">Calendar Connections</h3>
                          <p className="text-sm text-slate-500 mb-6">Check for conflicts across your calendars.</p>
                          <button 
                            onClick={isGoogleConnected ? onDisconnectGoogle : onConnectGoogle}
                            className={`px-6 py-2 rounded-xl text-sm font-bold border transition-colors ${isGoogleConnected ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'}`}
                          >
                              {isGoogleConnected ? 'Disconnect Google' : 'Connect Google Calendar'}
                          </button>
                      </div>
                  )}
                  {availabilityTab === 'advanced' && (
                      <div className="bg-white border rounded-xl p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-slate-800 mb-4">Advanced Settings</h3>
                          <div className="flex items-center justify-between pb-6 border-b">
                              <div><div className="text-sm font-bold text-slate-700">Daily Meeting Limit</div><div className="text-xs text-slate-400">Maximum events per day</div></div>
                              <input type="number" className="w-16 border rounded-lg p-2 text-center" value={meetingLimit} onChange={e => setMeetingLimit(parseInt(e.target.value) || 0)} />
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>

      {viewingMeeting && (() => {
          const isGoogle = viewingMeeting.source === 'google';
          const meetingDate = isGoogle
              ? new Date(viewingMeeting.start)
              : (viewingMeeting.startTime?.seconds ? new Date(viewingMeeting.startTime.seconds * 1000) : null);
          const meetingTitle = isGoogle ? 'Google Calendar' : viewingMeeting.eventTypeTitle;
          const meetingName = isGoogle ? viewingMeeting.title : viewingMeeting.attendeeName;
          return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-0 sm:p-4 z-[600] backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.target === e.currentTarget && setViewingMeeting(null)}>
              <div className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-full sm:max-h-[90vh]">
                  <div className="flex justify-between items-start p-6 border-b border-slate-100 shrink-0">
                      <div>
                          <h3 className="text-lg font-bold text-slate-800">{isCancelling ? 'Cancel Event' : meetingTitle}</h3>
                          {!isCancelling && <div className="text-slate-500 text-sm font-medium">with {meetingName}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                          {!isCancelling && !isGoogle && (
                              <button onClick={handleEditMeeting} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><Edit3 className="w-5 h-5" /></button>
                          )}
                          <button onClick={() => { setViewingMeeting(null); setIsCancelling(false); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5" /></button>
                      </div>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1 space-y-6">
                      {isCancelling ? (
                          <div className="space-y-4">
                              <p className="text-sm text-slate-600">Timeslot will be freed up.</p>
                              <textarea
                                className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                rows={4}
                                placeholder="Reason for cancellation..."
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                              />
                          </div>
                      ) : (
                          <>
                              <div className="flex items-start gap-4">
                                  <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><Calendar className="w-5 h-5" /></div>
                                  <div>
                                      <div className="text-sm font-bold text-slate-800">{meetingDate ? meetingDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Date TBD'}</div>
                                      <div className="text-sm text-slate-500">{meetingDate ? meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                                  </div>
                              </div>
                              <div className="flex items-start gap-4">
                                  <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><Video className="w-5 h-5" /></div>
                                  <div className="text-sm font-bold text-slate-800">{viewingMeeting.location || 'Zoom web conference'}</div>
                              </div>

                              {!isGoogle && (
                              <div className="border-t pt-4">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Participants</h4>
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                                          {getInitials(viewingMeeting.attendeeName || 'U')}
                                      </div>
                                      <div>
                                          <div className="text-sm text-slate-800 font-bold">{viewingMeeting.attendeeName} <span className="font-normal text-slate-400">(Invitee)</span></div>
                                          <div className="text-xs text-slate-500">{viewingMeeting.attendeeEmail}</div>
                                      </div>
                                  </div>
                              </div>
                              )}

                              {isGoogle && (
                                  <div className="border-t pt-4">
                                      <div className="flex items-center gap-2 text-xs text-green-600 font-bold bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                                          <Calendar className="w-3.5 h-3.5" />
                                          Synced from Google Calendar — edit in Google Calendar
                                      </div>
                                  </div>
                              )}

                              {viewingMeeting.notes && (
                                  <div className="border-t pt-4">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Meeting Notes</h4>
                                      <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100" dangerouslySetInnerHTML={{ __html: viewingMeeting.notes }} />
                                  </div>
                              )}
                          </>
                      )}
                  </div>

                  <div className="p-6 border-t bg-slate-50 flex justify-between shrink-0">
                      {isCancelling ? (
                          <>
                              <button onClick={() => setIsCancelling(false)} className="py-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Back</button>
                              <button onClick={handleConfirmCancel} className="bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-red-700 transition-all">Confirm Cancellation</button>
                          </>
                      ) : isGoogle ? (
                          <div className="w-full text-center">
                              <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:underline">Open Google Calendar</a>
                          </div>
                      ) : (
                          <>
                              <button onClick={handleEditMeeting} className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline"><RotateCcw className="w-4 h-4" /> Reschedule</button>
                              <button onClick={handleCancelMeeting} className="text-sm font-bold text-red-600 hover:underline">Cancel Event</button>
                          </>
                      )}
                  </div>
              </div>
          </div>
          );
      })()}

      {/* Event Type Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[700] backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center p-6 border-b">
                      <h3 className="text-lg font-bold text-slate-800">{editingType ? 'Edit Event' : 'New Event'}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleSubmitEventType} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                      <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Name</label><input required className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Duration (min)</label><input type="number" required className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} /></div>
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Location</label>
                              <select className="w-full border rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                                  <option value="Zoom">Zoom</option>
                                  <option value="Phone">Phone</option>
                                  <option value="In-person">In-person</option>
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Team Members to Include</label>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                              {teamMembers.map((member: any) => (
                                  <label key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-white hover:shadow-sm cursor-pointer transition-all">
                                      <div className="flex items-center gap-3">
                                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${member.id === '1' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>{getInitials(member.name)}</div>
                                          <div><div className="text-xs font-bold text-slate-700">{member.name}</div><div className="text-[10px] text-slate-400">{member.role}</div></div>
                                      </div>
                                      <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" checked={formData.hosts.includes(member.id)} onChange={() => toggleHost(member.id)} />
                                  </label>
                              ))}
                          </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4 border-t">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancel</button>
                          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all">Save Event</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {isBookingPageModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[700] backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                  <div className="flex justify-between items-center p-6 border-b">
                      <h3 className="text-lg font-bold text-slate-800">New Booking Page</h3>
                      <button onClick={() => setIsBookingPageModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleSubmitBookingPage} className="p-6 space-y-4">
                      <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Page Title</label><input required className="w-full border rounded-lg px-4 py-2" value={bookingPageFormData.title} onChange={e => setBookingPageFormData({...bookingPageFormData, title: e.target.value})} /></div>
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Included Events</label>
                          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border p-3 rounded-lg">
                              {eventTypes.map((et: any) => (
                                  <label key={et.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        checked={bookingPageFormData.includedEventTypeIds.includes(et.id)}
                                        onChange={e => {
                                            const newIds = e.target.checked 
                                                ? [...bookingPageFormData.includedEventTypeIds, et.id]
                                                : bookingPageFormData.includedEventTypeIds.filter((id: string) => id !== et.id);
                                            setBookingPageFormData({...bookingPageFormData, includedEventTypeIds: newIds});
                                        }}
                                      /> {et.title}
                                  </label>
                              ))}
                          </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                          <button type="button" onClick={() => setIsBookingPageModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancel</button>
                          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Create Page</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {showOverrideModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[700] backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="flex justify-between items-center p-6 border-b">
                      <h3 className="text-lg font-bold text-slate-800">Add Date Override</h3>
                      <button onClick={() => setShowOverrideModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleSaveOverride} className="p-6 space-y-5">
                      <div className="flex gap-4">
                          <div className="flex-1">
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Start Date</label>
                              <input 
                                type="date" 
                                required
                                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                                value={overrideFormData.startDate}
                                onChange={e => {
                                    const newStart = e.target.value;
                                    let newEnd = overrideFormData.endDate;
                                    if (!newEnd || newEnd < newStart) newEnd = newStart;
                                    setOverrideFormData({ ...overrideFormData, startDate: newStart, endDate: newEnd });
                                }}
                              />
                          </div>
                          <div className="flex-1">
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">End Date</label>
                              <input 
                                type="date" 
                                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                                value={overrideFormData.endDate}
                                min={overrideFormData.startDate}
                                onChange={e => setOverrideFormData({ ...overrideFormData, endDate: e.target.value })}
                              />
                          </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                              <div className="text-sm font-bold text-slate-800">Available</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" checked={overrideFormData.active} onChange={() => setOverrideFormData({ ...overrideFormData, active: !overrideFormData.active })} />
                              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                          </label>
                      </div>
                      {overrideFormData.active && (
                          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                              <div className="flex-1 w-full">
                                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Start Time</label>
                                  <input type="time" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={overrideFormData.start} onChange={e => setOverrideFormData({ ...overrideFormData, start: e.target.value })} />
                              </div>
                              <div className="flex-1 w-full">
                                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">End Time</label>
                                  <input type="time" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={overrideFormData.end} onChange={e => setOverrideFormData({ ...overrideFormData, end: e.target.value })} />
                              </div>
                          </div>
                      )}
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button type="button" onClick={() => setShowOverrideModal(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancel</button>
                          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-all">Apply Rule</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {showBookingModal && selectedEventType && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-0 sm:p-4 z-[500] backdrop-blur-sm overflow-hidden">
              <div className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full max-w-lg h-full sm:h-auto max-h-screen sm:max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
                  <div className="p-6 border-b bg-slate-50 flex justify-between items-center shrink-0">
                      <div>
                           <h3 className="text-xl font-bold text-slate-900">{selectedEventType.title}</h3>
                           <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedEventType.duration} min</span>
                                <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> {selectedEventType.location || 'Zoom'}</span>
                           </div>
                      </div>
                      <button onClick={() => setShowBookingModal(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1 space-y-6">
                       <div className="space-y-4">
                           <div className="bg-white border rounded-xl overflow-hidden">
                               <div className="flex items-center justify-between p-3 bg-slate-50 border-b">
                                   <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))} className="p-1 hover:bg-white rounded-md"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                                   <span className="text-sm font-bold text-slate-700">{calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                   <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))} className="p-1 hover:bg-white rounded-md"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                               </div>
                               <div className="p-3">
                                   <div className="grid grid-cols-7 text-center text-[10px] text-slate-400 font-bold mb-2">
                                       {['S','M','T','W','T','F','S'].map(d => <div key={d}>{d}</div>)}
                                   </div>
                                   <div className="grid grid-cols-7 gap-1">
                                       {generateCalendarDays(calendarViewDate).map((date, i) => {
                                           if (!date) return <div key={i}></div>;
                                           const isSelected = bookingDate?.toDateString() === date.toDateString();
                                           const isToday = new Date().toDateString() === date.toDateString();
                                           const isAvailable = checkAvailability(date);
                                           const isPast = date < new Date() && !isToday;
                                           return (
                                               <button
                                                   key={i}
                                                   disabled={isPast || !isAvailable}
                                                   onClick={() => handleDateClick(date)}
                                                   className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center text-xs font-medium transition-all relative ${isSelected ? 'bg-blue-600 text-white shadow-md font-bold' : 'text-slate-700 hover:bg-slate-100'} ${(isPast || !isAvailable) ? 'text-slate-300 cursor-not-allowed hover:bg-transparent' : ''} ${isToday && !isSelected ? 'text-blue-600 font-bold bg-blue-50' : ''}`}
                                               >
                                                   {date.getDate()}
                                               </button>
                                           );
                                       })}
                                   </div>
                               </div>
                           </div>
                           {bookingDate && (
                               <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                   <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Available Times</label>
                                   <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                                       {generateTimeSlots(bookingDate).length > 0 ? (
                                           generateTimeSlots(bookingDate).map((time) => (
                                               <button key={time} onClick={() => setBookingTime(time)} className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${bookingTime === time ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'}`}>
                                                   {time}
                                               </button>
                                           ))
                                       ) : (
                                           <div className="col-span-3 text-center text-xs text-slate-400 py-4 italic bg-slate-50 rounded-lg">No slots available for this date.</div>
                                       )}
                                   </div>
                               </div>
                           )}
                           <div className="space-y-3 pt-4 border-t border-slate-100">
                               <input className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Invitee Name" value={inviteeName} onChange={e => setInviteeName(e.target.value)} />
                               <input className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Invitee Email" value={inviteeEmail} onChange={e => setInviteeEmail(e.target.value)} />
                           </div>
                       </div>
                  </div>
                  <div className="p-6 border-t bg-slate-50 shrink-0">
                       <button onClick={handleBookMeeting} disabled={!bookingDate || !bookingTime || !inviteeName || !inviteeEmail} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]">
                           {editingEventId ? 'Update Booking' : 'Confirm Booking'}
                       </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, Pen, Star, Clock, Send, File, Inbox, 
  MoreVertical, ChevronLeft, ChevronRight, RotateCw, 
  Trash2, Archive, Mail, AlertCircle, Settings, AlertOctagon, Tag,
  ReplyAll, Menu, ArrowLeft, Plus, X, Check, Info,
  Square, CheckSquare, MailOpen, FolderInput, Printer, ListFilter, Edit2, Edit3,
  Layers, ChevronDown, Server, Globe, Shield, MessageSquare, Video, Calendar, ExternalLink, Sparkles, SlidersHorizontal, Loader2, CheckCircle2, History, UserSearch, CalendarPlus, ImageIcon, Palette, ChevronUp, CornerDownRight, Filter, RotateCcw, Paperclip, Building2, User as UserIcon, Calendar as CalendarIcon, UserPlus, Phone
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { getInitials, isValidDate } from '../utils';
import { StatusBadge } from './Shared';
import { RichTextEditor } from './RichTextEditor';

const getApiKey = () => {
    try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            return process.env.API_KEY;
        }
    } catch (e) { }
    return undefined;
};

const PRESET_COLORS = [
    { name: 'Indigo', class: 'bg-indigo-100 text-indigo-700', hex: '#4f46e5' },
    { name: 'Emerald', class: 'bg-emerald-100 text-emerald-700', hex: '#10b981' },
    { name: 'Blue', class: 'bg-blue-100 text-blue-700', hex: '#3b82f6' },
    { name: 'Amber', class: 'bg-amber-100 text-amber-700', hex: '#f59e0b' },
    { name: 'Rose', class: 'bg-rose-100 text-rose-700', hex: '#e11d48' },
    { name: 'Purple', class: 'bg-purple-100 text-purple-700', hex: '#9333ea' },
    { name: 'Pink', class: 'bg-pink-100 text-pink-700', hex: '#db2777' },
    { name: 'Slate', class: 'bg-slate-100 text-slate-700', hex: '#475569' },
];

const ProfilePopover = ({ person, contact, onNavigate, onBookMeeting, onCompose, onAddContact, position, tagGroups = [] }: any) => {
    if (!person) return null;
    
    const isContact = !!contact;
    const name = isContact ? contact.name : person.name;
    const email = isContact ? (contact.emails?.[0]?.value || contact.email) : person.email;
    const phone = isContact ? (contact.phones?.[0]?.value || contact.phone) : null;
    const photo = isContact ? contact.photo : person.photo;
    const groups = isContact ? contact.groups : [];

    const isTopPlacement = position.placement === 'top';

    return (
        <div 
            className={`fixed z-[999] w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 shadow-indigo-500/10`}
            style={{ 
                top: position.top, 
                left: position.left,
                transform: isTopPlacement ? 'translateY(-100%) translateY(-12px)' : 'translateY(12px)'
            }}
        >
            <div className="h-20 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-end px-4 pb-3">
                 <div className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden shadow-lg bg-white translate-y-10 ml-2">
                    {photo ? (
                        <img src={photo} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600 font-black text-2xl uppercase">
                            {getInitials(name)}
                        </div>
                    )}
                 </div>
            </div>
            
            <div className="pt-12 px-5 pb-5">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-slate-900 text-xl leading-tight truncate pr-2">{name}</h3>
                    {isContact && <StatusBadge status={contact.status} />}
                </div>
                
                <div className="space-y-1.5 mb-4">
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{email}</span>
                    </p>
                    {phone && (
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{phone}</span>
                        </p>
                    )}
                </div>
                
                {isContact ? (
                    <div className="space-y-4">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company</div>
                            <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                                <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
                                <div className="truncate">
                                    {contact.company || 'Private Entity'}
                                </div>
                            </div>
                        </div>

                        {groups.length > 0 && (
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Groups</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {groups.map((g: string) => {
                                        const groupColor = tagGroups.find((tg: any) => tg.name === g)?.color || 'bg-slate-100 text-slate-600';
                                        return (
                                            <span key={g} className={`px-2 py-0.5 rounded text-[10px] font-bold ${groupColor}`}>
                                                {g}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mb-4 bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                        <p className="text-[11px] font-bold text-indigo-700 mb-3 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4" /> This person is not in your CRM.
                        </p>
                        <button 
                            onClick={() => onAddContact({ name: person.name, email: person.email })}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md hover:bg-indigo-700 transition-all active:scale-95"
                        >
                            <UserPlus className="w-3.5 h-3.5" /> Add to Contacts
                        </button>
                    </div>
                )}

                {isContact && (
                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <button 
                            onClick={() => onNavigate(contact.id)}
                            className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                        >
                            <UserIcon className="w-3.5 h-3.5 text-emerald-400" /> View Profile
                        </button>
                        <button 
                            onClick={() => onBookMeeting({ name: contact.name, email: contact.email })}
                            className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                        >
                            <CalendarIcon className="w-3.5 h-3.5 text-blue-500" /> Schedule
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const GeminiPanel = ({ isOpen, onClose, contacts, todos, scheduledEvents, selectedEmail }: any) => {
    const [messages, setMessages] = useState<any[]>([
        { role: 'assistant', text: "I'm Gemini. How can I help you today with your emails, calendar, or contacts?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async (customPrompt?: string) => {
        const textToUse = customPrompt || input;
        if (!textToUse.trim() || isLoading) return;
        const apiKey = getApiKey();
        if (!apiKey) return;

        setMessages(prev => [...prev, { role: 'user', text: textToUse }]);
        setInput('');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: textToUse,
                config: {
                    systemInstruction: `You are Gemini, an intelligent CRM assistant. Context: Contacts: ${contacts.length}, Pending Tasks: ${todos.length}.`
                }
            });
            setMessages(prev => [...prev, { role: 'assistant', text: response.text || "I couldn't process that." }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: "Error connecting to Gemini." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="w-80 sm:w-96 h-full bg-white border-l border-slate-200 flex flex-col shrink-0 animate-in slide-in-from-right duration-300 shadow-2xl relative z-[120]">
            <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 rounded-lg text-white"><Sparkles className="w-4 h-4" /></div>
                    <span className="font-bold text-slate-800">Gemini Intelligence</span>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar" ref={scrollRef}>
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                          dangerouslySetInnerHTML={{ __html: msg.text }}
                        />
                    </div>
                ))}
                {isLoading && <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mx-auto" />}
            </div>
            <div className="p-4 border-t">
                <div className="relative">
                    <input className="w-full bg-slate-100 rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none" placeholder="Ask Gemini..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
                    <button onClick={() => handleSend()} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600"><Send className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
};

export const EmailPage = ({ user, emails, contacts = [], tagGroups = [], todos = [], scheduledEvents = [], initialSelectedEmailId, onClearInitialEmailId, onCompose, onUpdateEmail, onDeleteEmail, isGoogleConnected, onConnectGoogle, onNavigateContact, onBookMeeting, onOpenAddContact, onSummarize }: any) => {
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isGeminiPanelOpen, setIsGeminiPanelOpen] = useState(false);
  const [isMailSettingsOpen, setIsMailSettingsOpen] = useState(false);
  
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  const [snoozeModalMode, setSnoozeModalMode] = useState<'snooze' | 'reschedule'>('snooze');
  const [snoozeTargetIds, setSnoozeTargetIds] = useState<string[]>([]);
  const [snoozeDate, setSnoozeDate] = useState(new Date());
  const [snoozeTime, setSnoozeTime] = useState('09:00');
  const [snoozeError, setSnoozeError] = useState<string | null>(null);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const [hoveredPerson, setHoveredPerson] = useState<any>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, placement: 'bottom' });
  const hoverTimeoutRef = useRef<any>(null);

  // Settings State
  const [settingsTab, setSettingsTab] = useState<'general' | 'accounts'>('general');
  const [vacationResponder, setVacationResponder] = useState({
    enabled: false,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    useEndDate: false,
    subject: 'Out of Office',
    message: "Thank you for your email. I'm currently out of the office and will respond as soon as I can."
  });
  const [signatures, setSignatures] = useState<any[]>([
    { id: '1', name: 'Standard', content: `<p><b>${user?.displayName || 'User'}</b><br/>SimpleCRM Support Team</p>` }
  ]);
  const [newSignatureName, setNewSignatureName] = useState('');
  const [isCreatingSignature, setIsCreatingSignature] = useState(false);
  const [signatureDefaults, setSignatureDefaults] = useState({ newEmails: '1', replies: '1' });

  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [emailFilters, setEmailFilters] = useState({
      searchIn: 'all',
      dateStart: '',
      dateEnd: '',
      hasAttachment: false,
      isUnread: false,
      isStarred: false,
      labelName: 'All'
  });

  const findContactByEmail = (emailStr: string) => {
    if (!emailStr) return null;
    const lowerEmail = emailStr.toLowerCase();
    return contacts.find((c: any) => {
        if (c.email && c.email.toLowerCase() === lowerEmail) return true;
        if (c.emails && c.emails.some((e: any) => e.value && e.value.toLowerCase() === lowerEmail)) return true;
        return false;
    });
  };

  const handleProfileMouseEnter = (e: React.MouseEvent, person: any) => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - 340);
      const popoverHeight = 420; 
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      let placement = 'bottom';
      let top = rect.bottom;
      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow && spaceAbove > popoverHeight) {
          placement = 'top';
          top = rect.top;
      }
      setPopoverPosition({ top, left: Math.max(16, left), placement });
      setHoveredPerson(person);
  };

  const handleProfileMouseLeave = () => {
      hoverTimeoutRef.current = setTimeout(() => {
          setHoveredPerson(null);
      }, 300);
  };

  useEffect(() => {
    const checkSnoozed = () => {
      const now = new Date();
      const expiredIds: string[] = [];
      emails.forEach((email: any) => {
        if (email.folder === 'snoozed' && email.snoozeUntil && new Date(email.snoozeUntil) <= now) {
          expiredIds.push(email.id);
        }
      });
      if (expiredIds.length > 0) {
        onUpdateEmail(expiredIds, { folder: 'inbox', snoozeUntil: null, date: new Date(), isRead: false });
      }
    };
    const interval = setInterval(checkSnoozed, 5000);
    return () => clearInterval(interval);
  }, [emails, onUpdateEmail]);

  const [isLabelPickerOpen, setIsLabelPickerOpen] = useState(false);
  const [isNewLabelModalOpen, setIsNewLabelModalOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [isCustomColorMode, setIsCustomColorMode] = useState(false);
  const [selectedLabelColor, setSelectedLabelColor] = useState(PRESET_COLORS[0].class);
  const [customHexColor, setCustomHexColor] = useState('#6366f1');
  const [nestUnder, setNestUnder] = useState<string | null>(null);
  const [isNestingEnabled, setIsNestingEnabled] = useState(false);
  const [collapsedLabels, setCollapsedLabels] = useState<Set<string>>(new Set());
  const [editingLabel, setEditingLabel] = useState<any>(null);
  const [labels, setLabels] = useState<any[]>([
    { name: 'Work', color: 'bg-blue-100 text-blue-700', isCustom: false, parentName: null },
    { name: 'Personal', color: 'bg-emerald-100 text-emerald-700', isCustom: false, parentName: null },
    { name: 'Finance', color: 'bg-amber-100 text-amber-700', isCustom: false, parentName: null },
    { name: 'Travel', color: 'bg-rose-100 text-rose-700', isCustom: false, parentName: null }
  ]);

  const [currentAccount, setCurrentAccount] = useState<any>({ id: 'user', label: user?.displayName || 'My Account', email: user?.email, img: user?.photoURL });
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accounts = [
      { id: 'all', label: 'All Inboxes', email: '', icon: Layers, color: 'bg-slate-800 text-white' },
      { id: 'user', label: user?.displayName || 'My Account', email: user?.email, img: user?.photoURL, color: 'bg-emerald-100 text-emerald-700' },
      { id: 'support', label: 'Support', email: 'support@simplecrm.com', color: 'bg-blue-100 text-blue-700' }
  ];

  useEffect(() => {
    if (initialSelectedEmailId && emails.length > 0) {
      const found = emails.find((e: any) => e.id === initialSelectedEmailId);
      if (found) {
        setSelectedEmail(found);
        if (!found.isRead) onUpdateEmail(found.id, { isRead: true });
        setSelectedFolder(found.folder);
      }
      onClearInitialEmailId();
    }
  }, [initialSelectedEmailId, emails]);

  const filteredEmails = useMemo(() => {
    let result = emails.filter((email: any) => {
      const activeLabel = labels.find(l => l.name === selectedFolder);
      if (activeLabel) { if (!email.labels || !email.labels.includes(selectedFolder)) return false; }
      else if (selectedFolder !== 'all') {
        if (selectedFolder === 'starred') { if (!email.isStarred || email.folder === 'trash') return false; }
        else if (selectedFolder === 'snoozed') { if (email.folder !== 'snoozed') return false; }
        else { if (email.folder !== selectedFolder) return false; }
      } else { if (email.folder === 'trash' || email.folder === 'spam') return false; }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const { searchIn } = emailFilters;
        if (searchIn === 'subject') return email.subject.toLowerCase().includes(q);
        if (searchIn === 'body') return (email.body || email.snippet).toLowerCase().includes(q);
        if (searchIn === 'from') return (email.sender || '').toLowerCase().includes(q) || (email.senderEmail || '').toLowerCase().includes(q);
        if (searchIn === 'to') return (email.to || '').toLowerCase().includes(q);
        return email.subject.toLowerCase().includes(q) || email.sender.toLowerCase().includes(q) || (email.body || email.snippet).toLowerCase().includes(q);
      }
      return true;
    });
    if (emailFilters.isUnread) result = result.filter((e: any) => !e.isRead);
    if (emailFilters.isStarred) result = result.filter((e: any) => e.isStarred);
    if (emailFilters.hasAttachment) result = result.filter((e: any) => e.hasAttachment); 
    if (emailFilters.labelName !== 'All') result = result.filter((e: any) => (e.labels || []).includes(emailFilters.labelName));
    if (emailFilters.dateStart) { const start = new Date(emailFilters.dateStart); result = result.filter((e: any) => new Date(e.date) >= start); }
    if (emailFilters.dateEnd) { const end = new Date(emailFilters.dateEnd); end.setHours(23, 59, 59, 999); result = result.filter((e: any) => new Date(e.date) <= end); }
    return result.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [emails, selectedFolder, searchQuery, labels, emailFilters]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedEmailIds(new Set(filteredEmails.map((e: any) => e.id)));
    else setSelectedEmailIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedEmailIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedEmailIds(newSelected);
  };

  const handleBulkAction = (action: string, singleId?: string) => {
    const ids = singleId ? [singleId] : Array.from(selectedEmailIds);
    if (ids.length === 0) return;
    if (action === 'snooze') { 
        setSnoozeTargetIds(ids); 
        setSnoozeError(null); 
        setSnoozeModalMode('snooze');
        setIsSnoozeModalOpen(true); 
    } 
    else if (action === 'delete') { onUpdateEmail(ids, { folder: 'trash' }); setSelectedEmailIds(new Set()); if (singleId) setSelectedEmail(null); } 
    else if (action === 'archive') { onUpdateEmail(ids, { folder: 'archive' }); setSelectedEmailIds(new Set()); if (singleId) setSelectedEmail(null); } 
    else if (action === 'markRead') { onUpdateEmail(ids, { isRead: true }); setSelectedEmailIds(new Set()); } 
    else if (action === 'markUnread') { onUpdateEmail(ids, { isRead: false }); setSelectedEmailIds(new Set()); if (singleId) setSelectedEmail(null); }
  };

  const handleEmptyTrash = () => {
    const trashEmails = emails.filter((e: any) => e.folder === 'trash');
    const ids = trashEmails.map((e: any) => e.id);
    if (ids.length === 0) return;
    if (window.confirm(`Permanently delete all ${ids.length} messages in Trash? This cannot be undone.`)) {
        onDeleteEmail(ids);
        setSelectedEmailIds(new Set());
        setSelectedEmail(null);
    }
  };

  const applyLabel = (labelName: string, singleId?: string) => {
    const ids = singleId ? [singleId] : Array.from(selectedEmailIds);
    if (ids.length === 0) return;

    onUpdateEmail(ids, (email: any) => {
        const currentLabels = email.labels || [];
        const hasLabel = currentLabels.includes(labelName);
        return {
            labels: hasLabel ? currentLabels.filter((l: string) => l !== labelName) : [...currentLabels, labelName]
        };
    });

    setIsLabelPickerOpen(false);
    if (!singleId) setSelectedEmailIds(new Set());
  };

  const handleAddNewLabel = () => {
    if (newLabelName.trim()) {
        const labelExists = labels.find(l => l.name.toLowerCase() === newLabelName.trim().toLowerCase());
        if (editingLabel) {
            const oldName = editingLabel.name;
            const newName = newLabelName.trim();
            const updatedLabels = labels.map(l => {
                if (l.name === oldName) return { ...l, name: newName, color: isCustomColorMode ? customHexColor : selectedLabelColor, isCustom: isCustomColorMode, parentName: isNestingEnabled ? nestUnder : null };
                if (l.parentName === oldName) return { ...l, parentName: newName };
                return l;
            });
            setLabels(updatedLabels);
            if (oldName !== newName) {
                const emailIdsToUpdate = emails.filter(e => e.labels?.includes(oldName)).map(e => e.id);
                if (emailIdsToUpdate.length > 0) {
                    onUpdateEmail(emailIdsToUpdate, (email: any) => ({
                        labels: (email.labels || []).map((ln: string) => ln === oldName ? newName : ln)
                    }));
                }
            }
            if (selectedFolder === oldName) setSelectedFolder(newName);
        } else if (!labelExists) {
            setLabels([...labels, { name: newLabelName.trim(), color: isCustomColorMode ? customHexColor : selectedLabelColor, isCustom: isCustomColorMode, parentName: isNestingEnabled ? nestUnder : null }]);
        }
        setNewLabelName(''); setNestUnder(null); setIsNestingEnabled(false); setIsNewLabelModalOpen(false); setIsCustomColorMode(false); setEditingLabel(null);
    }
  };

  const handleDeleteLabel = (labelName: string) => {
    if (confirm(`Are you sure you want to delete the label "${labelName}"? It will be removed from all associated emails.`)) {
        const emailIdsWithLabel = emails.filter(e => e.labels?.includes(labelName)).map(e => e.id);
        if (emailIdsWithLabel.length > 0) {
            onUpdateEmail(emailIdsWithLabel, (email: any) => ({
                labels: (email.labels || []).filter((l: string) => l !== labelName)
            }));
        }
        setLabels(prev => prev.filter(l => l.name !== labelName));
        if (selectedFolder === labelName) setSelectedFolder('inbox');
        setIsNewLabelModalOpen(false); 
        setEditingLabel(null); 
    }
  };

  const handleStartEditLabel = (e: React.MouseEvent, label: any) => { e.stopPropagation(); setEditingLabel(label); setNewLabelName(label.name); setIsCustomColorMode(label.isCustom); if (label.isCustom) setCustomHexColor(label.color); else setSelectedLabelColor(label.color); setIsNestingEnabled(!!label.parentName); setNestUnder(label.parentName); setIsNewLabelModalOpen(true); };

  const handleSnoozeConfirm = () => {
    const [hours, minutes] = snoozeTime.split(':').map(Number);
    const combinedDate = new Date(snoozeDate);
    combinedDate.setHours(hours, minutes, 0, 0);
    if (combinedDate <= new Date()) { setSnoozeError("Please select a future date and time."); return; }
    
    if (snoozeModalMode === 'snooze') {
        onUpdateEmail(snoozeTargetIds, { folder: 'snoozed', snoozeUntil: combinedDate.toISOString() });
        if (selectedEmail && snoozeTargetIds.includes(selectedEmail.id)) { setSelectedEmail({ ...selectedEmail, folder: 'snoozed', snoozeUntil: combinedDate.toISOString() }); }
    } else {
        onUpdateEmail(snoozeTargetIds, { scheduledDate: combinedDate.toISOString() });
        if (selectedEmail && snoozeTargetIds.includes(selectedEmail.id)) { setSelectedEmail({ ...selectedEmail, scheduledDate: combinedDate.toISOString() }); }
    }
    
    setIsSnoozeModalOpen(false); setSelectedEmailIds(new Set()); setSnoozeError(null);
  };

  const handleUnsnooze = (email: any) => { onUpdateEmail(email.id, { folder: 'inbox', snoozeUntil: null, date: new Date() }); if (selectedEmail && selectedEmail.id === email.id) { setSelectedEmail({ ...selectedEmail, folder: 'inbox', snoozeUntil: null, date: new Date() }); } };

  const handleSnoozeReschedule = (email: any) => { 
      setSnoozeTargetIds([email.id]); 
      setSnoozeError(null); 
      setSnoozeModalMode(email.folder === 'scheduled' ? 'reschedule' : 'snooze');
      setIsSnoozeModalOpen(true); 
  };

  const toggleLabelCollapse = (e: React.MouseEvent, labelName: string) => { e.stopPropagation(); setCollapsedLabels(prev => { const next = new Set(prev); if (next.has(labelName)) next.delete(labelName); else next.add(labelName); return next; }); };

  const getLabelStyles = (labelName: string) => {
    const label = labels.find(l => l.name === labelName);
    if (!label) return {};
    if (label.isCustom) return { style: { backgroundColor: `${label.color}26`, color: label.color } };
    return { className: label.color };
  };

  const SidebarItem = ({ id, label, icon: Icon, count, isLabel = false, depth = 0, hasChildren = false, isCollapsed = false, onToggleCollapse }: any) => {
    const labelData = isLabel ? labels.find(l => l.name === label) : null;
    return (
        <div className="relative group/item flex items-center">
            {isLabel && hasChildren && (
                <button onClick={(e) => onToggleCollapse(e, label)} className="absolute z-30 p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors" style={{ left: `${(depth * 0.75) + 0.35}rem` }}>
                    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
            )}
            <div role="button" tabIndex={0} onClick={() => { setSelectedFolder(id); setSelectedEmail(null); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center justify-between px-6 py-2.5 text-sm font-medium rounded-r-full transition-colors cursor-pointer ${selectedFolder === id ? 'bg-red-50 text-red-600' : 'text-slate-600 hover:bg-slate-100'}`} style={{ paddingLeft: `${1.5 + (depth * 0.75) + (isLabel ? 0.6 : 0)}rem` }}>
                <div className="flex items-center gap-3 shrink-0 truncate">
                    {Icon ? <Icon className="w-4 h-4 shrink-0" /> : (
                      <div className="flex items-center gap-2 shrink-0">
                        {isLabel && <div className="w-4 flex items-center justify-center shrink-0" />}
                        <div className={`w-2 h-2 rounded-full shrink-0 ${!labelData?.isCustom ? (labelData?.color?.split(' ')[0] || 'bg-slate-300') : ''}`} style={labelData?.isCustom ? { backgroundColor: labelData.color } : {}}></div>
                      </div>
                    )}
                    <span className="truncate">{label}</span>
                </div>
                <div className="flex items-center shrink-0">
                    {isLabel && (
                        <div className="hidden group-hover/item:flex items-center mr-2 gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleStartEditLabel(e, labelData); }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition-all"
                                title="Edit Label"
                            >
                                <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteLabel(labelData.name); }}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded transition-all"
                                title="Delete Label"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    {count > 0 && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${selectedFolder === id ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}
                </div>
            </div>
        </div>
    );
  };

  const renderNestedLabels = () => {
      const renderLabelTree = (parentName: string | null, depth: number) => {
          const children = labels.filter(l => l.parentName === parentName);
          return children.map(label => {
              const hasChildren = labels.some(l => l.parentName === label.name);
              const isCollapsed = collapsedLabels.has(label.name);
              const unreadCount = emails.filter((e: any) => e.labels?.includes(label.name) && !e.isRead).length;
              return (
                  <React.Fragment key={label.name}>
                      <SidebarItem id={label.name} label={label.name} isLabel={true} depth={depth} hasChildren={hasChildren} isCollapsed={isCollapsed} onToggleCollapse={toggleLabelCollapse} count={unreadCount} />
                      {(!isCollapsed && hasChildren) && renderLabelTree(label.name, depth + 1)}
                  </React.Fragment>
              );
          });
      };
      return renderLabelTree(null, 0);
  };

  const scheduledCount = emails.filter((e: any) => e.folder === 'scheduled').length;

  // Settings Logic
  const handleSaveSignature = (id: string, content: string) => {
    setSignatures(prev => prev.map(s => s.id === id ? { ...s, content } : s));
  };

  const handleCreateSignature = () => {
    if (!newSignatureName.trim()) return;
    const newId = Date.now().toString();
    setSignatures([...signatures, { id: newId, name: newSignatureName, content: '' }]);
    setNewSignatureName('');
    setIsCreatingSignature(false);
  };

  const handleDeleteSignature = (id: string) => {
    if (signatures.length <= 1) return;
    setSignatures(prev => prev.filter(s => s.id !== id));
    if (signatureDefaults.newEmails === id) setSignatureDefaults(d => ({ ...d, newEmails: signatures.find(s => s.id !== id)?.id || '' }));
    if (signatureDefaults.replies === id) setSignatureDefaults(d => ({ ...d, replies: signatures.find(s => s.id !== id)?.id || '' }));
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {hoveredPerson && (
          <div 
            onMouseEnter={() => { if(hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }}
            onMouseLeave={handleProfileMouseLeave}
          >
            <ProfilePopover 
                person={hoveredPerson} 
                contact={findContactByEmail(hoveredPerson.email)} 
                position={popoverPosition}
                onNavigate={onNavigateContact}
                onBookMeeting={onBookMeeting}
                onCompose={onCompose}
                onAddContact={(data: any) => { onOpenAddContact(data); setHoveredPerson(null); }}
                tagGroups={tagGroups}
            />
          </div>
      )}

      <div className="h-16 border-b border-slate-200 flex items-center px-4 gap-4 shrink-0 bg-white relative z-20 shadow-sm">
         <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden p-2 text-slate-500 rounded-lg"><Menu className="w-6 h-6" /></button>
         <div className="hidden md:flex items-center gap-3 pr-6 border-r border-slate-100">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shadow-sm"><Mail className="w-5 h-5" /></div>
            <h1 className="text-xl font-bold text-slate-800">Mail</h1>
         </div>
         
         <div className="flex-1 max-w-xl relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
            <input className="w-full bg-slate-100 border-2 border-transparent rounded-xl pl-9 pr-12 py-2 outline-none text-sm transition-all focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-50" placeholder="Search mail..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (<button onClick={() => setSearchQuery('')} className="p-1 text-slate-300 hover:text-slate-500 rounded-full transition-colors"><X className="w-3.5 h-3.5" /></button>)}
                <div className="w-px h-5 bg-slate-200 mx-1"></div>
                <button onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)} className={`p-1.5 rounded-lg transition-all ${isAdvancedSearchOpen ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`} title="Advanced Filters"><SlidersHorizontal className="w-4 h-4" /></button>
            </div>
         </div>
         <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setIsGeminiPanelOpen(!isGeminiPanelOpen)} className={`p-2 rounded-full ${isGeminiPanelOpen ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'text-slate-500 hover:bg-slate-100'} transition-all`} title="CRM Intelligence"><Sparkles className="w-5 h-5" /></button>
            <button onClick={() => setIsMailSettingsOpen(true)} className={`p-2 rounded-full transition-all ${isMailSettingsOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`} title="Email Settings"><Settings className="w-5 h-5" /></button>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
         <div className={`fixed inset-0 z-[110] transition-opacity md:static md:z-0 md:opacity-100 ${isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none md:pointer-events-auto'}`}>
            <div className="absolute inset-0 bg-black/40 md:hidden" onClick={() => setIsMobileSidebarOpen(false)}></div>
            <div className={`relative w-72 h-full bg-white flex flex-col shrink-0 md:w-64 transition-transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                 <div className="p-4 space-y-4">
                    <div className="relative">
                        <button onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)} className="w-full flex items-center justify-between p-2 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm">
                            <div className="flex items-center gap-2 overflow-hidden">
                                {currentAccount.img ? <img src={currentAccount.img} className="w-6 h-6 rounded-full" /> : <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentAccount.color || 'bg-slate-200'}`}>{getInitials(currentAccount.label)}</div>}
                                <span className="text-xs font-bold text-slate-700 truncate">{currentAccount.label}</span>
                            </div>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>
                        {isAccountMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsAccountMenuOpen(false)}></div>
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1.5 overflow-hidden animate-in fade-in zoom-in-95">
                                    {accounts.map(acc => (
                                        <button key={acc.id} onClick={() => { setCurrentAccount(acc); setIsAccountMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${acc.color || 'bg-slate-200'}`}>{acc.icon ? <acc.icon className="w-3 h-3" /> : getInitials(acc.label)}</div>
                                            <div className="text-left"><div className="text-xs font-bold text-slate-800">{acc.label}</div><div className="text-[10px] text-slate-400">{acc.email}</div></div>
                                        </button>
                                    ))}
                                    <div className="border-t border-slate-100 mt-1.5 pt-1.5"><button onClick={() => onConnectGoogle()} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-xs font-bold text-indigo-600"><Plus className="w-3 h-3" /> Add Account</button></div>
                                </div>
                            </>
                        )}
                    </div>
                    <button onClick={() => onCompose()} className="flex items-center justify-center w-full gap-3 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 rounded-2xl px-6 py-3 transition-all"><Pen className="w-4 h-4" /><span className="font-bold">Compose</span></button>
                 </div>
                 <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                     <SidebarItem id="inbox" label="Inbox" icon={Inbox} count={emails.filter((e: any) => e.folder === 'inbox' && !e.isRead).length} />
                     <SidebarItem id="starred" label="Starred" icon={Star} />
                     <SidebarItem id="snoozed" label="Snoozed" icon={Clock} />
                     <SidebarItem id="sent" label="Sent" icon={Send} />
                     {scheduledCount > 0 && (
                        <SidebarItem id="scheduled" label="Scheduled" icon={CalendarIcon} count={scheduledCount} />
                     )}
                     <SidebarItem id="drafts" label="Drafts" icon={File} />
                     <SidebarItem id="archive" label="Archive" icon={Archive} />
                     <SidebarItem id="spam" label="Spam" icon={AlertOctagon} />
                     <SidebarItem id="trash" label="Trash" icon={Trash2} />
                     <div className="mt-8 mb-2 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between"><span>Labels</span><button onClick={() => { setEditingLabel(null); setNewLabelName(''); }} className="hover:text-slate-600"><Plus className="w-3 h-3" /></button></div>
                     {renderNestedLabels()}
                 </div>
            </div>
         </div>

         <div className="flex-1 bg-white md:rounded-tl-2xl overflow-hidden flex relative border-l border-slate-100">
            <div className={`flex flex-col w-full ${selectedEmail ? 'hidden' : 'flex'}`}>
                <div className="h-12 border-b border-slate-200 flex items-center justify-between px-4 text-slate-500 bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500" checked={filteredEmails.length > 0 && selectedEmailIds.size === filteredEmails.length} onChange={handleSelectAll} />
                        <button className="p-1.5 hover:bg-slate-100 rounded transition-colors" title="Refresh"><RotateCw className="w-4 h-4" /></button>
                        {selectedEmailIds.size > 0 && (
                            <div className="flex items-center gap-2 border-l pl-4 animate-in fade-in slide-in-from-left-2 duration-200 relative">
                                <button onClick={() => handleBulkAction('archive')} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Archive"><Archive className="w-4 h-4" /></button>
                                <button onClick={() => handleBulkAction('delete')} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                <button onClick={() => handleBulkAction('markRead')} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Mark Read"><MailOpen className="w-4 h-4" /></button>
                                <button onClick={() => handleBulkAction('snooze')} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Snooze"><Clock className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {filteredEmails.map((email: any) => {
                        const contactMatch = findContactByEmail(email.senderEmail || email.sender);
                        return (
                        <div key={email.id} onClick={() => { setSelectedEmail(email); if (!email.isRead) onUpdateEmail(email.id, { isRead: true }); }} className={`flex items-center gap-4 px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-all ${email.isRead ? 'bg-white' : 'bg-slate-50'}`}>
                            <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-red-600" checked={selectedEmailIds.has(email.id)} onChange={() => handleToggleSelect(email.id)} />
                                <button onClick={() => onUpdateEmail(email.id, { isStarred: !email.isStarred })} className={email.isStarred ? 'text-amber-400' : 'text-slate-300 hover:text-slate-400'}><Star className={`w-4 h-4 ${email.isStarred ? 'fill-current' : ''}`} /></button>
                            </div>
                            <div className={`w-48 truncate text-sm flex items-center gap-2 ${email.isRead ? 'font-medium' : 'font-bold'}`}>
                                <div 
                                    className="relative shrink-0"
                                    onMouseEnter={(e) => handleProfileMouseEnter(e, { name: email.sender, email: email.senderEmail || email.sender })}
                                    onMouseLeave={handleProfileMouseLeave}
                                    onClick={e => e.stopPropagation()}
                                >
                                    {contactMatch?.photo ? (
                                        <img src={contactMatch.photo} className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-100 shadow-sm" alt="" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 shrink-0 uppercase">
                                            {getInitials(email.sender)}
                                        </div>
                                    )}
                                </div>
                                <span className="truncate">{email.sender}</span>
                            </div>
                            <div className="flex-1 truncate text-sm flex items-center gap-2">
                                <span className={email.isRead ? 'text-slate-700' : 'font-bold'}>{email.subject}</span>
                                {email.labels?.map((l: string) => {
                                    const s = getLabelStyles(l);
                                    return ( <span key={l} className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.className || ''}`} style={s.style}>{l}</span> );
                                })}
                                <span className="text-slate-400 ml-2">— {email.snippet}</span>
                            </div>
                            <div className={`text-xs font-medium ${(selectedFolder === 'snoozed' || selectedFolder === 'scheduled') ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                                {new Date(email.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    );})}
                </div>
            </div>

            {selectedEmail && (
                 <div className="flex-1 flex-col bg-white h-full z-10 animate-in slide-in-from-right duration-200 flex">
                     <div className="h-12 border-b border-slate-200 flex items-center px-4 text-slate-500 bg-white shrink-0">
                         <div className="flex items-center gap-2">
                             <button onClick={() => setSelectedEmail(null)} className="p-1.5 hover:bg-slate-100 rounded transition-colors" title="Back"><ArrowLeft className="w-5 h-5" /></button>
                             <div className="w-px h-6 bg-slate-200 mx-1"></div>
                             <button onClick={() => handleBulkAction('archive', selectedEmail.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Archive"><Archive className="w-4 h-4" /></button>
                             <button onClick={() => handleBulkAction('delete', selectedEmail.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                             <button onClick={() => handleBulkAction('markUnread', selectedEmail.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Mark Unread"><MailOpen className="w-4 h-4" /></button>
                             <button onClick={() => onUpdateEmail(selectedEmail.id, { isStarred: !selectedEmail.isStarred })} className={`p-1.5 hover:bg-slate-100 rounded transition-colors ${selectedEmail.isStarred ? 'text-amber-400' : ''}`} title="Star"><Star className={`w-4 h-4 ${selectedEmail.isStarred ? 'fill-current' : ''}`} /></button>
                         </div>
                     </div>
                     <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
                         <div className="flex flex-wrap gap-2 mb-2">{selectedEmail.labels?.map((l: string) => { const s = getLabelStyles(l); return ( <span key={l} className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.className || ''}`} style={s.style}>{l}</span> ); })}</div>
                         <h2 className="text-2xl font-bold text-slate-800 mb-6">{selectedEmail.subject}</h2>
                         <div className="flex items-center gap-4 mb-8">
                             {(() => {
                                 const match = findContactByEmail(selectedEmail.senderEmail || selectedEmail.sender);
                                 return (
                                    <div 
                                        className="relative group/avatar cursor-pointer"
                                        onMouseEnter={(e) => handleProfileMouseEnter(e, { name: selectedEmail.sender, email: selectedEmail.senderEmail || selectedEmail.sender })}
                                        onMouseLeave={handleProfileMouseLeave}
                                    >
                                        {match?.photo ? (
                                            <img src={match.photo} className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 shadow-md" alt={selectedEmail.sender} />
                                        ) : (
                                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm">{getInitials(selectedEmail.sender)}</div>
                                        )}
                                    </div>
                                 );
                             })()}
                             <div className="flex-1">
                                 <div className="font-bold text-slate-900 flex items-center gap-2">
                                     {selectedEmail.sender} 
                                     <span className="font-normal text-slate-400 text-sm">({selectedEmail.senderEmail})</span>
                                 </div>
                                 <div className="text-xs text-slate-500">{new Date(selectedEmail.date).toLocaleString()}</div>
                             </div>
                             <div className="flex items-center gap-2">
                                 {onSummarize && <button onClick={() => onSummarize(selectedEmail.body || selectedEmail.snippet)} className="p-2 border border-indigo-200 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors flex items-center gap-1.5" title="AI Summarize"><Sparkles className="w-4 h-4" /><span className="text-xs font-bold hidden sm:inline">Summarize</span></button>}
                                 <button onClick={() => onCompose({ to: selectedEmail.senderEmail, subject: `Re: ${selectedEmail.subject}`, body: `<br/><br/>On ${new Date(selectedEmail.date).toLocaleString()}, ${selectedEmail.sender} wrote:<br/><blockquote>${selectedEmail.body}</blockquote>` })} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" title="Reply"><ReplyAll className="w-4 h-4 mirror" /></button>
                             </div>
                         </div>
                         <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                             <iframe
                                 srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#334155;line-height:1.6;overflow-x:hidden;}img{max-width:100%;height:auto;}a{color:#4f46e5;}</style></head><body>${selectedEmail.body}</body></html>`}
                                 className="w-full border-0"
                                 style={{ minHeight: '300px' }}
                                 onLoad={(e) => {
                                     const iframe = e.target as HTMLIFrameElement;
                                     if (iframe.contentDocument?.body) {
                                         iframe.style.height = iframe.contentDocument.body.scrollHeight + 40 + 'px';
                                     }
                                 }}
                                 sandbox="allow-same-origin"
                                 title="Email content"
                             />
                         </div>
                     </div>
                 </div>
            )}
         </div>

         {/* Settings Modal */}
         {isMailSettingsOpen && (
            <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-200 text-slate-700 rounded-lg"><Settings className="w-5 h-5" /></div>
                            <h3 className="text-xl font-bold text-slate-800">Mail Settings</h3>
                        </div>
                        <button onClick={() => setIsMailSettingsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar */}
                        <div className="w-56 border-r bg-slate-50/30 p-4 space-y-1">
                            <button onClick={() => setSettingsTab('general')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all ${settingsTab === 'general' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>General</button>
                            <button onClick={() => setSettingsTab('accounts')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all ${settingsTab === 'accounts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>Accounts & Import</button>
                            <div className="pt-4 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">More Settings</div>
                            <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-slate-400 cursor-not-allowed opacity-60">Filters & Blocked</button>
                            <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-slate-400 cursor-not-allowed opacity-60">Forwarding & POP/IMAP</button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10">
                            {settingsTab === 'general' && (
                                <>
                                    {/* Signatures Section */}
                                    <section>
                                        <h4 className="text-lg font-bold text-slate-800 mb-2">Signature</h4>
                                        <p className="text-xs text-slate-500 mb-6">Append a professional signature at the end of all outgoing messages.</p>
                                        
                                        <div className="flex gap-6 h-[250px]">
                                            <div className="w-48 flex flex-col gap-2 border-r pr-4 overflow-y-auto no-scrollbar">
                                                {signatures.map(sig => (
                                                    <div key={sig.id} className="group relative">
                                                        <button onClick={() => setSignatureDefaults(d => ({ ...d, current: sig.id }))} className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${signatureDefaults.current === sig.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                            {sig.name}
                                                        </button>
                                                        <button onClick={() => handleDeleteSignature(sig.id)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                                                    </div>
                                                ))}
                                                {!isCreatingSignature ? (
                                                    <button onClick={() => setIsCreatingSignature(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 hover:underline"><Plus className="w-3.5 h-3.5" /> Create new</button>
                                                ) : (
                                                    <div className="px-2 space-y-2 mt-2">
                                                        <input autoFocus className="w-full border-b outline-none text-xs py-1" placeholder="Name..." value={newSignatureName} onChange={e => setNewSignatureName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateSignature()} />
                                                        <div className="flex gap-2"><button onClick={handleCreateSignature} className="text-[10px] font-black uppercase text-blue-600">Add</button><button onClick={() => setIsCreatingSignature(false)} className="text-[10px] font-black uppercase text-slate-400">Cancel</button></div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col border rounded-xl overflow-hidden bg-slate-50/50">
                                                {signatureDefaults.current ? (
                                                    <RichTextEditor 
                                                        value={signatures.find(s => s.id === signatureDefaults.current)?.content || ''} 
                                                        onChange={(val: string) => handleSaveSignature(signatureDefaults.current, val)} 
                                                        placeholder="Enter your signature text here..."
                                                    />
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic">Select or create a signature to edit</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t grid grid-cols-2 gap-8 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">For New Emails Use</label>
                                                <select className="w-full border rounded-lg px-3 py-2 text-xs font-bold text-slate-700 bg-white" value={signatureDefaults.newEmails} onChange={e => setSignatureDefaults({...signatureDefaults, newEmails: e.target.value})}>
                                                    <option value="none">No signature</option>
                                                    {signatures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">On Reply/Forward Use</label>
                                                <select className="w-full border rounded-lg px-3 py-2 text-xs font-bold text-slate-700 bg-white" value={signatureDefaults.replies} onChange={e => setSignatureDefaults({...signatureDefaults, replies: e.target.value})}>
                                                    <option value="none">No signature</option>
                                                    {signatures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Vacation Responder Section */}
                                    <section className="pt-10 border-t border-slate-100">
                                        <h4 className="text-lg font-bold text-slate-800 mb-2">Vacation responder</h4>
                                        <p className="text-xs text-slate-500 mb-6">Send an automated reply to incoming messages when you are away.</p>
                                        
                                        <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-6">
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input type="radio" name="v_responder" checked={!vacationResponder.enabled} onChange={() => setVacationResponder({...vacationResponder, enabled: false})} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                    <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Responder off</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input type="radio" name="v_responder" checked={vacationResponder.enabled} onChange={() => setVacationResponder({...vacationResponder, enabled: true})} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                    <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Responder on</span>
                                                </label>
                                            </div>

                                            <div className={`space-y-4 transition-all ${!vacationResponder.enabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">First day</label>
                                                        <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" value={vacationResponder.startDate} onChange={e => setVacationResponder({...vacationResponder, startDate: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Last day (optional)</label>
                                                            <input type="checkbox" checked={vacationResponder.useEndDate} onChange={e => setVacationResponder({...vacationResponder, useEndDate: e.target.checked})} className="rounded text-blue-600" />
                                                        </div>
                                                        <input type="date" disabled={!vacationResponder.useEndDate} className="w-full border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100" value={vacationResponder.endDate} onChange={e => setVacationResponder({...vacationResponder, endDate: e.target.value})} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject</label>
                                                    <input className="w-full border rounded-lg px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Out of Office" value={vacationResponder.subject} onChange={e => setVacationResponder({...vacationResponder, subject: e.target.value})} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Message</label>
                                                    <div className="border rounded-xl bg-white h-40">
                                                        <RichTextEditor value={vacationResponder.message} onChange={(val: string) => setVacationResponder({...vacationResponder, message: val})} placeholder="Type your auto-reply here..." />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}

                            {settingsTab === 'accounts' && (
                                <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <section>
                                        <div className="flex justify-between items-end mb-6">
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-800 mb-1">Send mail as:</h4>
                                                <p className="text-xs text-slate-500">Configure which email addresses you can send messages from.</p>
                                            </div>
                                            <button className="text-xs font-black uppercase text-blue-600 hover:underline">Add another email address</button>
                                        </div>
                                        <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 border-b">
                                                    <tr>
                                                        <th className="px-6 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Name & Address</th>
                                                        <th className="px-6 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Status</th>
                                                        <th className="px-6 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-widest text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    <tr className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-800">{user?.displayName || 'Primary User'}</div>
                                                            <div className="text-xs text-slate-400">{user?.email || 'user@example.com'}</div>
                                                        </td>
                                                        <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase">Default</span></td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button className="text-blue-600 text-xs font-bold hover:underline">Edit info</button>
                                                        </td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-800">Support Team</div>
                                                            <div className="text-xs text-slate-400">support@simplecrm.com</div>
                                                        </td>
                                                        <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] uppercase">Verified</span></td>
                                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                                                            <button className="text-blue-600 text-xs font-bold hover:underline">Make default</button>
                                                            <button className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <section className="pt-10 border-t border-slate-100">
                                        <div className="flex justify-between items-end mb-6">
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-800 mb-1">Check mail from other accounts:</h4>
                                                <p className="text-xs text-slate-500">Import emails from other accounts using POP3 or Gmail sync.</p>
                                            </div>
                                            <button className="text-xs font-black uppercase text-blue-600 hover:underline">Add a mail account</button>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-300 text-center flex flex-col items-center justify-center gap-2">
                                            <RotateCw className="w-8 h-8 text-slate-300 mb-2" />
                                            <p className="text-sm font-bold text-slate-600">No other accounts linked yet.</p>
                                            <p className="text-xs text-slate-400">Fetch messages from your personal or legacy work accounts directly into SimpleCRM.</p>
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-8 py-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
                        <button onClick={() => setIsMailSettingsOpen(false)} className="px-6 py-2 text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-white rounded-xl transition-all">Cancel</button>
                        <button onClick={() => setIsMailSettingsOpen(false)} className="px-10 py-2 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">Save Changes</button>
                    </div>
                </div>
            </div>
         )}

         {isSnoozeModalOpen && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[500] backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"><div className="p-5 border-b flex justify-between items-center bg-slate-50/50"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-500" /> {snoozeModalMode === 'reschedule' ? 'Reschedule Send' : 'Snooze Email'}</h3><button onClick={() => setIsSnoozeModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div><div className="p-5 space-y-4">{snoozeError && (<div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2"><AlertCircle className="w-4 h-4" />{snoozeError}</div>)}<div className="bg-white border border-slate-200 rounded-xl p-3 shadow-inner"><div className="flex items-center justify-between mb-4"><button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></button><span className="text-xs font-bold uppercase tracking-wider">{calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span><button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></button></div><div className="grid grid-cols-7 gap-1 text-center">{Array.from({ length: 31 }).map((_, i) => (<button key={i} onClick={() => { setSnoozeDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), i + 1)); setSnoozeError(null); }} className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${snoozeDate.getDate() === (i+1) && snoozeDate.getMonth() === calendarViewDate.getMonth() ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-50'}`}>{i+1}</button>))}</div></div><div className="flex items-center gap-3 bg-slate-50 border p-3 rounded-xl"><Clock className="w-4 h-4 text-slate-400" /><input type="time" className="bg-transparent text-sm font-bold outline-none" value={ snoozeTime} onChange={e => { setSnoozeTime(e.target.value); setSnoozeError(null); }} /></div></div><div className="p-5 border-t bg-slate-50 flex justify-end gap-3"><button onClick={() => setIsSnoozeModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button><button onClick={handleSnoozeConfirm} className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg">{snoozeModalMode === 'reschedule' ? 'Reschedule' : 'Snooze'}</button></div></div></div>)}

         {isNewLabelModalOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[500] backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"><div className="p-5 border-b flex justify-between items-center bg-slate-50/50"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Tag className="w-4 h-4 text-indigo-500" />{editingLabel ? 'Edit Label' : 'Create Label'}</h3><button onClick={() => { setIsNewLabelModalOpen(false); setEditingLabel(null); setNewLabelName(''); }}><X className="w-5 h-5 text-slate-400" /></button></div><div className="p-5 space-y-6"><div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Label Name</label><input autoFocus className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-sm font-medium" placeholder="e.g. Important Project" value={newLabelName} onChange={e => setNewLabelName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNewLabel()} /></div><div><div className="flex items-center gap-2 mb-3"><input type="checkbox" id="nestLabel" className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" checked={isNestingEnabled} onChange={e => setIsNestingEnabled(e.target.checked)} /><label htmlFor="nestLabel" className="text-sm font-medium text-slate-700">Nest label under:</label></div>{isNestingEnabled && (<select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-sm font-medium mb-6 animate-in slide-in-from-top-1" value={nestUnder || ''} onChange={e => setNestUnder(e.target.value || null)}><option value="">Please select a parent...</option>{labels.filter(l => l.name !== editingLabel?.name).map(l => ( <option key={l.name} value={l.name}>{l.name}</option> ))}</select>)}</div><div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">Choose Color</label><div className="grid grid-cols-4 gap-3">{PRESET_COLORS.map((color) => ( <button key={color.name} type="button" onClick={() => { setSelectedLabelColor(color.class); setIsCustomColorMode(false); }} className={`h-10 rounded-xl flex items-center justify-center transition-all ${color.class} ${(!isCustomColorMode && selectedLabelColor === color.class) ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105 shadow-sm' : 'opacity-80 hover:opacity-100 hover:scale-105'}`} title={color.name}>{!isCustomColorMode && selectedLabelColor === color.class && <Check className="w-4 h-4" />}</button> ))}<button type="button" onClick={() => setIsCustomColorMode(true)} className={`h-10 rounded-xl flex items-center justify-center transition-all bg-white border-2 border-dashed border-slate-300 text-slate-400 ${isCustomColorMode ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105 shadow-sm border-indigo-300 text-indigo-500' : 'hover:border-slate-400 hover:text-slate-600'}`} title="Custom Color"><Palette className="w-4 h-4" /></button></div>{isCustomColorMode && (<div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl animate-in slide-in-from-top-2 duration-200"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg shadow-sm border border-white shrink-0" style={{ backgroundColor: customHexColor }} /><div className="flex-1"><input type="color" className="w-full h-8 cursor-pointer bg-transparent border-none rounded" value={customHexColor} onChange={e => setCustomHexColor(e.target.value)} /></div><div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">{customHexColor}</div></div></div>)}</div></div><div className="p-5 border-t bg-slate-50 flex justify-end gap-3"><button onClick={() => { setIsNewLabelModalOpen(false); setEditingLabel(null); setNewLabelName(''); }} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button><button disabled={!newLabelName.trim()} onClick={handleAddNewLabel} className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg disabled:opacity-50">{editingLabel ? 'Save Changes' : 'Create'}</button></div></div></div>)}

         <GeminiPanel isOpen={isGeminiPanelOpen} onClose={() => setIsGeminiPanelOpen(false)} contacts={contacts} todos={todos} scheduledEvents={scheduledEvents} selectedEmail={selectedEmail} />
      </div>
    </div>
  );
};

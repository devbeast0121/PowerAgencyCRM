
import React, { useState, useEffect, useMemo, Component, ReactNode, useRef } from 'react';
import { 
  Layout, BarChart3, Users, List, LayoutGrid, Plus, 
  Building2, User as UserIcon, Mail, Phone, ChevronRight, ChevronLeft, Search, 
  Circle, CheckCircle2, XCircle, Shapes, X, Minimize2, Maximize2, Send, Paperclip,
  Sparkles, Loader2, Copy, PhoneOff, Mic, SlidersHorizontal, ChevronDown, Filter, RotateCcw,
  Smile, Link as LinkIcon, Lock, Pen, MoreVertical, Trash2, HardDrive, Image as ImageIcon,
  FileText, Clock, Calendar as CalendarIcon, Check
} from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { User } from 'firebase/auth';
import { 
  auth, db, appId, 
  signInWithCustomToken, signInAnonymously, onAuthStateChanged, signInWithGoogleCalendar, signInWithGoogle,
  collection, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot, serverTimestamp
} from './firebase';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { GroupsPage } from './components/GroupsPage';
import { TodoPage } from './components/TodoPage';
import { Pipeline } from './components/Pipeline';
import { SettingsPage } from './components/SettingsPage';
import { CalendarPage } from './components/CalendarPage';
import { EmailPage } from './components/EmailPage';
import { ContactDetail } from './components/ContactDetail';
import { ContactForm } from './components/ContactForm';
import { AuthPage } from './components/AuthPage';
import { StatusBadge } from './components/Shared';
import { RichTextEditor } from './components/RichTextEditor';
import { GROUP_COLORS } from './constants';
import { decodeBase64, decodeAudioData, formatFileSize } from './utils';

// --- Audio Helpers for Live API ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createAudioBlob(data: Float32Array): any {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Mock Email Generator
const generateMockEmails = () => {
  const senders = [
    { name: "Sarah Connor", email: "sarah@cyberdyne.net" },
    { name: "John Wick", email: "j.wick@continental.com" },
    { name: "Ellen Ripley", email: "ripley@nostromo.ship" },
    { name: "Carter Burke", email: "burke@company.net" },
    { name: "Support Team", email: "support@simplecrm.com" },
    { name: "Newsletter", email: "news@simplecrm.com" }
  ];
  const subjects = ["Project Update", "Lunch meeting?", "Invoice #1023", "New Security Protocol", "Welcome to SimpleCRM"];
  const bodies = [
      "Hi there,<br/><br/>Just wanted to follow up on our previous conversation. Let me know if you have time to chat later today.<br/><br/>Best,<br/>Sender",
      "Attached is the invoice for the last month's services. Please process it at your earliest convenience.",
      "Are we still on for lunch tomorrow at 12:30 PM? Let me know.",
      "We have updated our security policies. Please review the attached document.",
      "Welcome aboard! We are excited to have you with us."
  ];

  return Array.from({ length: 15 }).map((_, i) => {
    const senderObj = senders[i % senders.length];
    return {
      id: `email-${i}`,
      sender: senderObj.name,
      senderEmail: senderObj.email,
      subject: subjects[i % subjects.length],
      snippet: bodies[i % bodies.length].replace(/<br\/>/g, ' ').substring(0, 60) + "...",
      body: bodies[i % bodies.length],
      date: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
      isRead: Math.random() > 0.4,
      isStarred: Math.random() > 0.8,
      folder: i % 5 === 0 ? 'sent' : 'inbox',
      labels: Math.random() > 0.7 ? ['Work'] : []
    };
  }).sort((a, b) => b.date.getTime() - a.date.getTime());
};

// Error Boundary Component
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-4 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-4">We encountered an unexpected error.</p>
          <pre className="bg-white p-4 rounded border border-red-200 text-xs text-left overflow-auto max-w-2xl text-red-500">
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [contacts, setContacts] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [tagGroups, setTagGroups] = useState<any[]>([]);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [currentPipelineId, setCurrentPipelineId] = useState<string>('');
  const [customFields, setCustomFields] = useState<any[]>([]); 
  const [emails, setEmails] = useState<any[]>([]);
  const [bookingPages, setBookingPages] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [initialSelectedEmailId, setInitialSelectedEmailId] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [contactModalInitialData, setContactModalInitialData] = useState<any>(null);
  const [modalCallback, setModalCallback] = useState<any>(null);
  const [contactsViewMode, setContactsViewMode] = useState<'list' | 'gallery'>('list');
  const [initialCalendarBooking, setInitialCalendarBooking] = useState<any>(null);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({ type: 'All', lifecycleStage: 'All', groupId: 'All', pipelineId: 'All' });

  // --- Live Briefing & TTS State ---
  const [liveCallStatus, setLiveCallStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<Promise<any> | null>(null);
  const liveSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);

  // --- Team Members State ---
  const [teamMembers, setTeamMembers] = useState([
    { id: '1', name: 'You', email: 'you@company.com', role: 'Super Admin', avatar: null },
  ]);

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isComposeMinimized, setIsComposeMinimized] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [composeAttachments, setComposeAttachments] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [showScheduleSendModal, setShowScheduleSendModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const composeAttachmentInputRef = useRef<HTMLInputElement>(null);

  const [isGeminiOpen, setIsGeminiOpen] = useState(false);
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);

  // Summary State
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // Google Integration State
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [calendarAccessToken, setCalendarAccessToken] = useState<string | null>(null);
  const [isGoogleEmailConnected, setIsGoogleEmailConnected] = useState(false);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const stopLiveCall = async () => {
    if (liveSessionRef.current) {
        try {
            const session = await liveSessionRef.current;
            if (session && typeof session.close === 'function') session.close();
        } catch (e) { }
        liveSessionRef.current = null;
    }
    if (micStreamRef.current) {
        micStreamRef.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
    }
    liveSources.current.forEach(source => { try { source.stop(); } catch(e) {} });
    liveSources.current.clear();
    setLiveCallStatus('idle');
  };

  // Only load mock emails in demo mode (no real Firebase config)
  const isRealFirebase = (() => {
    try {
      const cfg = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
      return cfg.apiKey && cfg.apiKey !== 'mock' && cfg.apiKey !== '';
    } catch { return false; }
  })();

  useEffect(() => {
    if (!isRealFirebase) {
      setEmails(generateMockEmails());
    }
  }, []);


  const handleGroupClick = (groupName: string) => {
    setFilterType(groupName);
    setView('contacts');
    setSelectedContactId(null);
  };

  const handleOpenCreateCompanyModal = () => {
    setContactModalInitialData({ type: 'Company' });
    setModalCallback(() => (newId: string, newData: any) => {
       if (selectedContactId) {
          handleUpdateContact(selectedContactId, { relatedCompanyId: newId, company: newData.name });
       }
    });
    setIsContactModalOpen(true);
  };

  // Gmail access token stored in state for API calls
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(null);

  // Fetch real Gmail messages using the Gmail API (batched to avoid 429)
  const fetchGmailMessages = async (accessToken: string) => {
    if (accessToken === "mock_gmail_token") return;
    try {
        const listRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=20', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!listRes.ok) throw new Error(`Gmail list error: ${listRes.statusText}`);
        const listData = await listRes.json();
        if (!listData.messages || listData.messages.length === 0) { setEmails([]); return; }

        // Fetch in batches of 5 with 300ms delay between batches to avoid 429
        const BATCH_SIZE = 5;
        const messages: any[] = [];
        for (let i = 0; i < listData.messages.length; i += BATCH_SIZE) {
            if (i > 0) await new Promise(r => setTimeout(r, 300));
            const batch = listData.messages.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map((msg: any) =>
                    fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    }).then(res => res.ok ? res.json() : null).catch(() => null)
                )
            );
            messages.push(...batchResults.filter(Boolean));
        }

        const parsed = messages.filter((msg: any) => msg.payload).map((msg: any) => {
            const headers = msg.payload?.headers || [];
            const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
            const from = getHeader('From');
            const subject = getHeader('Subject');
            const date = getHeader('Date');
            const to = getHeader('To');

            const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/);
            const senderName = fromMatch ? fromMatch[1].replace(/"/g, '') : from;
            const senderEmail = fromMatch ? fromMatch[2] : from;

            let body = '';
            const decodeBase64Utf8 = (base64url: string): string => {
                const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
                const binary = atob(base64);
                const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
                return new TextDecoder('utf-8').decode(bytes);
            };
            const getBody = (payload: any): string => {
                if (payload.body?.data) {
                    return decodeBase64Utf8(payload.body.data);
                }
                if (payload.parts) {
                    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
                    const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
                    const multiPart = payload.parts.find((p: any) => p.mimeType?.startsWith('multipart/'));
                    if (htmlPart) return getBody(htmlPart);
                    if (textPart) return getBody(textPart);
                    if (multiPart) return getBody(multiPart);
                }
                return '';
            };
            body = getBody(msg.payload);

            const labelIds = msg.labelIds || [];
            let folder = 'inbox';
            if (labelIds.includes('SENT')) folder = 'sent';
            else if (labelIds.includes('DRAFT')) folder = 'drafts';
            else if (labelIds.includes('TRASH')) folder = 'trash';
            else if (labelIds.includes('SPAM')) folder = 'spam';

            return {
                id: msg.id, threadId: msg.threadId,
                sender: senderName, senderEmail, to,
                subject: subject || '(No Subject)',
                snippet: msg.snippet || '', body,
                date: new Date(date),
                isRead: !labelIds.includes('UNREAD'),
                isStarred: labelIds.includes('STARRED'),
                folder,
                labels: labelIds.filter((l: string) => !['UNREAD', 'STARRED', 'INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'].includes(l))
            };
        }).sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

        setEmails(parsed);
    } catch (error) { console.error('Failed to fetch Gmail messages:', error); }
  };

  // Send email via Gmail API
  const sendGmailMessage = async (to: string, subject: string, htmlBody: string) => {
    if (!gmailAccessToken || gmailAccessToken === "mock_gmail_token") return false;
    try {
        const rawMessage = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            '',
            htmlBody
        ].join('\r\n');

        const encoded = btoa(unescape(encodeURIComponent(rawMessage)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${gmailAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: encoded })
        });
        if (!response.ok) throw new Error(`Gmail send error: ${response.statusText}`);
        // Refresh inbox after sending
        await fetchGmailMessages(gmailAccessToken);
        return true;
    } catch (error) { console.error('Failed to send Gmail message:', error); return false; }
  };

  const handleConnectGoogle = async () => {
      try {
          const result = await signInWithGoogle();
          const accessToken = result.credential?.accessToken;
          if (accessToken) {
              setGmailAccessToken(accessToken);
              setIsGoogleEmailConnected(true);
              // Fetch real emails if not in mock mode
              await fetchGmailMessages(accessToken);
          }
      } catch (e) { console.error('Gmail connect error:', e); }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
        const result = await signInWithGoogleCalendar();
        const accessToken = result.credential?.accessToken;
        if (accessToken === "mock_access_token") {
            setCalendarAccessToken(accessToken);
            setIsGoogleCalendarConnected(true);
            const today = new Date();
            setGoogleEvents([
                { id: 'g1', title: 'Dentist (Mock)', start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 10, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 11, 0), source: 'google', color: 'bg-green-100 text-green-700 border-green-200' },
                { id: 'g2', title: 'Team Sync (Mock)', start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0), source: 'google', color: 'bg-green-100 text-green-700 border-green-200' },
            ]);
            return;
        }
        if (!accessToken) return;
        setCalendarAccessToken(accessToken);
        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 1);
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 3);
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&maxResults=250&singleEvents=true&orderBy=startTime`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error(`Google API Error: ${response.statusText}`);
        const data = await response.json();
        if (data.items) {
            const mappedEvents = data.items.map((item: any) => {
                const start = item.start.dateTime ? new Date(item.start.dateTime) : (item.start.date ? new Date(item.start.date) : null);
                const end = item.end.dateTime ? new Date(item.end.dateTime) : (item.end.date ? new Date(item.end.date) : null);
                return {
                    id: item.id,
                    title: item.summary || '(No Title)',
                    start,
                    end,
                    source: 'google',
                    color: 'bg-green-100 text-green-700 border-green-200'
                };
            }).filter((e: any) => e.start);
            setGoogleEvents(mappedEvents);
            setIsGoogleCalendarConnected(true);
        }
    } catch (error) { console.error('Google Calendar connect error:', error); }
  };

  // Create event in Google Calendar when booking from CRM
  const handleCreateGoogleCalendarEvent = async (eventData: { summary: string, description?: string, startTime: Date, endTime: Date, attendeeEmail?: string }) => {
    if (!calendarAccessToken || calendarAccessToken === "mock_access_token") return;
    try {
        const body: any = {
            summary: eventData.summary,
            description: eventData.description || '',
            start: { dateTime: eventData.startTime.toISOString() },
            end: { dateTime: eventData.endTime.toISOString() },
        };
        if (eventData.attendeeEmail) {
            body.attendees = [{ email: eventData.attendeeEmail }];
        }
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${calendarAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`Google Calendar create error: ${response.statusText}`);
        const created = await response.json();
        // Add to local state immediately
        setGoogleEvents(prev => [...prev, {
            id: created.id,
            title: created.summary || eventData.summary,
            start: new Date(eventData.startTime),
            end: new Date(eventData.endTime),
            source: 'google',
            color: 'bg-green-100 text-green-700 border-green-200'
        }]);
    } catch (error) { console.error('Failed to create Google Calendar event:', error); }
  };

  const handleDisconnectGoogleCalendar = () => {
      setIsGoogleCalendarConnected(false);
      setGoogleEvents([]);
      setCalendarAccessToken(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u: User | null) => {
        setUser(u);
        setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const createListener = (collName: string, setter: Function, sortFn?: (a: any, b: any) => number) => {
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, collName));
        return onSnapshot(q, (snap: any) => {
            const data = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            if (sortFn) data.sort(sortFn);
            setter(data);
        }, (err: any) => console.error(`${collName} error`, err));
    };
    const unsubContacts = createListener('contacts', setContacts, (a: any,b: any) => {
         if (a.type === b.type) return a.name.localeCompare(b.name);
         return a.type === 'Company' ? -1 : 1;
    });
    const unsubNotes = createListener('notes', setNotes, (a: any,b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const unsubTodos = createListener('todos', setTodos);
    const unsubGroups = createListener('tag_groups', setTagGroups, (a: any,b: any) => a.name.localeCompare(b.name));
    const unsubEventTypes = createListener('event_types', setEventTypes);
    const unsubScheduledEvents = createListener('scheduled_events', setScheduledEvents, (a: any, b: any) => (a.startTime?.seconds || 0) - (b.startTime?.seconds || 0));
    const unsubPipelines = createListener('pipelines', setPipelines);
    const unsubBookingPages = createListener('booking_pages', setBookingPages);
    const unsubCustomFields = createListener('custom_fields', setCustomFields);
    return () => { 
        unsubContacts(); unsubNotes(); unsubGroups(); unsubTodos(); 
        unsubEventTypes(); unsubScheduledEvents(); unsubPipelines(); 
        unsubBookingPages(); unsubCustomFields();
    };
  }, [user]);

  useEffect(() => {
      if (pipelines.length > 0 && !currentPipelineId) {
          setCurrentPipelineId(pipelines[0].id);
      }
  }, [pipelines, currentPipelineId]);

  const handleAddContact = async (contactData: any) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'contacts'), { ...contactData, createdAt: serverTimestamp() });
      setIsContactModalOpen(false);
      if (modalCallback) { modalCallback(docRef.id, contactData); setModalCallback(null); }
      setContactModalInitialData(null);
      return docRef.id;
    } catch (e) { return null; }
  };

  const handleUpdateContact = async (id: string, data: any) => {
    if (!user) return;
    try { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'contacts', id), data); } catch (e) { }
  };

  const handleDeleteContact = async (id: string) => {
    if (!user) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'contacts', id)); if (selectedContactId === id) setSelectedContactId(null); } catch (e) { }
  };

  const handleAddNote = async (contactId: string, content: string, type: string, transcript: string = '') => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), { contactId, content, type, rawTranscript: transcript, createdAt: serverTimestamp() });
  };
  
  const handleUpdateNote = async (noteId: string, content: string) => {
      if (!user) return;
      try { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', noteId), { content }); } catch (e) { }
  };

  const handleDeleteNote = async (noteId: string) => {
      if (!user) return;
      try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', noteId)); } catch (e) { }
  };

  const handleToggleTodo = async (todo: any) => {
    if (!user) return;
    try { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'todos', todo.id), { isDone: !todo.isDone }); } catch (e) { }
  };

  const handleDeleteTodo = async (id: string) => {
    if (!user) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'todos', id)); } catch (e) { }
  };

  const handleAddTodo = async (todoData: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'todos'), { ...todoData, createdAt: serverTimestamp() });
    } catch (e) { }
  };

  const handleUpdateScheduledEvent = async (id: string, data: any) => {
    if (!user) return;
    try { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'scheduled_events', id), data); } catch (e) { }
  };

  const handleDeleteScheduledEvent = async (id: string) => {
    if (!user) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'scheduled_events', id)); } catch (e) { }
  };

  const handleCreatePipeline = async (pipelineData: any) => {
      if (!user) return;
      try {
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'pipelines'), { ...pipelineData, createdAt: serverTimestamp() });
          setCurrentPipelineId(docRef.id);
      } catch (e) { }
  };

  const handleUpdatePipeline = async (id: string, data: any) => {
      if (!user) return;
      try { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'pipelines', id), data); } catch (e) { }
  };

  const handleDeletePipeline = async (id: string) => {
      if (!user) return;
      try { 
          await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'pipelines', id));
          if (currentPipelineId === id) {
              const remaining = pipelines.filter(p => p.id !== id);
              if (remaining.length > 0) setCurrentPipelineId(remaining[0].id);
              else setCurrentPipelineId('');
          }
      } catch (e) { }
  };

  const handleAddCustomField = async (fieldData: any) => {
      if (!user) return;
      try { addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'custom_fields'), { ...fieldData, createdAt: serverTimestamp() }); } catch (e) { }
  };

  const handleDeleteCustomField = async (id: string) => {
      if (!user) return;
      try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'custom_fields', id)); } catch (e) { }
  };

  const handleCreateGroup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !newGroupName.trim()) return;
    try { 
        if (editingGroup) {
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tag_groups', editingGroup.id), {
                name: newGroupName.trim(),
                color: `${newGroupColor.bg} ${newGroupColor.text}`
            });
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tag_groups'), { 
                name: newGroupName.trim(), 
                color: `${newGroupColor.bg} ${newGroupColor.text}`, 
                createdAt: serverTimestamp() 
            }); 
        }
        setNewGroupName(''); 
        setNewGroupColor(GROUP_COLORS[0]); 
        setEditingGroup(null);
        setIsGroupModalOpen(false); 
    } catch (e) { }
  };

  const handleEditGroup = (group: any) => {
      setEditingGroup(group);
      setNewGroupName(group.name);
      const matchedColor = GROUP_COLORS.find(c => `${c.bg} ${c.text}` === group.color) || GROUP_COLORS[0];
      setNewGroupColor(matchedColor);
      setIsGroupModalOpen(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
      if (!user) return;
      try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tag_groups', groupId)); } catch (e) { }
  };

  const handleCloseGroupModal = () => {
      setIsGroupModalOpen(false);
      setEditingGroup(null);
      setNewGroupName('');
      setNewGroupColor(GROUP_COLORS[0]);
  };

  const handleCreateEventType = async (data: any) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'event_types'), { ...data, createdAt: serverTimestamp() });
  };

  const handleUpdateEventType = async (id: string, data: any) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'event_types', id), data);
  };

  const handleDeleteEventType = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'event_types', id));
  };

  const handleCreateBookingPage = async (data: any) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'booking_pages'), { ...data, createdAt: serverTimestamp() });
  };

  const handleUpdateBookingPage = async (id: string, data: any) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'booking_pages', id), data);
  };

  const handleDeleteBookingPage = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'booking_pages', id));
  };

  const handleAddScheduledEvent = async (eventData: any) => {
    if (!user) return;
    try {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'scheduled_events'), { ...eventData, createdAt: serverTimestamp() });
        // Also create in Google Calendar if connected
        if (isGoogleCalendarConnected && calendarAccessToken && eventData.startTime) {
            const startDate = eventData.startTime.seconds
                ? new Date(eventData.startTime.seconds * 1000)
                : new Date(eventData.startTime);
            const durationMin = parseInt(eventData.duration || '30', 10);
            const endDate = new Date(startDate.getTime() + durationMin * 60000);
            await handleCreateGoogleCalendarEvent({
                summary: `${eventData.eventTypeTitle || 'Meeting'} - ${eventData.attendeeName || ''}`.trim(),
                description: eventData.notes || '',
                startTime: startDate,
                endTime: endDate,
                attendeeEmail: eventData.attendeeEmail
            });
        }
    } catch (e) { console.error('Failed to add scheduled event:', e); }
  };

  const handleSeedData = async () => {
    if (!user) return;
    const sampleGroups = [
      { name: "App development", color: "bg-blue-100 text-blue-700" },
      { name: "Branding", color: "bg-purple-100 text-purple-700" },
      { name: "Government contacts", color: "bg-slate-100 text-slate-700" },
      { name: "Marketing Agency", color: "bg-orange-100 text-orange-700" },
      { name: "Marketing Strategy", color: "bg-amber-100 text-amber-700" },
      { name: "Potential Partner", color: "bg-emerald-100 text-emerald-700" },
      { name: "Public Relations", color: "bg-pink-100 text-pink-700" },
      { name: "Solopraneur", color: "bg-indigo-100 text-indigo-700" },
    ];

    try {
      for (const g of sampleGroups) { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tag_groups'), { ...g, createdAt: serverTimestamp() }); }

      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'pipelines'), {
          name: "Sales Pipeline",
          stages: [
              { name: 'Lead', category: 'Lead' },
              { name: 'Contacted', category: 'Lead' },
              { name: 'Proposal', category: 'Lead' },
              { name: 'Negotiation', category: 'Lead' },
              { name: 'Closed', category: 'Customer' },
              { name: 'Lost', category: 'Lost' }
          ],
          createdAt: serverTimestamp()
      });

      const demoData = [
        { type: 'Company', name: "Cyberdyne Systems", status: "Lead", lifecycleStage: "Lead", email: "info@cyberdyne.net", phone: "555-0199", address: "123 Tech Blvd", groups: ["App development", "Government contacts"] },
        { type: 'Company', name: "Continental Services", status: "Closed", lifecycleStage: "Customer", email: "concierge@continental.com", phone: "555-0155", address: "89 Hotel Circle", groups: ["Branding"] },
        { type: 'Person', name: "Sarah Connor", company: "Cyberdyne Systems", title: "Security Chief", status: "Lead", lifecycleStage: "Lead", email: "sarah@cyberdyne.net", phone: "555-0199", groups: ["Government contacts"] },
        { type: 'Person', name: "John Wick", company: "Continental Services", title: "Contractor", status: "Closed", lifecycleStage: "Customer", email: "j.wick@continental.com", phone: "555-0155", groups: ["Solopraneur"] },
        { type: 'Person', name: "Ellen Ripley", company: "Weyland-Yutani", title: "Warrant Officer", status: "Contacted", lifecycleStage: "Lead", email: "ripley@nostromo.ship", phone: "555-0122", groups: ["Potential Partner"] },
        { type: 'Person', name: "Carter Burke", company: "Weyland-Yutani", title: "Special Exec", status: "Lost", lifecycleStage: "Lost", email: "burke@company.net", phone: "555-0999", groups: ["Marketing Strategy"] },
      ];

      const createdContacts = [];
      for (const d of demoData) {
         const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'contacts'), { ...d, createdAt: serverTimestamp() });
         createdContacts.push({ name: d.name, id: docRef.id });
      }

      const demoActivities = [
        { contactName: "Sarah Connor", type: "Call", content: "Discussed the new security protocols. They are interested in the AI integration." },
        { contactName: "Sarah Connor", type: "Email", content: "Sent over the proposal for Q4. Awaiting feedback on the budget." },
        { contactName: "John Wick", type: "Meeting", content: "Met for lunch. discussed the new 'cleaning' services contract. Very urgent." },
        { contactName: "Cyberdyne Systems", type: "Note", content: "Key account. Needs follow-up every 2 weeks." },
        { contactName: "Ellen Ripley", type: "Email", content: "She mentioned issues with current logistics. Good opportunity to pitch our tracking software." },
        { contactName: "Continental Services", type: "Call", content: "Front desk called to confirm the reservation system upgrade." }
      ];

      for (const act of demoActivities) {
        const contact = createdContacts.find(c => c.name === act.contactName);
        if (contact) {
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), {
                contactId: contact.id, content: act.content, type: act.type, createdAt: serverTimestamp()
            });
             await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'contacts', contact.id), {
                lastContact: { date: new Date().toLocaleDateString(), type: act.type }
             });
        }
      }

      const demoTasks = [
          { text: "Send updated contract", description: "Include the new clause about AI safety.", dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], contactName: "Sarah Connor", isDone: false },
          { text: "Lunch with John", description: "Discuss the continental breakfast menu.", dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0], contactName: "John Wick", isDone: false },
          { text: "Follow up on shipment", description: "Ensure the cargo is secure.", dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], contactName: "Ellen Ripley", isDone: false }
      ];

      for (const task of demoTasks) {
          const contact = createdContacts.find(c => c.name === task.contactName);
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'todos'), { ...task, contactId: contact ? contact.id : null, contactName: contact ? contact.name : '', createdAt: serverTimestamp() });
      }

      const sampleEventTypes = [
        { title: "15 Minute Meeting", duration: "15", description: "Short sync up.", slug: "15-min", color: "bg-blue-500" },
        { title: "30 Minute Meeting", duration: "30", description: "Standard meeting slot.", slug: "30-min", color: "bg-purple-500" },
        { title: "60 Minute Meeting", duration: "60", description: "Deep dive session.", slug: "60-min", color: "bg-orange-500" }
      ];
      for (const et of sampleEventTypes) { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'event_types'), { ...et, createdAt: serverTimestamp() }); }

      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(14, 0, 0, 0);
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'scheduled_events'), { 
          eventTypeTitle: "30 Minute Meeting", attendeeName: "Sarah Connor", attendeeEmail: "sarah@cyberdyne.net", startTime: { seconds: Math.floor(tomorrow.getTime() / 1000) }, color: "bg-purple-500", status: "confirmed", createdAt: serverTimestamp()
      });

      console.log("Demo data populated!");
    } catch (error) { }
  };

  const handleCompose = (initialData: { to?: string, subject?: string, body?: string, cc?: string, bcc?: string } = {}) => {
      setComposeTo(initialData.to || ''); setComposeSubject(initialData.subject || ''); setComposeBody(initialData.body || ''); setShowCcBcc(!!initialData.cc || !!initialData.bcc); setIsComposeOpen(true); setIsComposeMinimized(false); setComposeAttachments([]);
  };

  const handleComposeSubmit = async (e: React.FormEvent, isScheduled: boolean = false, scheduledAt: Date | null = null) => {
      if (e) e.preventDefault();
      setIsComposeOpen(false);

      // Try to send via Gmail API if connected
      if (isGoogleEmailConnected && gmailAccessToken && gmailAccessToken !== "mock_gmail_token" && !isScheduled) {
          const sent = await sendGmailMessage(composeTo, composeSubject, composeBody);
          if (sent) {
              // CRM activity tracking
              const recipientContact = contacts.find(c => c.email === composeTo || (c.emails && c.emails.some((em: any) => em.value === composeTo)));
              if (recipientContact) {
                  handleAddNote(recipientContact.id, `Sent email: ${composeSubject}`, 'Email');
                  handleUpdateContact(recipientContact.id, { lastContact: { date: new Date().toLocaleDateString(), type: 'Email' }});
              }
              setComposeBody(''); setComposeTo(''); setComposeSubject(''); setShowCcBcc(false); setComposeAttachments([]);
              return;
          }
          // If Gmail send failed, fall through to local mock
      }

      // Fallback: local email state (mock mode or scheduled)
      const newEmail = {
          id: `sent-${Date.now()}`,
          sender: "Me",
          senderEmail: user?.email || "me@example.com",
          subject: composeSubject,
          snippet: composeBody.replace(/<[^>]*>?/gm, '').substring(0, 50),
          body: composeBody,
          date: isScheduled ? scheduledAt : new Date(),
          isRead: true,
          isStarred: false,
          folder: isScheduled ? 'scheduled' : 'sent',
          attachments: composeAttachments,
          scheduledDate: isScheduled ? scheduledAt?.toISOString() : null
      };
      setEmails(prev => [newEmail, ...prev]);
      const recipientContact = contacts.find(c => c.email === composeTo || (c.emails && c.emails.some((em: any) => em.value === composeTo)));
      if (recipientContact) {
          handleAddNote(recipientContact.id, isScheduled ? `Scheduled email for ${scheduledAt?.toLocaleString()}: ${composeSubject}` : `Sent email: ${composeSubject}`, 'Email');
          handleUpdateContact(recipientContact.id, { lastContact: { date: new Date().toLocaleDateString(), type: 'Email' }});
      }
      setComposeBody(''); setComposeTo(''); setComposeSubject(''); setShowCcBcc(false); setComposeAttachments([]);
  };

  const handleUpdateEmail = async (ids: string | string[], updates: any) => {
    const idArray = Array.isArray(ids) ? ids : [ids];
    // Update local state immediately
    setEmails(prev => prev.map(email => idArray.includes(email.id) ? { ...email, ...updates } : email));

    // Sync with Gmail API if connected
    if (isGoogleEmailConnected && gmailAccessToken && gmailAccessToken !== "mock_gmail_token") {
        for (const id of idArray) {
            // Skip local mock IDs
            if (id.startsWith('sent-') || id.startsWith('email-')) continue;
            try {
                const addLabels: string[] = [];
                const removeLabels: string[] = [];
                if (updates.isRead === true) removeLabels.push('UNREAD');
                if (updates.isRead === false) addLabels.push('UNREAD');
                if (updates.isStarred === true) addLabels.push('STARRED');
                if (updates.isStarred === false) removeLabels.push('STARRED');
                if (updates.folder === 'trash') addLabels.push('TRASH');
                if (updates.folder === 'archive') removeLabels.push('INBOX');
                if (addLabels.length > 0 || removeLabels.length > 0) {
                    await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${gmailAccessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ addLabelIds: addLabels, removeLabelIds: removeLabels })
                    });
                }
            } catch (error) { console.error('Gmail modify error:', error); }
        }
    }
  };

  const handleDeleteEmail = async (ids: string | string[]) => {
    const idArray = Array.isArray(ids) ? ids : [ids];
    setEmails(prev => prev.filter(email => !idArray.includes(email.id)));

    // Trash in Gmail API if connected
    if (isGoogleEmailConnected && gmailAccessToken && gmailAccessToken !== "mock_gmail_token") {
        for (const id of idArray) {
            if (id.startsWith('sent-') || id.startsWith('email-')) continue;
            try {
                await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${id}/trash`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${gmailAccessToken}` }
                });
            } catch (error) { console.error('Gmail trash error:', error); }
        }
    }
  };

  const handleStartLiveCall = async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    setLiveCallStatus('connecting');
    const ctx = initAudio();
    if (ctx.state === 'suspended') await ctx.resume();
    nextStartTimeRef.current = 0;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            callbacks: {
                onopen: () => {
                    setLiveCallStatus('active');
                    const source = ctx.createMediaStreamSource(stream);
                    const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBlob = createAudioBlob(inputData);
                        sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(ctx.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio) {
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                        const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(ctx.destination);
                        source.addEventListener('ended', () => liveSources.current.delete(source));
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        liveSources.current.add(source);
                    }
                },
                onclose: () => stopLiveCall(),
                onerror: () => stopLiveCall()
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                systemInstruction: (() => {
                    const contactNotes = notes.filter((n: any) => n.contactId === contactId);
                    const contactEmails = emails.filter((e: any) => e.senderEmail === contact.email || e.to === contact.email);
                    const contactTodos = (todos || []).filter((t: any) => t.contactId === contactId && !t.isDone);
                    return `You are a world-class CRM analyst having a live voice conversation with the user. You are briefing them about their client.

**Contact:** ${contact.name} (${contact.type || 'Person'})
**Company:** ${contact.company || 'N/A'} | **Title:** ${contact.title || 'N/A'}
**Status:** ${contact.status || 'N/A'} | **Stage:** ${contact.lifecycleStage || 'N/A'}
**Email:** ${contact.email || 'N/A'} | **Phone:** ${contact.phone || 'N/A'}
**Last Contact:** ${contact.lastContact ? `${contact.lastContact.date} via ${contact.lastContact.type}` : 'No previous contact'}

**Recent Notes:** ${contactNotes.slice(0, 5).map((n: any) => `[${n.type}] ${n.content}`).join(' | ') || 'None'}
**Recent Emails:** ${contactEmails.slice(0, 3).map((e: any) => `"${e.subject}"`).join(', ') || 'None'}
**Open Tasks:** ${contactTodos.slice(0, 3).map((t: any) => t.text).join(', ') || 'None'}

Be conversational, concise, and helpful. Answer questions about this contact using the data above. Suggest next steps when appropriate.`;
                })()
            }
        });
        liveSessionRef.current = sessionPromise;
    } catch (err) { setLiveCallStatus('idle'); }
  };

  const handleGeminiAction = async (action: string) => {
    setGeminiLoading(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let prompt = '';
        const contextText = composeBody.replace(/<[^>]*>?/gm, '\n').trim(); 
        if (action === 'fix') prompt = `Fix grammar: ${contextText}`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        if (response.text) { setComposeBody(response.text.replace(/\n/g, '<br />')); setIsGeminiOpen(false); }
    } catch (error) { } finally { setGeminiLoading(false); }
  };

  const handleGenerateContactSummary = async (contactId: string) => {
    setIsSummaryModalOpen(true); setIsSummaryLoading(true);
    try {
        const contact = contacts.find((c: any) => c.id === contactId);
        if (!contact) { setSummaryText("Contact not found."); setIsSummaryLoading(false); return; }
        const contactNotes = notes.filter((n: any) => n.contactId === contactId);
        const contactEmails = emails.filter((e: any) => e.senderEmail === contact.email || e.to === contact.email || (contact.emails && contact.emails.some((em: any) => e.senderEmail === em.value || e.to === em.value)));
        const contactTodos = (todos || []).filter((t: any) => t.contactId === contactId);

        const prompt = `You are a CRM analyst. Provide a concise, actionable summary of this contact.

**Contact:** ${contact.name}
**Type:** ${contact.type || 'Person'}
**Company:** ${contact.company || 'N/A'}
**Title:** ${contact.title || 'N/A'}
**Status:** ${contact.status || 'N/A'} | **Stage:** ${contact.lifecycleStage || 'N/A'}
**Email:** ${contact.email || 'N/A'} | **Phone:** ${contact.phone || 'N/A'}
**Groups:** ${contact.groups?.join(', ') || 'None'}
**Last Contact:** ${contact.lastContact ? `${contact.lastContact.date} (${contact.lastContact.type})` : 'Never'}

**Activity Notes (${contactNotes.length}):**
${contactNotes.slice(0, 10).map((n: any) => `- [${n.type}] ${n.content}`).join('\n') || 'No notes.'}

**Recent Emails (${contactEmails.length}):**
${contactEmails.slice(0, 5).map((e: any) => `- ${e.folder === 'sent' ? 'Sent' : 'Received'}: "${e.subject}" (${new Date(e.date).toLocaleDateString()})`).join('\n') || 'No emails.'}

**Open Tasks (${contactTodos.filter((t: any) => !t.isDone).length}):**
${contactTodos.filter((t: any) => !t.isDone).slice(0, 5).map((t: any) => `- ${t.text}${t.dueDate ? ' (Due: ' + t.dueDate + ')' : ''}`).join('\n') || 'No open tasks.'}

**Instructions:** Provide a 3-4 paragraph summary covering: (1) Who they are and relationship status, (2) Key interactions and sentiment, (3) Recommended next steps. Be specific, cite activity details.`;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { thinkingConfig: { thinkingBudget: 0 } } });
        setSummaryText(response.text || "No summary.");
    } catch (error) { setSummaryText("Unable to generate summary. Please check your API key."); } finally { setIsSummaryLoading(false); }
  };

  const handleSummarizeText = async (text: string) => {
    setIsSummaryModalOpen(true); setIsSummaryLoading(true);
    try {
        const cleanText = text
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?(p|div|tr|li|h[1-6])[^>]*>/gi, '\n')
            .replace(/<[^>]*>?/gm, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&#\d+;/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        const prompt = `You are an email assistant in a CRM. Summarize this email content concisely.

**Email Content:**
${cleanText.substring(0, 3000)}

**Instructions:** Provide: (1) A one-line TL;DR, (2) Key points as bullet points, (3) Any action items or requests mentioned. Keep it brief and professional.`;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { thinkingConfig: { thinkingBudget: 0 } } });
        setSummaryText(response.text || "No summary.");
    } catch (error) { setSummaryText("Unable to summarize. Please check your API key."); } finally { setIsSummaryLoading(false); }
  };

  const handleSpeak = async (text: string) => {
    if (isSpeaking) { if (ttsSourceRef.current) { try { ttsSourceRef.current.stop(); } catch(e) {} ttsSourceRef.current = null; } setIsSpeaking(false); return; }
    setIsSpeaking(true); const ctx = initAudio();
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
            config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } } },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
            const source = ctx.createBufferSource(); source.buffer = audioBuffer; source.connect(ctx.destination);
            source.onended = () => setIsSpeaking(false); ttsSourceRef.current = source; source.start();
        } else setIsSpeaking(false);
    } catch (error) { setIsSpeaking(false); }
  };

  const handleComposeFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
    const newAttachments = [...composeAttachments];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_SIZE) {
            alert(`File "${file.name}" exceeds the 25MB limit.`);
            continue;
        }
        newAttachments.push({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file
        });
    }
    setComposeAttachments(newAttachments);
    if (composeAttachmentInputRef.current) composeAttachmentInputRef.current.value = '';
  };

  const removeComposeAttachment = (id: string) => {
    setComposeAttachments(prev => prev.filter(a => a.id !== id));
  };

  const insertEmoji = (emoji: string) => {
    setComposeBody(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleConfirmScheduleSend = () => {
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const combinedDate = new Date(scheduleDate);
      combinedDate.setHours(hours, minutes, 0, 0);
      if (combinedDate <= new Date()) {
          alert("Please select a future date and time.");
          return;
      }
      handleComposeSubmit(null as any, true, combinedDate);
      setShowScheduleSendModal(false);
  };

  const generateCalendarDays = (date: Date) => {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(date.getFullYear(), date.getMonth(), i));
    return days;
  };

  const filteredContacts = useMemo(() => {
    let result = contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase())) || (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())));
    if (filterType === 'Customers') result = result.filter(c => c.lifecycleStage === 'Customer' || (!c.lifecycleStage && c.status === 'Closed'));
    else if (filterType === 'Leads') result = result.filter(c => { if (c.lifecycleStage) return c.lifecycleStage === 'Lead'; return c.status !== 'Closed' && c.status !== 'Lost'; });
    else if (filterType === 'Not a Fit') result = result.filter(c => c.lifecycleStage === 'Lost' || (!c.lifecycleStage && c.status === 'Lost'));
    else if (filterType !== 'All') result = result.filter(c => c.groups && c.groups.includes(filterType));
    return result;
  }, [contacts, searchQuery, filterType]);
  
  const selectedContact = useMemo(() => contacts.find(c => c.id === selectedContactId), [contacts, selectedContactId]);

  if (authLoading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>;
  if (!user) return <ErrorBoundary><AuthPage onGoogleLogin={(accessToken: string) => {
    if (accessToken && accessToken !== "mock_gmail_token") {
      setGmailAccessToken(accessToken);
      setIsGoogleEmailConnected(true);
      fetchGmailMessages(accessToken);
    }
  }} /></ErrorBoundary>;

  const liveCallProps = { isLiveCallActive: liveCallStatus === 'active', liveCallStatus, stopLiveCall, startLiveCall: handleStartLiveCall };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-white font-sans text-slate-900 overflow-hidden relative">
        {!selectedContactId && (
          <Sidebar currentView={view} setView={(v: string) => { setView(v); setSelectedContactId(null); }} setFilter={setFilterType} />
        )}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {!selectedContactId && (
            <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden shadow-sm">
               <h1 className="font-bold flex items-center gap-2 text-slate-800"><Layout className="w-5 h-5 text-emerald-500" /> SimpleCRM</h1>
               <div className="flex gap-2"><button onClick={() => setView('dashboard')} className="p-2 bg-slate-100 rounded-lg"><BarChart3 className="w-4 h-4" /></button><button onClick={() => setView('contacts')} className="p-2 bg-slate-100 rounded-lg"><Users className="w-4 h-4" /></button></div>
            </div>
          )}
          <div className={`flex-1 overflow-auto ${selectedContactId ? '' : 'p-4 md:p-8'} ${view === 'email' ? 'p-0 md:p-0' : ''}`}>
            <div className={`mx-auto h-full ${view === 'email' ? 'max-w-full' : 'max-w-7xl'}`}>
              {view === 'dashboard' && !selectedContactId && (
                  <Dashboard contacts={contacts} notes={notes} todos={todos} emails={emails} scheduledEvents={scheduledEvents} setView={setView} onSeedData={handleSeedData} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} user={user} onNavigate={(id: string) => { setSelectedContactId(id); setView('contacts'); }} onToggleTodo={handleToggleTodo} onDeleteTodo={handleDeleteTodo} onSpeak={handleSpeak} isSpeaking={isSpeaking} />
              )}
              {view === 'calendar' && !selectedContactId && (
                  <CalendarPage eventTypes={eventTypes} scheduledEvents={scheduledEvents} bookingPages={bookingPages} onCreateBookingPage={handleCreateBookingPage} onUpdateBookingPage={handleUpdateBookingPage} onDeleteBookingPage={handleDeleteBookingPage} todos={todos} onCreateEventType={handleCreateEventType} onUpdateEventType={handleUpdateEventType} onDeleteEventType={handleDeleteEventType} isGoogleConnected={isGoogleCalendarConnected} onConnectGoogle={handleConnectGoogleCalendar} onDisconnectGoogle={handleDisconnectGoogleCalendar} googleEvents={googleEvents} onBookMeeting={handleAddScheduledEvent} onNavigateToSettings={() => setView('settings')} onCompose={handleCompose} contacts={contacts} onNavigate={(id: string) => { setSelectedContactId(id); setView('contacts'); }} onUpdateScheduledEvent={handleUpdateScheduledEvent} onDeleteScheduledEvent={handleDeleteScheduledEvent} teamMembers={teamMembers} initialBooking={initialCalendarBooking} onClearInitialBooking={() => setInitialCalendarBooking(null)} />
              )}
              {view === 'email' && !selectedContactId && (
                 <EmailPage user={user} emails={emails} contacts={contacts} tagGroups={tagGroups} todos={todos} scheduledEvents={scheduledEvents} initialSelectedEmailId={initialSelectedEmailId} onClearInitialEmailId={() => setInitialSelectedEmailId(null)} onCompose={handleCompose} onUpdateEmail={handleUpdateEmail} onDeleteEmail={handleDeleteEmail} isGoogleConnected={isGoogleEmailConnected} onConnectGoogle={handleConnectGoogle} onNavigateContact={(id: string) => { setSelectedContactId(id); setView('contacts'); }} onBookMeeting={(contact: any) => { setInitialCalendarBooking({ name: contact.name, email: contact.email }); setView('calendar'); setSelectedContactId(null); }} onSummarize={handleSummarizeText} onOpenAddContact={(data: any) => { setContactModalInitialData(data); setIsContactModalOpen(true); }} />
              )}
              {view === 'groups' && !selectedContactId && (
                  <GroupsPage contacts={contacts} tagGroups={tagGroups} onGroupClick={(filter: string) => { setFilterType(filter); setView('contacts'); }} onAddNewGroup={() => setIsGroupModalOpen(true)} onEditGroup={handleEditGroup} onDeleteGroup={handleDeleteGroup} />
              )}
              {view === 'settings' && !selectedContactId && <SettingsPage teamMembers={teamMembers} setTeamMembers={setTeamMembers} customFields={customFields} onAddCustomField={handleAddCustomField} onDeleteCustomField={handleDeleteCustomField} />}
              {view === 'todo' && !selectedContactId && (
                  <TodoPage user={user} contacts={contacts} onNavigate={(id: string) => { setSelectedContactId(id); setView('contacts'); }} todos={todos} onToggle={handleToggleTodo} onDelete={handleDeleteTodo} onAdd={handleAddTodo} />
              )}
              {view === 'contacts' && (
                <div className="h-full flex flex-col">
                  {!selectedContactId && (
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-6">
                      <div><h2 className="text-2xl font-bold text-slate-800">Contacts</h2><p className="text-slate-500">{filterType === 'All' ? 'All contacts' : `Viewing ${filterType}`}</p></div>
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                        <div className="flex p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                          {['All', 'Leads', 'Customers', 'Not a Fit'].map((f) => (
                            <button key={f} onClick={() => setFilterType(f)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === f ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                               {f === 'All' && <Users className="w-4 h-4" />}
                               {f === 'Leads' && <Circle className="w-4 h-4" />}
                               {f === 'Customers' && <CheckCircle2 className="w-4 h-4" />}
                               {f === 'Not a Fit' && <XCircle className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Search contacts..." className="w-full pl-9 pr-12 py-2.5 bg-slate-100 rounded-xl focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <button onClick={() => setIsContactModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-emerald-200 transform active:scale-95 shrink-0"><Plus className="w-4 h-4" /> <span className="hidden md:inline">Add Contact</span></button>
                      </div>
                    </div>
                  )}
                  {selectedContactId && selectedContact ? (
                      <ContactDetail contact={selectedContact} allContacts={contacts} notes={notes.filter(n => n.contactId === selectedContactId)} emails={emails} onClose={() => setSelectedContactId(null)} onUpdate={handleUpdateContact} onDelete={handleDeleteContact} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} onNavigate={(id: string) => { setSelectedContactId(id); setView('contacts'); }} onViewEmail={(emailId: string) => { setInitialSelectedEmailId(emailId); setView('email'); setSelectedContactId(null); }} tagGroups={tagGroups} onAddNewGroup={() => setIsGroupModalOpen(true)} user={user} onGroupClick={handleGroupClick} onCreateLinkedCompany={handleOpenCreateCompanyModal} onCreateCompany={handleAddContact} onCompose={handleCompose} onGenerateSummary={handleGenerateContactSummary} pipelines={pipelines} liveCallProps={liveCallProps} onSpeak={handleSpeak} isSpeaking={isSpeaking} />
                  ) : (
                    view === 'contacts' && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">Icon</th>
                                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Group</th>
                                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredContacts.map(contact => (
                                    <tr key={contact.id} onClick={() => setSelectedContactId(contact.id)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                                      <td className="px-6 py-4 text-center">{contact.type === 'Company' ? <Building2 className="w-5 h-5 text-orange-500 mx-auto" /> : <UserIcon className="w-5 h-5 text-blue-500 mx-auto" />}</td>
                                      <td className="px-6 py-4 font-bold text-slate-900">{contact.name}</td>
                                      <td className="px-6 py-4">{contact.groups?.join(', ') || '-'}</td>
                                      <td className="px-6 py-4 text-right"><ChevronRight className="w-5 h-5 text-slate-400" /></td>
                                    </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                    )
                  )}
                </div>
              )}
              {view === 'pipeline' && <Pipeline contacts={contacts} setContactId={(id: string) => { setSelectedContactId(id); setView('contacts'); }} onUpdateStatus={handleUpdateContact} pipelines={pipelines} currentPipelineId={currentPipelineId} setCurrentPipelineId={setCurrentPipelineId} onCreatePipeline={handleCreatePipeline} onUpdatePipeline={handleUpdatePipeline} onDeletePipeline={handleDeletePipeline} />}
            </div>
          </div>
        </main>

        {isComposeOpen && (
          <div className={`fixed bottom-0 right-4 md:right-16 bg-white rounded-t-xl shadow-2xl border border-slate-200 z-[200] flex flex-col transition-all duration-300 ${isComposeMinimized ? 'h-12 w-64' : 'w-[95%] sm:w-[600px] h-[90vh] sm:h-[650px]'}`}>
              {/* Desktop-like Header */}
              <div className="bg-[#f2f6fc] px-4 py-2.5 rounded-t-xl flex justify-between items-center cursor-pointer shrink-0 border-b border-slate-100" onClick={() => setIsComposeMinimized(!isComposeMinimized)}>
                  <span className="text-sm font-bold text-slate-700">New Message</span>
                  <div className="flex items-center gap-1.5 text-slate-500">
                      <button onClick={(e) => { e.stopPropagation(); setIsComposeMinimized(!isComposeMinimized); }} className="hover:bg-slate-200 p-1.5 rounded transition-colors" title={isComposeMinimized ? 'Expand' : 'Minimize'}>
                        {isComposeMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setIsComposeOpen(false); }} className="hover:bg-slate-200 p-1.5 rounded transition-colors" title="Close"><X className="w-4 h-4" /></button>
                  </div>
              </div>
              
              {!isComposeMinimized && (
                  <form onSubmit={(e) => handleComposeSubmit(e)} className="flex-1 flex flex-col overflow-hidden bg-white">
                      <div className="flex items-center px-4 py-2.5 border-b border-slate-100 text-sm text-slate-500">
                         <span className="w-12">From</span>
                         <div className="flex items-center gap-1 font-medium text-slate-700 cursor-pointer hover:bg-slate-50 px-2 py-0.5 rounded">
                             {user?.displayName || 'User'} &lt;{user?.email || 'user@example.com'}&gt; <ChevronDown className="w-3.5 h-3.5" />
                         </div>
                      </div>

                      <div className="flex items-center px-4 py-2.5 border-b border-slate-100 text-sm group">
                         <span className="w-12 text-slate-500">To</span>
                         <input autoFocus className="flex-1 outline-none font-medium text-slate-800" value={composeTo} onChange={e => setComposeTo(e.target.value)} />
                      </div>

                      <div className="flex items-center px-4 py-2.5 border-b border-slate-100 text-sm">
                         <input className="w-full outline-none font-medium text-slate-800" placeholder="Subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
                      </div>

                      {composeAttachments.length > 0 && (
                          <div className="px-4 py-2 bg-slate-50 flex flex-wrap gap-2 border-b border-slate-100 max-h-32 overflow-y-auto">
                              {composeAttachments.map(att => (
                                  <div key={att.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700">
                                      <FileText className="w-3 h-3 text-slate-400" />
                                      <span className="truncate max-w-[150px]">{att.name}</span>
                                      <span className="text-slate-400 font-normal">({formatFileSize(att.size)})</span>
                                      <button type="button" onClick={() => removeComposeAttachment(att.id)} className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                  </div>
                              ))}
                          </div>
                      )}

                      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                          <RichTextEditor value={composeBody} onChange={setComposeBody} placeholder="" />
                      </div>

                      <div className="p-3 border-t bg-white flex items-center justify-between shrink-0 relative">
                          <div className="flex items-center gap-3">
                              <div className="relative">
                                  <div className="flex bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md overflow-hidden transition-all active:scale-[0.98]">
                                      <button type="submit" className="pl-6 pr-4 py-2.5 font-bold text-sm border-r border-white/20">Send</button>
                                      <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); setShowSendOptions(!showSendOptions); }}
                                        className={`px-2 py-2.5 hover:bg-black/10 transition-colors ${showSendOptions ? 'bg-black/20' : ''}`}
                                      >
                                          <ChevronDown className="w-4 h-4" />
                                      </button>
                                  </div>
                                  
                                  {showSendOptions && (
                                      <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowSendOptions(false)}></div>
                                        <div className="absolute bottom-full mb-2 left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 py-1.5 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                            <button 
                                                type="button"
                                                onClick={() => { setShowSendOptions(false); setShowScheduleSendModal(true); }}
                                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
                                            >
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                Send Later
                                            </button>
                                            <button 
                                                type="button"
                                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 opacity-50 cursor-not-allowed"
                                            >
                                                <Lock className="w-4 h-4 text-slate-400" />
                                                Confidential Mode
                                            </button>
                                        </div>
                                      </>
                                  )}
                              </div>

                              <div className="flex items-center gap-1">
                                  <button type="button" onClick={() => setIsGeminiOpen(!isGeminiOpen)} className={`p-2 rounded-full transition-all ${isGeminiOpen ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`} title="Gemini AI"><Sparkles className="w-5 h-5" /></button>
                                  
                                  <input type="file" multiple className="hidden" ref={composeAttachmentInputRef} onChange={handleComposeFileAttachment} />
                                  <button type="button" onClick={() => composeAttachmentInputRef.current?.click()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-all" title="Attach files"><Paperclip className="w-5 h-5" /></button>
                                  
                                  <div className="relative">
                                      <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 rounded-full transition-all ${showEmojiPicker ? 'bg-amber-50 text-amber-600' : 'text-slate-500 hover:bg-slate-100'}`} title="Insert emoji"><Smile className="w-5 h-5" /></button>
                                      {showEmojiPicker && (
                                          <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 grid grid-cols-6 gap-1 w-64 z-[210] animate-in fade-in slide-in-from-bottom-2">
                                              {['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','🤨','🧐','🤠','🤡','🥳','🥴','🥵','🥶','🥺','🤢','🤮','🤧','🥵','🥶','🥺','🥳','🥴','👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👣','👂','🦻','👃','🧠','🦷','🦴','👀','👁','👅','👄'].slice(0, 48).map(e => (
                                                  <button key={e} type="button" onClick={() => insertEmoji(e)} className="p-1.5 hover:bg-slate-100 rounded text-lg flex items-center justify-center">{e}</button>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                                  
                                  <button type="button" className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-all"><Pen className="w-5 h-5" /></button>
                                  <button type="button" className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-all"><MoreVertical className="w-5 h-5" /></button>
                              </div>
                          </div>
                          <button type="button" onClick={() => setIsComposeOpen(false)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-all" title="Discard"><Trash2 className="w-5 h-5" /></button>
                      </div>
                  </form>
              )}
          </div>
        )}

        {showScheduleSendModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[501] backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">
                    <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" /> Schedule Send
                        </h3>
                        <button onClick={() => setShowScheduleSendModal(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}>
                                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                                </button>
                                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                                    {calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}>
                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center">
                                {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[10px] font-black text-slate-400 pb-1">{d}</div>)}
                                {generateCalendarDays(calendarViewDate).map((date, i) => {
                                    if (!date) return <div key={`empty-${i}`} className="h-8" />;
                                    const isSelected = scheduleDate.toDateString() === date.toDateString();
                                    const isPast = date < new Date() && date.toDateString() !== new Date().toDateString();
                                    return (
                                        <button 
                                            key={i} 
                                            disabled={isPast}
                                            onClick={() => setScheduleDate(date)} 
                                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isSelected ? 'bg-blue-600 text-white shadow-md' : isPast ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-blue-50'}`}
                                        >
                                            {date.getDate()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <input 
                                type="time" 
                                className="bg-transparent text-sm font-black outline-none text-slate-700 w-full" 
                                value={scheduleTime} 
                                onChange={e => setScheduleTime(e.target.value)} 
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium italic text-center px-4 leading-relaxed">
                            Scheduled messages will be sent automatically at the selected time if they remain in your outbox.
                        </p>
                    </div>
                    <div className="p-5 border-t bg-slate-50 flex justify-end gap-3">
                        <button onClick={() => setShowScheduleSendModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-700">Cancel</button>
                        <button onClick={handleConfirmScheduleSend} className="px-6 py-2.5 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">Schedule Send</button>
                    </div>
                </div>
            </div>
        )}

        {isSummaryModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[400] backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
              <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-indigo-50 to-emerald-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-600" /> AI Summary</h3>
                <button onClick={() => setIsSummaryModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/60 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {isSummaryLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                      <Sparkles className="w-6 h-6 text-white animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700">Analyzing with AI</p>
                      <p className="text-xs text-slate-400 mt-1">This usually takes a few seconds...</p>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: summaryText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^\* (.+)$/gm, '<li>$1</li>').replace(/(<li>.*<\/li>)/s, '<ul class="list-disc pl-4 space-y-1 my-2">$1</ul>').replace(/\n{2,}/g, '</p><p class="mt-3">').replace(/\n/g, '<br/>') }} />
                )}
              </div>
              {!isSummaryLoading && summaryText && (
                <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
                  <button onClick={() => { navigator.clipboard.writeText(summaryText); }} className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white transition-colors"><Copy className="w-3.5 h-3.5" /> Copy</button>
                  <button onClick={() => handleSpeak(summaryText)} className={`text-xs font-bold flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${isSpeaking ? 'bg-indigo-600 text-white animate-pulse' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>{isSpeaking ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Stop</> : <><Mic className="w-3.5 h-3.5" /> Listen</>}</button>
                </div>
              )}
            </div>
          </div>
        )}

        {isContactModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[300]">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-800">Add New Contact</h3><button onClick={() => setIsContactModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button></div>
              <ContactForm existingCompanies={contacts.filter(c => c.type === 'Company')} allContacts={contacts} tagGroups={tagGroups} onSubmit={handleAddContact} onCancel={() => { setIsContactModalOpen(false); setContactModalInitialData(null); setModalCallback(null); }} onAddNewGroup={() => setIsGroupModalOpen(true)} initialData={contactModalInitialData} pipelines={pipelines} customFields={customFields} />
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

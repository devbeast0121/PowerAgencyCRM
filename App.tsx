
import React, { useState, useEffect, useMemo, Component, ReactNode, useRef } from 'react';
import { 
  Layout, Users, List, LayoutGrid, Plus,
  Building2, User as UserIcon, Mail, Phone, ChevronRight, ChevronLeft, Search, 
  Circle, CheckCircle2, XCircle, Shapes, X, Minimize2, Maximize2, Send, Paperclip,
  Sparkles, Loader2, Copy, PhoneOff, Mic, SlidersHorizontal, ChevronDown, Filter, RotateCcw,
  Smile, Link as LinkIcon, Lock, Pen, MoreVertical, Trash2, HardDrive, Image as ImageIcon,
  FileText, Clock, Calendar as CalendarIcon, Check, Menu, Save
} from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { User } from 'firebase/auth';
import { 
  auth, db, appId, 
  signInWithCustomToken, signInAnonymously, onAuthStateChanged, signInWithGoogleCalendar, signInWithGoogle,
  collection, addDoc, setDoc, updateDoc, deleteDoc, doc, query, onSnapshot, serverTimestamp
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const [contactsPage, setContactsPage] = useState(1);
  const [isClearingContacts, setIsClearingContacts] = useState(false);
  const CONTACTS_PER_PAGE = 50;
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

  // --- Team Members State (Firestore-backed) ---
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const hasSeededTeamMember = useRef(false);

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

  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
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
        micStreamRef.current.getTracks().forEach(track => track.stop());
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

  // Gmail access token stored in state for API calls (valid only for current session)
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(null);

  // Fetch real Gmail messages using the Gmail API (batched to avoid 429)
  const fetchGmailMessages = async (accessToken: string) => {
    if (accessToken === "mock_gmail_token") return;
    try {
        // Fetch from multiple label buckets so all folders are populated
        const labelBuckets = ['INBOX', 'SENT', 'DRAFT', 'STARRED'];
        const allIds = new Map<string, any>();
        await Promise.all(labelBuckets.map(async (label) => {
            try {
                const res = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=20&labelIds=${label}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (!res.ok) return;
                const data = await res.json();
                (data.messages || []).forEach((m: any) => { if (!allIds.has(m.id)) allIds.set(m.id, m); });
            } catch {}
        }));
        const listData = { messages: Array.from(allIds.values()) };
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

        // Save Gmail emails to Firestore so they persist across page refreshes.
        // Use the Gmail message ID as the Firestore doc ID to avoid duplicates on re-fetch.
        if (user) {
            await Promise.allSettled(parsed.map((email: any) => {
                const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'email', email.id);
                return setDoc(docRef, {
                    ...email,
                    date: email.date instanceof Date ? email.date.toISOString() : email.date,
                    _fromGmail: true,
                }, { merge: true });
            }));
        }
        // Update local state immediately (Firestore listener will also fire but this is faster)
        const tagged = parsed.map((e: any) => ({ ...e, _fromGmail: true }));
        setEmails(prev => {
            const nonGmail = prev.filter((e: any) => !e._fromGmail);
            return [...tagged, ...nonGmail].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
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

  // Send email with optional .ics calendar invite attachment
  const sendGmailWithIcs = async (to: string, subject: string, htmlBody: string, icsContent?: string) => {
    if (!gmailAccessToken || gmailAccessToken === "mock_gmail_token") return false;
    try {
        let rawMessage: string;
        if (icsContent) {
            const boundary = `boundary_${Date.now()}`;
            rawMessage = [
                `To: ${to}`,
                `Subject: ${subject}`,
                'MIME-Version: 1.0',
                `Content-Type: multipart/mixed; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                'Content-Type: text/html; charset=utf-8',
                '',
                htmlBody,
                '',
                `--${boundary}`,
                'Content-Type: text/calendar; charset=utf-8; method=REQUEST',
                'Content-Transfer-Encoding: 7bit',
                'Content-Disposition: attachment; filename="invite.ics"',
                '',
                icsContent,
                '',
                `--${boundary}--`
            ].join('\r\n');
        } else {
            rawMessage = [
                `To: ${to}`,
                `Subject: ${subject}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                '',
                htmlBody
            ].join('\r\n');
        }
        const encoded = btoa(unescape(encodeURIComponent(rawMessage)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${gmailAccessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw: encoded })
        });
        if (!response.ok) throw new Error(`Gmail send error: ${response.statusText}`);
        return true;
    } catch (error) { console.error('Failed to send email with ICS:', error); return false; }
  };

  // Generate .ics calendar invite string
  const generateIcs = (title: string, startDate: Date, durationMin: number, location: string, attendeeEmail: string, organizerEmail: string, description: string = '') => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const toIcsDate = (d: Date) =>
        `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    const endDate = new Date(startDate.getTime() + durationMin * 60000);
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@simplecrm`;
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SimpleCRM//EN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART:${toIcsDate(startDate)}`,
        `DTEND:${toIcsDate(endDate)}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
        `LOCATION:${location}`,
        `ORGANIZER;CN=SimpleCRM:mailto:${organizerEmail}`,
        `ATTENDEE;CN=${attendeeEmail};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendeeEmail}`,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
  };

  // Get Zoom access token via Cloudflare Worker proxy (browser can't call Zoom OAuth directly due to CORS)
  const getZoomAccessToken = async (): Promise<string | null> => {
    try {
        const accountId = 'QpZrBe15TsG_PfT7Bdn-Xw';
        const clientId = 'Mv52pCmFQQa2GTy95tzNgw';
        const clientSecret = 'SS9UBFHMfnMZSPYv05CZbCf7B8UjTeI7';
        console.log('[Zoom] Fetching token via Cloudflare Worker...');
        const res = await fetch('https://zoom-proxy.illia-2de.workers.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId, clientId, clientSecret })
        });
        if (!res.ok) { console.error('[Zoom] Token error:', res.status, await res.text()); return null; }
        const data = await res.json();
        console.log('[Zoom] Token received:', !!data.access_token);
        return data.access_token || null;
    } catch (e) { console.error('[Zoom] Token fetch failed:', e); return null; }
  };

  // Create a Zoom meeting via Cloudflare Worker proxy and return join URL
  const createZoomMeeting = async (topic: string, startDate: Date, durationMin: number): Promise<string | null> => {
    try {
        const token = await getZoomAccessToken();
        if (!token) { console.error('[Zoom] No token, skipping meeting creation'); return null; }
        console.log('[Zoom] Creating meeting:', topic);
        const res = await fetch('https://zoom-proxy.illia-2de.workers.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'createMeeting',
                token,
                topic,
                start_time: startDate.toISOString(),
                duration: durationMin
            })
        });
        if (!res.ok) { console.error('[Zoom] Create meeting error:', res.status, await res.text()); return null; }
        const data = await res.json();
        console.log('[Zoom] Meeting created, join_url:', data.join_url);
        return data.join_url || null;
    } catch (e) { console.error('[Zoom] Meeting creation failed:', e); return null; }
  };

  const handleConnectGoogle = async () => {
      try {
          const result = await signInWithGoogle();
          const accessToken = result.credential?.accessToken;
          if (accessToken) {
              setGmailAccessToken(accessToken);
              setIsGoogleEmailConnected(true);
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
    const unsubTeamMembers = createListener('team_members', setTeamMembers, (a: any, b: any) => a.name.localeCompare(b.name));
    // All CRM emails (Gmail cached + drafts) are stored in Firestore — load them all here
    const unsubEmails = createListener('email', (data: any[]) => {
        const allEmails = data.map((e: any) => ({
            ...e,
            // date may be a Firestore Timestamp, ISO string, or already a Date
            date: e.date?.toDate ? e.date.toDate() : (e.date ? new Date(e.date) : new Date()),
        }));
        setEmails(prev => {
            // Keep any local optimistic items (e.g. a draft just saved) until Firestore snapshot arrives with them
            const optimistic = prev.filter((e: any) => e._optimistic && !allEmails.find((f: any) => f.id === e.id));
            return [...allEmails, ...optimistic].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
    });
    return () => {
        unsubContacts(); unsubNotes(); unsubGroups(); unsubTodos();
        unsubEventTypes(); unsubScheduledEvents(); unsubPipelines();
        unsubBookingPages(); unsubCustomFields(); unsubTeamMembers(); unsubEmails();
    };
  }, [user]);

  useEffect(() => {
      if (pipelines.length > 0 && !currentPipelineId) {
          setCurrentPipelineId(pipelines[0].id);
      }
  }, [pipelines, currentPipelineId]);

  // Auto-refresh Gmail when user navigates to email tab
  useEffect(() => {
      if (view === 'email' && isGoogleEmailConnected && gmailAccessToken) {
          fetchGmailMessages(gmailAccessToken);
      }
  }, [view]);

  // Bulk import handler — receives array of contacts from ImportModal, saves each to Firestore
  const handleImportContacts = async (contactsToImport: any[]) => {
    if (!user) { console.error('[handleImportContacts] no user!'); return; }
    console.log('[handleImportContacts] called, count =', contactsToImport.length);
    for (const contactData of contactsToImport) {
      const trimmedName = (contactData.name || '').trim();
      console.log('[handleImportContacts] saving:', trimmedName, '| type:', contactData.type, '| email:', contactData.emails?.[0]?.value);
      if (!trimmedName) { console.warn('[handleImportContacts] SKIPPED empty name'); continue; }
      const { initialNote, ...rest } = contactData;
      try {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'contacts'), { ...rest, name: trimmedName, createdAt: serverTimestamp() });
        console.log('[handleImportContacts] saved id:', docRef.id, 'name:', trimmedName);
        if (initialNote) {
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), { contactId: docRef.id, content: initialNote, type: 'Note', createdAt: serverTimestamp() });
        }
      } catch (e) { console.error('[handleImportContacts] ERROR saving', trimmedName, e); }
    }
  };

  const handleAddContact = async (contactData: any) => {
    if (!user) return;
    // Trim name
    const trimmedName = (contactData.name || '').trim();
    if (!trimmedName) return null;
    // Check for duplicate (same name + same primary email)
    const primaryEmail = contactData.emails?.find((e: any) => e.value.trim())?.value?.trim().toLowerCase() || '';
    if (primaryEmail) {
      const duplicate = contacts.find((c: any) => {
        const cEmail = c.emails?.find((e: any) => e.value.trim())?.value?.trim().toLowerCase() || c.email?.toLowerCase() || '';
        return c.name?.toLowerCase() === trimmedName.toLowerCase() && cEmail === primaryEmail;
      });
      if (duplicate) {
        if (!confirm(`A contact named "${duplicate.name}" with email "${primaryEmail}" already exists. Add anyway?`)) return null;
      }
    }
    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'contacts'), { ...contactData, name: trimmedName, createdAt: serverTimestamp() });
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

  // Listen for group add/remove events dispatched from GroupsPage MemberRow
  useEffect(() => {
    const handler = (e: any) => {
      const { contactId, groupName, add } = e.detail;
      const contact = contacts.find((c: any) => c.id === contactId);
      if (!contact) return;
      const current: string[] = contact.groups || [];
      const updated = add
        ? [...new Set([...current, groupName])]
        : current.filter((g: string) => g !== groupName);
      handleUpdateContact(contactId, { groups: updated });
    };
    window.addEventListener('crm:group-toggle', handler);
    return () => window.removeEventListener('crm:group-toggle', handler);
  }, [contacts, user]);

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

  // --- Team Members CRUD ---
  const handleAddTeamMember = async (memberData: any) => {
      if (!user) return;
      const trimmed = { ...memberData, name: (memberData.name || '').trim(), email: (memberData.email || '').trim() };
      if (!trimmed.name || !trimmed.email) return;
      const emailLower = trimmed.email.toLowerCase();
      const isDuplicate = teamMembers.some((m: any) => m.email?.toLowerCase() === emailLower);
      if (isDuplicate) { alert('A team member with this email already exists.'); return; }
      try {
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'team_members'), { ...trimmed, createdAt: serverTimestamp() });
          // Send invite email if Gmail connected
          if (isGoogleEmailConnected && gmailAccessToken) {
              const inviterName = user.displayName || user.email || 'Your colleague';
              const appUrl = 'https://power-agency-crm.web.app';
              const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;">
  <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:16px;padding:32px;text-align:center;margin-bottom:32px;">
    <h1 style="color:#fff;margin:0;font-size:24px;">You've been invited to SimpleCRM</h1>
    <p style="color:#d1fae5;margin:8px 0 0;">by ${inviterName}</p>
  </div>
  <p style="color:#1e293b;font-size:16px;">Hi ${trimmed.name},</p>
  <p style="color:#475569;">You've been added as a <strong>${trimmed.role || 'Member'}</strong> on the SimpleCRM workspace.</p>
  <div style="text-align:center;margin:32px 0;">
    <a href="${appUrl}" style="background:#10b981;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">Open SimpleCRM</a>
  </div>
  <p style="color:#64748b;font-size:14px;">Sign in with this email address (<strong>${trimmed.email}</strong>) to get started.</p>
  <p style="color:#94a3b8;font-size:12px;margin-top:32px;">Sent via SimpleCRM &mdash; <a href="${appUrl}" style="color:#10b981;">${appUrl}</a></p>
</div>`;
              const sent = await sendGmailMessage(trimmed.email, `You've been invited to SimpleCRM by ${inviterName}`, html);
              if (!sent) {
                  alert(`Team member "${trimmed.name}" was added, but the invite email could not be sent. Your Gmail session may have expired — try reconnecting Gmail in Settings and resending manually.`);
              }
          } else {
              alert(`Team member "${trimmed.name}" was added. No invite email was sent because Gmail is not connected. Connect Gmail in Settings to send invites.`);
          }
      } catch (e) { console.error('Add team member error', e); }
  };
  const handleUpdateTeamMember = async (id: string, data: any) => {
      if (!user) return;
      try { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'team_members', id), data); } catch (e) { console.error('Update team member error', e); }
  };
  const handleDeleteTeamMember = async (id: string) => {
      if (!user) return;
      try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'team_members', id)); } catch (e) { console.error('Delete team member error', e); }
  };

  // Auto-seed current user as team member AND clean up any legacy duplicates created by addDoc (random IDs)
  useEffect(() => {
      if (!user || hasSeededTeamMember.current) return;
      hasSeededTeamMember.current = true;

      // Upsert canonical record using uid as doc ID — idempotent across all refreshes
      const canonicalRef = doc(db, 'artifacts', appId, 'users', user.uid, 'team_members', user.uid);
      setDoc(canonicalRef, {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'You',
          email: user.email || '',
          role: 'Super Admin',
          avatar: user.photoURL || null,
          createdAt: serverTimestamp(),
      }, { merge: true }).catch(e => { console.error('Auto-seed error', e); hasSeededTeamMember.current = false; });

      // One-time cleanup: delete any legacy duplicates that have random addDoc IDs but same uid/email
      const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'team_members'));
      const unsub = onSnapshot(q, (snap: any) => {
          unsub(); // fire once only
          snap.docs.forEach((d: any) => {
              const data = d.data();
              const isLegacyDuplicate = d.id !== user.uid && (data.uid === user.uid || (user.email && data.email?.toLowerCase() === user.email.toLowerCase()));
              if (isLegacyDuplicate) deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'team_members', d.id)).catch(() => {});
          });
      }, () => {});
  }, [user]);

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
    const duration = parseInt(data.duration);
    if (!duration || duration < 1) { alert('Duration must be at least 1 minute.'); return; }
    const slug = (data.slug || '').trim();
    if (slug && eventTypes.some((et: any) => et.slug === slug)) { alert('An event type with this slug already exists.'); return; }
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'event_types'), { ...data, duration: String(duration), createdAt: serverTimestamp() });
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
    const slug = (data.slug || '').trim();
    if (!slug) { alert('URL slug is required.'); return; }
    if (bookingPages.some((bp: any) => bp.slug === slug)) { alert('A booking page with this slug already exists. Please choose a different one.'); return; }
    if (!data.includedEventTypeIds || data.includedEventTypeIds.length === 0) { alert('Please include at least one event type.'); return; }
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'booking_pages'), { ...data, slug, createdAt: serverTimestamp() });
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
        const startDate = eventData.startTime?.seconds
            ? new Date(eventData.startTime.seconds * 1000)
            : new Date(eventData.startTime);
        const durationMin = parseInt(eventData.duration || '30', 10);
        let meetingLink = eventData.location || '';
        const locationLower = (eventData.location || '').toLowerCase();

        // Auto-create Zoom meeting if location is "zoom"
        if (locationLower === 'zoom' || locationLower.includes('zoom')) {
            const zoomUrl = await createZoomMeeting(
                `${eventData.eventTypeTitle || 'Meeting'} with ${eventData.attendeeName || ''}`,
                startDate,
                durationMin
            );
            if (zoomUrl) meetingLink = zoomUrl;
        }

        const enrichedEvent = { ...eventData, location: meetingLink, createdAt: serverTimestamp() };
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'scheduled_events'), enrichedEvent);

        // Also create in Google Calendar if connected
        if (isGoogleCalendarConnected && calendarAccessToken && eventData.startTime) {
            const endDate = new Date(startDate.getTime() + durationMin * 60000);
            await handleCreateGoogleCalendarEvent({
                summary: `${eventData.eventTypeTitle || 'Meeting'} - ${eventData.attendeeName || ''}`.trim(),
                description: eventData.notes || '',
                startTime: startDate,
                endTime: endDate,
                attendeeEmail: eventData.attendeeEmail
            });
        }

        // Send booking confirmation email with .ics invite to attendee
        if (eventData.attendeeEmail && isGoogleEmailConnected && gmailAccessToken) {
            const organizerEmail = user.email || '';
            const title = `${eventData.eventTypeTitle || 'Meeting'} with ${user.displayName || organizerEmail}`;
            const formattedDate = startDate.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const formattedTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const locationLine = meetingLink.startsWith('http')
                ? `<a href="${meetingLink}" style="color:#10b981;">${meetingLink}</a>`
                : meetingLink || 'TBD';
            const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;">
  <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:16px;padding:32px;text-align:center;margin-bottom:32px;">
    <h1 style="color:#fff;margin:0;font-size:24px;">Meeting Confirmed</h1>
    <p style="color:#d1fae5;margin:8px 0 0;">${title}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;width:100px;">Date</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;">${formattedDate}</td></tr>
    <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Time</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;">${formattedTime} (${durationMin} min)</td></tr>
    <tr><td style="padding:12px 0;color:#64748b;">Location</td><td style="padding:12px 0;font-weight:600;color:#1e293b;">${locationLine}</td></tr>
  </table>
  <p style="margin-top:24px;color:#64748b;font-size:14px;">A calendar invite is attached. Add it to your calendar to get a reminder.</p>
  <p style="color:#94a3b8;font-size:12px;margin-top:32px;">Sent via SimpleCRM</p>
</div>`;
            const ics = generateIcs(title, startDate, durationMin, meetingLink, eventData.attendeeEmail, organizerEmail);
            await sendGmailWithIcs(eventData.attendeeEmail, `Meeting Confirmed: ${title}`, html, ics);
        }
    } catch (e) { console.error('Failed to add scheduled event:', e); }
  };

  // Clear all contacts and notes from Firestore
  const handleClearContacts = async () => {
    if (!user) return;
    if (!confirm('This will permanently delete all contacts and their activity notes. Your settings, pipeline, calendar and emails will NOT be deleted. Continue?')) return;
    setIsClearingContacts(true);
    try {
      for (const coll of ['contacts', 'notes']) {
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, coll));
        await new Promise<void>((resolve) => {
          const unsub = onSnapshot(q, async (snap: any) => {
            unsub();
            await Promise.all(snap.docs.map((d: any) => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, coll, d.id))));
            resolve();
          });
        });
      }
    } catch (e) { console.error('Clear contacts error', e); }
    finally { setIsClearingContacts(false); }
  };

  const handleClearAllData = async () => {
    if (!user) return;
    if (!confirm('This will permanently delete ALL your CRM data. Are you sure?')) return;
    setIsClearingAll(true);
    const colls = ['contacts', 'notes', 'todos', 'tag_groups', 'event_types', 'scheduled_events', 'email', 'custom_fields', 'pipelines', 'booking_pages'];
    try {
      for (const coll of colls) {
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, coll));
        await new Promise<void>((resolve) => {
          const unsub = onSnapshot(q, async (snap: any) => {
            unsub();
            await Promise.all(snap.docs.map((d: any) => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, coll, d.id))));
            resolve();
          });
        });
      }
    } catch (e) { console.error('Clear error', e); }
    finally { setIsClearingAll(false); }
  };

  const handleSeedData = async () => {
    if (!user || isSeeding) return;
    if (contacts.length > 0 || tagGroups.length > 0) {
      if (!confirm('Data already exists. This will ADD to existing data. Clear first if you want a clean slate.')) return;
    }
    setIsSeeding(true);

    // Helper: days offset from today
    const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
    const daysFromNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

    const sampleGroups = [
      { name: "Branding", color: "bg-purple-100 text-purple-700" },
      { name: "E-commerce", color: "bg-blue-100 text-blue-700" },
      { name: "Hospitality", color: "bg-amber-100 text-amber-700" },
      { name: "Real Estate", color: "bg-emerald-100 text-emerald-700" },
      { name: "SaaS", color: "bg-indigo-100 text-indigo-700" },
      { name: "Key Account", color: "bg-red-100 text-red-700" },
      { name: "Referral", color: "bg-pink-100 text-pink-700" },
    ];

    try {
      for (const g of sampleGroups) { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tag_groups'), { ...g, createdAt: serverTimestamp() }); }

      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'pipelines'), {
          name: "Agency Sales Pipeline",
          stages: [
              { name: 'Lead', category: 'Lead' },
              { name: 'Contacted', category: 'Lead' },
              { name: 'Proposal Sent', category: 'Lead' },
              { name: 'Negotiation', category: 'Lead' },
              { name: 'Closed Won', category: 'Customer' },
              { name: 'Closed Lost', category: 'Lost' }
          ],
          createdAt: serverTimestamp()
      });

      // --- Companies ---
      const companies = [
        { type: 'Company', name: "Vertex Commerce", status: "Closed", lifecycleStage: "Customer", email: "hello@vertexcommerce.io", phone: "+1 415 234 5678", website: "https://vertexcommerce.io", address: "580 Market St, San Francisco, CA 94104", groups: ["E-commerce", "Key Account"], lastContact: { date: daysAgo(3).toLocaleDateString(), type: 'Meeting' } },
        { type: 'Company', name: "Bloom Hospitality Group", status: "Proposal", lifecycleStage: "Lead", email: "contact@bloomhospitality.com", phone: "+1 212 876 5432", website: "https://bloomhospitality.com", address: "245 Park Ave, New York, NY 10167", groups: ["Hospitality"], lastContact: { date: daysAgo(7).toLocaleDateString(), type: 'Call' } },
        { type: 'Company', name: "NorthPoint Realty", status: "Negotiation", lifecycleStage: "Lead", email: "info@northpointrealty.com", phone: "+1 312 456 7890", website: "https://northpointrealty.com", address: "233 S Wacker Dr, Chicago, IL 60606", groups: ["Real Estate"], lastContact: { date: daysAgo(2).toLocaleDateString(), type: 'Email' } },
        { type: 'Company', name: "Stackly SaaS", status: "Lead", lifecycleStage: "Lead", email: "sales@stackly.io", phone: "+1 737 800 1200", website: "https://stackly.io", address: "701 Brazos St, Austin, TX 78701", groups: ["SaaS"], lastContact: { date: daysAgo(14).toLocaleDateString(), type: 'Email' } },
        { type: 'Company', name: "Crest Brand Studio", status: "Closed", lifecycleStage: "Customer", email: "hello@crestbrand.co", phone: "+1 310 555 9900", website: "https://crestbrand.co", address: "8721 Santa Monica Blvd, Los Angeles, CA 90069", groups: ["Branding", "Key Account"], lastContact: { date: daysAgo(1).toLocaleDateString(), type: 'Call' } },
      ];

      // --- People ---
      const people = [
        { type: 'Person', name: "Marcus Webb", title: "CEO", company: "Vertex Commerce", status: "Closed", lifecycleStage: "Customer", email: "marcus.webb@vertexcommerce.io", phone: "+1 415 234 5679", birthday: "1982-03-15", groups: ["E-commerce", "Key Account", "Referral"], lastContact: { date: daysAgo(3).toLocaleDateString(), type: 'Meeting' } },
        { type: 'Person', name: "Priya Nair", title: "Head of Marketing", company: "Vertex Commerce", status: "Closed", lifecycleStage: "Customer", email: "priya@vertexcommerce.io", phone: "+1 415 234 5680", groups: ["E-commerce"], lastContact: { date: daysAgo(5).toLocaleDateString(), type: 'Email' } },
        { type: 'Person', name: "Daniel Bloom", title: "Managing Director", company: "Bloom Hospitality Group", status: "Proposal", lifecycleStage: "Lead", email: "daniel@bloomhospitality.com", phone: "+1 212 876 5433", birthday: "1975-11-22", groups: ["Hospitality"], lastContact: { date: daysAgo(7).toLocaleDateString(), type: 'Call' } },
        { type: 'Person', name: "Sofia Marchetti", title: "VP of Sales", company: "NorthPoint Realty", status: "Negotiation", lifecycleStage: "Lead", email: "sofia.m@northpointrealty.com", phone: "+1 312 456 7891", groups: ["Real Estate"], lastContact: { date: daysAgo(2).toLocaleDateString(), type: 'Email' } },
        { type: 'Person', name: "James Thornton", title: "Founder & CTO", company: "Stackly SaaS", status: "Lead", lifecycleStage: "Lead", email: "james@stackly.io", phone: "+1 737 800 1201", birthday: "1990-06-08", groups: ["SaaS"], lastContact: { date: daysAgo(14).toLocaleDateString(), type: 'Email' } },
        { type: 'Person', name: "Rachel Kim", title: "Creative Director", company: "Crest Brand Studio", status: "Closed", lifecycleStage: "Customer", email: "rachel@crestbrand.co", phone: "+1 310 555 9901", groups: ["Branding", "Key Account"], lastContact: { date: daysAgo(1).toLocaleDateString(), type: 'Call' } },
        { type: 'Person', name: "Tom Okafor", title: "Independent Consultant", company: "", status: "Contacted", lifecycleStage: "Lead", email: "tom.okafor@gmail.com", phone: "+1 646 222 3344", groups: ["Referral"], lastContact: { date: daysAgo(10).toLocaleDateString(), type: 'Call' } },
      ];

      const createdContacts: any[] = [];
      for (const d of [...companies, ...people]) {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'contacts'), { ...d, createdAt: serverTimestamp() });
        createdContacts.push({ name: d.name, id: docRef.id });
      }

      // --- Activity Notes ---
      const activities = [
        { contactName: "Marcus Webb", type: "Meeting", content: "Quarterly review at their SF office. Signed off on the Q2 social campaign — $28k. They want to expand to LinkedIn ads next quarter." },
        { contactName: "Marcus Webb", type: "Call", content: "Marcus called to check on creative timeline. Confirmed delivery by end of month. Very happy with the brand refresh." },
        { contactName: "Priya Nair", type: "Email", content: "Sent Priya the updated UTM tracking sheet and campaign brief. She needs approval from Marcus before we proceed with influencer outreach." },
        { contactName: "Daniel Bloom", type: "Call", content: "30-min discovery call. Bloom Hospitality wants a full rebrand for 3 hotel properties. Budget range: $60k–$90k. Very promising lead." },
        { contactName: "Daniel Bloom", type: "Email", content: "Sent over our agency deck and 2 case studies from the hospitality vertical. Waiting for response." },
        { contactName: "Sofia Marchetti", type: "Email", content: "Sofia reviewed our proposal. She has questions about the lead generation scope and wants to negotiate on retainer terms. Scheduled follow-up for next week." },
        { contactName: "Sofia Marchetti", type: "Note", content: "Key stakeholder — decision maker. She prefers WhatsApp for quick questions. Budget approved up to $15k/month." },
        { contactName: "James Thornton", type: "Email", content: "Cold outreach sent. Pitched our SaaS content marketing package. No reply yet — follow up in 1 week." },
        { contactName: "Rachel Kim", type: "Call", content: "Rachel confirmed the new brand guidelines are approved. She needs 5 social media templates by Friday. Straightforward deliverable." },
        { contactName: "Tom Okafor", type: "Call", content: "Tom referred us to NorthPoint Realty. Great connection — should send a thank-you and discuss a referral commission structure." },
        { contactName: "Vertex Commerce", type: "Note", content: "Key account — $28k closed this quarter. Upsell opportunity: LinkedIn Ads and email automation. Renewal due in 3 months." },
        { contactName: "Crest Brand Studio", type: "Note", content: "Long-term client since 2023. Always pays on time. Potential for white-label partnership." },
      ];

      for (const act of activities) {
        const contact = createdContacts.find(c => c.name === act.contactName);
        if (contact) {
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), {
            contactId: contact.id, content: act.content, type: act.type, createdAt: serverTimestamp()
          });
        }
      }

      // --- Tasks ---
      const tasks = [
        { text: "Send revised proposal to Bloom Hospitality", description: "Include 3 pricing tiers and case studies from hotel clients.", dueDate: daysFromNow(2).toISOString().split('T')[0], contactName: "Daniel Bloom", isDone: false },
        { text: "Follow up with James Thornton (Stackly)", description: "No reply to cold email. Try LinkedIn message.", dueDate: daysFromNow(3).toISOString().split('T')[0], contactName: "James Thornton", isDone: false },
        { text: "Deliver social media templates to Rachel", description: "5 templates in Figma format. Check brand guidelines first.", dueDate: daysFromNow(1).toISOString().split('T')[0], contactName: "Rachel Kim", isDone: false },
        { text: "Negotiate retainer terms with Sofia", description: "She wants a 10% discount on the 6-month plan. Check with finance.", dueDate: daysFromNow(5).toISOString().split('T')[0], contactName: "Sofia Marchetti", isDone: false },
        { text: "Send referral thank-you to Tom Okafor", description: "Handwritten note + referral commission agreement PDF.", dueDate: daysFromNow(1).toISOString().split('T')[0], contactName: "Tom Okafor", isDone: false },
        { text: "Monthly report for Vertex Commerce", description: "Include campaign metrics, CTR, conversions, and Q3 recommendations.", dueDate: daysFromNow(7).toISOString().split('T')[0], contactName: "Marcus Webb", isDone: false },
        { text: "Upsell meeting with Priya (LinkedIn Ads)", description: "Prepare ROI projections and competitive benchmarks.", dueDate: daysFromNow(10).toISOString().split('T')[0], contactName: "Priya Nair", isDone: false },
      ];

      for (const task of tasks) {
        const contact = createdContacts.find(c => c.name === task.contactName);
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'todos'), {
          ...task, contactId: contact?.id || null, contactName: contact?.name || '', createdAt: serverTimestamp()
        });
      }

      // --- Event Types ---
      const eventTypes = [
        { title: "15-Min Discovery Call", duration: "15", description: "Quick intro call to understand your goals.", slug: "discovery-15", color: "bg-blue-500" },
        { title: "30-Min Strategy Session", duration: "30", description: "Deep dive into your marketing strategy.", slug: "strategy-30", color: "bg-purple-500" },
        { title: "60-Min Proposal Review", duration: "60", description: "Walk through our proposal in detail.", slug: "proposal-60", color: "bg-orange-500" },
      ];
      for (const et of eventTypes) { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'event_types'), { ...et, createdAt: serverTimestamp() }); }

      // --- Scheduled Meetings ---
      const meeting1 = daysFromNow(2); meeting1.setHours(10, 0, 0, 0);
      const meeting2 = daysFromNow(5); meeting2.setHours(14, 0, 0, 0);
      const danielContact = createdContacts.find(c => c.name === 'Daniel Bloom');
      const sofiaContact = createdContacts.find(c => c.name === 'Sofia Marchetti');
      if (danielContact) {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'scheduled_events'), {
          eventTypeTitle: "30-Min Strategy Session", attendeeName: "Daniel Bloom", attendeeEmail: "daniel@bloomhospitality.com",
          contactId: danielContact.id, startTime: { seconds: Math.floor(meeting1.getTime() / 1000) }, color: "bg-purple-500", status: "confirmed", createdAt: serverTimestamp()
        });
      }
      if (sofiaContact) {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'scheduled_events'), {
          eventTypeTitle: "60-Min Proposal Review", attendeeName: "Sofia Marchetti", attendeeEmail: "sofia.m@northpointrealty.com",
          contactId: sofiaContact.id, startTime: { seconds: Math.floor(meeting2.getTime() / 1000) }, color: "bg-orange-500", status: "confirmed", createdAt: serverTimestamp()
        });
      }

      console.log("Demo data populated!");
    } catch (error) { console.error('Seed error', error); }
    finally { setIsSeeding(false); }
  };

  const handleCompose = (initialData: { to?: string, subject?: string, body?: string, cc?: string, bcc?: string } = {}) => {
      setComposeTo(initialData.to || ''); setComposeSubject(initialData.subject || ''); setComposeBody(initialData.body || ''); setShowCcBcc(!!initialData.cc || !!initialData.bcc); setIsComposeOpen(true); setIsComposeMinimized(false); setComposeAttachments([]);
  };

  const handleSaveDraft = async () => {
      if (!composeSubject && !composeBody && !composeTo) return;
      const draftData = {
          sender: "Me",
          senderEmail: user?.email || "me@example.com",
          subject: composeSubject || '(No Subject)',
          snippet: composeBody.replace(/<[^>]*>?/gm, '').substring(0, 50),
          body: composeBody,
          to: composeTo,
          isRead: true,
          isStarred: false,
          folder: 'drafts',
          attachments: composeAttachments,
      };
      // Optimistic update — show draft immediately; Firestore snapshot will replace it
      const localDraft = { ...draftData, id: `draft-${Date.now()}`, date: new Date(), _optimistic: true };
      setEmails((prev: any[]) => [localDraft, ...prev]);
      // Also persist to Firestore so it survives refresh
      if (user) {
          try {
              await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'email'), { ...draftData, date: serverTimestamp() });
          } catch (e) {
              // Firestore write failed silently — local state already updated above
          }
      }
      setIsComposeOpen(false);
      setComposeTo(''); setComposeSubject(''); setComposeBody(''); setComposeAttachments([]);
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

  const totalContactPages = Math.ceil(filteredContacts.length / CONTACTS_PER_PAGE);
  const pagedContacts = filteredContacts.slice((contactsPage - 1) * CONTACTS_PER_PAGE, contactsPage * CONTACTS_PER_PAGE);
  // Reset to page 1 whenever filter or search changes
  useEffect(() => { setContactsPage(1); }, [searchQuery, filterType]);
  
  const selectedContact = useMemo(() => contacts.find(c => c.id === selectedContactId), [contacts, selectedContactId]);

  if (authLoading) return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
      <div className="flex flex-col items-center gap-5 animate-pulse">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-200">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-slate-800">SimpleCRM</p>
          <p className="text-sm text-slate-400 mt-1">Loading your workspace…</p>
        </div>
        <div className="flex gap-1.5 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  );
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
        {/* Desktop Sidebar */}
        {!selectedContactId && (
          <div className="hidden md:flex">
            <Sidebar currentView={view} setView={(v: string) => { setView(v); setSelectedContactId(null); }} setFilter={setFilterType} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
          </div>
        )}
        {/* Mobile Sidebar Drawer */}
        {!selectedContactId && isMobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 md:hidden">
              <Sidebar currentView={view} setView={(v: string) => { setView(v); setSelectedContactId(null); setIsMobileMenuOpen(false); }} setFilter={setFilterType} onClose={() => setIsMobileMenuOpen(false)} />
            </div>
          </>
        )}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {!selectedContactId && (
            <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden shadow-sm">
               <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-100 rounded-lg"><Menu className="w-4 h-4" /></button>
               <h1 className="font-bold flex items-center gap-2 text-slate-800"><Layout className="w-5 h-5 text-emerald-500" /> SimpleCRM</h1>
               <button onClick={() => setView('contacts')} className="p-2 bg-slate-100 rounded-lg"><Users className="w-4 h-4" /></button>
            </div>
          )}
          <div className={`flex-1 overflow-auto ${view === 'email' ? 'p-0' : selectedContactId ? '' : 'p-3 sm:p-4 md:p-8'}`}>
            <div className={`mx-auto h-full ${view === 'email' ? 'max-w-full' : 'max-w-7xl'}`}>
              {view === 'dashboard' && !selectedContactId && (
                  <Dashboard contacts={contacts} notes={notes} todos={todos} emails={emails} scheduledEvents={scheduledEvents} setView={setView} onSeedData={handleSeedData} onClearData={handleClearAllData} isSeeding={isSeeding} isClearingAll={isClearingAll} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} user={user} onNavigate={(id: string) => { setSelectedContactId(id); setView('contacts'); }} onToggleTodo={handleToggleTodo} onDeleteTodo={handleDeleteTodo} onSpeak={handleSpeak} isSpeaking={isSpeaking} />
              )}
              {view === 'calendar' && !selectedContactId && (
                  <CalendarPage eventTypes={eventTypes} scheduledEvents={scheduledEvents} bookingPages={bookingPages} onCreateBookingPage={handleCreateBookingPage} onUpdateBookingPage={handleUpdateBookingPage} onDeleteBookingPage={handleDeleteBookingPage} todos={todos} onCreateEventType={handleCreateEventType} onUpdateEventType={handleUpdateEventType} onDeleteEventType={handleDeleteEventType} isGoogleConnected={isGoogleCalendarConnected} onConnectGoogle={handleConnectGoogleCalendar} onDisconnectGoogle={handleDisconnectGoogleCalendar} googleEvents={googleEvents} onBookMeeting={handleAddScheduledEvent} onNavigateToSettings={() => setView('settings')} onCompose={handleCompose} contacts={contacts} onNavigate={(id: string) => { setSelectedContactId(id); setView('contacts'); }} onUpdateScheduledEvent={handleUpdateScheduledEvent} onDeleteScheduledEvent={handleDeleteScheduledEvent} teamMembers={teamMembers} initialBooking={initialCalendarBooking} onClearInitialBooking={() => setInitialCalendarBooking(null)} user={user} />
              )}
              {view === 'email' && !selectedContactId && (
                 <EmailPage user={user} emails={emails} contacts={contacts} tagGroups={tagGroups} todos={todos} scheduledEvents={scheduledEvents} initialSelectedEmailId={initialSelectedEmailId} onClearInitialEmailId={() => setInitialSelectedEmailId(null)} onCompose={handleCompose} onUpdateEmail={handleUpdateEmail} onDeleteEmail={handleDeleteEmail} isGoogleConnected={isGoogleEmailConnected} onConnectGoogle={handleConnectGoogle} onNavigateContact={(id: string) => { setSelectedContactId(id); setView('contacts'); }} onBookMeeting={(contact: any) => { setInitialCalendarBooking({ name: contact.name, email: contact.email }); setView('calendar'); setSelectedContactId(null); }} onSummarize={handleSummarizeText} onOpenAddContact={(data: any) => { setContactModalInitialData(data); setIsContactModalOpen(true); }} onRefreshEmails={gmailAccessToken ? () => fetchGmailMessages(gmailAccessToken) : undefined} />
              )}
              {view === 'groups' && !selectedContactId && (
                  <GroupsPage contacts={contacts} tagGroups={tagGroups} onGroupClick={(filter: string) => { setFilterType(filter); setView('contacts'); }} onAddNewGroup={() => setIsGroupModalOpen(true)} onEditGroup={handleEditGroup} onDeleteGroup={handleDeleteGroup} onCompose={handleCompose} />
              )}
              {view === 'settings' && !selectedContactId && <SettingsPage teamMembers={teamMembers} onAddTeamMember={handleAddTeamMember} onUpdateTeamMember={handleUpdateTeamMember} onDeleteTeamMember={handleDeleteTeamMember} currentUser={user} customFields={customFields} onAddCustomField={handleAddCustomField} onDeleteCustomField={handleDeleteCustomField} onConnectGmail={handleConnectGoogle} onConnectGoogleCalendar={handleConnectGoogleCalendar} isGmailConnected={isGoogleEmailConnected} isCalendarConnected={isGoogleCalendarConnected} onImportContacts={handleImportContacts} onClearContacts={handleClearContacts} isClearingContacts={isClearingContacts} />}
              {view === 'todo' && !selectedContactId && (
                  <TodoPage user={user} contacts={contacts} onNavigate={(id: string) => { setSelectedContactId(id); setView('contacts'); }} todos={todos} onToggle={handleToggleTodo} onDelete={handleDeleteTodo} onAdd={handleAddTodo} />
              )}
              {view === 'contacts' && (
                <div className="h-full flex flex-col">
                  {!selectedContactId && (
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-6">
                      <div><h2 className="text-2xl font-bold text-slate-800">Contacts</h2><p className="text-slate-500">{filterType === 'All' ? 'All contacts' : `Viewing ${filterType}`}</p></div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full xl:w-auto">
                        <div className="flex flex-wrap p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
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
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
                          <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="px-3 sm:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10 sm:w-16 text-center">Icon</th>
                                  <th className="px-3 sm:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                  <th className="px-3 sm:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Group</th>
                                  <th className="px-3 sm:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {pagedContacts.map(contact => (
                                    <tr key={contact.id} onClick={() => setSelectedContactId(contact.id)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">{contact.type === 'Company' ? <Building2 className="w-5 h-5 text-orange-500 mx-auto" /> : <UserIcon className="w-5 h-5 text-blue-500 mx-auto" />}</td>
                                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-slate-900 text-sm sm:text-base">{contact.name}</td>
                                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">{contact.groups?.join(', ') || '-'}</td>
                                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right flex items-center justify-end gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${contact.name}"?`)) handleDeleteContact(contact.id); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                      </td>
                                    </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {totalContactPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white">
                              <span className="text-sm text-slate-500">
                                {(contactsPage - 1) * CONTACTS_PER_PAGE + 1}–{Math.min(contactsPage * CONTACTS_PER_PAGE, filteredContacts.length)} of {filteredContacts.length}
                              </span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setContactsPage(p => Math.max(1, p - 1))} disabled={contactsPage === 1} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Prev</button>
                                {Array.from({ length: totalContactPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalContactPages || Math.abs(p - contactsPage) <= 1).reduce<(number | string)[]>((acc, p, idx, arr) => { if (idx > 0 && (p as number) - (arr[idx-1] as number) > 1) acc.push('…'); acc.push(p); return acc; }, []).map((p, i) =>
                                  typeof p === 'string' ? <span key={i} className="px-2 text-slate-400">…</span> :
                                  <button key={p} onClick={() => setContactsPage(p as number)} className={`w-8 h-8 text-sm rounded-lg border transition-colors ${contactsPage === p ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 hover:bg-slate-50'}`}>{p}</button>
                                )}
                                <button onClick={() => setContactsPage(p => Math.min(totalContactPages, p + 1))} disabled={contactsPage === totalContactPages} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></button>
                              </div>
                            </div>
                          )}
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
                          <div className="flex items-center gap-1">
                              <button type="button" onClick={handleSaveDraft} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Save Draft"><Save className="w-5 h-5" /></button>
                              <button type="button" onClick={() => setIsComposeOpen(false)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-all" title="Discard"><Trash2 className="w-5 h-5" /></button>
                          </div>
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

        {isGroupModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[350]">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">{editingGroup ? 'Edit Group' : 'New Group'}</h3>
                <button onClick={handleCloseGroupModal} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Group Name</label>
                  <input
                    autoFocus
                    required
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="e.g. VIP Clients"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {GROUP_COLORS.map(c => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setNewGroupColor(c)}
                        className={`w-7 h-7 rounded-full ${c.bg} border-2 transition-all ${newGroupColor.name === c.name ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={handleCloseGroupModal} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-sm transition-colors">{editingGroup ? 'Save Changes' : 'Create Group'}</button>
                </div>
              </form>
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

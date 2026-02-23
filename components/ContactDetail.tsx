import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    ArrowLeft, MoreHorizontal, Edit3, Trash2, Camera, Building2, User as UserIcon, 
    Clock, Mail, Phone, Globe, Linkedin, X, Plus, FileText, DownloadCloud, Eye, 
    ExternalLink, Sparkles, Mic, Send, Loader2, MicOff, MessageSquare, Volume2, Square, Headphones, PhoneOff,
    Info, Activity, Link as LinkIcon, FileUp, ChevronDown, ChevronUp, History, ClipboardCheck
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { ContactForm } from './ContactForm';
import { NoteItem } from './NoteItem';
import { RichTextEditor } from './RichTextEditor';
import { WidgetItem, StatusBadge } from './Shared';
import { RelatedContactsCard, RelatedCompanyCard } from './RelatedCards';
import { resizeImage, fileToBase64, formatFileSize, formatDate, parseVtt, getInitials } from '../utils';

// Helper to safely get API Key (Vite replaces process.env.API_KEY at build time)
const getApiKey = (): string | undefined => {
    const key = process.env.API_KEY;
    return key && key !== '' ? key : undefined;
};

export const ContactDetail = ({ contact, allContacts, notes = [], emails = [], onViewEmail, onClose, onUpdate, onAddNote, onUpdateNote, onDeleteNote, tagGroups, onAddNewGroup, user, onDelete, onGroupClick, onCreateLinkedCompany, onNavigate, onCreateCompany, onCompose, liveCallProps = {}, customFields = [], pipelines = [], onSpeak, isSpeaking, onGenerateSummary }: any) => { 
  const [activeMainTab, setActiveMainTab] = useState('All'); 
  const [activityType, setActivityType] = useState('Note');
  const [noteText, setNoteText] = useState('');
  const [rawTranscript, setRawTranscript] = useState(''); 
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  
  // Intelligence Panel State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([
      { role: 'assistant', text: `I've analyzed <b>${contact.name}'s</b> history. What would you like to know?` }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Safe access to liveCallProps
  const isLiveCallActive = liveCallProps?.isLiveCallActive || false;
  const liveCallStatus = liveCallProps?.liveCallStatus || 'idle';
  const stopLiveCall = liveCallProps?.stopLiveCall || (() => {});
  const startLiveCall = liveCallProps?.startLiveCall || (() => {});

  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [mobileTab, setMobileTab] = useState<'activity' | 'info' | 'related'>('activity');
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [newWidgetName, setNewWidgetName] = useState('');
  const [newWidgetUrl, setNewWidgetUrl] = useState('');
  const [previewFile, setPreviewFile] = useState<any>(null);
  const vttInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
  }, [chatMessages, isChatOpen]);

  const displayEmails = contact.emails?.length ? contact.emails : (contact.email ? [{type:'Work', value: contact.email}] : []);
  const displayPhones = contact.phones?.length ? contact.phones : (contact.phone ? [{type:'Mobile', value: contact.phone}] : []);

  const handleAddNoteSubmit = async () => { 
      if(!noteText.trim()) return; 
      await onAddNote(contact.id, noteText, activityType, rawTranscript); 
      onUpdate(contact.id, { lastContact: { date: new Date().toLocaleDateString(), type: activityType } }); 
      setNoteText('');
      setRawTranscript('');
      setIsPostingUpdate(false);
  };

  const handleDirectPhotoUpload = async (e: any) => { const file = e.target.files?.[0]; if (file) { try { const resized = await resizeImage(file); onUpdate(contact.id, { photo: resized }); } catch (err) { console.error("Error."); } } };
  
  const handleVttUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        const cleanedTranscript = parseVtt(text);
        setRawTranscript(cleanedTranscript);
        setIsPostingUpdate(true);
        setNoteText('<p style="color: #6366f1;"><i>✨ <b>Processing Meeting Intelligence...</b></i></p>');
        handleAiSummarize(cleanedTranscript);
    };
    reader.readAsText(file);
    if (vttInputRef.current) vttInputRef.current.value = '';
  };

  const handleAiSummarize = async (providedText?: string) => {
    const apiKey = getApiKey();
    if (!apiKey) return;
    const textToSummarize = providedText || noteText;
    if (!textToSummarize.trim()) return;
    setIsSummarizing(true);
    try {
        const ai = new GoogleGenAI({ apiKey });
        const contextText = textToSummarize.replace(/<[^>]*>?/gm, '\n').trim(); 
        
        // Prompt for organized task grouping with sub-bullets and extracted due dates
        const prompt = `Act as an expert executive secretary. Provide a highly organized, professional, and visually structured summary of the following meeting transcript for contact "${contact.name}".

        Use exactly this structured format. You MUST include two <br /> tags before every header except the very first one to ensure there is a clear visual space/blank line between each section.

        <b>OVERVIEW</b>
        <p>[A 2-sentence professional summary of the meeting's core purpose and outcome.]</p>

        <br /><br />
        <b>KEY DISCUSSION POINTS</b>
        <ul>
        <li>[Point 1]</li>
        <li>[Point 2]</li>
        </ul>

        <br /><br />
        <b>ACTION ITEMS BY PERSON</b>
        <ul>
        <li><b>[Person Name 1]</b>:
            <ul>
            <li>[Task A] <b>(Due: [Date])</b></li>
            <li>[Task B]</li>
            </ul>
        </li>
        <li><b>[Person Name 2]</b>:
            <ul>
            <li>[Task C] <b>(Due: [Date])</b></li>
            </ul>
        </li>
        </ul>

        <br /><br />
        <b>CRITICAL INSIGHTS</b>
        <ul>
        <li>[Crucial detail, preference, or technical note mentioned during the call]</li>
        </ul>

        <br /><br />
        <b>NEXT STEPS</b>
        <p>[Broad project-level next steps or scheduled follow-ups.]</p>

        TRANSCRIPT TO ANALYZE:
        ${contextText}

        IMPORTANT RULES:
        1. Return ONLY the summary content using clean HTML tags (<b>, <ul>, <li>, <p>, <br />).
        2. Do NOT use Markdown symbols like # or *.
        3. Make sure headers are in BOLD.
        4. ENSURE double <br /> tags appear before every bold header starting from "KEY DISCUSSION POINTS".
        5. In the ACTION ITEMS BY PERSON section:
           - Clearly group all tasks under the name of the person responsible.
           - If a person has more than one task, you MUST show them organized as a sub-bullet list (nested <ul>/<li>) under that person's name for easy viewing.
           - EXTRACT DUE DATES: If the speaker mentioned "by Friday", "next week", "March 5th", etc., for a task, ensure that date is included next to the task in the format: <b>(Due: [Date])</b>.
        6. DO NOT include any introductory or meta-text like "Group tasks by..." or "If a deadline...". Only the formatted summary content.`;

        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt 
        });

        if (response.text) {
            const cleanHtml = response.text.replace(/```html|```/g, '').trim();
            setNoteText(cleanHtml);
        }
    } catch (error) { 
        console.error(error); 
        setNoteText("<p>Unable to generate AI summary at this time. Please check your transcript and try again.</p>");
    } finally { 
        setIsSummarizing(false); 
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
      const text = customPrompt || chatInput;
      if (!text.trim() || isChatLoading) return;

      const apiKey = getApiKey();
      if (!apiKey) {
          alert("API Key missing.");
          return;
      }

      const userMsg = { role: 'user', text };
      setChatMessages(prev => [...prev, userMsg]);
      setChatInput('');
      setIsChatLoading(true);

      try {
          const ai = new GoogleGenAI({ apiKey });
          
          const allPhones = displayPhones.map((p: any) => `${p.type}: ${p.value}`).join(', ');
          const allEmails = displayEmails.map((e: any) => `${e.type}: ${e.value}`).join(', ');
          
          const historyBlock = notes.map((n:any) => `
            [${n.type} - ${new Date(n.createdAt?.seconds * 1000).toLocaleDateString()}] 
            ${n.content.replace(/<[^>]*>?/gm, '')}
            ${n.rawTranscript ? `Full Meeting Transcript: ${n.rawTranscript}` : ''}
          `).join('\n---\n');

          const emailBlock = emails.slice(0, 15).map((e:any) => `- ${e.subject}: ${e.snippet}`).join('\n');

          const contextSummary = `
            PROFILE:
            Name: ${contact.name}
            Title: ${contact.title || 'N/A'}
            Company: ${contact.company || 'N/A'}
            Status: ${contact.status}
            Phones: ${allPhones || 'Not provided'}
            Emails: ${allEmails || 'Not provided'}
            Address: ${contact.address || 'N/A'}
            Background: ${contact.background || 'None'}
            
            FULL ACTIVITY HISTORY (Including Conversations):
            ${historyBlock}
            
            RECENT EMAILS:
            ${emailBlock}
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: text,
              config: {
                  systemInstruction: `
                    You are an expert CRM assistant with access to ALL client records.
                    A user is asking about: ${contact.name}.
                    
                    HERE IS THE CLIENT DATA:
                    ${contextSummary}
                    
                    RULES:
                    - If asked for a phone number or specific contact detail, provide it from the PROFILE section.
                    - If asked about a conversation, check the ACTIVITY HISTORY, specifically looking at any text marked "Full Meeting Transcript".
                    - FORMATTING RULE: When giving a summary, interaction insight, or long response, you MUST use clean HTML tags (<b>, <ul>, <li>, <p>, <br />).
                    - VISUAL STRUCTURE: Use bold headers for sections. Use double <br /><br /> tags before every header (except the first) to ensure clear spacing.
                    - LISTS: Always use <ul> and <li> for points to make them easy to read.
                    - PERSPECTIVE: Be professional and helpful. If data is genuinely missing, state it clearly.
                  `
              }
          });

          const cleanResponseText = (response.text || "I'm sorry, I couldn't process that.").replace(/```html|```/g, '').trim();
          setChatMessages(prev => [...prev, { role: 'assistant', text: cleanResponseText }]);
      } catch (err) {
          setChatMessages(prev => [...prev, { role: 'assistant', text: "Error connecting to Intelligence engine." }]);
      } finally {
          setIsChatLoading(false);
      }
  };

  const handleAddWidget = () => { if (newWidgetName && newWidgetUrl) { const newWidget = { id: Date.now().toString(), name: newWidgetName, url: newWidgetUrl }; const updatedWidgets = [...(contact.widgets || []), newWidget]; onUpdate(contact.id, { widgets: updatedWidgets }); setNewWidgetName(''); setNewWidgetUrl(''); setIsAddingWidget(false); } };
  const handleAddAttachment = async (e: any) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 1024 * 1024 * 5) { alert("File too large (max 5MB)."); return; } try { const base64 = await fileToBase64(file); const newAttachment = { id: Date.now().toString(), name: file.name, size: file.size, type: file.type, data: base64, createdAt: new Date().toISOString() }; const updatedAttachments = [...(contact.attachments || []), newAttachment]; onUpdate(contact.id, { attachments: updatedAttachments }); } catch (err) { console.error(err); } };
  const handleDeleteAttachment = (attId: string) => { const updatedAttachments = contact.attachments?.filter((a: any) => a.id !== attId) || []; onUpdate(contact.id, { attachments: updatedAttachments }); };
  const handleUpdateWidget = (widgetId: string, newData: any) => { const updatedWidgets = contact.widgets.map((w: any) => w.id === widgetId ? { ...w, ...newData } : w); onUpdate(contact.id, { widgets: updatedWidgets }); };
  const handleDeleteWidget = (widgetId: string) => { const updatedWidgets = contact.widgets.filter((w: any) => w.id !== widgetId); onUpdate(contact.id, { widgets: updatedWidgets }); };

  const timelineItems = useMemo(() => {
      const noteItems = (notes || []).map((n: any) => ({ ...n, activityType: 'NoteItem' }));
      let emailItems = (emails || []).filter((e: any) => {
          const contactEmailList = displayEmails.map((e:any) => e.value ? e.value.toLowerCase() : null).filter(Boolean);
          return contactEmailList.includes(e.senderEmail?.toLowerCase()) || contactEmailList.includes(e.sender?.toLowerCase());
      }).map((e: any) => ({ ...e, activityType: 'EmailItem', createdAt: e.date }));
      
      let combined = [...noteItems, ...emailItems];
      if (activeMainTab !== 'All') {
          const typeMap: any = { 'Notes': 'Note', 'Emails': 'Email', 'Calls': 'Call', 'Meetings': 'Meeting' };
          const targetType = typeMap[activeMainTab];
          combined = combined.filter((item: any) => item.activityType === 'EmailItem' ? (activeMainTab === 'Emails' || activeMainTab === 'All') : item.type === targetType);
      }
      return combined.sort((a: any, b: any) => {
          const getTime = (v: any) => v?.seconds ? v.seconds * 1000 : new Date(v).getTime();
          return getTime(b.createdAt) - getTime(a.createdAt);
      });
  }, [notes, emails, contact, activeMainTab]);

  if (isEditing) {
      return (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[200] backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                 <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b border-slate-100 z-10"><h3 className="text-lg font-bold text-slate-800">Edit {contact.name}</h3><button onClick={() => setIsEditing(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
                 <ContactForm existingCompanies={allContacts.filter((c: any) => c.type === 'Company')} allContacts={allContacts} tagGroups={tagGroups} onSubmit={(data: any) => { onUpdate(contact.id, data); setIsEditing(false); }} onCancel={() => setIsEditing(false)} onAddNewGroup={onAddNewGroup} initialData={contact} customFields={customFields} pipelines={pipelines} />
             </div>
         </div>
      )
  }

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-50 font-sans overflow-hidden relative">
      {/* Intelligence Sidebar */}
      {isChatOpen && (
          <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-[150] flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
              <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Sparkles className="w-5 h-5" /></div>
                      <div>
                          <h3 className="font-bold text-slate-800">Contact Intelligence</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Analyzing {contact.name}</p>
                      </div>
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar" ref={chatScrollRef}>
                  {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div 
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 border border-slate-200'} [&_b]:text-indigo-900 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mt-1 [&_li]:mt-0.5`}
                            dangerouslySetInnerHTML={{ __html: msg.text }}
                          />
                      </div>
                  ))}
                  {isChatLoading && (
                      <div className="flex justify-start animate-pulse">
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                              <span className="text-xs font-medium text-slate-500">Checking CRM history...</span>
                          </div>
                      </div>
                  )}
              </div>
              <div className="p-4 border-t space-y-3">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      <button onClick={() => handleSendMessage("Summarize our interaction history in an organized way.")} className="shrink-0 px-3 py-1.5 rounded-full border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50">History Summary</button>
                      <button onClick={() => handleSendMessage("Are there any outstanding tasks for this contact?")} className="shrink-0 px-3 py-1.5 rounded-full border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50">Pending Tasks</button>
                      <button onClick={() => handleSendMessage("Draft a professional follow-up email based on our last conversation.")} className="shrink-0 px-3 py-1.5 rounded-full border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50">Draft Follow-up</button>
                  </div>
                  <div className="relative">
                      <textarea 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all resize-none min-h-[50px] max-h-32"
                          placeholder="Ask Gemini anything..."
                          rows={1}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                              }
                          }}
                      />
                      <button 
                        onClick={() => handleSendMessage()}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="absolute right-2.5 bottom-2.5 p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
                      >
                          <Send className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Mobile Sticky Secondary Nav */}
      <div className="lg:hidden grid grid-cols-3 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-[60] shadow-sm">
          <button onClick={() => setMobileTab('info')} className={`flex flex-col items-center gap-1 py-4 px-2 transition-all relative ${mobileTab === 'info' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <span className="text-[10px] font-bold uppercase tracking-widest">Info</span>
              {mobileTab === 'info' && <div className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-emerald-500 rounded-t-full" />}
          </button>
          <button onClick={() => setMobileTab('activity')} className={`flex flex-col items-center gap-1 py-4 px-2 transition-all relative ${mobileTab === 'activity' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <span className="text-[10px] font-bold uppercase tracking-widest">Activity</span>
              {mobileTab === 'activity' && <div className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-emerald-500 rounded-t-full" />}
          </button>
          <button onClick={() => setMobileTab('related')} className={`flex flex-col items-center gap-1 py-4 px-2 transition-all relative ${mobileTab === 'related' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <span className="text-[10px] font-bold uppercase tracking-widest">Related</span>
              {mobileTab === 'related' && <div className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-emerald-500 rounded-t-full" />}
          </button>
      </div>

      {/* Left Profile Sidebar */}
      <div className={`w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto ${mobileTab === 'info' ? 'flex flex-1' : 'hidden lg:flex'}`}>
        <div className="p-6">
           <button onClick={onClose} className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-bold mb-6 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"><ArrowLeft className="w-4 h-4" /> Back</button>
           <div className="flex flex-col items-center text-center relative group">
             <div className="absolute right-0 top-0">
                <button onClick={() => setShowActionsMenu(!showActionsMenu)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
                {showActionsMenu && (
                   <><div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(false)}></div>
                   <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-20 overflow-hidden animate-in fade-in zoom-in-95">
                     <button onClick={() => { setIsEditing(true); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"><Edit3 className="w-4 h-4 text-blue-500" /> Edit Profile</button>
                     <button onClick={() => { onDelete(contact.id); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"><Trash2 className="w-4 h-4" /> Delete</button>
                   </div></>
                )}
             </div>
             <div className={`w-28 h-28 rounded-full border-4 overflow-hidden mb-5 relative shadow-md transition-all duration-500 ${isLiveCallActive ? 'border-emerald-400 ring-4 ring-emerald-100' : 'border-slate-50'}`}>
                <label className="cursor-pointer block w-full h-full">
                  {contact.photo ? <img src={contact.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300">{contact.type === 'Company' ? <Building2 className="w-12 h-12" /> : <UserIcon className="w-12 h-12" />}</div>}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><Camera className="w-7 h-7 text-white" /></div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleDirectPhotoUpload} />
                </label>
             </div>
             <h1 className="text-2xl font-bold text-slate-900 leading-tight">{contact.name}</h1>
             <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mt-1.5">{contact.company ? <><Building2 className="w-4 h-4 text-orange-500" /> {contact.company}</> : <span className="italic text-slate-400">Independent</span>}</div>
             
             {/* Intelligence Action Bar */}
             <div className="w-full mt-6 space-y-2 px-1">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsChatOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        Ask Intelligence
                    </button>
                    <button 
                        onClick={() => isLiveCallActive ? stopLiveCall() : startLiveCall(contact.id)}
                        className={`p-3 rounded-xl shadow-sm transition-all border ${isLiveCallActive ? 'bg-emerald-600 border-emerald-600 text-white animate-pulse' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        title={isLiveCallActive ? "End Session" : "Start Voice Conversation"}
                    >
                        {isLiveCallActive ? <PhoneOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => onGenerateSummary(contact.id)}
                        className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                        <Sparkles className="w-3 h-3" /> Profile TLDR
                    </button>
                    <button 
                        onClick={() => handleSendMessage("Summarize our recent interaction history and provide key insights.")}
                        className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                        <History className="w-3 h-3" /> Quick Insight
                    </button>
                </div>
                <button 
                    onClick={() => onCompose({ to: displayEmails[0]?.value || contact.email })}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold uppercase tracking-wider text-blue-600 hover:bg-blue-100 transition-all"
                >
                    <Mail className="w-3.5 h-3.5" /> Compose Email
                </button>
             </div>
           </div>
        </div>
        
        {/* Unified Info Section */}
        <div className="p-6 space-y-6 border-t border-slate-100 bg-white">
           {contact.title && <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Title</label><div className="text-sm text-slate-700 mt-1.5 font-semibold">{contact.title}</div></div>}
           <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Email</label><div className="text-sm text-slate-700 mt-1.5 font-semibold truncate">{displayEmails[0]?.value || '-'}</div></div>
           <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label><div className="text-sm text-slate-700 mt-1.5 font-semibold">{displayPhones[0]?.value || '-'}</div></div>
           <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</label><div className="text-sm text-slate-700 mt-1.5 font-semibold leading-relaxed">{contact.address || '-'}</div></div>
           {contact.linkedin && <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">LinkedIn</label><a href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 mt-1.5 font-semibold truncate hover:underline flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" /> View Profile</a></div>}
           {contact.website && <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Website</label><a href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 mt-1.5 font-semibold truncate hover:underline flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {contact.website.replace(/^https?:\/\//, '')}</a></div>}
           <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Pipeline Stage</label><StatusBadge status={contact.status} /></div>
        </div>
      </div>

      {/* Main Content Area - Activity Timeline */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden border-r border-slate-100 bg-slate-50/30 ${mobileTab === 'activity' ? 'flex flex-1' : 'hidden lg:flex'}`}>
        <div className="bg-white border-b border-slate-200 px-6 pt-4 shrink-0 shadow-sm z-10">
          <div className="flex gap-6 overflow-x-auto no-scrollbar">
            {['All', 'Notes', 'Emails', 'Calls', 'Meetings'].map(tab => (
              <button key={tab} onClick={() => setActiveMainTab(tab)} className={`pb-3.5 text-sm font-bold transition-all whitespace-nowrap border-b-2 ${activeMainTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{tab}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-24 lg:pb-10 pt-6">
           <div className="mb-8">
                {!isPostingUpdate ? (
                    <button onClick={() => setIsPostingUpdate(true)} className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform"><Plus className="w-5 h-5" /></div>
                            <span className="text-sm font-bold text-slate-400 group-hover:text-slate-600">Log a new note, call, or meeting...</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-300" />
                    </button>
                ) : (
                    <div className="bg-white border-2 border-emerald-100 rounded-2xl p-4 sm:p-5 shadow-xl animate-in slide-in-from-top-2 duration-300 ring-4 ring-emerald-50">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                            <div className="flex wrap gap-2">{(['Note', 'Email', 'Call', 'Meeting']).map(type => (<button key={type} onClick={() => setActivityType(type)} className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${activityType === type ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{type}</button>))}</div>
                            <button onClick={() => setIsPostingUpdate(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-full transition-colors"><ChevronUp className="w-5 h-5" /></button>
                        </div>
                        {activityType === 'Meeting' && (
                            <div className="mb-4">
                                <input type="file" accept=".vtt" className="hidden" ref={vttInputRef} onChange={handleVttUpload} />
                                <button type="button" onClick={() => vttInputRef.current?.click()} className="w-full py-4 border-2 border-dashed border-emerald-200 rounded-xl bg-emerald-50/30 flex flex-col items-center justify-center gap-2 group hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                                    <FileUp className="w-5 h-5 text-emerald-600" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Drop or Upload Meeting Transcript (.vtt)</span>
                                </button>
                            </div>
                        )}
                        <RichTextEditor placeholder={`What happened during this ${activityType.toLowerCase()}?`} value={noteText} onChange={setNoteText} onSubmit={handleAddNoteSubmit} />
                        <div className="flex justify-end items-center gap-3 pt-3 mt-2">
                            <button onClick={() => setIsPostingUpdate(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">Discard</button>
                            <button onClick={handleAddNoteSubmit} disabled={isSummarizing} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/10 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                                {isSummarizing && <Loader2 className="w-4 h-4 animate-spin" />}
                                Post Update
                            </button>
                        </div>
                    </div>
                )}
           </div>

           <div className="relative border-l-2 border-slate-200 ml-5 pl-8 space-y-8 pb-20">
             {timelineItems.length === 0 ? (<p className="text-sm text-slate-400 italic bg-white p-4 rounded-xl border border-slate-100 text-center shadow-sm">No activity found.</p>) : (
                 timelineItems.map((item: any) => item.activityType === 'EmailItem' ? (
                    <div key={item.id} className="relative"><div className="absolute -left-[41px] top-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center bg-blue-100 text-blue-600 shadow-sm z-10"><Mail className="w-4 h-4" /></div><div className="bg-white border border-blue-100 rounded-lg shadow-sm overflow-hidden"><div className="px-4 py-3 border-b border-blue-50 bg-blue-50/30 flex justify-between items-center"><div className="flex flex-col"><div className="flex items-center gap-2"><span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Email</span><span className="text-[10px] text-slate-500">• {formatDate(item.createdAt)}</span></div></div><button onClick={() => onViewEmail && onViewEmail(item.id)} className="text-xs flex items-center gap-1 text-blue-600 font-bold">Open Email <ExternalLink className="w-3 h-3" /></button></div><div className="p-4"><div className="text-sm font-bold text-slate-800 mb-1">{item.subject}</div><div className="text-sm text-slate-500 line-clamp-2">{item.snippet}</div></div></div></div>
                 ) : (<NoteItem key={item.id} note={item} onUpdate={onUpdateNote} onDelete={onDeleteNote} userName={user?.displayName || 'You'} userPhoto={user?.photoURL} onNavigate={onNavigate} />))
             )}
           </div>
        </div>
      </div>

      {/* Right Associations Sidebar */}
      <div className={`w-full lg:w-80 bg-white flex flex-col p-6 space-y-6 shrink-0 overflow-y-auto border-l border-slate-100 ${mobileTab === 'related' ? 'flex flex-1' : 'hidden lg:flex'}`}>
        {contact.type === 'Company' ? (<RelatedContactsCard company={contact} allContacts={allContacts} onUpdate={onUpdate} onNavigate={onNavigate} />) : (<RelatedCompanyCard contact={contact} companies={allContacts.filter((c: any) => c.type === 'Company')} onUpdate={onUpdate} onOpenCreateCompanyModal={onCreateLinkedCompany} onCreateCompany={onCreateCompany} onNavigate={onNavigate} />)}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Groups</h3>
          <div className="flex flex-wrap gap-2">
            {contact.groups?.map((group: any) => {
              const color = tagGroups.find((tg: any) => tg.name === group)?.color || 'bg-slate-100 text-slate-600';
              return (
                <button 
                  key={group} 
                  onClick={() => onGroupClick(group)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${color} shadow-sm hover:ring-2 hover:ring-offset-1 transition-all active:scale-95`}
                >
                  {group}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t border-slate-100 pt-6"><h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Important Links</h3><div className="space-y-2">{contact.widgets?.map((widget: any) => (<WidgetItem key={widget.id} widget={widget} onUpdate={handleUpdateWidget} onDelete={handleDeleteWidget} />))}</div>{!isAddingWidget ? (<button onClick={() => setIsAddingWidget(true)} className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-xs font-bold text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Link Tool</button>) : (<div className="bg-slate-50 p-4 rounded-xl space-y-3 shadow-inner"><input className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none" placeholder="Name" value={newWidgetName} onChange={e => setNewWidgetName(e.target.value)} /><input className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none" placeholder="https://..." value={newWidgetUrl} onChange={e => setNewWidgetUrl(e.target.value)} /><div className="flex justify-end gap-2"><button onClick={() => setIsAddingWidget(false)} className="text-[10px] font-bold text-slate-400">Cancel</button><button onClick={handleAddWidget} className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">Add</button></div></div>)}</div>
        <div className="border-t border-slate-100 pt-6 flex flex-col pb-20"><h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Files</h3><label className="cursor-pointer text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-lg mb-4 text-center">Upload<input type="file" className="hidden" onChange={handleAddAttachment} /></label><div className="space-y-3">{contact.attachments?.map((att: any) => (<div key={att.id} className="flex items-center gap-3 p-2.5 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-white transition-all cursor-pointer" onClick={() => setPreviewFile(att)}><FileText className="w-4 h-4 text-slate-400" /><div className="flex-1 min-0 text-xs font-bold text-slate-800 truncate">{att.name}</div><button onClick={(e) => {e.stopPropagation(); handleDeleteAttachment(att.id);}} className="p-1.5 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button></div>))}</div></div>
      </div>

      {previewFile && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[800] p-4 backdrop-blur-sm" onClick={() => setPreviewFile(null)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-4 border-b bg-white shrink-0"><h3 className="font-bold text-slate-800 truncate pr-4">{previewFile.name}</h3><button onClick={() => setPreviewFile(null)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button></div>
                  <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">{previewFile.type.startsWith('image/') ? (<img src={previewFile.data} alt={previewFile.name} className="max-w-full max-h-full object-contain" />) : (<div className="text-center p-12"><FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" /><a href={previewFile.data} download={previewFile.name} className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg">Download File</a></div>)}</div>
              </div>
          </div>
      )}
    </div>
  );
};
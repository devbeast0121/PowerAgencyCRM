
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Circle, Building2, User as UserIcon, CheckCircle2, MoreVertical, CheckSquare, Calendar, Trash2, Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp, Volume2, Square } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { NoteItem } from './NoteItem';
import { isValidDate } from '../utils';

// Helper to safely get API Key (Vite replaces process.env.API_KEY at build time)
const getApiKey = (): string | undefined => {
    const key = process.env.API_KEY;
    return key && key !== '' ? key : undefined;
};

export const Dashboard = ({ contacts, notes, todos, emails, scheduledEvents, setView, onSeedData, onClearData, isSeeding, isClearingAll, onUpdateNote, onDeleteNote, user, onNavigate, onToggleTodo, onDeleteTodo, onSpeak, isSpeaking, isAudioUnlocked }: any) => {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const activeLeads = contacts.filter((c: any) => c.status !== 'Closed' && c.status !== 'Lost').length;
  const closedDeals = contacts.filter((c: any) => c.status === 'Closed').length;
  const companiesCount = contacts.filter((c: any) => c.type === 'Company').length;
  const peopleCount = contacts.filter((c: any) => (c.type === 'Person' || !c.type)).length;

  const upcomingTasks = useMemo(() => {
     if (!todos) return [];
     return todos
       .filter((t: any) => !t.isDone)
       .sort((a: any, b: any) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
       });
  }, [todos]);

  const generateBriefing = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    setIsBriefingLoading(true);
    setBriefing(null);
    
    let attempt = 0;
    const maxRetries = 2;

    const todayStr = new Date().toDateString();
    const meetingsToday = (scheduledEvents || []).filter((e: any) => 
        e.startTime && new Date(e.startTime.seconds * 1000).toDateString() === todayStr
    );

    const threeBusinessDaysAgo = new Date();
    threeBusinessDaysAgo.setDate(threeBusinessDaysAgo.getDate() - 5); 
    
    const sentEmails = (emails || []).filter((e: any) => 
        e.folder === 'sent' && new Date(e.date) < threeBusinessDaysAgo
    );
    
    const unansweredSent = sentEmails.filter((sent: any) => {
        const replies = (emails || []).filter((inbox: any) => 
            inbox.folder === 'inbox' && 
            inbox.senderEmail === sent.to && 
            new Date(inbox.date) > new Date(sent.date)
        );
        return replies.length === 0;
    });

    const pendingReplies = (emails || []).filter((e: any) => 
        e.folder === 'inbox' && !e.isRead
    );

    const followUpRecs = contacts.filter((c: any) => {
        if (!c.lastContact) return true;
        const lastDate = new Date(c.lastContact.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return lastDate < sevenDaysAgo;
    }).slice(0, 5);

    const prompt = `
      Provide a professional, high-energy daily CRM briefing for ${user?.displayName || 'the user'}.
      Today is ${todayStr}.
      
      **Current Status:**
      - ${activeLeads} active leads
      - ${closedDeals} closed customers
      
      **Meetings Today:**
      ${meetingsToday.length > 0 ? meetingsToday.map((m: any) => `- [${new Date(m.startTime.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}] ${m.eventTypeTitle} with ${m.attendeeName}`).join('\n') : 'No meetings scheduled for today.'}

      **Follow-up Recommendations (No contact in 7+ days):**
      ${followUpRecs.length > 0 ? followUpRecs.map((c: any) => `- ${c.name} (${c.company || 'No Company'})`).join('\n') : 'No urgent follow-ups.'}

      **Emails Needing Your Reply:**
      ${pendingReplies.length > 0 ? pendingReplies.slice(0, 3).map((e: any) => `- From: ${e.sender} - Subject: ${e.subject}`).join('\n') : 'All clear!'}

      **Alert: Sent Emails with No Response (3+ Business Days):**
      ${unansweredSent.length > 0 ? unansweredSent.slice(0, 3).map((e: any) => `- To: ${e.to} - Subject: ${e.subject} (Sent: ${new Date(e.date).toLocaleDateString()})`).join('\n') : 'None found.'}

      **Instructions:**
      1. Use a warm but efficient tone.
      2. Structure with clear headers (Meetings, Follow-ups, Alerts).
      3. Keep it brief (max 150 words).
    `;

    while (attempt <= maxRetries) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 0 }
                }
            });

            const text = response.text || "No summary available.";
            setBriefing(text);
            setIsExpanded(true);
            setIsBriefingLoading(false);
            return;
        } catch (error: any) {
            const isRateLimit = error?.status === 429 || 
                               error?.message?.includes("429") || 
                               error?.message?.includes("RESOURCE_EXHAUSTED") ||
                               error?.message?.includes("quota");

            if (isRateLimit && attempt < maxRetries) {
                attempt++;
                const delay = Math.pow(2, attempt) * 1000;
                setBriefing(`API rate limit reached. Retrying in ${delay/1000}s (Attempt ${attempt}/${maxRetries})...`);
                setIsExpanded(true);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            console.error("Briefing error", error);
            setBriefing(isRateLimit 
                ? "You've exceeded your current API quota. Please check your Gemini API plan or wait a minute before trying again." 
                : "Unable to generate briefing. Please check your connection or API key.");
            setIsExpanded(true);
            setIsBriefingLoading(false);
            break;
        }
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end flex-wrap gap-2">
        <div><h2 className="text-xl sm:text-2xl font-bold text-slate-800">Dashboard</h2><p className="text-slate-500 text-sm sm:text-base">Overview of your companies and people.</p></div>
        <div className="flex items-center gap-2">
          {onSeedData && (
            <button onClick={onSeedData} disabled={isSeeding} className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5">
              {isSeeding ? (<><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Loading…</>) : 'Load Demo Data'}
            </button>
          )}
          {onClearData && (
            <button onClick={onClearData} disabled={isSeeding || isClearingAll} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5">
              {isClearingAll ? (<><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Clearing…</>) : 'Clear All Data'}
            </button>
          )}
        </div>
      </header>
      
      <div className={`bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-2xl p-0.5 shadow-md overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px]' : 'max-h-[120px] sm:max-h-[84px]'}`}>
          <div className={`bg-white rounded-[14px] transition-all duration-500 ${isExpanded ? 'p-4 sm:p-6' : 'p-3 sm:p-4'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={`transition-all duration-500 rounded-xl flex items-center justify-center shrink-0 ${isExpanded ? 'w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 text-indigo-600' : 'w-8 h-8 bg-indigo-50 text-indigo-50'}`}>
                          <Sparkles className={`text-indigo-600 ${isExpanded ? 'w-5 h-5 sm:w-6 sm:h-6 animate-pulse' : 'w-4 h-4'}`} />
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <h3 className={`font-bold text-slate-800 transition-all whitespace-nowrap ${isExpanded ? 'text-base sm:text-lg' : 'text-sm'}`}>AI Daily Briefing</h3>
                          {!isExpanded && (
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden lg:inline-block">
                                {isBriefingLoading ? "— Generating..." : briefing ? "— Review your insights" : "— Tap to analyze your day"}
                              </span>
                          )}
                      </div>
                  </div>

                  <div className="flex items-center gap-2">
                      {briefing && !isBriefingLoading && !briefing.includes("Retrying") && !briefing.includes("quota") && (
                          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                             <button
                                onClick={(e) => { e.stopPropagation(); onSpeak(briefing); }}
                                className={`p-1.5 rounded-md transition-all flex items-center gap-1 sm:gap-2 text-xs font-bold ${isSpeaking ? 'bg-indigo-600 text-white animate-pulse' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
                                title={isSpeaking ? "Stop Speaking" : "Listen to Briefing"}
                             >
                                {isSpeaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                {isExpanded && <span className="pr-1 hidden sm:inline">{isSpeaking ? 'Stop' : 'Listen'}</span>}
                             </button>
                             <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-md transition-colors"
                                title={isExpanded ? "Collapse" : "Expand"}
                             >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                             </button>
                          </div>
                      )}
                      <button
                          onClick={(e) => { e.stopPropagation(); generateBriefing(); }}
                          disabled={isBriefingLoading}
                          className={`flex items-center gap-1.5 sm:gap-2 transition-all font-bold shadow-sm active:scale-95 border whitespace-nowrap ${isExpanded ? 'bg-slate-900 text-white border-slate-900 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm' : 'bg-white text-slate-700 border-slate-200 px-3 sm:px-4 py-1.5 rounded-lg text-xs hover:bg-slate-50'}`}
                      >
                          {isBriefingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (briefing ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />)}
                          <span className="hidden sm:inline">{briefing ? 'Refresh' : 'Generate Briefing'}</span>
                          <span className="sm:hidden">{briefing ? 'Refresh' : 'Generate'}</span>
                      </button>
                  </div>
              </div>

              {isExpanded && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    {isBriefingLoading && !briefing?.includes("Retrying") ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                            <div className="relative">
                                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                                <Sparkles className="w-4 h-4 text-indigo-500 absolute -top-1 -right-1" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">AI is gathering your insights...</p>
                        </div>
                    ) : (
                        <div className={`rounded-xl p-3 sm:p-5 border ${briefing?.includes("quota") ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                            {briefing?.includes("Retrying") && (
                                <div className="flex items-center gap-3 mb-3 text-indigo-600 font-bold text-xs animate-pulse">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{briefing}</span>
                                </div>
                            )}
                            <div className={`prose prose-sm max-w-none font-medium leading-relaxed ${briefing?.includes("quota") ? 'text-red-700' : 'text-slate-700'}`}
                                dangerouslySetInnerHTML={{ __html: (briefing || "No summary available. Click 'Generate Briefing' above to analyze your CRM data.").replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^\* (.+)$/gm, '<li>$1</li>').replace(/(<li>.*<\/li>)/s, '<ul class="list-disc pl-4 space-y-1 my-2">$1</ul>').replace(/\n{2,}/g, '</p><p class="mt-3">').replace(/\n/g, '<br/>') }}
                            />
                            {briefing && !isSpeaking && !briefing.includes("Retrying") && !briefing.includes("quota") && (
                                <button 
                                    onClick={() => onSpeak(briefing)}
                                    className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors bg-white px-4 py-2 rounded-lg border border-indigo-100 shadow-sm"
                                >
                                    <Volume2 className="w-3.5 h-3.5" /> Listen to Audio Briefing
                                </button>
                            )}
                        </div>
                    )}
                </div>
              )}
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-center justify-between mb-3 sm:mb-4"><h3 className="text-slate-500 font-medium text-xs sm:text-base">Active Leads</h3><Circle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /></div><p className="text-2xl sm:text-3xl font-bold text-slate-800">{activeLeads}</p></div>
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-center justify-between mb-3 sm:mb-4"><h3 className="text-slate-500 font-medium text-xs sm:text-base">Companies</h3><Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" /></div><p className="text-2xl sm:text-3xl font-bold text-slate-800">{companiesCount}</p></div>
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-center justify-between mb-3 sm:mb-4"><h3 className="text-slate-500 font-medium text-xs sm:text-base">People</h3><UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" /></div><p className="text-2xl sm:text-3xl font-bold text-slate-800">{peopleCount}</p></div>
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-center justify-between mb-3 sm:mb-4"><h3 className="text-slate-500 font-medium text-xs sm:text-base">Customers</h3><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" /></div><p className="text-2xl sm:text-3xl font-bold text-slate-800">{closedDeals}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
        {/* Card 1: Upcoming Tasks (Moved to Left) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-orange-500" /> Upcoming Tasks</h3>
               <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{upcomingTasks.length} pending</span>
            </div>
            <div className="p-6 overflow-y-auto flex-1 max-h-[600px]">
                {upcomingTasks.length > 0 ? (
                   <div className="space-y-3">
                       {upcomingTasks.map((task: any) => (
                           <div key={task.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3 hover:bg-white hover:shadow-sm transition-all group">
                               <button 
                                 onClick={() => onToggleTodo(task)}
                                 className="mt-0.5 w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center transition-colors flex-shrink-0 hover:border-emerald-500"
                               >
                                   <div className={`w-2 h-2 rounded-full ${task.isDone ? 'bg-emerald-500' : 'bg-transparent'} group-hover:bg-slate-200`}></div>
                               </button>
                               
                               <div className="flex-1 min-w-0">
                                   <p className={`text-sm font-medium ${task.isDone ? 'text-slate-400 line-through' : 'text-slate-800'} truncate`}>{task.text}</p>
                                   
                                   {task.description && (
                                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                                             {task.description}
                                        </div>
                                   )}

                                   <div className="flex items-center gap-3 mt-1.5">
                                      {task.dueDate && isValidDate(task.dueDate) && (
                                          <span className={`text-xs flex items-center gap-1 ${new Date(task.dueDate).getTime() < new Date().setHours(0,0,0,0) && !task.isDone ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                              <Calendar className="w-3 h-3" /> {new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                          </span>
                                      )}
                                      {task.contactName && (
                                         <span 
                                            className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer hover:underline truncate max-w-[120px]"
                                            onClick={() => onNavigate(task.contactId)}
                                         >
                                             {task.contactName}
                                         </span>
                                      )}
                                   </div>
                               </div>

                               <button 
                                 onClick={() => onDeleteTodo(task.id)} 
                                 className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                   <Trash2 className="w-4 h-4" />
                               </button>
                           </div>
                       ))}
                   </div>
                ) : (
                    <div className="text-center py-12 text-slate-400">
                      <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No upcoming tasks.</p>
                      <button onClick={() => setView('todo')} className="text-sm text-emerald-600 font-medium mt-2 hover:underline">Add one now</button>
                   </div>
                )}
            </div>
        </div>

        {/* Card 2: Recent Activity (Moved to Right) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><MoreVertical className="w-4 h-4 text-emerald-600" /> Recent Activity</h3>
               <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Updates</span>
            </div>
            <div className="p-6 overflow-y-auto flex-1 max-h-[600px]">
               {notes && notes.length > 0 ? (
                   <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-6">
                       {notes.slice(0, 15).map((note: any) => {
                           const relatedContact = contacts.find((c: any) => c.id === note.contactId);
                           return (
                             <NoteItem 
                                 key={note.id} 
                                 note={note}
                                 contactName={relatedContact?.name}
                                 contactId={relatedContact?.id}
                                 onNavigate={onNavigate}
                                 onUpdate={onUpdateNote}
                                 onDelete={onDeleteNote}
                                 userName={user?.displayName || 'You'}
                                 userPhoto={user?.photoURL}
                             />
                           );
                       })}
                   </div>
               ) : (
                   <div className="text-center py-12 text-slate-400">
                      <MoreVertical className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No recent activity.</p>
                   </div>
               )}
            </div>
        </div>
      </div>
    </div>
  );
};

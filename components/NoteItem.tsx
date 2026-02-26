
import React, { useState } from 'react';
import { Edit3, Trash2, Check, X, MessageSquare, ChevronDown, ChevronUp, Quote } from 'lucide-react';
import { ACTIVITY_STYLES } from '../constants';
import { RichTextEditor } from './RichTextEditor';
import { formatDate, getInitials } from '../utils';

// Convert markdown to HTML for notes that were imported as plain text markdown
const markdownToHtml = (text: string): string => {
    if (!text) return '';
    // If it already contains HTML tags, return as-is
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // Headers
        .replace(/^### (.+)$/gm, '<h3 class="font-bold text-base mt-3 mb-1">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="font-bold text-lg mt-4 mb-1">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="font-bold text-xl mt-4 mb-2">$1</h1>')
        // Bold + italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Links [text](url)
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">$1</a>')
        // Bullet lists
        .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
        // Wrap consecutive <li> in <ul>
        .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="my-1 space-y-0.5">${match}</ul>`)
        // Paragraphs (double newline)
        .replace(/\n\n+/g, '</p><p class="mb-2">')
        // Single newlines → <br>
        .replace(/\n/g, '<br>')
        // Wrap in paragraph
        .replace(/^/, '<p class="mb-2">').replace(/$/, '</p>');
};

export const NoteItem = ({ note, onUpdate, onDelete, userName = 'You', userPhoto, contactName, onNavigate, contactId }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showFullTranscript, setShowFullTranscript] = useState(false);
    const [editContent, setEditContent] = useState(note.content);

    const handleStartEdit = () => {
        setEditContent(note.content);
        setIsEditing(true);
    };

    const handleSave = () => {
        onUpdate(note.id, editContent);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditContent(note.content);
        setIsEditing(false);
    };

    const handleLinkClick = (e: React.MouseEvent) => {
        const link = (e.target as HTMLElement).closest('a');
        if (link) {
            e.preventDefault();
            window.open(link.href, '_blank', 'noopener,noreferrer');
        }
    };

    const renderFormattedTranscript = (text: string) => {
        if (!text) return null;
        
        const lines = text.split('\n');
        return (
            <div className="space-y-3">
                {lines.map((line, idx) => {
                    const match = line.match(/^([^:]+):\s*(.*)$/);
                    if (match) {
                        const [, name, message] = match;
                        return (
                            <div key={idx} className="flex flex-col gap-0.5 group/line">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{name}</span>
                                <div className="text-[13px] text-slate-700 bg-white/50 p-2 rounded-lg border border-slate-100 group-hover/line:bg-emerald-50/30 transition-colors">
                                    {message}
                                </div>
                            </div>
                        );
                    }
                    return (
                        <p key={idx} className="text-[13px] text-slate-600 leading-relaxed px-1">
                            {line}
                        </p>
                    );
                })}
            </div>
        );
    };

    const style = ACTIVITY_STYLES[note.type] || ACTIVITY_STYLES['Note'];
    const Icon = style.icon;

    if (isEditing) {
        return (
            <div className="relative pl-8 pb-8 border-l border-slate-200 last:border-0 last:pb-0">
                <div className={`absolute -left-4 top-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center ${style.bg} ${style.text} shadow-sm z-10`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Edit {note.type}</div>
                    <RichTextEditor 
                        value={editContent} 
                        onChange={setEditContent} 
                        placeholder="Edit note..." 
                        minHeightClass="min-h-[120px]"
                    />
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                        <button onClick={handleCancel} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm transition-colors">Save Changes</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative pl-8 pb-8 border-l border-slate-200 last:border-0 last:pb-0 group">
            <div className={`absolute -left-4 top-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center ${style.bg} ${style.text} shadow-sm z-10`}>
               <Icon className="w-4 h-4" />
            </div>
            
            <div className={`bg-white rounded-lg border ${style.border} shadow-sm overflow-hidden transition-shadow hover:shadow-md`}>
               <div className={`px-4 py-3 flex justify-between items-center ${style.bg} border-b ${style.border}`}>
                  <div className="flex items-center gap-3">
                      {userPhoto ? (
                        <img src={userPhoto} alt={userName} className="w-6 h-6 rounded-full object-cover border-2 border-white shadow-sm" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200 shadow-sm">
                            {getInitials(userName)}
                        </div>
                      )}
                      <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${style.text} uppercase tracking-wider`}>{note.type}</span>
                            <span className="text-[10px] text-slate-500">• {formatDate(note.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                             {contactName && (
                                 <>
                                    <span className="text-[11px] font-medium text-slate-600">on</span>
                                    <button 
                                        onClick={() => onNavigate && contactId && onNavigate(contactId)}
                                        className={`text-[11px] font-bold text-slate-800 hover:text-blue-600 hover:underline ${!onNavigate ? 'cursor-default pointer-events-none' : ''}`}
                                    >
                                        {contactName}
                                    </button>
                                    <span className="text-[11px] text-slate-400">•</span>
                                 </>
                             )}
                             <span className="text-[11px] font-medium text-slate-600">Posted by {userName}</span>
                          </div>
                      </div>
                  </div>
                  
                  <div className={`flex gap-1 transition-opacity ${isDeleting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {isDeleting ? (
                          <>
                              <button onClick={() => onDelete(note.id)} className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded transition-colors shadow-sm flex items-center gap-1" title="Confirm Delete"><Check className="w-3 h-3" /><span className="text-[10px] font-bold">Delete?</span></button>
                              <button onClick={() => setIsDeleting(false)} className="p-1.5 text-slate-500 hover:bg-white/50 rounded transition-colors" title="Cancel"><X className="w-3 h-3" /></button>
                          </>
                      ) : (
                          <>
                              <button onClick={handleStartEdit} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white/50 rounded transition-colors"><Edit3 className="w-3 h-3" /></button>
                              <button onClick={() => setIsDeleting(true)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white/50 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
                          </>
                      )}
                  </div>
               </div>
               
               <div className="p-4 bg-white">
                   <div
                       className="text-sm text-slate-700 prose prose-sm max-w-none"
                       dangerouslySetInnerHTML={{ __html: markdownToHtml(note.content) }}
                       onClick={handleLinkClick}
                   />
                   
                   {note.rawTranscript && (
                       <div className="mt-6 pt-4 border-t border-slate-100">
                           <div className="flex items-center justify-between mb-4">
                               <button 
                                    onClick={() => setShowFullTranscript(!showFullTranscript)}
                                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors"
                               >
                                   <Quote className="w-3.5 h-3.5" />
                                   {showFullTranscript ? 'Hide Dialogue' : 'View Full Transcript'}
                                   {showFullTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                               </button>
                               {showFullTranscript && <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-tighter">Raw Data</span>}
                           </div>
                           
                           {showFullTranscript && (
                               <div className="mt-2 p-4 bg-slate-50/50 rounded-xl border border-slate-100 font-sans animate-in slide-in-from-top-2 duration-300 max-h-96 overflow-y-auto no-scrollbar">
                                   {renderFormattedTranscript(note.rawTranscript)}
                               </div>
                           )}
                       </div>
                   )}
               </div>
            </div>
        </div>
    );
};


import React, { useState, useMemo } from 'react';
import { Plus, Search, X, Building2, User as UserIcon, Check, Calendar, Trash2, CheckSquare, AlertCircle, Edit3 } from 'lucide-react';
import { isValidDate } from '../utils';

export const TodoPage = ({ user, contacts, todos, onToggle, onDelete, onNavigate, onAdd, onUpdate }: any) => {
  const [taskName, setTaskName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showDateWarning, setShowDateWarning] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ text: '', description: '', dueDate: '', contactId: '', contactName: '' });
  const [editContactSearch, setEditContactSearch] = useState('');
  const [showEditContactDropdown, setShowEditContactDropdown] = useState(false);

  const todayDate = new Date().toISOString().split('T')[0];

  const sortedTodos = useMemo(() => {
    return [...todos].sort((a: any, b: any) => {
        if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });
  }, [todos]);

  const handleSubmit = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!taskName.trim()) { setShowWarning(true); return; }
      if (dueDate) {
        const [y, m, d] = dueDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj < today) { setShowDateWarning(true); return; }
      }
      if (isSaving) return;
      setIsSaving(true); setShowWarning(false); setShowDateWarning(false);
      const contact = contacts.find((c: any) => c.id === selectedContactId);
      const newTodo = { text: taskName, description: description, dueDate: dueDate, contactId: selectedContactId, contactName: contact ? contact.name : '', isDone: false };
      try {
          await onAdd(newTodo);
          setTaskName(''); setDescription(''); setDueDate(''); setSelectedContactId(''); setContactSearch(''); setIsFormExpanded(false);
      } catch (error) { console.error("Failed to add task", error); } finally { setIsSaving(false); }
  };

  const startEditing = (todo: any) => {
      setEditingId(todo.id);
      setEditForm({
          text: todo.text,
          description: todo.description || '',
          dueDate: todo.dueDate || '',
          contactId: todo.contactId || '',
          contactName: todo.contactName || ''
      });
      setEditContactSearch(todo.contactName || '');
  };

  const cancelEditing = () => {
      setEditingId(null);
      setEditForm({ text: '', description: '', dueDate: '', contactId: '', contactName: '' });
      setEditContactSearch('');
  };

  const saveEditing = async (id: string) => {
      if (!editForm.text.trim()) return;
      const contact = contacts.find((c: any) => c.id === editForm.contactId);
      const updatedData = {
          text: editForm.text,
          description: editForm.description,
          dueDate: editForm.dueDate,
          contactId: editForm.contactId,
          contactName: contact ? contact.name : (editForm.contactId ? editForm.contactName : '')
      };
      await onUpdate(id, updatedData);
      setEditingId(null);
  };

  const filteredContacts = contacts.filter((c: any) => c.name.toLowerCase().includes(contactSearch.toLowerCase()));
  const filteredEditContacts = contacts.filter((c: any) => c.name.toLowerCase().includes(editContactSearch.toLowerCase()));

  return (
      <div className="max-w-4xl mx-auto py-4 sm:py-8 px-2 sm:px-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6">To Do List</h2>
          <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm mb-8 transition-all overflow-hidden ${isFormExpanded ? 'ring-2 ring-emerald-500 shadow-xl' : ''}`}>
              <form onSubmit={handleSubmit}>
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <Plus className={`w-5 h-5 transition-colors ${isFormExpanded ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <input className="flex-1 outline-none text-slate-700 placeholder:text-slate-400 font-bold text-sm sm:text-base" placeholder="What needs to be done?" value={taskName} onChange={e => { setTaskName(e.target.value); if (showWarning && e.target.value.trim()) setShowWarning(false); }} onFocus={() => setIsFormExpanded(true)} />
                    {!isFormExpanded && <button type="button" onClick={() => setIsFormExpanded(true)} className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700">Expand</button>}
                  </div>
                  {showWarning && <div className="px-12 pb-3 flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-widest animate-in slide-in-from-top-1"><AlertCircle className="w-3 h-3" /><span>Title required</span></div>}
                  {showDateWarning && <div className="px-12 pb-3 flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-widest animate-in slide-in-from-top-1"><AlertCircle className="w-3 h-3" /><span>Date must be in future</span></div>}
                  {isFormExpanded && (
                    <div className="px-4 sm:px-6 pb-6 animate-in slide-in-from-top-2 duration-200 border-t border-slate-50 pt-6">
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Due Date</label>
                                <input type="date" min={todayDate} className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50" value={dueDate} onChange={e => { setDueDate(e.target.value); setShowDateWarning(false); }} />
                            </div>
                            <div className="flex-1 relative">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Link Contact</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input className="w-full text-sm border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50" placeholder="Search..." value={contactSearch} onChange={e => { setContactSearch(e.target.value); setSelectedContactId(''); setShowContactDropdown(true); }} onFocus={() => setShowContactDropdown(true)} />
                                    {selectedContactId && <button type="button" onClick={() => { setSelectedContactId(''); setContactSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full"><X className="w-3 h-3 text-slate-500" /></button>}
                                </div>
                                {showContactDropdown && contactSearch && !selectedContactId && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto ring-1 ring-black/5">
                                        {filteredContacts.length > 0 ? (
                                            filteredContacts.map((c: any) => (
                                                <div key={c.id} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-0" onClick={() => { setSelectedContactId(c.id); setContactSearch(c.name); setShowContactDropdown(false); }}>
                                                    {c.type === 'Company' ? <Building2 className="w-4 h-4 text-orange-500" /> : <UserIcon className="w-4 h-4 text-blue-500" />}
                                                    <span className="text-sm font-medium">{c.name}</span>
                                                </div>
                                            ))
                                        ) : <div className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">No results</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mb-6"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label><textarea className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 min-h-[100px]" placeholder="Extra details..." value={description} onChange={e => setDescription(e.target.value)} /></div>
                        <div className="flex justify-end gap-3"><button type="button" onClick={() => setIsFormExpanded(false)} className="px-6 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancel</button><button type="button" onClick={() => handleSubmit()} className={`px-8 py-2.5 text-xs font-bold uppercase tracking-widest bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all ${!taskName.trim() ? 'opacity-50' : ''}`} disabled={isSaving}>{isSaving ? 'Saving...' : 'Add Task'}</button></div>
                    </div>
                  )}
              </form>
          </div>
          <div className="space-y-4">
              {sortedTodos.map((todo: any) => {
                  if (editingId === todo.id) {
                      return (
                          <div key={todo.id} className="bg-white rounded-2xl border border-emerald-500 shadow-lg p-5 animate-in fade-in zoom-in-95">
                              <div className="space-y-4">
                                  <input 
                                    className="w-full text-base font-bold border-b border-slate-200 pb-2 outline-none focus:border-emerald-500" 
                                    value={editForm.text} 
                                    onChange={e => setEditForm({...editForm, text: e.target.value})} 
                                    placeholder="Task Name"
                                    autoFocus
                                  />
                                  <textarea 
                                    className="w-full text-sm text-slate-600 border border-slate-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-emerald-500" 
                                    rows={3} 
                                    value={editForm.description} 
                                    onChange={e => setEditForm({...editForm, description: e.target.value})} 
                                    placeholder="Description"
                                  />
                                  <div className="flex flex-col sm:flex-row gap-4">
                                      <div className="flex-1">
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</label>
                                          <input 
                                            type="date" 
                                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500" 
                                            value={editForm.dueDate} 
                                            onChange={e => setEditForm({...editForm, dueDate: e.target.value})} 
                                          />
                                      </div>
                                      <div className="flex-1 relative">
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contact</label>
                                          <div className="relative">
                                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                              <input 
                                                className="w-full text-sm border border-slate-200 rounded-lg pl-8 pr-8 py-2 outline-none focus:ring-1 focus:ring-emerald-500" 
                                                placeholder="Search..." 
                                                value={editContactSearch} 
                                                onChange={e => { setEditContactSearch(e.target.value); setEditForm({...editForm, contactId: ''}); setShowEditContactDropdown(true); }} 
                                                onFocus={() => setShowEditContactDropdown(true)} 
                                              />
                                              {editContactSearch && <button type="button" onClick={() => { setEditForm({...editForm, contactId: '', contactName: ''}); setEditContactSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full"><X className="w-3 h-3 text-slate-500" /></button>}
                                          </div>
                                          {showEditContactDropdown && editContactSearch && !editForm.contactId && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto ring-1 ring-black/5">
                                                    {filteredEditContacts.length > 0 ? (
                                                        filteredEditContacts.map((c: any) => (
                                                            <div key={c.id} className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2 border-b border-slate-50 last:border-0" onClick={() => { setEditForm({...editForm, contactId: c.id, contactName: c.name}); setEditContactSearch(c.name); setShowEditContactDropdown(false); }}>
                                                                {c.type === 'Company' ? <Building2 className="w-3 h-3 text-orange-500" /> : <UserIcon className="w-3 h-3 text-blue-500" />}
                                                                <span className="text-xs font-medium">{c.name}</span>
                                                            </div>
                                                        ))
                                                    ) : <div className="p-3 text-[10px] text-slate-400 text-center">No results</div>}
                                                </div>
                                            )}
                                      </div>
                                  </div>
                                  <div className="flex justify-end gap-2 pt-2">
                                      <button onClick={cancelEditing} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                      <button onClick={() => saveEditing(todo.id)} className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors">Save Changes</button>
                                  </div>
                              </div>
                          </div>
                      );
                  }

                  const isOverdue = todo.dueDate && isValidDate(todo.dueDate) && new Date(todo.dueDate).getTime() < new Date().setHours(0,0,0,0) && !todo.isDone;
                  return (
                      <div key={todo.id} className={`group flex items-start gap-4 p-5 bg-white rounded-2xl border transition-all ${todo.isDone ? 'border-slate-100 bg-slate-50/30' : 'border-slate-200 hover:shadow-lg hover:-translate-y-0.5'}`}>
                          <button onClick={() => onToggle(todo)} className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${todo.isDone ? 'bg-emerald-500 border-emerald-500 text-white scale-110' : 'border-slate-200 hover:border-emerald-500 text-transparent'}`}><Check className="w-4 h-4 stroke-[3px]" /></button>
                          <div className="flex-1 min-w-0">
                              <div className={`text-base font-bold leading-tight ${todo.isDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{todo.text}</div>
                              {todo.description && (<div className={`text-xs mt-1.5 leading-relaxed line-clamp-2 ${todo.isDone ? 'text-slate-300' : 'text-slate-500'}`}>{todo.description}</div>)}
                              <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-3">
                                  {todo.dueDate && isValidDate(todo.dueDate) && (<div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}><Calendar className="w-3.5 h-3.5" /> {new Date(todo.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>)}
                                  {todo.contactId && (<button onClick={(e) => { e.stopPropagation(); onNavigate(todo.contactId); }} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-700 transition-colors"><UserIcon className="w-3.5 h-3.5" />{todo.contactName || 'Contact'}</button>)}
                              </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditing(todo)} className="text-slate-300 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={() => onDelete(todo.id)} className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </div>
                      </div>
                  );
              })}
              {sortedTodos.length === 0 && (<div className="text-center py-20 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><CheckSquare className="w-8 h-8 opacity-20" /></div><p className="font-bold uppercase tracking-widest text-xs">Clear Agenda</p><p className="text-xs mt-1">Enjoy your productivity!</p></div>)}
          </div>
      </div>
  );
};

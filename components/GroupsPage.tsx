import React, { useState } from 'react';
import { Plus, Tag, X, Edit3, Trash2, ChevronRight } from 'lucide-react';
import { GROUP_COLORS } from '../constants';

export const GroupsPage = ({ contacts, tagGroups, onGroupClick, onAddNewGroup, onEditGroup, onDeleteGroup }: any) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <header className="mb-4 flex justify-between items-center"><div><h2 className="text-xl font-bold text-slate-800">Groups</h2><p className="text-sm text-slate-500">Organize contacts with custom groups.</p></div><button onClick={onAddNewGroup} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> New Group</button></header>
        {tagGroups.length === 0 ? (
          <div className="text-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 text-slate-500"><Tag className="w-8 h-8 mx-auto mb-3 text-slate-300" /><p>No custom groups yet.</p><button onClick={onAddNewGroup} className="text-emerald-600 font-medium hover:underline mt-2">Create your first group</button></div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {tagGroups.map((group: any) => {
                const count = contacts.filter((c: any) => c.groups && c.groups.includes(group.name)).length;
                const colorObj = GROUP_COLORS.find(c => `${c.bg} ${c.text}` === group.color) || GROUP_COLORS[0];
                const isDeleting = deleteConfirmId === group.id;

                return (
                  <div key={group.id} onClick={() => onGroupClick(group.name)} className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group">
                    <div className="flex items-center gap-4"><div className={`p-2 rounded-lg ${colorObj.bg} ${colorObj.text}`}><Tag className="w-5 h-5" /></div><span className="font-medium text-slate-800">{group.name}</span></div>
                    <div className="flex items-center gap-4">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{count}</span>
                        
                        <div className={`flex items-center gap-1 transition-all ${isDeleting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {isDeleting ? (
                                <>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); setDeleteConfirmId(null); }} 
                                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                    >
                                        Delete?
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} 
                                        className="p-1 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onEditGroup(group); }} 
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                        title="Edit Group"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(group.id); }} 
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete Group"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                        
                        {!isDeleting && <ChevronRight className="w-5 h-5 text-slate-300" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

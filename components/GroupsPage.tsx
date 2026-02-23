import React, { useState, useMemo } from 'react';
import { Plus, Tag, X, Edit3, Trash2, ChevronRight, ArrowLeft, Mail, Users, BarChart2, UserCheck, UserX, Search, CheckSquare, Square, Send } from 'lucide-react';
import { GROUP_COLORS } from '../constants';
import { getInitials } from '../utils';

// ── Group List (main view) ──────────────────────────────────────────────────
export const GroupsPage = ({ contacts, tagGroups, onGroupClick, onAddNewGroup, onEditGroup, onDeleteGroup, onCompose }: any) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  if (selectedGroup) {
    return (
      <GroupDetailPage
        group={selectedGroup}
        contacts={contacts}
        tagGroups={tagGroups}
        onBack={() => setSelectedGroup(null)}
        onCompose={onCompose}
        onEditGroup={onEditGroup}
      />
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Groups</h2>
          <p className="text-sm text-slate-500">Organize contacts with custom groups.</p>
        </div>
        <button onClick={onAddNewGroup} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Group
        </button>
      </header>

      {tagGroups.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 text-slate-500">
          <Tag className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          <p>No custom groups yet.</p>
          <button onClick={onAddNewGroup} className="text-emerald-600 font-medium hover:underline mt-2">Create your first group</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {tagGroups.map((group: any) => {
              const count = contacts.filter((c: any) => c.groups && c.groups.includes(group.name)).length;
              const colorObj = GROUP_COLORS.find(c => `${c.bg} ${c.text}` === group.color) || GROUP_COLORS[0];
              const isDeleting = deleteConfirmId === group.id;

              return (
                <div key={group.id} onClick={() => setSelectedGroup(group)} className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${colorObj.bg} ${colorObj.text}`}><Tag className="w-5 h-5" /></div>
                    <div>
                      <span className="font-medium text-slate-800">{group.name}</span>
                      <div className="text-xs text-slate-400 mt-0.5">{count} contact{count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{count}</span>
                    <div className={`flex items-center gap-1 transition-all ${isDeleting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {isDeleting ? (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); setDeleteConfirmId(null); }} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Delete?</button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="p-1 text-slate-500 hover:bg-slate-100 rounded transition-colors"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); onEditGroup(group); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Edit"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(group.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
  );
};

// ── Group Detail Page ───────────────────────────────────────────────────────
const GroupDetailPage = ({ group, contacts, tagGroups, onBack, onCompose, onEditGroup }: any) => {
  const [activeTab, setActiveTab] = useState<'members' | 'analytics' | 'manage'>('members');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [manageSearch, setManageSearch] = useState('');

  const colorObj = GROUP_COLORS.find(c => `${c.bg} ${c.text}` === group.color) || GROUP_COLORS[0];

  const members = useMemo(() =>
    contacts.filter((c: any) => c.groups && c.groups.includes(group.name)),
    [contacts, group.name]
  );

  const nonMembers = useMemo(() =>
    contacts.filter((c: any) => !c.groups || !c.groups.includes(group.name)),
    [contacts, group.name]
  );

  const filteredMembers = useMemo(() =>
    members.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase())),
    [members, search]
  );

  // ── Analytics ──
  const analytics = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = { Person: 0, Company: 0 };
    const withEmail = members.filter((c: any) => c.emails?.some((e: any) => e.value)).length;
    const withPhone = members.filter((c: any) => c.phones?.some((p: any) => p.value)).length;

    members.forEach((c: any) => {
      const s = c.status || 'Unknown';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
      typeCounts[c.type || 'Person']++;
    });

    return { statusCounts, typeCounts, withEmail, withPhone, total: members.length };
  }, [members]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredMembers.map((c: any) => c.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleEmailGroup = () => {
    const toList = members
      .filter((c: any) => c.emails?.some((e: any) => e.value))
      .map((c: any) => c.emails.find((e: any) => e.value)?.value)
      .filter(Boolean)
      .join(', ');
    onCompose({ to: toList, subject: `[${group.name}] ` });
  };

  const handleEmailSelected = () => {
    const selected = members.filter((c: any) => selectedIds.has(c.id));
    const toList = selected
      .filter((c: any) => c.emails?.some((e: any) => e.value))
      .map((c: any) => c.emails.find((e: any) => e.value)?.value)
      .filter(Boolean)
      .join(', ');
    onCompose({ to: toList, subject: `[${group.name}] ` });
  };

  const STATUS_COLORS: Record<string, string> = {
    Lead: 'bg-blue-500', Contacted: 'bg-indigo-500', Proposal: 'bg-amber-500',
    Negotiation: 'bg-purple-500', Closed: 'bg-emerald-500', Lost: 'bg-slate-400', Unknown: 'bg-gray-300'
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Groups
        </button>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colorObj.bg} ${colorObj.text}`}><Tag className="w-6 h-6" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{group.name}</h2>
              <p className="text-sm text-slate-500">{members.length} contact{members.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEditGroup(group)} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 transition-colors">
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={handleEmailGroup} disabled={!members.some((c: any) => c.emails?.some((e: any) => e.value))} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Mail className="w-3.5 h-3.5" /> Email All
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-4 border-t border-slate-100 pt-1 -mb-4">
          {(['members', 'analytics', 'manage'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 pt-1 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {tab === 'members' ? 'Members' : tab === 'analytics' ? 'Analytics' : 'Manage Members'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">

        {/* ── MEMBERS TAB ── */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            {members.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-xl border border-slate-200 text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No contacts in this group yet.</p>
                <button onClick={() => setActiveTab('manage')} className="mt-2 text-sm text-blue-600 hover:underline">Add contacts →</button>
              </div>
            ) : (
              <>
                {/* Search & bulk actions */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                      <>
                        <span className="text-xs text-slate-500 font-medium">{selectedIds.size} selected</span>
                        <button onClick={handleEmailSelected} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 transition-colors">
                          <Send className="w-3 h-3" /> Email Selected
                        </button>
                        <button onClick={clearAll} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">Clear</button>
                      </>
                    )}
                    <button onClick={selectedIds.size === filteredMembers.length ? clearAll : selectAll} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                      {selectedIds.size === filteredMembers.length && filteredMembers.length > 0 ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      <span>All</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm divide-y">
                  {filteredMembers.map((contact: any) => {
                    const email = contact.emails?.find((e: any) => e.value)?.value || '';
                    const isSelected = selectedIds.has(contact.id);
                    return (
                      <div key={contact.id} onClick={() => toggleSelect(contact.id)} className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <div onClick={(e) => { e.stopPropagation(); toggleSelect(contact.id); }} className="shrink-0">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                        </div>
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 overflow-hidden">
                          {contact.photo ? <img src={contact.photo} className="w-full h-full object-cover" /> : getInitials(contact.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 text-sm truncate">{contact.name}</div>
                          <div className="text-xs text-slate-400 truncate">{contact.title || email || contact.type}</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[contact.status] ? `${STATUS_COLORS[contact.status].replace('bg-', 'bg-').replace('500', '100')} text-${STATUS_COLORS[contact.status].split('-')[1]}-700` : 'bg-slate-100 text-slate-600'}`}>
                          {contact.status || 'Lead'}
                        </span>
                      </div>
                    );
                  })}
                  {filteredMembers.length === 0 && <div className="p-8 text-center text-slate-400 text-sm italic">No contacts match your search.</div>}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Members', value: analytics.total, icon: Users, color: 'text-blue-600 bg-blue-50' },
                { label: 'People', value: analytics.typeCounts.Person, icon: Users, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Companies', value: analytics.typeCounts.Company, icon: Users, color: 'text-orange-600 bg-orange-50' },
                { label: 'Have Email', value: analytics.withEmail, icon: Mail, color: 'text-purple-600 bg-purple-50' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
                  <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{value}</div>
                    <div className="text-xs text-slate-500">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Status breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Status Breakdown</h3>
              {analytics.total === 0 ? (
                <p className="text-sm text-slate-400 italic">No members yet.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics.statusCounts).sort(([,a],[,b]) => (b as number) - (a as number)).map(([status, count]) => {
                    const pct = Math.round(((count as number) / analytics.total) * 100);
                    const barColor = STATUS_COLORS[status] || 'bg-slate-400';
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                          <span>{status}</span>
                          <span>{count as number} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Contact coverage */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4">Contact Coverage</h3>
              <div className="space-y-3">
                {[
                  { label: 'Have Email', value: analytics.withEmail, icon: UserCheck, color: 'text-emerald-600' },
                  { label: 'No Email', value: analytics.total - analytics.withEmail, icon: UserX, color: 'text-red-400' },
                  { label: 'Have Phone', value: analytics.withPhone, icon: UserCheck, color: 'text-blue-600' },
                  { label: 'No Phone', value: analytics.total - analytics.withPhone, icon: UserX, color: 'text-slate-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 text-sm ${color}`}><Icon className="w-4 h-4" />{label}</div>
                    <span className="text-sm font-bold text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MANAGE MEMBERS TAB ── */}
        {activeTab === 'manage' && (
          <div className="space-y-6">
            {/* Current members */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><UserCheck className="w-4 h-4 text-emerald-600" /> In this group ({members.length})</h3>
              </div>
              {members.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm italic">No members yet.</div>
              ) : (
                <div className="divide-y max-h-64 overflow-y-auto">
                  {members.map((contact: any) => (
                    <MemberRow
                      key={contact.id}
                      contact={contact}
                      inGroup={true}
                      groupName={group.name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Non-members — add contacts */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><UserX className="w-4 h-4 text-slate-400" /> Not in this group ({nonMembers.length})</h3>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search contacts..." value={manageSearch} onChange={e => setManageSearch(e.target.value)} />
                </div>
              </div>
              {nonMembers.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm italic">All contacts are in this group.</div>
              ) : (
                <div className="divide-y max-h-64 overflow-y-auto">
                  {nonMembers.filter((c: any) => c.name.toLowerCase().includes(manageSearch.toLowerCase())).map((contact: any) => (
                    <MemberRow
                      key={contact.id}
                      contact={contact}
                      inGroup={false}
                      groupName={group.name}
                    />
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 text-center italic">Changes are saved immediately to Firestore.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Member row with add/remove button (updates Firestore via contact) ────────
const MemberRow = ({ contact, inGroup, groupName }: any) => {
  // We call onUpdateContact from context — but since we don't have it here,
  // we dispatch a custom event that App.tsx can listen to.
  const handleToggle = () => {
    window.dispatchEvent(new CustomEvent('crm:group-toggle', {
      detail: { contactId: contact.id, groupName, add: !inGroup }
    }));
  };

  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 overflow-hidden">
        {contact.photo ? <img src={contact.photo} className="w-full h-full object-cover" /> : getInitials(contact.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{contact.name}</div>
        <div className="text-xs text-slate-400 truncate">{contact.title || contact.type}</div>
      </div>
      <button
        onClick={handleToggle}
        className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${inGroup
          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
      >
        {inGroup ? 'Remove' : 'Add'}
      </button>
    </div>
  );
};

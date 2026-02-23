import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Mail, User, Shield, Check, X, Lock, Eye, AlertTriangle, Crown, List as ListIcon, Calendar as CalendarIcon, Type as TypeIcon, Hash, Building2, UserCircle2, FileUp } from 'lucide-react';
import { ImportModal } from './ImportModal';

export const SettingsPage = ({ teamMembers = [], onAddTeamMember, onUpdateTeamMember, onDeleteTeamMember, currentUser, customFields = [], onAddCustomField, onDeleteCustomField, onImportContacts, onConnectGmail, onConnectGoogleCalendar, isGmailConnected = false, isCalendarConnected = false }: any) => {
  const [activeTab, setActiveTab] = useState('team_members');
  const [comingSoonMsg, setComingSoonMsg] = useState<string | null>(null);

  const showComingSoon = (name: string) => {
      setComingSoonMsg(`${name} integration is coming soon!`);
      setTimeout(() => setComingSoonMsg(null), 3000);
  };
  // Simulating Current User Role for demonstration purposes
  const [currentUserRole, setCurrentUserRole] = useState<'Super Admin' | 'Admin' | 'Assistant' | 'Member'>('Super Admin');

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'Member' });
  
  // Custom Field State
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [newField, setNewField] = useState({ label: '', type: 'Text', options: '', scope: 'Both' });
  
  // Track which member is being deleted for inline confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Permissions Logic
  const canManageIntegrations = currentUserRole === 'Super Admin' || currentUserRole === 'Admin';
  const canAddEditTeam = currentUserRole === 'Super Admin' || currentUserRole === 'Admin';
  const canManageCustomFields = currentUserRole === 'Super Admin' || currentUserRole === 'Admin' || currentUserRole === 'Assistant';
  const canImportData = currentUserRole === 'Super Admin' || currentUserRole === 'Admin';

  // Helper to determine if the current user can delete a specific target user
  const canDeleteUser = (targetRole: string, member: any) => {
      // Allow deleting duplicate "You" entries (same uid/email but not the canonical doc id === currentUser.uid)
      const isDuplicateSelf = (member.uid === currentUser?.uid || member.email?.toLowerCase() === currentUser?.email?.toLowerCase()) && member.id !== currentUser?.uid;
      if (isDuplicateSelf) return true;

      // Cannot delete the canonical self entry
      if (member.uid === currentUser?.uid) return false;

      if (currentUserRole === 'Super Admin') return true;
      if (currentUserRole === 'Admin') return ['Assistant', 'Member'].includes(targetRole);
      return false;
  };

  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const handleAddMember = (e: React.FormEvent) => {
      e.preventDefault();
      setAddMemberError(null);
      const trimmedName = newMember.name.trim();
      const trimmedEmail = newMember.email.trim().toLowerCase();
      if (!trimmedName || !trimmedEmail) { setAddMemberError('Name and email are required.'); return; }
      // Basic email format check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setAddMemberError('Please enter a valid email address.'); return; }
      // Duplicate check (local, before calling parent)
      if (teamMembers.some((m: any) => m.email?.toLowerCase() === trimmedEmail)) { setAddMemberError('A team member with this email already exists.'); return; }
      onAddTeamMember({
          name: trimmedName,
          email: trimmedEmail,
          role: newMember.role,
          avatar: null,
      });
      setNewMember({ name: '', email: '', role: 'Member' });
      setShowAddMember(false);
  };

  const handleAddField = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newField.label) return;
      
      onAddCustomField({
          label: newField.label,
          type: newField.type,
          scope: newField.scope,
          options: newField.type === 'Dropdown' ? newField.options.split(',').map(s => s.trim()).filter(Boolean) : []
      });
      
      setIsFieldModalOpen(false);
      setNewField({ label: '', type: 'Text', options: '', scope: 'Both' });
  };

  const handleDeleteClick = (id: string) => {
      setDeleteConfirmId(id);
  };

  const confirmDelete = (id: string) => {
      onDeleteTeamMember(id);
      setDeleteConfirmId(null);
  };

  const cancelDelete = () => {
      setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
          <p className="text-slate-500">Manage your workspace preferences.</p>
        </div>
        {/* Role Simulator for Demo */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-2">View as:</span>
            {(['Super Admin', 'Admin', 'Assistant', 'Member'] as const).map(role => (
                <button
                    type="button"
                    key={role}
                    onClick={() => { 
                        setCurrentUserRole(role); 
                        if (role !== 'Super Admin' && role !== 'Admin' && activeTab === 'integrations') {
                            setActiveTab('team_members'); 
                        }
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${currentUserRole === role ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {role}
                </button>
            ))}
        </div>
      </div>

      {currentUserRole === 'Member' && (
          <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm border border-blue-100">
              <Eye className="w-4 h-4" />
              <span>You are viewing settings as a <strong>Member</strong>. You have read-only access.</span>
          </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden min-h-[500px] flex flex-col md:flex-row shadow-sm">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 p-4 shrink-0">
          <div className="space-y-1">
            {canManageIntegrations ? (
                <button
                type="button"
                onClick={() => setActiveTab('integrations')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'integrations' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/50'}`}
                >
                Integrations
                </button>
            ) : (
                <div className="flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed opacity-60" title="Requires Admin Role">
                    Integrations <Lock className="w-3 h-3" />
                </div>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('team_members')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'team_members' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/50'}`}
            >
              Team Members
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom_fields')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'custom_fields' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/50'}`}
            >
              Custom Fields
            </button>
            <div className="h-px bg-slate-200 my-2 mx-1"></div>
            {canImportData ? (
                <button
                    type="button"
                    onClick={() => setActiveTab('import_data')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'import_data' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/50'}`}
                >
                    <FileUp className="w-4 h-4" /> Import Data
                </button>
            ) : (
                <div className="flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed opacity-60" title="Requires Admin Role">
                    <span className="flex items-center gap-2"><FileUp className="w-4 h-4" /> Import Data</span> <Lock className="w-3 h-3" />
                </div>
            )}
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-6 bg-white overflow-y-auto">
          {activeTab === 'import_data' && canImportData && (
              <div className="space-y-6 h-full flex flex-col">
                  <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <FileUp className="w-5 h-5 text-emerald-500" /> Bulk Import
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">Upload contact exports from other systems like Less Annoying CRM.</p>
                  </div>
                  <div className="flex-1">
                      <ImportModal 
                        inline={true} 
                        customFields={customFields} 
                        onImport={onImportContacts} 
                      />
                  </div>
              </div>
          )}

          {activeTab === 'integrations' && canManageIntegrations && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Integrations</h3>

              {/* Coming Soon Toast */}
              {comingSoonMsg && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium px-4 py-3 rounded-lg animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {comingSoonMsg}
                  </div>
              )}

              <div className="space-y-4">

                 {/* 1. Zoom */}
                 <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-[#2D8CFF] rounded-lg flex items-center justify-center shadow-sm p-1.5">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-full h-full"><path d="M4.5 9C3.675 9 3 9.675 3 10.5V17.5C3 18.325 3.675 19 4.5 19H13.5C14.325 19 15 18.325 15 17.5V10.5C15 9.675 14.325 9 13.5 9H4.5ZM17 10.5V17.5L21 19.5V8.5L17 10.5Z"/></svg>
                       </div>
                       <div>
                          <div className="font-medium text-slate-900">Zoom</div>
                          <div className="text-xs text-slate-500">Video calls and webinars</div>
                       </div>
                    </div>
                    <button type="button" onClick={() => showComingSoon('Zoom')} className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200">Coming Soon</button>
                 </div>

                 {/* 2. Slack */}
                 <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center shadow-sm overflow-hidden p-1.5">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className="w-full h-full"><path fill="#E01E5A" d="M28.6 39a9.7 9.7 0 1 1 9.7-9.7V39H28.6zm13.1 3.4a9.7 9.7 0 1 1 9.7 9.7H41.7v-9.7z"/><path fill="#36C5F0" d="M55.3 28.6a9.7 9.7 0 1 1 9.7 9.7H55.3V28.6zm3.4 13.1a9.7 9.7 0 1 1 9.7 9.7v13.1H58.7v-22.8z"/><path fill="#2EB67D" d="M99.4 89a9.7 9.7 0 1 1-9.7 9.7V89h9.7zm-13.1-3.4a9.7 9.7 0 1 1-9.7-9.7h9.7v9.7z"/><path fill="#ECB22E" d="M72.7 99.4a9.7 9.7 0 1 1-9.7-9.7h9.7v9.7zm-3.4-13.1a9.7 9.7 0 1 1-9.7-9.7V63.5h9.7v22.8z"/></svg>
                       </div>
                       <div>
                          <div className="font-medium text-slate-900">Slack</div>
                          <div className="text-xs text-slate-500">Receive notifications in channels</div>
                       </div>
                    </div>
                    <button type="button" onClick={() => showComingSoon('Slack')} className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200">Coming Soon</button>
                 </div>

                 {/* 3. LinkedIn Messaging */}
                 <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-[#0077b5] rounded-lg flex items-center justify-center shadow-sm p-1.5">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-full h-full"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                       </div>
                       <div>
                          <div className="font-medium text-slate-900">LinkedIn Messaging</div>
                          <div className="text-xs text-slate-500">Sync messages and InMails</div>
                       </div>
                    </div>
                    <button type="button" onClick={() => showComingSoon('LinkedIn Messaging')} className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200">Coming Soon</button>
                 </div>

                 {/* 4. Gmail */}
                 <div className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isGmailConnected ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center shadow-sm overflow-hidden p-1.5">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-full h-full"><path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"/><path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"/><polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"/><path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"/><path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0C43.076,8,45,9.924,45,12.298z"/></svg>
                       </div>
                       <div>
                          <div className="font-medium text-slate-900">Gmail</div>
                          <div className="text-xs text-slate-500">{isGmailConnected ? 'Connected — emails syncing' : 'Sync emails and threads'}</div>
                       </div>
                    </div>
                    {isGmailConnected
                        ? <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-lg"><Check className="w-3.5 h-3.5" /> Connected</span>
                        : <button type="button" onClick={onConnectGmail} className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm">Connect</button>
                    }
                 </div>

                 {/* 5. Google Calendar */}
                 <div className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isCalendarConnected ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center shadow-sm overflow-hidden p-1.5">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-full h-full"><path fill="#29CC7A" d="M14 42V14H6v24c0 2.2 1.8 4 4 4h4z"/><path fill="#E04239" d="M34 14v28h4c2.2 0 4-1.8 4-4V14h-8z"/><path fill="#3B88F5" d="M14 42h20v-8H14z"/><path fill="#FBC02D" d="M14 14h20V6H14z"/><path fill="#29CC7A" d="M6 14h8v-8H10C7.8 6 6 7.8 6 10v4z"/><path fill="#E04239" d="M34 6v8h8v-4c0-2.2-1.8-4-4-4h-4z"/></svg>
                       </div>
                       <div>
                          <div className="font-medium text-slate-900">Google Calendar</div>
                          <div className="text-xs text-slate-500">{isCalendarConnected ? 'Connected — events syncing' : 'Sync meetings and events'}</div>
                       </div>
                    </div>
                    {isCalendarConnected
                        ? <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-lg"><Check className="w-3.5 h-3.5" /> Connected</span>
                        : <button type="button" onClick={onConnectGoogleCalendar} className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm">Connect</button>
                    }
                 </div>

                 {/* 6. Google Meet */}
                 <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center shadow-sm overflow-hidden p-1.5">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-full h-full"><path fill="#00832d" d="M17 13h-4c-2.2 0-4 1.8-4 4v14c0 2.2 1.8 4 4 4h4V13z"/><path fill="#0066da" d="M31 35h4c2.2 0 4-1.8 4-4V17c0-2.2-1.8-4-4-4h-4v22z"/><path fill="#00ac47" d="M17 13h14v22H17z"/><path fill="#ea4335" d="M35 13l-4 4v14l4 4V13z"/><path fill="#2684fc" d="M9 31V17l4-4v22l-4-4z"/><path fill="#ffba00" d="M31 13l-14 0-4 4 0 14 4 4 14 0 4-4 0-14z"/></svg>
                       </div>
                       <div>
                          <div className="font-medium text-slate-900">Google Meet</div>
                          <div className="text-xs text-slate-500">Video conferencing</div>
                       </div>
                    </div>
                    <button type="button" onClick={() => showComingSoon('Google Meet')} className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200">Coming Soon</button>
                 </div>

                 {/* 7. Office 365 Calendar */}
                 <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center shadow-sm overflow-hidden p-1.5">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-full h-full"><path fill="#E63F24" d="M11.5,12.5H6.5v-5h5V12.5z"/><path fill="#EB3C00" d="M6.5,7.5h-5v5h5V7.5z"/><path fill="#F25022" d="M1.5,12.5v5h5v-5H1.5z"/><path fill="#7FBA00" d="M12.5,7.5h5v-5h-5V7.5z"/><path fill="#00A4EF" d="M12.5,12.5v5h5v-5H12.5z"/><path fill="#FFB900" d="M12.5,12.5h-5v5h5V12.5z"/></svg>
                       </div>
                       <div>
                          <div className="font-medium text-slate-900">Office 365 Calendar</div>
                          <div className="text-xs text-slate-500">Sync organization schedule</div>
                       </div>
                    </div>
                    <button type="button" onClick={() => showComingSoon('Office 365 Calendar')} className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200">Coming Soon</button>
                 </div>

                 {/* 8. Outlook Calendar */}
                 <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-[#0072C6] rounded-lg flex items-center justify-center shadow-sm p-1.5">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-full h-full"><path fill="white" d="M19.5,4H10a3,3,0,0,0-3,3V19a1,1,0,0,0,1,1H19.5a1,1,0,0,0,1-1V5A1,1,0,0,0,19.5,4ZM18.5,18h-9V7h9Z"/><path fill="white" d="M22,7H21v9h1a1,1,0,0,0,1-1V8A1,1,0,0,0,22,7Z"/><path fill="white" d="M25,10H24v3h1a1,1,0,0,0,1-1V11A1,1,0,0,0,25,10Z"/></svg>
                       </div>
                       <div>
                          <div className="font-medium text-slate-900">Outlook Calendar</div>
                          <div className="text-xs text-slate-500">Sync meetings and events</div>
                       </div>
                    </div>
                    <button type="button" onClick={() => showComingSoon('Outlook Calendar')} className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200">Coming Soon</button>
                 </div>

                 {/* 9. Microsoft Teams */}
                 <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-[#5059C9] rounded-lg flex items-center justify-center shadow-sm p-1.5">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-full h-full"><path d="M16 9.5C16 10.88 14.88 12 13.5 12S11 10.88 11 9.5 12.12 7 13.5 7 16 8.12 16 9.5zM17 13h-7v-1.26c0-.85 1.57-1.27 2.22-1.44.42-.11.85-.17 1.28-.17.43 0 .86.06 1.28.17.65.17 2.22.59 2.22 1.44V13zM9 10.5c0 .97-.78 1.75-1.75 1.75S5.5 11.47 5.5 10.5 6.28 8.75 7.25 8.75 9 9.53 9 10.5zM3 14h6.14c-.11-.22-.14-.46-.14-.7 0-.74.61-1.39 1.41-1.73-.29-.07-.63-.12-1.01-.12-.77 0-2.35.53-2.35 1.6V14h-4v-.95c0-1.07 1.58-1.6 2.35-1.6.21 0 .42.02.62.05-.62.33-1.02.97-1.02 1.7V14z"/></svg>
                       </div>
                       <div>
                          <div className="font-medium text-slate-900">Microsoft Teams</div>
                          <div className="text-xs text-slate-500">Conferencing & Chat</div>
                       </div>
                    </div>
                    <button type="button" onClick={() => showComingSoon('Microsoft Teams')} className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200">Coming Soon</button>
                 </div>

              </div>
            </div>
          )}

          {activeTab === 'team_members' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                 <h3 className="text-lg font-semibold text-slate-800">Team Members</h3>
                 {canAddEditTeam && (
                     <button 
                        type="button"
                        onClick={() => setShowAddMember(true)}
                        className="text-xs flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                     >
                        <Plus className="w-3 h-3" /> Add Member
                     </button>
                 )}
              </div>
              
              <div className="space-y-4">
                 <p className="text-sm text-slate-500">Manage your team and their access levels.</p>
                 
                 {showAddMember && canAddEditTeam && (
                     <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 shadow-sm mb-4">
                         <h4 className="text-sm font-bold text-slate-800 mb-3">Invite New Member</h4>
                         <form onSubmit={handleAddMember} className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                     <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                                     <input 
                                        required
                                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                        placeholder="John Doe"
                                        value={newMember.name}
                                        onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                                     <input 
                                        required
                                        type="email"
                                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                        placeholder="john@example.com"
                                        value={newMember.email}
                                        onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                                     />
                                 </div>
                             </div>
                             
                             <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-2">Role</label>
                                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                     {['Admin', 'Assistant', 'Member'].map((roleOption) => (
                                         <div 
                                            key={roleOption}
                                            onClick={() => setNewMember({...newMember, role: roleOption})}
                                            className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${newMember.role === roleOption ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                         >
                                             <div className="flex items-center gap-2 mb-1">
                                                 <div className={`w-3 h-3 rounded-full border ${newMember.role === roleOption ? 'border-4 border-emerald-500' : 'border-slate-300'}`}></div>
                                                 <span className={`text-sm font-bold ${newMember.role === roleOption ? 'text-emerald-700' : 'text-slate-700'}`}>{roleOption}</span>
                                             </div>
                                             <p className="text-[10px] text-slate-500 leading-tight pl-5">
                                                 {roleOption === 'Admin' && "Can manage records and other members."}
                                                 {roleOption === 'Assistant' && "Can manage records but cannot edit team."}
                                                 {roleOption === 'Member' && "View-only access."}
                                             </p>
                                         </div>
                                     ))}
                                 </div>
                             </div>

                             {addMemberError && <p className="text-xs text-red-500 font-medium">{addMemberError}</p>}
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 mt-2">
                                 <button
                                    type="button"
                                    onClick={() => { setShowAddMember(false); setAddMemberError(null); }}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                 >
                                     Cancel
                                 </button>
                                 <button
                                    type="submit"
                                    className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
                                 >
                                     <Mail className="w-3 h-3" /> Send Invite
                                 </button>
                             </div>
                         </form>
                     </div>
                 )}

                 <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                          <tr>
                             <th className="px-4 py-3">Name</th>
                             <th className="px-4 py-3">Email</th>
                             <th className="px-4 py-3">Role</th>
                             <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {teamMembers.map((member: any) => (
                              <tr key={member.id} className="group hover:bg-slate-50 transition-colors">
                                 <td className="px-4 py-3">
                                     <div className="flex items-center gap-2">
                                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${member.role === 'Super Admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                             {member.avatar ? (
                                                 <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                             ) : member.role === 'Super Admin' ? <Crown className="w-4 h-4" /> : member.name.charAt(0)}
                                         </div>
                                         <div>
                                             <div className="font-medium text-slate-800 flex items-center gap-1">
                                                 {member.name} {member.uid === currentUser?.uid && <span className="text-slate-400 font-normal text-xs">(You)</span>}
                                             </div>
                                         </div>
                                     </div>
                                 </td>
                                 <td className="px-4 py-3 text-slate-600">{member.email}</td>
                                 <td className="px-4 py-3">
                                     <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border
                                        ${member.role === 'Super Admin' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                          member.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                          member.role === 'Assistant' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                          'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                         {member.role === 'Super Admin' && <Crown className="w-3 h-3" />}
                                         {member.role === 'Admin' && <Shield className="w-3 h-3" />}
                                         {member.role}
                                     </span>
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                     {deleteConfirmId === member.id ? (
                                         <div className="flex items-center justify-end gap-2">
                                             <span className="text-xs text-slate-500 font-medium mr-1">Sure?</span>
                                             <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); confirmDelete(member.id); }}
                                                className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-md transition-colors"
                                                title="Confirm Delete"
                                             >
                                                 <Check className="w-3 h-3" />
                                             </button>
                                             <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); cancelDelete(); }}
                                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                                                title="Cancel"
                                             >
                                                 <X className="w-3 h-3" />
                                             </button>
                                         </div>
                                     ) : (
                                         canDeleteUser(member.role, member) ? (
                                             <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(member.id); }}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remove Member"
                                             >
                                                 <Trash2 className="w-4 h-4" />
                                             </button>
                                         ) : (
                                             <span className="text-slate-300 text-xs italic cursor-not-allowed">
                                                 {member.uid === currentUser?.uid ? '' : 'Locked'}
                                             </span>
                                         )
                                     )}
                                 </td>
                              </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'custom_fields' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                 <h3 className="text-lg font-semibold text-slate-800">Custom Fields</h3>
                 {canManageCustomFields && (
                     <button 
                        type="button" 
                        onClick={() => setIsFieldModalOpen(true)}
                        className="text-xs flex items-center gap-1 text-emerald-600 font-medium hover:text-emerald-700"
                     >
                        <Plus className="w-3 h-3" /> Add Field
                     </button>
                 )}
              </div>
              <div className="space-y-4">
                 <p className="text-sm text-slate-500">Define custom data fields for your contacts and companies.</p>
                 
                 <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-slate-100 text-slate-500 font-medium border-b border-slate-200">
                          <tr>
                             <th className="px-4 py-2">Label</th>
                             <th className="px-4 py-2">Type</th>
                             <th className="px-4 py-2">Scope</th>
                             <th className="px-4 py-2 text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-200">
                          {customFields.map((field: any) => (
                              <tr key={field.id}>
                                 <td className="px-4 py-3 text-slate-700 font-medium">{field.label}</td>
                                 <td className="px-4 py-3 text-slate-500">
                                     <div className="flex items-center gap-2">
                                         {field.type === 'Text' && <TypeIcon className="w-3 h-3" />}
                                         {field.type === 'Number' && <Hash className="w-3 h-3" />}
                                         {field.type === 'Date' && <CalendarIcon className="w-3 h-3" />}
                                         {field.type === 'Dropdown' && <ListIcon className="w-3 h-3" />}
                                         {field.type}
                                     </div>
                                 </td>
                                 <td className="px-4 py-3">
                                     <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${field.scope === 'Person' ? 'bg-blue-50 text-blue-600 border-blue-100' : field.scope === 'Company' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                         {field.scope === 'Person' && <UserCircle2 className="w-2.5 h-2.5" />}
                                         {field.scope === 'Company' && <Building2 className="w-2.5 h-2.5" />}
                                         {field.scope || 'Both'}
                                     </span>
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                     {canManageCustomFields ? (
                                         <button 
                                            type="button" 
                                            onClick={() => onDeleteCustomField(field.id)}
                                            className="text-slate-400 hover:text-red-600"
                                            title="Delete Field"
                                         >
                                             <Trash2 className="w-3 h-3 ml-auto" />
                                         </button>
                                     ) : <span className="text-slate-300 text-xs">Locked</span>}
                                 </td>
                              </tr>
                          ))}
                          {customFields.length === 0 && (
                              <tr>
                                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                      No custom fields defined.
                                  </td>
                              </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isFieldModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl w-full max-sm overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-slate-100">
                      <h3 className="text-md font-bold text-slate-800">Add Custom Field</h3>
                      <button onClick={() => setIsFieldModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                  </div>
                  <form onSubmit={handleAddField} className="p-4 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Field Label</label>
                          <input 
                              required
                              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="e.g. Lead Source"
                              value={newField.label}
                              onChange={(e) => setNewField({...newField, label: e.target.value})}
                              autoFocus
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Data Type</label>
                          <select 
                              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                              value={newField.type}
                              onChange={(e) => setNewField({...newField, type: e.target.value})}
                          >
                              <option value="Text">Text</option>
                              <option value="Number">Number</option>
                              <option value="Date">Date</option>
                              <option value="Dropdown">Dropdown</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Applies To</label>
                          <div className="flex bg-slate-100 p-0.5 rounded-lg">
                             {(['Person', 'Company', 'Both'] as const).map(scope => (
                                 <button
                                    key={scope}
                                    type="button"
                                    onClick={() => setNewField({...newField, scope})}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newField.scope === scope ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                 >
                                     {scope}
                                 </button>
                             ))}
                          </div>
                      </div>
                      {newField.type === 'Dropdown' && (
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Options (comma separated)</label>
                              <input 
                                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                  placeholder="Option A, Option B, Option C"
                                  value={newField.options}
                                  onChange={(e) => setNewField({...newField, options: e.target.value})}
                              />
                          </div>
                      )}
                      <div className="flex justify-end gap-2 pt-2">
                          <button type="button" onClick={() => setIsFieldModalOpen(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                          <button type="submit" className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm">Save Field</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

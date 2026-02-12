import React, { useState, useMemo } from 'react';
import { Plus, X, Search, Building2, Mail, Phone, PlusCircle, Check } from 'lucide-react';
import { getInitials } from '../utils';

export const RelatedContactsCard = ({ company, allContacts, onUpdate, onNavigate }: any) => {
  const [isLinking, setIsLinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Find contacts linked to this company
  const linkedContacts = allContacts.filter((c: any) => c.relatedCompanyId === company.id || (c.company === company.name && c.type === 'Person'));

  // Filter for search (exclude already linked)
  const filteredContacts = useMemo(() => {
      if (!searchQuery) return [];
      return allContacts.filter((c: any) => 
          c.type === 'Person' && 
          c.relatedCompanyId !== company.id && 
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [allContacts, searchQuery, company.id]);

  const handleLink = (person: any) => {
      // Update the person to link to this company
      onUpdate(person.id, { relatedCompanyId: company.id, company: company.name });
      setSearchQuery('');
      setIsLinking(false);
  };

  const handleUnlink = (personId: string) => {
      onUpdate(personId, { relatedCompanyId: null, company: '' });
  };

  return (
      <div className="border border-slate-200 rounded-xl p-4 bg-white relative">
          <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  Associated Contacts 
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">{linkedContacts.length}</span>
              </h3>
              {!isLinking && (
                  <button onClick={() => setIsLinking(true)} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors" title="Add Person">
                      <Plus className="w-4 h-4" />
                  </button>
              )}
          </div>

          {/* List Linked Contacts */}
          <div className="space-y-3 mb-3">
              {linkedContacts.length === 0 && !isLinking && (
                  <p className="text-xs text-slate-400 italic">No contacts linked.</p>
              )}
              {linkedContacts.map((person: any) => (
                  <div key={person.id} className="flex items-center justify-between group">
                      <div 
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => onNavigate(person.id)}
                      >
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                              {getInitials(person.name)}
                          </div>
                          <div>
                              <div className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">{person.name}</div>
                              <div className="text-[10px] text-slate-500">{person.title || 'No Title'}</div>
                          </div>
                      </div>
                      <button 
                          onClick={() => handleUnlink(person.id)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Unlink"
                      >
                          <X className="w-3 h-3" />
                      </button>
                  </div>
              ))}
          </div>

          {/* Linking UI */}
          {isLinking && (
              <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Link Person</span>
                      <button onClick={() => setIsLinking(false)}><X className="w-3 h-3 text-slate-400" /></button>
                  </div>
                  <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input 
                        className="w-full text-xs border border-slate-300 rounded-md pl-7 pr-2 py-1.5 outline-none focus:border-blue-500"
                        placeholder="Search people..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                      />
                  </div>
                  {searchQuery && (
                      <div className="mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-32 overflow-y-auto">
                          {filteredContacts.length === 0 ? (
                              <div className="p-2 text-xs text-slate-400 text-center">No people found</div>
                          ) : (
                              filteredContacts.map((p: any) => (
                                  <div 
                                    key={p.id}
                                    onClick={() => handleLink(p)}
                                    className="px-2 py-1.5 hover:bg-slate-50 cursor-pointer flex items-center gap-2 border-b border-slate-50 last:border-0"
                                  >
                                      <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[8px] text-blue-600 font-bold">{getInitials(p.name)}</div>
                                      <span className="text-xs text-slate-700 truncate">{p.name}</span>
                                  </div>
                              ))
                          )}
                      </div>
                  )}
              </div>
          )}
      </div>
  );
};

export const RelatedCompanyCard = ({ contact, companies, onUpdate, onOpenCreateCompanyModal, onNavigate, onCreateCompany }: any) => { 
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false); // Added unlinking confirmation state
  const [mode, setMode] = useState('existing'); // 'existing' | 'new'
  const [searchQuery, setSearchQuery] = useState('');
   
  // Find the actual linked company object
  const linkedCompany = companies.find((c: any) => c.id === contact.relatedCompanyId);

  // Filter companies based on search
  const filteredCompanies = useMemo(() => {
      if (!searchQuery) return [];
      return companies.filter((c: any) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [companies, searchQuery]);

  // If we have a linked company, show the card
  if (linkedCompany) {
    return (
      <div className="border border-slate-200 rounded-xl p-4 bg-white relative group">
        <h3 className="font-bold text-slate-800 mb-3 flex justify-between items-center">
            Company
            {isUnlinking ? (
                <div className="flex gap-1">
                      <button 
                        onClick={() => {
                            onUpdate(contact.id, { relatedCompanyId: null, company: '' });
                            setIsUnlinking(false);
                        }}
                        className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                        title="Confirm Unlink"
                    >
                        <Check className="w-3 h-3" />
                    </button>
                    <button 
                        onClick={() => setIsUnlinking(false)}
                        className="text-slate-400 hover:bg-slate-50 p-1 rounded transition-colors"
                        title="Cancel"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setIsUnlinking(true)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Unlink"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </h3>
        <div 
            className="flex items-center gap-3 cursor-pointer group/card" 
            onClick={() => onNavigate(linkedCompany.id)}
            title="View Company Page"
        >
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover/card:bg-blue-50 group-hover/card:text-blue-600 transition-colors">
                <Building2 className="w-5 h-5" />
            </div>
            <div>
                <div className="font-bold text-sm text-slate-800 group-hover/card:text-blue-600 transition-colors">{linkedCompany.name}</div>
                <div className="text-xs text-slate-500">{linkedCompany.website || 'No website'}</div>
            </div>
        </div>
        <div className="mt-3 space-y-2">
            {linkedCompany.email && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Mail className="w-3 h-3" /> {linkedCompany.email}
                </div>
            )}
            {linkedCompany.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="w-3 h-3" /> {linkedCompany.phone}
                </div>
            )}
        </div>
      </div>
    );
  }

  // No linked company - Show Add/Link UI
  if (!isLinking) {
      return (
          <div className="border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <Building2 className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500 font-medium mb-3">No company associated</p>
              <button 
                onClick={() => setIsLinking(true)}
                className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center gap-2"
              >
                  <Plus className="w-3 h-3" /> Add Company
              </button>
          </div>
      );
  }

  // Linking Interface
  const handleLink = (company: any) => {
      onUpdate(contact.id, { relatedCompanyId: company.id, company: company.name });
      setIsLinking(false);
      setSearchQuery('');
  };

  return (
      <div className="border border-slate-200 rounded-xl p-4 bg-white">
          <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Add Company</h3>
              <button onClick={() => setIsLinking(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          
          <div className="flex bg-slate-100 p-0.5 rounded-lg mb-3">
              <button 
                onClick={() => setMode('existing')}
                className={`flex-1 text-[10px] font-bold uppercase py-1.5 rounded-md transition-all ${mode === 'existing' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  Existing
              </button>
              <button 
                onClick={() => setMode('new')}
                className={`flex-1 text-[10px] font-bold uppercase py-1.5 rounded-md transition-all ${mode === 'new' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  New
              </button>
          </div>

          {mode === 'existing' ? (
              <div className="relative">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-500"
                        placeholder="Search existing companies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                      />
                  </div>
                  {searchQuery && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                          {filteredCompanies.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center">No companies found</div>
                          ) : (
                              filteredCompanies.map((c: any) => (
                                  <div 
                                    key={c.id}
                                    onClick={() => handleLink(c)}
                                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2 border-b border-slate-50 last:border-0"
                                  >
                                      <Building2 className="w-4 h-4 text-slate-400" />
                                      <span className="text-sm text-slate-700 font-medium">{c.name}</span>
                                  </div>
                              ))
                          )}
                      </div>
                  )}
              </div>
          ) : (
              <div className="text-center py-2">
                  <p className="text-xs text-slate-500 mb-3">Create a new company record and automatically link it to this contact.</p>
                  <button 
                    onClick={onOpenCreateCompanyModal}
                    className="w-full bg-blue-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                      <PlusCircle className="w-4 h-4" /> Open Company Creator
                  </button>
              </div>
          )}
      </div>
  );
};

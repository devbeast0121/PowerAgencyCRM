
import React, { useState } from 'react';
import { User as UserIcon, Building2, Linkedin, DownloadCloud, Camera, Mail, Phone, Globe, Calendar, MapPin, AlignLeft, Tag, PlusCircle, Filter, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { DynamicInputList } from './Shared';
import { resizeImage } from '../utils';

export const ContactForm = ({ onSubmit, onCancel, existingCompanies, allContacts, tagGroups, onAddNewGroup, initialData, customFields = [], pipelines = [] }: any) => {
  const [formData, setFormData] = useState({
    type: initialData?.type || 'Person',
    name: initialData?.name || '',
    emails: initialData?.emails || (initialData?.email ? [{ type: 'Work', value: initialData.email }] : [{ type: 'Work', value: '' }]),
    phones: initialData?.phones || (initialData?.phone ? [{ type: 'Mobile', value: initialData.phone }] : [{ type: 'Mobile', value: '' }]),
    linkedin: initialData?.linkedin || '',
    website: initialData?.website || '',
    birthday: initialData?.birthday || '',
    background: initialData?.background || '',
    photo: initialData?.photo || '',
    company: initialData?.company || '',
    relatedCompanyId: initialData?.relatedCompanyId || '',
    title: initialData?.title || '',
    status: initialData?.status || 'Lead',
    lifecycleStage: initialData?.lifecycleStage || 'Lead',
    pipelineId: initialData?.pipelineId || (pipelines.length > 0 ? pipelines[0].id : ''), // Default pipeline
    groups: initialData?.groups || [],
    address: initialData?.address || '',
    customData: initialData?.customData || {}
  });

  // Filter custom fields based on current contact type
  const activeCustomFields = customFields.filter((f: any) => 
    !f.scope || f.scope === 'Both' || f.scope === formData.type
  );

  const handlePhotoUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file);
        setFormData({ ...formData, photo: resized });
      } catch (err) {
        console.error("Error processing image.");
      }
    }
  };

  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const parseLinkedInSlug = (url: string): string => {
    if (!url.includes('/in/')) return '';
    const parts = url.split('/in/');
    if (!parts[1]) return '';
    let slug = parts[1].split('/')[0].split('?')[0]; // Remove trailing slash and query params
    // Remove trailing LinkedIn hex ID suffix (e.g., "-b58a2b1a5", "-3a7b8c9d0")
    // These are typically 8-12 hex chars at the end after a hyphen
    slug = slug.replace(/-[a-f0-9]{6,}$/i, '');
    // Remove any trailing numbers-only segment (e.g., "-123456789")
    slug = slug.replace(/-\d{4,}$/, '');
    // Convert hyphens to spaces and capitalize
    return slug.replace(/-/g, ' ').split(' ')
        .filter(s => s.length > 0)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
        .join(' ');
  };

  const handleFetchInfo = async () => {
    if (!formData.linkedin) return;
    setIsFetchingInfo(true);
    setFetchError(null);

    const parsedName = parseLinkedInSlug(formData.linkedin);

    // --- Try Proxycurl first (real LinkedIn data) ---
    try {
        const proxyRes = await fetch('https://zoom-proxy.illia-2de.workers.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'linkedinProfile', linkedinUrl: formData.linkedin })
        });
        if (proxyRes.ok) {
            const p = await proxyRes.json();
            if (p.full_name || p.first_name) {
                const updated: any = {};
                const fullName = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
                if (fullName && !formData.name) updated.name = fullName;
                if (p.occupation && !formData.title) updated.title = p.occupation;
                if (p.experiences?.[0]?.company && !formData.company) updated.company = p.experiences[0].company;
                if (p.summary && !formData.background) updated.background = p.summary;
                if (p.city || p.country_full_name) updated.location = [p.city, p.country_full_name].filter(Boolean).join(', ');
                if (p.profile_pic_url && !formData.photo) updated.photo = p.profile_pic_url;
                const email = p.personal_emails?.[0] || p.personal_email || p.work_email;
                if (email && (!formData.emails || !formData.emails.some((e: any) => e.value))) {
                    updated.emails = [{ type: 'Work', value: email }];
                }
                setFormData(prev => ({ ...prev, ...updated }));
                setIsFetchingInfo(false);
                return;
            }
        }
    } catch (e: any) {
        console.warn('Proxycurl fetch failed:', e?.message || e);
    }

    // --- Fallback: Gemini AI with Google Search grounding ---
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        if (parsedName) setFormData(prev => ({...prev, name: prev.name || parsedName}));
        else setFetchError('Could not fetch profile info.');
        setIsFetchingInfo(false);
        return;
    }

    const ai = new GoogleGenAI({ apiKey });
    let text = '';
    let searchWorked = false;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Search for this LinkedIn profile and find the person's real professional information: ${formData.linkedin}

The LinkedIn URL slug suggests the name might be "${parsedName}".

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{"name": "Full name", "title": "Current job title", "company": "Current company name", "background": "One sentence professional summary"}

Use empty string "" for any field you cannot verify.`,
            config: { tools: [{ googleSearch: {} }] },
        });
        text = (response.text || '').replace(/```json|```/g, '').trim();
        searchWorked = true;
    } catch (e1: any) {
        console.warn('Search grounding failed:', e1?.message || e1);
    }

    if (!searchWorked) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `I have a LinkedIn profile URL: ${formData.linkedin}
The URL slug is "${parsedName}". Based on what you know, provide professional info about this person.

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{"name": "Full name (best guess from URL slug)", "title": "", "company": "", "background": ""}

For name, just clean up the URL slug "${parsedName}" into a proper name. Leave other fields empty if unsure.`,
            });
            text = (response.text || '').replace(/```json|```/g, '').trim();
        } catch (e2: any) {
            console.error('Gemini fallback also failed:', e2?.message || e2);
        }
    }

    if (text) {
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found');
            const data = JSON.parse(jsonMatch[0]);
            const updated: any = {};
            if (data.name && !formData.name) updated.name = data.name;
            else if (parsedName && !formData.name) updated.name = parsedName;
            if (data.title && !formData.title) updated.title = data.title;
            if (data.company && !formData.company) updated.company = data.company;
            if (data.background && !formData.background) updated.background = data.background;
            if (Object.keys(updated).length > 0) {
                setFormData(prev => ({ ...prev, ...updated }));
                if (!searchWorked) setFetchError('Name set from URL. Job/company may need manual entry.');
            } else {
                setFetchError('All fields already filled.');
            }
        } catch (parseErr) {
            console.error('JSON parse error:', parseErr, text);
            if (parsedName && !formData.name) setFormData(prev => ({...prev, name: parsedName}));
            setFetchError('Name set from URL. Could not parse additional info.');
        }
    } else {
        if (parsedName) {
            setFormData(prev => ({...prev, name: prev.name || parsedName}));
            setFetchError('API unavailable. Name parsed from URL.');
        } else {
            setFetchError('Could not fetch profile info.');
        }
    }

    setIsFetchingInfo(false);
  };

  const toggleGroup = (group: string) => {
    const current = formData.groups || [];
    if (current.includes(group)) {
      setFormData({...formData, groups: current.filter((g: string) => g !== group)});
    } else {
      setFormData({...formData, groups: [...current, group]});
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
      setFormData(prev => ({
          ...prev,
          customData: {
              ...prev.customData,
              [fieldId]: value
          }
      }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedValue = e.target.value;
      // Value format: "pipelineId|stageName"
      if (selectedValue.includes('|')) {
          const [pid, stage] = selectedValue.split('|');
          
          // Find the pipeline stage config to set lifecycleStage
          // Safety check: ensure pipelines is an array
          const safePipelines = Array.isArray(pipelines) ? pipelines : [];
          const pipeline = safePipelines.find((p: any) => p.id === pid);
          let lifecycleStage = formData.lifecycleStage || 'Lead'; // Default to existing
          
          if (pipeline) {
              const stageConfig = pipeline.stages.find((s: any) => {
                  if (typeof s === 'string') return s === stage;
                  return s.name === stage;
              });
              
              if (stageConfig && typeof stageConfig === 'object') {
                  if (stageConfig.category !== 'No Change') {
                      lifecycleStage = stageConfig.category;
                  }
                  // If 'No Change', we leave lifecycleStage as is
              } else {
                  // Legacy fallback
                  if (stage === 'Closed') lifecycleStage = 'Customer';
                  else if (stage === 'Lost') lifecycleStage = 'Lost';
                  // else keep existing if possible, or default to Lead
              }
          }

          setFormData({ ...formData, pipelineId: pid, status: stage, lifecycleStage });
      } else {
          // Fallback legacy behavior
          setFormData({ ...formData, status: selectedValue });
      }
  };

  const [submitError, setSubmitError] = useState<string | null>(null);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const trimmedName = formData.name.trim();
    if (!trimmedName) return;
    const cleanedEmails = formData.emails.filter((e: any) => e.value.trim() !== '');
    const cleanedPhones = formData.phones.filter((p: any) => p.value.trim() !== '');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmail = cleanedEmails.find((e: any) => !emailRegex.test(e.value.trim()));
    if (invalidEmail) { setSubmitError(`Invalid email: ${invalidEmail.value}`); return; }

    // Validate phone format (digits, spaces, dashes, parens, plus, dots — min 7 digits)
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
    const digitCount = (v: string) => (v.match(/\d/g) || []).length;
    const invalidPhone = cleanedPhones.find((p: any) => {
      const v = p.value.trim();
      return !phoneRegex.test(v) || digitCount(v) < 7;
    });
    if (invalidPhone) { setSubmitError(`Invalid phone number: ${invalidPhone.value}`); return; }

    // Validate website format
    if (formData.website.trim()) {
      const websiteRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;
      if (!websiteRegex.test(formData.website.trim())) {
        setSubmitError('Invalid website URL. Example: example.com or https://example.com'); return;
      }
    }

    // Validate birthday — must be in the past (up to yesterday)
    if (formData.birthday) {
      const bday = new Date(formData.birthday);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      if (bday > yesterday) { setSubmitError('Birthday must be yesterday or earlier.'); return; }
    }

    const cleanedData = {
      ...formData,
      name: trimmedName,
      emails: cleanedEmails,
      phones: cleanedPhones
    };
    // Ensure pipelineId is set if missing (default to first pipeline)
    if (!cleanedData.pipelineId && pipelines.length > 0) {
        cleanedData.pipelineId = pipelines[0].id;
    }
    onSubmit(cleanedData);
  };

  const handleCompanySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const companyId = e.target.value;
    const company = existingCompanies.find((c: any) => c.id === companyId);
    setFormData({ ...formData, relatedCompanyId: companyId, company: company ? company.name : '' });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6">
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg cursor-pointer transition-all text-sm font-bold ${formData.type === 'Person' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><input type="radio" name="type" value="Person" checked={formData.type === 'Person'} onChange={() => setFormData({...formData, type: 'Person'})} className="hidden" /><UserIcon className="w-4 h-4" /> Person</label>
        <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg cursor-pointer transition-all text-sm font-bold ${formData.type === 'Company' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><input type="radio" name="type" value="Company" checked={formData.type === 'Company'} onChange={() => setFormData({...formData, type: 'Company'})} className="hidden" /><Building2 className="w-4 h-4" /> Company</label>
      </div>
      <div className="mb-6"><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">LinkedIn Profile</label><div className="flex flex-col sm:flex-row gap-2"><div className="relative flex-1"><Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700" /><input className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})} placeholder="URL..." /></div><button type="button" onClick={handleFetchInfo} disabled={isFetchingInfo || !formData.linkedin} className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 transition-colors disabled:opacity-50">{isFetchingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />} {isFetchingInfo ? 'Fetching...' : 'Fetch Info'}</button></div>{fetchError && <p className="text-xs text-amber-600 mt-1">{fetchError}</p>}</div>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-8 text-center sm:text-left">
        <div className="shrink-0"><label className="w-24 h-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all overflow-hidden relative group">{formData.photo ? (<img src={formData.photo} className="w-full h-full object-cover" />) : (<><Camera className="w-6 h-6 text-slate-300 mb-1 group-hover:text-emerald-500" /><span className="text-[10px] text-slate-400 uppercase font-bold group-hover:text-emerald-500">Photo</span></>)}<input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} /></label></div>
        <div className="flex-1 w-full"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{formData.type === 'Company' ? 'Company Name *' : 'Full Name *'}</label><input required className="w-full text-xl sm:text-2xl font-bold border-b-2 border-slate-100 focus:border-emerald-500 outline-none py-2 bg-transparent placeholder-slate-200 transition-colors" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={formData.type === 'Company' ? "Ex: Acme Corp" : "Ex: Jane Doe"} /></div>
      </div>
      <div className="space-y-5">
        {formData.type === 'Person' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1"><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Job Title</label><input className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: CEO" /></div>
            <div className="col-span-1"><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Affiliation</label><select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" value={formData.relatedCompanyId} onChange={handleCompanySelect}><option value="">-- No link --</option>{existingCompanies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
        )}
        <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Addresses</label><DynamicInputList items={formData.emails} setItems={(i: any) => setFormData({...formData, emails: i})} types={['Work', 'Personal', 'Other']} placeholder="email@example.com" icon={Mail} /></div>
        <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone Numbers</label><DynamicInputList items={formData.phones} setItems={(i: any) => setFormData({...formData, phones: i})} types={['Mobile', 'Work', 'Home', 'Other']} placeholder="(555) 000-0000" icon={Phone} /></div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4`}>
           <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Website</label><div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} placeholder="example.com" /></div></div>
           {formData.type === 'Person' && (<div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Birthday</label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="date" className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})} /></div></div>)}
        </div>
        <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Address</label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="123 Main St..." /></div></div>
        
        {/* Custom Fields Rendering */}
        {activeCustomFields.length > 0 && (
            <div className="pt-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">Additional Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeCustomFields.map((field: any) => (
                        <div key={field.id} className="col-span-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{field.label}</label>
                            {field.type === 'Dropdown' ? (
                                <select 
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                                    value={formData.customData[field.id] || ''}
                                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                >
                                    <option value="">Select...</option>
                                    {field.options?.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            ) : field.type === 'Date' ? (
                                <input 
                                    type="date"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    value={formData.customData[field.id] || ''}
                                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                />
                            ) : (
                                <input 
                                    type={field.type === 'Number' ? 'number' : 'text'}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    value={formData.customData[field.id] || ''}
                                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                    placeholder={field.label}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bio / Background</label><div className="relative"><AlignLeft className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" /><textarea className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" rows={2} value={formData.background} onChange={e => setFormData({...formData, background: e.target.value})} placeholder="Met at..." /></div></div>
        
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mt-6">
           <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Organization</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             <div><label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Select Group</label><div className="space-y-2 max-h-40 overflow-y-auto px-1">{tagGroups.map((g: any) => (<label key={g.id} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer hover:text-emerald-600 transition-colors"><input type="checkbox" checked={(formData.groups || []).includes(g.name)} onChange={() => toggleGroup(g.name)} className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" /><span className={`w-2 h-2 rounded-full ${g.color.split(' ')[0]}`}></span> {g.name}</label>))} {tagGroups.length === 0 && <p className="text-[10px] text-slate-400 italic">No groups defined.</p>}</div><button type="button" onClick={onAddNewGroup} className="mt-4 text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5"><PlusCircle className="w-3.5 h-3.5" /> Create New</button></div>
             <div>
                 <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-2"><Filter className="w-3.5 h-3.5" /> Pipeline Status</label>
                 <select 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs font-bold uppercase tracking-wider" 
                    value={formData.pipelineId ? `${formData.pipelineId}|${formData.status}` : formData.status}
                    onChange={handleStatusChange}
                 >
                    {pipelines.length > 0 ? (
                        pipelines.map((p: any) => (
                            <optgroup key={p.id} label={p.name}>
                                {p.stages.map((s: any) => {
                                    const sName = typeof s === 'string' ? s : s.name;
                                    return <option key={`${p.id}-${sName}`} value={`${p.id}|${sName}`}>{sName}</option>
                                })}
                            </optgroup>
                        ))
                    ) : (
                        // Fallback
                        ['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Closed', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)
                    )}
                 </select>
             </div>
           </div>
        </div>
        {submitError && <p className="text-sm text-red-500 font-medium">{submitError}</p>}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100"><button type="button" onClick={onCancel} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Discard</button><button type="submit" className="px-8 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-sm shadow-lg shadow-slate-900/10 active:scale-[0.98] transition-all">Save {formData.type}</button></div>
      </div>
    </form>
  );
};

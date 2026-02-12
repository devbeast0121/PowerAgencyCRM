import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, ChevronRight, Loader2, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

export const ImportModal = ({ isOpen, onClose, onImport, customFields = [], inline = false }: any) => {
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<'upload' | 'mapping' | 'importing'>('upload');
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<any[]>([]);
    const [mapping, setMapping] = useState<any>({});
    const [importProgress, setImportProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const CRM_FIELDS = [
        { id: 'type', label: 'Type (Contact vs Company)' },
        { id: 'firstName', label: 'First Name' },
        { id: 'lastName', label: 'Last Name' },
        { id: 'name', label: 'Full Name (if single column)' },
        { id: 'email', label: 'Primary Email' },
        { id: 'phone', label: 'Primary Phone' },
        { id: 'company', label: 'Company Name' },
        { id: 'title', label: 'Job Title' },
        { id: 'website', label: 'Website' },
        { id: 'address', label: 'Address' },
        { id: 'background', label: 'Profile Bio / Background' },
        { id: 'notes', label: 'History / Activity Notes (will show in Timeline)' },
        ...customFields.map((cf: any) => ({ id: `cf_${cf.id}`, label: `Custom: ${cf.label}` }))
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (json.length > 0) {
                const sheetHeaders = (json[0] as string[]).filter(h => h != null);
                const sheetRows = XLSX.utils.sheet_to_json(worksheet);
                setHeaders(sheetHeaders);
                setRows(sheetRows);
                
                // Auto-detect mappings
                const initialMapping: any = {};
                sheetHeaders.forEach(header => {
                    const h = header.toLowerCase().replace(/[^a-z]/g, '');
                    if (h === 'type') initialMapping['type'] = header;
                    if (h === 'firstname' || h === 'first') initialMapping['firstName'] = header;
                    if (h === 'lastname' || h === 'last') initialMapping['lastName'] = header;
                    if (h === 'name' || h === 'fullname') initialMapping['name'] = header;
                    if (h.includes('email')) initialMapping['email'] = header;
                    if (h.includes('phone') || h.includes('mobile')) initialMapping['phone'] = header;
                    if (h.includes('company') || h.includes('employer')) initialMapping['company'] = header;
                    if (h.includes('title') || h.includes('role')) initialMapping['title'] = header;
                    if (h.includes('site') || h.includes('web')) initialMapping['website'] = header;
                    if (h.includes('address') || h.includes('location')) initialMapping['address'] = header;
                    if (h.includes('note') || h.includes('history')) initialMapping['notes'] = header;
                    if (h.includes('bio') || h.includes('background')) initialMapping['background'] = header;
                });
                setMapping(initialMapping);
                setStep('mapping');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        setStep('importing');
        const contactsToImport = [];
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // Determine type
            const rawType = mapping['type'] ? String(row[mapping['type']]).toLowerCase() : '';
            let contactType = 'Person';
            if (rawType.includes('company')) {
                contactType = 'Company';
            } else if (rawType.includes('contact')) {
                contactType = 'Person';
            } else {
                contactType = mapping['company'] && !mapping['firstName'] && !mapping['name'] ? 'Company' : 'Person';
            }

            // Construct name
            let fullName = row[mapping['name']] || '';
            if (!fullName && (row[mapping['firstName']] || row[mapping['lastName']])) {
                fullName = `${row[mapping['firstName']] || ''} ${row[mapping['lastName']] || ''}`.trim();
            }
            if (!fullName) fullName = row[mapping['company']] || 'Unnamed Contact';

            const contactData: any = {
                type: contactType,
                name: fullName,
                emails: row[mapping['email']] ? [{ type: 'Work', value: row[mapping['email']] }] : [],
                phones: row[mapping['phone']] ? [{ type: 'Mobile', value: String(row[mapping['phone']]) }] : [],
                company: row[mapping['company']] || '',
                title: row[mapping['title']] || '',
                website: row[mapping['website']] || '',
                address: row[mapping['address']] || '',
                background: row[mapping['background']] || '',
                initialNote: row[mapping['notes']] || '', // Special field to trigger activity note creation
                status: 'Lead',
                lifecycleStage: 'Lead',
                customData: {}
            };

            // Map Custom Fields
            customFields.forEach((cf: any) => {
                const mappedHeader = mapping[`cf_${cf.id}`];
                if (mappedHeader && row[mappedHeader]) {
                    contactData.customData[cf.id] = row[mappedHeader];
                }
            });

            contactsToImport.push(contactData);
        }

        setImportProgress(50);
        await onImport(contactsToImport);
        setImportProgress(100);
        
        setTimeout(() => {
            if (onClose) onClose();
            setStep('upload');
            setRows([]);
            setHeaders([]);
            setMapping({});
            setImportProgress(0);
        }, 800);
    };

    if (!isOpen && !inline) return null;

    const content = (
        <div className={`bg-white rounded-2xl flex flex-col ${inline ? 'h-full' : 'shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh]'}`}>
            {!inline && (
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Import Contacts</h3>
                            <p className="text-xs text-slate-500">XLSX Record Importer</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            <div className={`flex-1 overflow-y-auto ${inline ? '' : 'p-6'}`}>
                {step === 'upload' && (
                    <div 
                        className="border-2 border-dashed border-slate-200 rounded-2xl py-16 flex flex-col items-center justify-center gap-4 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input type="file" className="hidden" accept=".xlsx,.xls,.csv" ref={fileInputRef} onChange={handleFileChange} />
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-500" />
                        </div>
                        <div className="text-center px-4">
                            <p className="font-bold text-slate-700">Click to upload Less Annoying CRM export</p>
                            <p className="text-sm text-slate-400">Excel files (.xlsx, .xls) are supported</p>
                        </div>
                    </div>
                )}

                {step === 'mapping' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-700">
                                <p className="font-bold mb-1">Found {rows.length} records.</p>
                                Match your spreadsheet columns to CRM fields below. Note: Columns mapped to "History / Notes" will appear in the contact's activity timeline.
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {CRM_FIELDS.map(field => (
                                <div key={field.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 group hover:border-emerald-300 hover:bg-white transition-all">
                                    <div className="sm:w-1/3">
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                            {field.label}
                                            {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                    </div>
                                    <div className="flex-1">
                                        <select 
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                            value={mapping[field.id] || ''}
                                            onChange={(e) => setMapping({...mapping, [field.id]: e.target.value})}
                                        >
                                            <option value="">-- Ignore Field --</option>
                                            {headers.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'importing' && (
                    <div className="flex flex-col items-center justify-center py-12 gap-6">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="64" cy="64" r="58" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                                <circle 
                                    cx="64" cy="64" r="58" fill="none" stroke="#10b981" strokeWidth="8" 
                                    strokeDasharray={364.4} 
                                    strokeDashoffset={364.4 - (364.4 * importProgress) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-300"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-2xl font-bold text-slate-800">{importProgress}%</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <h4 className="font-bold text-slate-800">Processing Import...</h4>
                            <p className="text-sm text-slate-500">Saving {rows.length} contacts and their history.</p>
                        </div>
                    </div>
                )}
            </div>

            {step === 'mapping' && (
                <div className={`p-6 border-t bg-slate-50 flex justify-end gap-3 ${inline ? 'mt-6' : ''}`}>
                    <button onClick={() => setStep('upload')} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">Back</button>
                    <button 
                        onClick={handleImport}
                        disabled={!mapping['name'] && !mapping['company'] && !mapping['firstName']}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-[0.98]"
                    >
                        Import {rows.length} Contacts <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );

    if (inline) return content;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            {content}
        </div>
    );
};

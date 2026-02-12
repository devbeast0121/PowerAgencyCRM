import React, { useState } from 'react';
import { MinusCircle, PlusCircle, ExternalLink, X, Edit3, Trash2, Check } from 'lucide-react';
import { getFavicon } from '../utils';

export const StatusBadge = ({ status }: { status: string }) => {
  const colors: any = { 'Lead': 'bg-blue-100 text-blue-700', 'Contacted': 'bg-indigo-100 text-indigo-700', 'Proposal': 'bg-amber-100 text-amber-700', 'Negotiation': 'bg-purple-100 text-purple-700', 'Closed': 'bg-emerald-100 text-emerald-700', 'Lost': 'bg-slate-100 text-slate-600' };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
};

export const DynamicInputList = ({ items, setItems, types, placeholder, icon: Icon }: any) => {
  const handleChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };
  return (
    <div className="space-y-2">
      {items.map((item: any, index: number) => (
        <div key={index} className="flex gap-2">
          <div className="relative flex items-center justify-center bg-slate-100 rounded-lg w-10 shrink-0 text-slate-500"><Icon className="w-4 h-4" /></div>
          <select className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={item.type} onChange={(e) => handleChange(index, 'type', e.target.value)}>{types.map((t: string) => <option key={t} value={t}>{t}</option>)}</select>
          <input className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder={placeholder} value={item.value} onChange={(e) => handleChange(index, 'value', e.target.value)} />
          <button type="button" onClick={() => items.length > 1 ? setItems(items.filter((_: any, i: number) => i !== index)) : handleChange(index, 'value', '')} className="text-slate-400 hover:text-red-500 p-2"><MinusCircle className="w-5 h-5" /></button>
        </div>
      ))}
      <button type="button" onClick={() => setItems([...items, { type: types[0], value: '' }])} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 ml-12"><PlusCircle className="w-4 h-4" /> Add another</button>
    </div>
  );
};

export const WidgetItem = ({ widget, onUpdate, onDelete }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [name, setName] = useState(widget.name);
    const [url, setUrl] = useState(widget.url);

    const handleSave = () => {
        onUpdate(widget.id, { name, url });
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-2">
                <input 
                    className="w-full text-xs p-2 border rounded" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Name"
                />
                <input 
                    className="w-full text-xs p-2 border rounded" 
                    value={url} 
                    onChange={e => setUrl(e.target.value)} 
                    placeholder="URL"
                />
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="p-1 text-slate-500 hover:bg-slate-200 rounded"><X className="w-3 h-3" /></button>
                    <button onClick={handleSave} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-3 h-3" /></button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 group">
             <a href={widget.url.startsWith('http') ? widget.url : `https://${widget.url}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors min-w-0">
                <img src={getFavicon(widget.url)} alt="" className="w-4 h-4 rounded-sm shrink-0" onError={(e: any) => e.target.src = 'https://via.placeholder.com/16'} />
                <span className="text-sm font-medium text-slate-700 truncate flex-1">{widget.name}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isDeleting ? (
                    <div className="flex flex-col gap-1">
                        <button onClick={() => onDelete(widget.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Confirm"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setIsDeleting(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded" title="Cancel"><X className="w-3 h-3" /></button>
                    </div>
                ) : (
                    <>
                        <button onClick={() => setIsEditing(true)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => setIsDeleting(true)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded"><Trash2 className="w-3 h-3" /></button>
                    </>
                )}
            </div>
        </div>
    );
};

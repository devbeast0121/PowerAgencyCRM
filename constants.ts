import { 
  FileText, Mail, Phone, Users, CheckSquare 
} from 'lucide-react';

export const GROUP_COLORS = [
  { name: 'Slate', bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-300' },
  { name: 'Red', bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300' },
  { name: 'Orange', bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-300' },
  { name: 'Amber', bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-300' },
  { name: 'Green', bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  { name: 'Blue', bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-300' },
  { name: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-300' },
  { name: 'Purple', bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-300' },
  { name: 'Pink', bg: 'bg-pink-100', text: 'text-pink-700', ring: 'ring-pink-300' },
];

export const ACTIVITY_STYLES: any = {
  'Note': { bg: 'bg-slate-100', text: 'text-slate-600', icon: FileText, border: 'border-slate-200' },
  'Email': { bg: 'bg-red-100', text: 'text-red-600', icon: Mail, border: 'border-red-200' },
  'Call': { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: Phone, border: 'border-emerald-200' },
  'Meeting': { bg: 'bg-purple-100', text: 'text-purple-600', icon: Users, border: 'border-purple-200' },
  'Task': { bg: 'bg-orange-100', text: 'text-orange-600', icon: CheckSquare, border: 'border-orange-200' },
};

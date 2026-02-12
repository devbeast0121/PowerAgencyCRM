
import React from 'react';
import { Layout, Users, Layers, Filter, CheckSquare, Settings, BarChart3, Calendar, LogOut, Mail, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth, signOut } from '../firebase';

export const Sidebar = ({ currentView, setView, setFilter, onClose, isCollapsed, onToggleCollapse }: any) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'contacts', label: 'Contacts', icon: Users, action: () => setFilter('All') },
    { id: 'groups', label: 'Groups', icon: Layers },
    { id: 'pipeline', label: 'Pipeline', icon: Filter },
    { id: 'todo', label: 'To Do', icon: CheckSquare }, 
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const handleNavClick = (item: any) => {
    setView(item.id);
    if (item.action) item.action();
    if (onClose) onClose();
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 transition-all duration-300 ease-in-out relative z-30`}>
      {/* Header */}
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} transition-all duration-300`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <Layout className="w-6 h-6 text-emerald-500 shrink-0" />
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-white whitespace-nowrap animate-in fade-in duration-500">
              SimpleCRM
            </h1>
          )}
        </div>
        
        {/* Mobile Close Button (only shows in drawer mode on mobile) */}
        <button onClick={onClose} className="md:hidden p-1 text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        {/* Desktop Collapse Toggle Button */}
        <button 
          onClick={onToggleCollapse}
          className="hidden md:flex absolute -right-3 top-7 w-6 h-6 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-full items-center justify-center shadow-lg transition-transform hover:scale-110 z-40"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar pt-2">
        {navItems.map((item) => (
          <button 
            key={item.id} 
            onClick={() => handleNavClick(item)} 
            title={isCollapsed ? item.label : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg transition-all duration-200 ${currentView === item.id ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <item.icon className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} shrink-0`} />
            {!isCollapsed && (
              <span className="font-medium whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          title={isCollapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200`}
        >
          <LogOut className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} shrink-0`} />
          {!isCollapsed && <span className="font-medium whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">Sign Out</span>}
        </button>
      </div>
    </div>
  );
};

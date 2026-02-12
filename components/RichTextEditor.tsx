
import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, Italic, Underline, Undo, Redo, 
  List, ListOrdered, Check, X, Palette, Link as LinkIcon,
  ChevronDown, Type, AlignLeft
} from 'lucide-react';

const FONTS = [
    { label: 'Sans Serif', value: 'Arial, sans-serif' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Fixed Width', value: 'Courier New, monospace' },
    { label: 'Wide', value: 'Verdana, sans-serif' },
    { label: 'Narrow', value: 'Arial Narrow, sans-serif' },
    { label: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
    { label: 'Garamond', value: 'Garamond, serif' },
    { label: 'Tahoma', value: 'Tahoma, sans-serif' },
    { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
];

export const RichTextEditor = ({ value, onChange, placeholder, onSubmit, minHeightClass = "min-h-[150px]", className }: any) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastValueRef = useRef<string>(value);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [showFontMenu, setShowFontMenu] = useState(false);
    const [currentFontLabel, setCurrentFontLabel] = useState('Sans Serif');
    const [linkUrl, setLinkUrl] = useState('');
    const savedRange = useRef<Range | null>(null);
    const fontMenuRef = useRef<HTMLDivElement>(null);

    // Initial load and external sync
    useEffect(() => {
        if (editorRef.current) {
            const currentHTML = editorRef.current.innerHTML;
            if (value !== currentHTML && value !== lastValueRef.current) {
                editorRef.current.innerHTML = value || '';
                lastValueRef.current = value || '';
            }
        }
    }, [value]);

    useEffect(() => {
        try {
            document.execCommand('styleWithCSS', false, 'false');
            document.execCommand('defaultParagraphSeparator', false, 'div');
        } catch (e) {}

        const handleClickOutside = (event: MouseEvent) => {
            if (fontMenuRef.current && !fontMenuRef.current.contains(event.target as Node)) {
                setShowFontMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const execCmd = (command: string, arg: string | undefined = undefined) => {
        document.execCommand(command, false, arg);
        editorRef.current?.focus();
        handleInput();
    };

    const handleInput = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            const cleanHtml = (html === '<br>' || html === '<div><br></div>') ? '' : html;
            lastValueRef.current = cleanHtml;
            onChange(cleanHtml);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) {
            e.preventDefault();
            onSubmit();
        }
    };

    const confirmLink = () => {
        setShowLinkInput(false);
        const selection = window.getSelection();
        if (selection && savedRange.current) {
            selection.removeAllRanges();
            selection.addRange(savedRange.current);
        } else if (editorRef.current) {
            editorRef.current.focus();
        }

        if (linkUrl && linkUrl !== 'https://') {
            document.execCommand('createLink', false, linkUrl);
            handleInput();
        }
        savedRange.current = null;
        setLinkUrl('');
    };

    const cancelLink = () => {
        setShowLinkInput(false);
        savedRange.current = null;
        setLinkUrl('');
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        execCmd('foreColor', e.target.value);
    };

    const selectFont = (font: { label: string, value: string }) => {
        execCmd('fontName', font.value);
        setCurrentFontLabel(font.label);
        setShowFontMenu(false);
    };

    return (
        <div className={`flex flex-col flex-1 h-full relative ${className || ''}`}>
            {/* Editor Body - No internal border, looks part of the sheet */}
            <div
                ref={editorRef}
                contentEditable
                className={`flex-1 w-full p-4 text-sm outline-none overflow-y-auto text-slate-700 bg-white empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline ${minHeightClass}`}
                data-placeholder={placeholder}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                suppressContentEditableWarning={true}
            />

            {/* Floating GUI Pill at the bottom */}
            <div className="flex justify-center px-4 pb-4">
                <div className="flex items-center gap-1 p-1 bg-[#f0f4f9] border border-slate-200 rounded-2xl shadow-sm overflow-visible flex-wrap max-w-full">
                    {showLinkInput ? (
                        <div className="flex items-center gap-2 px-2 py-1 min-w-[200px]">
                            <input 
                                autoFocus
                                type="text" 
                                className="flex-1 text-xs border border-slate-300 rounded px-2 py-1 outline-none"
                                placeholder="https://..."
                                value={linkUrl}
                                onChange={e => setLinkUrl(e.target.value)}
                            />
                            <button onClick={confirmLink} className="p-1 text-emerald-600 rounded hover:bg-emerald-50"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={cancelLink} className="p-1 text-slate-400 rounded hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('undo')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><Undo className="w-4 h-4" /></button>
                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('redo')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><Redo className="w-4 h-4" /></button>
                            </div>
                            
                            <div className="flex items-center gap-0.5 px-1 border-r border-slate-200 relative" ref={fontMenuRef}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowFontMenu(!showFontMenu)}
                                    className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded transition-colors ${showFontMenu ? 'bg-slate-200' : ''}`}
                                >
                                    <span className="truncate max-w-[80px]">{currentFontLabel}</span> <ChevronDown className="w-3 h-3" />
                                </button>
                                
                                {showFontMenu && (
                                    <div className="absolute bottom-full mb-2 left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-2 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Select Font</div>
                                        {FONTS.map(font => (
                                            <button
                                                key={font.label}
                                                onMouseDown={e => e.preventDefault()}
                                                onClick={() => selectFont(font)}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${currentFontLabel === font.label ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-700'}`}
                                                style={{ fontFamily: font.value }}
                                            >
                                                {font.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('bold')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-600 font-bold">B</button>
                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('italic')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-600 italic">I</button>
                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('underline')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-600 underline">U</button>
                                <div className="relative w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-600 cursor-pointer">
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold text-xs leading-none">A</span>
                                        <div className="w-3 h-0.5 bg-black mt-0.5" />
                                    </div>
                                    <input type="color" onChange={handleColorChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                </div>
                            </div>

                            <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
                                <button type="button" className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><AlignLeft className="w-4 h-4" /></button>
                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('insertUnorderedList')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><List className="w-4 h-4" /></button>
                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('insertOrderedList')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><ListOrdered className="w-4 h-4" /></button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, User, Mail, Loader2, Check, MapPin, Layout } from 'lucide-react';
import { db, appId, collection, addDoc, query, onSnapshot, serverTimestamp } from '../firebase';

export const BookingPublicPage = ({ userId, slug }: { userId: string; slug: string }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [bookingPage, setBookingPage] = useState<any>(null);
    const [eventTypes, setEventTypes] = useState<any[]>([]);
    const [scheduledEvents, setScheduledEvents] = useState<any[]>([]);
    const [selectedEventType, setSelectedEventType] = useState<any>(null);
    const [bookingDate, setBookingDate] = useState<Date | null>(null);
    const [bookingTime, setBookingTime] = useState<string | null>(null);
    const [inviteeName, setInviteeName] = useState('');
    const [inviteeEmail, setInviteeEmail] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());

    const defaultWeeklyHours: any = {
        'Mon': { active: true, start: '09:00', end: '17:00' },
        'Tue': { active: true, start: '09:00', end: '17:00' },
        'Wed': { active: true, start: '09:00', end: '17:00' },
        'Thu': { active: true, start: '09:00', end: '17:00' },
        'Fri': { active: true, start: '09:00', end: '17:00' },
        'Sat': { active: false, start: '09:00', end: '17:00' },
        'Sun': { active: false, start: '09:00', end: '17:00' },
    };

    // Load data from Firestore
    useEffect(() => {
        if (!userId) { setError('Invalid booking link.'); setLoading(false); return; }

        const basePath = ['artifacts', appId, 'users', userId];
        const unsubs: (() => void)[] = [];

        // Load booking pages
        const qPages = query(collection(db, ...basePath, 'booking_pages'));
        unsubs.push(onSnapshot(qPages, (snap: any) => {
            const pages = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            const match = pages.find((p: any) => p.slug === slug);
            if (match) setBookingPage(match);
            else setError('Booking page not found.');
            setLoading(false);
        }, () => { setError('Could not load booking page.'); setLoading(false); }));

        // Load event types
        const qTypes = query(collection(db, ...basePath, 'event_types'));
        unsubs.push(onSnapshot(qTypes, (snap: any) => {
            setEventTypes(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }, () => {}));

        // Load scheduled events (for conflict checking)
        const qEvents = query(collection(db, ...basePath, 'scheduled_events'));
        unsubs.push(onSnapshot(qEvents, (snap: any) => {
            setScheduledEvents(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }, () => {}));

        return () => unsubs.forEach(u => u());
    }, [userId, slug]);

    // Filter event types to only those included in the booking page
    const availableEventTypes = useMemo(() => {
        if (!bookingPage) return [];
        return eventTypes.filter(et => bookingPage.includedEventTypeIds?.includes(et.id));
    }, [bookingPage, eventTypes]);

    // Auto-select if only one event type
    useEffect(() => {
        if (availableEventTypes.length === 1 && !selectedEventType) {
            setSelectedEventType(availableEventTypes[0]);
        }
    }, [availableEventTypes, selectedEventType]);

    // Calendar generation
    const calendarDays = useMemo(() => {
        const year = calendarViewDate.getFullYear();
        const month = calendarViewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPad = firstDay.getDay();
        const days: (Date | null)[] = Array(startPad).fill(null);
        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(new Date(year, month, d));
        }
        return days;
    }, [calendarViewDate]);

    // Generate time slots for a given date
    const generateTimeSlots = (date: Date) => {
        if (!selectedEventType) return [];
        const weekly = selectedEventType.customAvailability?.weekly || defaultWeeklyHours;
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayConfig = weekly[dayName];
        if (!dayConfig || !dayConfig.active) return [];

        const slots: string[] = [];
        const duration = parseInt(selectedEventType.duration) || 30;
        const [startH, startM] = dayConfig.start.split(':').map(Number);
        const [endH, endM] = dayConfig.end.split(':').map(Number);
        let current = new Date(date);
        current.setHours(startH, startM, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(endH, endM, 0, 0);
        const now = new Date();
        if (date.toDateString() === now.toDateString() && current < now) {
            current = new Date(now);
            current.setMinutes(current.getMinutes() + (15 - (current.getMinutes() % 15)));
        }

        // Conflict checking
        const dailyConflicts = (scheduledEvents || [])
            .filter((e: any) => e.startTime)
            .map((e: any) => ({
                start: new Date(e.startTime.seconds * 1000),
                end: new Date((e.startTime.seconds * 1000) + (parseInt(e.duration || '30') * 60000))
            }))
            .filter((conf: any) => conf.start.toDateString() === date.toDateString());

        while (current.getTime() + duration * 60000 <= endOfDay.getTime()) {
            const slotStart = new Date(current);
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            const isConflicting = dailyConflicts.some((conf: any) =>
                slotStart < conf.end && slotEnd > conf.start
            );
            if (!isConflicting) {
                slots.push(current.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase());
            }
            current.setMinutes(current.getMinutes() + 15);
        }
        return slots;
    };

    const timeSlots = bookingDate ? generateTimeSlots(bookingDate) : [];

    const isDateAvailable = (date: Date) => {
        if (!selectedEventType) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) return false;
        const weekly = selectedEventType.customAvailability?.weekly || defaultWeeklyHours;
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        return weekly[dayName]?.active || false;
    };

    const [validationError, setValidationError] = useState<string | null>(null);

    const handleConfirm = async () => {
        if (!selectedEventType || !bookingDate || !bookingTime) return;
        setValidationError(null);

        // Trim inputs
        const trimmedName = inviteeName.trim();
        const trimmedEmail = inviteeEmail.trim().toLowerCase();
        if (!trimmedName) { setValidationError('Please enter your name.'); return; }
        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setValidationError('Please enter a valid email address.'); return; }

        if (isSubmitting) return; // Prevent double-click
        setIsSubmitting(true);
        try {
            // Parse time string back to a date
            const timeParts = bookingTime.match(/(\d+):(\d+)\s*(am|pm)/i);
            if (!timeParts) return;
            let hours = parseInt(timeParts[1]);
            const mins = parseInt(timeParts[2]);
            if (timeParts[3].toLowerCase() === 'pm' && hours !== 12) hours += 12;
            if (timeParts[3].toLowerCase() === 'am' && hours === 12) hours = 0;

            const startTime = new Date(bookingDate);
            startTime.setHours(hours, mins, 0, 0);
            const duration = parseInt(selectedEventType.duration || '30');
            const endTime = new Date(startTime.getTime() + duration * 60000);

            // Re-check for conflicts right before booking (race condition prevention)
            const isStillAvailable = !scheduledEvents.some((e: any) => {
                if (!e.startTime) return false;
                const eStart = new Date(e.startTime.seconds * 1000);
                const eEnd = new Date(eStart.getTime() + parseInt(e.duration || '30') * 60000);
                return startTime < eEnd && endTime > eStart;
            });
            if (!isStillAvailable) {
                setValidationError('This time slot was just booked. Please choose another time.');
                setBookingTime(null);
                setIsSubmitting(false);
                return;
            }

            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'scheduled_events'), {
                eventTypeTitle: selectedEventType.title,
                attendeeName: trimmedName,
                attendeeEmail: trimmedEmail,
                startTime: { seconds: Math.floor(startTime.getTime() / 1000) },
                duration: selectedEventType.duration || '30',
                color: selectedEventType.color || 'bg-blue-50 border-blue-200 text-blue-700',
                status: 'confirmed',
                notes: `Booked via public link by ${trimmedName} (${trimmedEmail})`,
                source: 'booking_page',
                createdAt: serverTimestamp()
            });
            setIsConfirmed(true);
        } catch (e) {
            console.error('Booking error:', e);
            setError('Failed to confirm booking. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading & Error states
    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );
    if (error && !bookingPage) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border max-w-md">
                <p className="text-slate-600 font-medium">{error}</p>
            </div>
        </div>
    );

    // Confirmation screen
    if (isConfirmed) return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg border max-w-md w-full">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Booking Confirmed!</h2>
                <p className="text-slate-500 mb-4">
                    Your <strong>{selectedEventType?.title}</strong> has been scheduled for
                </p>
                <div className="bg-slate-50 rounded-xl p-4 mb-6 border">
                    <p className="font-bold text-slate-800">
                        {bookingDate?.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-blue-600 font-bold">{bookingTime}</p>
                </div>
                <p className="text-sm text-slate-400">A confirmation will be sent to <strong>{inviteeEmail}</strong></p>
            </div>
        </div>
    );

    // Step 1: Select event type (if multiple)
    if (!selectedEventType) return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Layout className="w-6 h-6 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">{bookingPage?.title}</h1>
                    {bookingPage?.description && <p className="text-slate-500 mt-1">{bookingPage.description}</p>}
                </div>
                <div className="space-y-3">
                    {availableEventTypes.map((et: any) => (
                        <button
                            key={et.id}
                            onClick={() => setSelectedEventType(et)}
                            className="w-full p-5 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-800 group-hover:text-blue-600">{et.title}</h3>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {et.duration} min</span>
                                        {et.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {et.location}</span>}
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    // Step 2: Select date & time + confirm
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b bg-slate-50/50">
                    {availableEventTypes.length > 1 && (
                        <button onClick={() => { setSelectedEventType(null); setBookingDate(null); setBookingTime(null); }}
                            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                    )}
                    <h2 className="text-xl font-bold text-slate-800">{selectedEventType.title}</h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedEventType.duration} min</span>
                        {selectedEventType.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedEventType.location}</span>}
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Calendar */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-700 text-sm">
                                    {calendarViewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="flex gap-1">
                                    <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
                                    <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-1">
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                    <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((date, idx) => {
                                    if (!date) return <div key={idx} />;
                                    const available = isDateAvailable(date);
                                    const isSelected = bookingDate?.toDateString() === date.toDateString();
                                    const isToday = new Date().toDateString() === date.toDateString();
                                    return (
                                        <button
                                            key={idx}
                                            disabled={!available}
                                            onClick={() => { setBookingDate(date); setBookingTime(null); }}
                                            className={`w-full aspect-square rounded-lg text-sm font-medium transition-all
                                                ${isSelected ? 'bg-blue-600 text-white shadow-sm' :
                                                  available ? 'hover:bg-blue-50 text-slate-700' :
                                                  'text-slate-300 cursor-not-allowed'}
                                                ${isToday && !isSelected ? 'ring-1 ring-blue-300' : ''}
                                            `}
                                        >
                                            {date.getDate()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Time slots + form */}
                        <div>
                            {bookingDate ? (
                                <>
                                    <h3 className="font-bold text-slate-700 text-sm mb-3">
                                        {bookingDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </h3>
                                    {!bookingTime ? (
                                        <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                                            {timeSlots.length > 0 ? timeSlots.map(time => (
                                                <button
                                                    key={time}
                                                    onClick={() => setBookingTime(time)}
                                                    className="w-full py-2.5 px-4 border border-blue-200 text-blue-600 font-bold text-sm rounded-lg hover:bg-blue-50 transition-all"
                                                >
                                                    {time}
                                                </button>
                                            )) : (
                                                <p className="text-sm text-slate-400 text-center py-8">No available slots for this date.</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                                                <span className="font-bold text-blue-700 text-sm">{bookingTime}</span>
                                                <button onClick={() => setBookingTime(null)} className="text-xs text-blue-500 hover:underline">Change</button>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Your Name</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="John Doe" value={inviteeName} onChange={e => setInviteeName(e.target.value)} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Your Email</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                        type="email" placeholder="john@example.com" value={inviteeEmail} onChange={e => setInviteeEmail(e.target.value)} />
                                                </div>
                                            </div>
                                            {(error || validationError) && <p className="text-sm text-red-500">{validationError || error}</p>}
                                            <button
                                                onClick={handleConfirm}
                                                disabled={isSubmitting || !inviteeName.trim() || !inviteeEmail.trim()}
                                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                                            >
                                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                    <div className="text-center">
                                        <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p>Select a date to see available times</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t bg-slate-50/50 text-center">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Powered by SimpleCRM</p>
                </div>
            </div>
        </div>
    );
};

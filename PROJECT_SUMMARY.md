# SimpleCRM — Project Summary

> **Live URL:** https://power-agency-crm.web.app
> **Firebase Project:** `power-agency-crm`
> **Last Updated:** 2026-02-23 (rev 2)

---

## Table of Contents

1. [Project Target](#1-project-target)
2. [Tech Stack](#2-tech-stack)
3. [What Was Built](#3-what-was-built)
4. [What Was Done (Session Work)](#4-what-was-done-session-work)
5. [What Is Pending](#5-what-is-pending)
6. [Known Issues & Solutions](#6-known-issues--solutions)
7. [File Structure](#7-file-structure)
8. [Environment Setup](#8-environment-setup)
9. [Deploy Command](#9-deploy-command)

---

## 1. Project Target

Build a **high-performance, lightweight CRM web application** for a power/marketing agency to manage:

- Contacts (people & companies) with rich profile data
- Sales pipeline management
- Task and calendar scheduling (with public booking pages)
- Email integration (Gmail API)
- AI-powered insights and briefings (Google Gemini)
- Team member management with role-based access
- Contact grouping / tagging
- Voice notes and live AI call assistant

### Target User

Agency staff (sales, account managers, admins) working from a browser — no mobile app needed. The CRM should feel fast, modern, and require minimal training.

### Delivery Plan

Work was structured into 3 weeks:

| Week | Focus |
|------|-------|
| Week 1 | Core CRM: Contacts, Pipeline, Dashboard, Auth |
| Week 2 | Email, Calendar, Todos, AI Features, Voice Notes |
| Week 3 | Polish, Bugs, Groups, Settings Integrations, UX |

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 19 + TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS (CDN) |
| Backend / DB | Firebase Firestore |
| Auth | Firebase Auth (Email + Google OAuth) |
| Hosting | Firebase Hosting |
| AI | Google Gemini API (`@google/genai`) |
| Email API | Gmail API (via Google OAuth) |
| Calendar API | Google Calendar API (via Google OAuth) |
| Icons | lucide-react |
| Rich Text | Custom RichTextEditor component |
| Excel Import | xlsx library |
| Voice | Browser MediaRecorder API + Gemini Live API |

**No Redux, no React Router** — all state lives in `App.tsx`, page switching via local state.

---

## 3. What Was Built

### Week 1 — Core CRM

| Feature | Status | File |
|---------|--------|------|
| Firebase Auth (Email + Google) | ✅ Done | `AuthPage.tsx` |
| Contact create / edit / delete | ✅ Done | `ContactForm.tsx` |
| Contact list with search & filters | ✅ Done | `App.tsx` |
| Contact detail page (full profile) | ✅ Done | `ContactDetail.tsx` |
| People vs Company types | ✅ Done | `ContactForm.tsx` |
| Sales Pipeline (Kanban drag-drop) | ✅ Done | `Pipeline.tsx` |
| Dashboard with KPIs | ✅ Done | `Dashboard.tsx` |
| Sidebar navigation | ✅ Done | `Sidebar.tsx` |

### Week 2 — Email, Calendar, AI, Voice

| Feature | Status | File |
|---------|--------|------|
| Email inbox (Gmail API) | ✅ Done | `EmailPage.tsx` |
| Email compose with rich text | ✅ Done | `EmailPage.tsx` + `RichTextEditor.tsx` |
| Email labels / star / read | ✅ Done | `EmailPage.tsx` |
| Calendar event types | ✅ Done | `CalendarPage.tsx` |
| Public booking pages | ✅ Done | `CalendarPage.tsx` + `BookingPublicPage.tsx` |
| Google Calendar sync | ✅ Done | `CalendarPage.tsx` |
| Todo / Task management | ✅ Done | `TodoPage.tsx` |
| AI daily briefing (Gemini) | ✅ Done | `Dashboard.tsx` |
| AI contact intelligence | ✅ Done | `ContactDetail.tsx` |
| Voice notes (record + transcribe) | ✅ Done | `ContactDetail.tsx` |
| AI Live Call (real-time voice) | ✅ Done | `App.tsx` |
| Contact import (Excel/XLSX) | ✅ Done | `ImportModal.tsx` |
| Custom fields in Settings | ✅ Done | `SettingsPage.tsx` |
| Team members + roles | ✅ Done | `SettingsPage.tsx` |

### Week 3 — Polish & New Features

| Feature | Status | File |
|---------|--------|------|
| Groups / Tags (full rewrite) | ✅ Done | `GroupsPage.tsx` |
| Group detail page | ✅ Done | `GroupsPage.tsx` |
| Bulk add/remove group members | ✅ Done | `GroupsPage.tsx` + `App.tsx` |
| Email to group (compose prefill) | ✅ Done | `GroupsPage.tsx` |
| Group analytics (status chart) | ✅ Done | `GroupsPage.tsx` |
| Contact field validations | ✅ Done | `ContactForm.tsx` |
| Calendar Week view | ✅ Done | `CalendarPage.tsx` |
| Calendar Day view | ✅ Done | `CalendarPage.tsx` |
| Email Save Draft | ✅ Done | `App.tsx` |
| Email Schedule Send | ✅ Done | `EmailPage.tsx` (dropdown arrow) |
| Settings integrations wired | ✅ Done | `SettingsPage.tsx` |
| Inline errors (no more alerts) | ✅ Done | `ContactDetail.tsx` |
| AI Live Call cancel bug fix | ✅ Done | `App.tsx` |
| Group Create modal bug fix | ✅ Done | `App.tsx` |

---

## 4. What Was Done (Session Work)

This is the detailed log of changes made in the development sessions.

### Bug Fixes

#### 1. AI Live Call — Cancel Button Not Working
- **Problem:** `micStreamRef.getTracks()` was called directly instead of `micStreamRef.current.getTracks()`, causing a silent crash when stopping the call.
- **Fix:** Changed to `micStreamRef.current.getTracks()` in `stopLiveCall()` function in `App.tsx`.

#### 2. Group "Create" Button Did Nothing
- **Problem:** `isGroupModalOpen` state existed and was being set to `true` on click, but the modal JSX was never added to the component tree.
- **Fix:** Added the full group modal UI to `App.tsx` with name input, color picker, and Create/Save buttons.

#### 3. `alert()` Popups in ContactDetail
- **Problem:** Two places used `alert()` for error messages (API key missing, file too large) which is poor UX.
- **Fix:** Added `chatError` and `attachError` state variables. Errors now display inline. `attachError` auto-dismisses after 4 seconds.

---

### New Features Added

#### 4. Contact Field Validations (`ContactForm.tsx`)
Added validation in `handleSubmit`:
- **Phone:** regex pattern + minimum 7 digits
- **Website:** URL format check (optional field, only validated if filled)
- **Birthday:** must be yesterday or earlier (no future birthdays)

#### 5. Calendar Week & Day Views (`CalendarPage.tsx`)
- Changed `meetingsViewMode` type from `'list' | 'calendar'` to `'list' | 'month' | 'week' | 'day'`
- **Week view:** 7-column Sun–Sat grid, events shown as color pills per day
- **Day view:** 24-hour timeline with current hour highlighted, time-positioned events
- Both views support CRM + Google Calendar events and Prev/Today/Next navigation

#### 6. Email Save Draft + Gmail Persistence (`App.tsx`, `firebase.ts`)
- Added `handleSaveDraft()` function — async, writes draft to Firestore `email` collection
- Draft also added to local state immediately (optimistic update) so UI responds without waiting for Firestore
- Save button (floppy disk icon) added to compose toolbar
- **Gmail emails now cached in Firestore** after each fetch — using Gmail message ID as Firestore doc ID (no duplicates on re-fetch)
- Firestore `email` listener loads all emails (Gmail-cached + drafts) on every page load — no Gmail token needed after first connection
- Added `setDoc` to `firebase.ts` (real SDK + mock implementation) to support upsert by document ID
- Removed broken `sessionStorage` token approach — Google OAuth tokens expire and cannot be reused across refreshes

#### 7. Groups Feature — Full Rewrite (`GroupsPage.tsx`)
Previous implementation was a simple list. Rewrote to include:
- **Group list** with color badges and member counts, clickable to open detail
- **Group Detail Page** (no route change, internal state) with 3 tabs:
  - **Members tab:** search bar, checkbox selection, "Email Selected" / "Email All" buttons
  - **Analytics tab:** summary cards, status breakdown bar chart, contact coverage percentage
  - **Manage Members tab:** searchable list of all contacts with Add/Remove toggle per contact
- Group member updates dispatch `crm:group-toggle` custom event → caught in `App.tsx` → updates Firestore

#### 8. Settings Integrations (`SettingsPage.tsx`)
- **Gmail:** real Connect button calls `onConnectGmail` prop → shows green "Connected" badge when connected
- **Google Calendar:** real Connect button calls `onConnectGoogleCalendar` prop → shows green "Connected" badge
- **7 others** (Zoom, Slack, LinkedIn, Google Meet, Office 365, Outlook, Teams): clicking shows amber "Coming Soon" toast for 3 seconds

---

## 5. What Is Pending

These items are known gaps but were **not explicitly requested** or **not yet prioritized**:

### Medium Priority

| Item | Description | Effort |
|------|-------------|--------|
| **Email Trash/Spam/Archive folders** | Only Inbox and Sent show real Gmail API emails. Trash/Spam/Archive folders only show CRM-generated demo emails. Gmail API needs additional fetch calls for these folders. | ~3 hours |
| **LinkedIn Profile data fetch** | LinkedIn does not offer a public API for profile lookup without a formal LinkedIn Partner Program application. Currently no data is pulled — this is a platform limitation, not a bug. | Requires LinkedIn partnership |

### Low Priority / Nice to Have

| Item | Description | Effort |
|------|-------------|--------|
| **Real Integrations** (Zoom, Slack, etc.) | 7 integrations show "Coming Soon". Each requires OAuth setup and API integration work. | 1-3 days per integration |
| **File attachments in Email** | Compose window supports attaching files but Gmail API send with attachments needs MIME multipart encoding. | ~4 hours |
| **Contact photo upload** | Currently accepts a URL string. Could add direct file upload to Firebase Storage. | ~3 hours |
| **Pipeline deal values** | Pipeline shows contacts but no deal $ values or revenue tracking. | ~4 hours |
| **Mobile responsive polish** | App works on mobile but some complex views (pipeline, calendar) are not optimized for small screens. | ~1 day |
| **Email pagination** | Email inbox fetches a fixed number of emails. No load-more or pagination. | ~2 hours |

---

## 6. Known Issues & Solutions

### Issue: Gmail emails disappear on page refresh ✅ FIXED
- **Root cause:** Google OAuth access tokens are short-lived and tied to the browser session. Saving them to `sessionStorage` does not help — the token itself expires and any API call with it fails silently. There is no way to re-use an OAuth token across page refreshes without a full re-authentication flow.
- **Solution implemented:** Gmail emails are now **saved to Firestore** immediately after being fetched from the Gmail API. The Gmail message ID is used as the Firestore document ID (`setDoc` with `merge: true`) to prevent duplicates on re-fetch. The existing Firestore `email` listener loads all emails (Gmail-cached + drafts) on every page load — no Gmail token needed after first connection.

### Issue: Draft emails lost on refresh ✅ FIXED
- **Root cause:** `handleSaveDraft()` only pushed to React local state (`emails`), which is cleared on refresh.
- **Solution implemented:** `handleSaveDraft()` now writes to Firestore `email` collection using `addDoc`. An optimistic local update is applied immediately so the UI responds without waiting for Firestore. The Firestore `email` listener then replaces the optimistic item with the real Firestore document.

### Issue: LinkedIn data cannot be fetched automatically — Platform Limitation
- **Root cause:** LinkedIn's API requires a formal partnership and OAuth app approval. There is no public search endpoint.
- **Current behavior:** "Open LinkedIn" button deep-links to `https://linkedin.com/search/results/all/?keywords=${name}` so the user can manually copy data. This is by design.

### Issue: Group member changes not persisting offline — Not a Bug
- **Root cause:** Group toggle uses Firestore `updateDoc` via `App.tsx`.
- **Status:** Firebase Firestore SDK handles offline caching automatically — writes are queued locally and synced when connection restores. Works correctly already.

### Issue: Gemini AI briefing fails silently if API key is missing
- **Root cause:** `GEMINI_API_KEY` is injected at build time via Vite. If missing, the variable is `undefined`.
- **Solution:** Already handled — `chatError` inline state in `ContactDetail.tsx` shows an error message in the UI. Dashboard briefing also shows a friendly error if the Gemini call fails.

---

## 7. File Structure

```
simplecrm/
├── index.html                    # HTML entry point
├── index.tsx                     # React entry + routing (AuthPage vs App)
├── App.tsx                       # Main app — all state, all handlers (~3,000 lines)
├── firebase.ts                   # Firebase init + mock backend fallback (exports: addDoc, setDoc, updateDoc, deleteDoc, doc, collection, onSnapshot, serverTimestamp)
├── constants.ts                  # GROUP_COLORS, ACTIVITY_STYLES
├── utils.ts                      # getFavicon, date helpers, audio utils
├── types.d.ts                    # TypeScript declarations for Vite env
├── metadata.json                 # App name, description, permissions
├── vite.config.ts                # Vite + React plugin, port 3000
├── tsconfig.json                 # TypeScript config
├── package.json                  # Dependencies + scripts
├── .env.local                    # GEMINI_API_KEY, FIREBASE_CONFIG (not in git)
├── .firebaserc                   # Firebase project: power-agency-crm
├── firebase.json                 # Firebase hosting config (dist/, SPA rewrite)
├── components/
│   ├── AuthPage.tsx              # Login / Sign-up / Google sign-in
│   ├── Dashboard.tsx             # KPIs, AI briefing, activity feed
│   ├── Sidebar.tsx               # Navigation sidebar (collapsible)
│   ├── ContactForm.tsx           # Create/edit contact form
│   ├── ContactDetail.tsx         # Contact profile, activities, AI, voice
│   ├── Pipeline.tsx              # Kanban sales pipeline
│   ├── GroupsPage.tsx            # Groups with detail, analytics, manage
│   ├── TodoPage.tsx              # Tasks with due dates
│   ├── CalendarPage.tsx          # Events, booking pages, week/day/month views
│   ├── EmailPage.tsx             # Gmail inbox, compose, labels
│   ├── SettingsPage.tsx          # Team, custom fields, integrations
│   ├── NoteItem.tsx              # Activity timeline item
│   ├── RichTextEditor.tsx        # WYSIWYG editor
│   ├── Shared.tsx                # StatusBadge, DynamicInputList, WidgetItem
│   ├── RelatedCards.tsx          # Related contacts/companies display
│   ├── BookingPublicPage.tsx     # Public meeting booking form
│   └── ImportModal.tsx           # Excel contact import wizard
└── dist/                         # Production build output (auto-generated)
```

---

## 8. Environment Setup

### Required environment variables (`.env.local`):

```env
GEMINI_API_KEY=your_gemini_api_key_here
FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"power-agency-crm","storageBucket":"...","messagingSenderId":"...","appId":"...","measurementId":"..."}
```

### Local development:

```bash
cd simplecrm
npm install
npm run dev
# → http://localhost:3000
```

### Production build:

```bash
npm run build
```

---

## 9. Deploy Command

```bash
cd e:/Work/HelpAgency/simplecrm
npm run build && firebase deploy --only hosting
```

**Live URL:** https://power-agency-crm.web.app

---

## Firestore Data Structure

```
artifacts/
  power-agency-crm/
    users/
      {userId}/
        contacts/          # Contact and company records
        notes/             # Activity notes per contact (all types: Call, Email, Meeting, Task, Note)
        todos/             # Tasks with due dates
        tag_groups/        # Contact groups with colors
        event_types/       # Calendar event type templates
        scheduled_events/  # Booked meetings
        email/             # All emails: Gmail-cached (_fromGmail:true) + CRM drafts/sent
        custom_fields/     # User-defined custom fields (per contact type)
        pipelines/         # Sales pipeline definitions
        booking_pages/     # Public booking page configs
        team_members/      # Team member records with roles
```

> **Note:** Collection names use snake_case (e.g. `tag_groups`, `event_types`) — match exactly when querying Firestore directly.

---

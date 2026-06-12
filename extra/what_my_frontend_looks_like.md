# What My Frontend Looks Like: UI/UX & Features Overview

This document outlines the design aesthetics, user experience (UX), and complete feature set of the AI Email Support System frontend.

## 🎨 UI/UX Design Aesthetics

The application is built using **Next.js 15**, styled with modern, premium aesthetics tailored to give users a professional and trustworthy experience.

### Visual Design

- **Color Palette:** Clean and modern utilizing a mix of soft neutral backgrounds (`bg-background`, `bg-muted/40`) with vibrant accent colors for actions (Indigo for primary actions, Green for success/sent, Amber for edits, Red for rejections).
- **Dark Mode Support:** Fully responsive light and dark mode support using Tailwind CSS (`dark:bg-...`).
- **Typography:** Uses crisp, modern sans-serif fonts (like Inter or system default) to ensure high readability for dense email text.
- **Glassmorphism & Shadows:** Subtle shadows and bordered cards (`components/ui/card`) are used to separate content zones cleanly without feeling cluttered.
- **Micro-interactions:** Smooth hover effects on ticket rows, transition animations on buttons, and real-time toast notifications (via `sonner`) provide immediate user feedback.

### User Experience (UX) Flow

- **Sidebar Navigation:** A sticky left-hand sidebar gives immediate access to all core modules (Dashboard, Mails, Tickets, Filters, Settings) with active-state highlighting.
- **Data Visualization:** The dashboard and analytics pages use `Recharts` to provide instant, visually appealing summaries of ticket volumes and categorizations without overwhelming the user with raw data.
- **Skeleton Loaders:** During data fetching (via `@tanstack/react-query`), UI skeleton blocks display to prevent layout shift and signal that the app is actively working.
- **Responsive Layout:** The grid systems (e.g., stats cards, charts) gracefully collapse from 4-columns on desktop to 1-column on mobile devices.

---

## 🚀 Core Features & Functionality

### 1. Dashboard & Analytics

- **Stat Metrics:** Top-level cards displaying "Emails Used vs Limit", "Open Tickets", "Pending Approvals", and "Current Subscription Plan".
- **Visual Analytics:**
  - **Bar Charts:** Displays tickets segmented by AI-classified categories (e.g., billing, complaint, feature request).
  - **Pie Charts:** Breaks down tickets by resolution status (Open, Resolved, Pending).
- **Recent Activity:** Quick links to the 5 most recently received tickets.

### 2. Mails (Approval Queue & History)

- **Review Mode / Pending Queue:** If Review Mode is enabled, AI-generated replies wait here. Users can:
  - **Approve & Send:** 1-click dispatch.
  - **Edit & Send:** Modify the AI's generated text in an inline text area before sending.
  - **Reject:** Discard the reply and close the ticket.
- **History Tab:** A full log of all processed emails, color-coded by resolution:
  - 🟢 **Sent:** Auto-sent or manually approved.
  - 🟡 **Edited & Sent:** Human-modified before sending.
  - 🔴 **Rejected:** Discarded replies.

### 3. Tickets (Full Inbox View)

- **Ticket Listing:** A comprehensive list of all support tickets showing sender, subject, relative time (e.g., "2 hours ago"), and current status.
- **Quick Status Updates:** A dropdown on the list view allows instantly changing a ticket to `open`, `in_progress`, `resolved`, or `closed`.
- **Thread View (**`/tickets/[id]`**):** Clicking a ticket opens the full conversation history. It displays the original inbound email and any outbound AI replies in a clear, chat-like thread format.

### 4. Custom Business Profiles (AI Persona)

- **Presets:** Users can select their business type (E-commerce, SaaS, Agency, Custom) to steer how the AI replies.
- **Tone & Style Overrides:** Users can dictate the exact tone (e.g., "Professional but friendly", "Empathetic") and style (e.g., "Concise, bullet points only").

### 5. Filters & Spam Control

- **Whitelist/Blacklist:** Users can add specific email addresses or entire domains (e.g., `*@spam.com`) to a blocklist (AI ignores them) or an allowlist (guaranteed processing).

### 6. Account & Settings

- **Gmail Integration:** Secure OAuth flow to connect the user's Gmail account for reading and replying to emails via the Gmail API.
- **Review Mode Toggle:** A simple switch to decide if the AI should reply automatically or wait for human approval in the Queue.
- **Subscription Management:** Tracks how many emails have been processed in the current billing cycle and allows upgrading via Stripe/payment portals.

### 7. Admin Panel (Hidden for regular users)

- Dedicated `/admin` route for platform owners to see total system-wide emails processed, active users, and manually upgrade users to higher tiers.
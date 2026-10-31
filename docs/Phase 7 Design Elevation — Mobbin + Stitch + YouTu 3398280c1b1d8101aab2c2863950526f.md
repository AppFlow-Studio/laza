# Phase 7: Design Elevation — Mobbin + Stitch + YouTube UI Inspiration

Start date: 04/07/2026
End date: 04/18/2026
Progress: 0%
Priority: High
Status: In progress
AI summary: Phase 7 focuses on elevating Laza CRM’s visual design by researching and prototyping UI directions before any coding, running from 04/07/2026 to 04/18/2026 with high priority and in‑progress status. Sardor (Track A) and Munis (Track B) will work in parallel on assigned sections—sidebar, dashboard, warehouse, stores, order tickets, cost tracking, invoice AI, analytics, notifications, payments, and a shared dynamic item drawer—following a checklist that includes Mobbin research, YouTube review, Stitch AI variations, team sharing, and Temur’s design approval before implementation using Next.js, Tailwind, and Framer Motion. Acceptance criteria require documented research, at least three Stitch concepts per section, video reviews, approved designs, proper animation use, and no direct Stitch code copying.

**Source Document:** Laza Mobbin Inspiration Guide.docx (reviewed and approved)

**Tools Required:** Mobbin Pro, Google Stitch AI ([stitch.withgoogle.com](http://stitch.withgoogle.com)), YouTube (videos shared in team chat)

**Developers:** Sardor Djurakulov (Track A), Munis Tursunov (Track B)

---

# Purpose

This phase focuses on elevating the visual quality of the entire Laza CRM. Before building or refactoring any UI, both developers will research, explore, and propose design directions for every section of the platform. The goal is to move from functional screens to polished, professional, emotionally engaging interfaces — without losing the speed and simplicity the Super Admin needs.

This is NOT a coding phase first. Research and visual exploration come first. Coding begins only after Temur approves the design direction for each section.

---

# How This Phase Works

## Three Inspiration Sources

1. **Mobbin Pro** — Study real companies and their actual UI flows. Each section below has specific companies and search queries assigned.
2. **YouTube Videos** — Temur will share curated videos in the group chat for specific sections. Watch them fully before starting work on that section. These are not optional.
3. **Google Stitch AI** — Use [stitch.withgoogle.com](http://stitch.withgoogle.com) (free, 350 generations/month) to generate quick UI variations from text prompts. Example prompts are provided below for each section.

## Workflow Per Section

- [ ]  Search Mobbin for the assigned companies and flows
- [ ]  Watch any YouTube videos shared for that section
- [ ]  Generate 3-5 Stitch variations using the provided prompts
- [ ]  Screenshot your top 2-3 favorites from Mobbin + Stitch
- [ ]  Share screenshots in group chat with labels (source + what you liked)
- [ ]  Wait for Abubeckr to pick the direction - i just want to make sure you guys are choosing the correct style and nice inspiration in the beginning. Be creative no screenshot is wrong i just want to see how you guys are thinking
- [ ]  Implement using our Next.js + Tailwind + Framer Motion stack

> ⚠️ **IMPORTANT:** Stitch code is for reference only. Never copy-paste Stitch output into our codebase. Use it for visual inspiration, then build from scratch using our existing component patterns.
> 

---

# Developer Tracks — Parallel Work Assignment

Sardor and Munis each own separate CRM sections so they never block each other. Both tracks can run at the same time.

| Track | Developer | Sections Owned | Focus Area |
| --- | --- | --- | --- |
| **Track A** | **Sardor** | 7.1 – 7.5 | Operational Core: Dashboard, Warehouse, Stores, Order System |
| **Track B** | **Munis** | 7.6 – 7.10 | Intelligence & Finance: Cost Tracking, Invoices, Analytics, Notifications, Payments |
| **Shared** | **Both** | 7.11 | Dynamic Box System (Item Detail Drawer) — Sardor owns the drawer shell, Munis owns the tabs content |

---

# Track A — Sardor

---

## 7.1 — Super Admin Sidebar Navigation

**Priority:** P0 MUST

**Depends on:** Nothing — can start immediately

**Why this matters:** The sidebar is the Super Admin's primary way of navigating the entire CRM. It appears on every page, so getting it right sets the visual tone for the whole platform.

**Mobbin Research:**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Shopify Admin | Web | Shopify admin dashboard sidebar | Icon + label pairs, collapsible sections, active state highlighting, group dividers |
| Linear | Web | Linear project management sidebar | Badge counts on nav items, collapse behavior, keyboard shortcuts, hover animations |
| Notion | Web + Mobile | Notion sidebar navigation | How sidebar collapses to icons-only on narrow screens. Mobile slide-in overlay — closest to our react-modal-sheet pattern |

**Stitch Prompt:** "Design a SaaS admin sidebar for a dessert cafe supply chain platform. Navigation items: Dashboard, Warehouse, Stores, Orders, Analytics, Settings. Show collapsed icon-only state and expanded state. Include badge counts for pending orders. Premium, clean, minimal dark sidebar."

**Emotional Design:** Sidebar items fade-in with stagger on first load (Framer Motion staggerChildren). Active nav item gets a gentle background color transition (0.2s ease). Mobile sheet uses spring animation with slight overshoot.

- [ ]  Research Mobbin (Shopify Admin, Linear, Notion)
- [ ]  Watch YouTube videos if shared
- [ ]  Generate 3-5 Stitch variations
- [ ]  Share top picks in group chat
- [ ]  Implement after Temur approves direction

---

## 7.2 — Super Admin Dashboard Home

**Priority:** P0 MUST

**Depends on:** 7.1 (sidebar must be designed first)

**Why this matters:** This is the command center. Stats cards + activity feed give the Super Admin an instant overview of everything happening across the business.

**Mobbin Research:**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Square Dashboard | Web | Square dashboard overview | 4-card stats grid: big number, label, trend indicator. Clean card layout |
| Stripe Dashboard | Web | Stripe dashboard home overview | Summary dashboard + scrollable activity feed. Clean separation between summary and detail |
| Shopify Admin | Web | Shopify admin home | "Things to do" action feed below stats. Pending orders, alerts prioritized by urgency |

**Stitch Prompt:** "Design a SaaS admin dashboard for a dessert cafe supply chain. Include 4 stats cards (Total Stores, Pending Orders, Warehouse Alerts, Total Items) followed by a recent activity feed showing order tickets. Premium clean style with desert-gold accent color."

**Emotional Design:** Stats cards animate in with scale-up (0.95 to 1.0) and fade. Numbers count up from 0 using spring animation. Trend arrows pulse once on load.

- [ ]  Research Mobbin (Square, Stripe, Shopify)
- [ ]  Watch YouTube videos if shared
- [ ]  Generate 3-5 Stitch variations
- [ ]  Share top picks in group chat
- [ ]  Implement after Temur approves direction

---

## 7.3 — Warehouse Management (Dashboard + Pallets + All Items)

**Priority:** P0 MUST

**Depends on:** 7.2

**Why this matters:** The warehouse page is where the Super Admin spends the most time. Pallet cards, item inventory, and the detail drawer need to be fast and scannable.

**Mobbin Research (Dashboard + Pallets):**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| ShipBob | Web | ShipBob warehouse inventory dashboard | Stats cards above filterable inventory table. Closest match to our warehouse layout |
| Flexport | Web | Flexport shipment tracking logistics | Container/shipment tracking cards with status badges, dates, contents summary |
| Sortly | Web + Mobile | Sortly inventory management | Visual inventory with photo cards and color-coded status tags |

**Mobbin Research (Pallet Detail Page):**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Notion | Web | Notion page detail view properties | Title at top, key-value properties, content area below |
| Linear | Web | Linear issue detail page | Right-rail properties panel with status, metadata. Activity log in center |
| Shopify | Web | Shopify product detail page | Product detail layout: visual on left, metadata right, inventory below |

**Mobbin Research (All Items View):**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Faire | Web | Faire wholesale product catalog table | Product table with search bar and category filter chips |
| Airtable | Web | Airtable grid view database | Sortable columns, filter bar, smooth scrolling, sticky headers |
| Shopify | Web | Shopify inventory list products | Inventory list with filter bar and bulk actions |

**Stitch Prompt:** "Design a warehouse inventory management page showing pallets as cards in a grid. Each pallet card: pallet number, item name, quantity, arrival date, rent cost, status badge. Top section has 4 summary stats cards and a search bar with filter chips. Clean SaaS style, light background."

**Emotional Design:** Pallet cards have hover lift (translateY: -2px + shadow). Empty pallets fade-to-gray. Table rows stagger fade-in on load. Row highlight on hover (0.15s transition).

- [ ]  Research Mobbin — Warehouse Dashboard (ShipBob, Flexport, Sortly)
- [ ]  Research Mobbin — Pallet Detail (Notion, Linear, Shopify)
- [ ]  Research Mobbin — All Items View (Faire, Airtable, Shopify)
- [ ]  Watch YouTube videos if shared
- [ ]  Generate 3-5 Stitch variations
- [ ]  Share top picks in group chat
- [ ]  Implement after Temur approves direction

---

## 7.4 — Stores Overview (Multi-Location)

**Priority:** P1 SHOULD

**Depends on:** 7.2

**Why this matters:** Super Admin needs a bird's-eye view of all franchise locations with drill-down ability.

**Mobbin Research:**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Toast | Web | Toast restaurant multi-location management | Each store as a card with name, address, employee count, status |
| Gusto | Web | Gusto company locations management | Location switcher dropdown and per-location drill-down |
| Square Dashboard | Web | Square multi-location overview | Location comparison with same metrics side-by-side |
| Shopify | Web | Shopify multi-location inventory | Multi-location inventory view with stock levels per location |

**Stitch Prompt:** "Design a multi-location management dashboard for a dessert cafe franchise. Show store locations as cards with: store name, address, employee count, active alerts badge. Include search and a drill-down detail view. Clean SaaS style."

**Emotional Design:** Store cards have subtle border glow on hover. Cards with alerts have a gentle pulsing red dot. Drill-down uses shared layout animation.

- [ ]  Research Mobbin (Toast, Gusto, Square, Shopify)
- [ ]  Watch YouTube videos if shared
- [ ]  Generate 3-5 Stitch variations
- [ ]  Share top picks in group chat
- [ ]  Implement after Temur approves direction

---

## 7.5 — Order Ticket System (Creation + Queue + Fulfillment + Confirmation)

**Priority:** P0 MUST

**Depends on:** 7.1

**Why this matters:** The order ticket system is the core feature. Store Admins create orders, Super Admin fulfills, employees confirm. Every role interacts with this system daily.

**Mobbin Research (Order Creation — Store Admin):**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Instacart | Mobile | Instacart grocery shopping add to cart | Product browse → add to cart → review → submit flow |
| Faire | Mobile + Web | Faire wholesale ordering catalog | Wholesale ordering by case quantities. Quantity stepper and review summary |
| DoorDash Merchant | Mobile | DoorDash merchant menu management | Catalog browsing with search and category tabs |

**Mobbin Research (Order History + Ticket Detail — Store Admin):**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Shopify | Web + Mobile | Shopify order history list | Order list with status badges and filter chips |
| Amazon | Mobile | Amazon order tracking timeline | Vertical status timeline: Ordered → Shipped → Delivered |
| Linear | Web | Linear issue detail status timeline | Status badge + activity log with timestamps |

**Mobbin Research (Order Queue + Fulfillment — Super Admin):**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Shopify | Web | Shopify orders queue fulfillment | Incoming orders with status filters, store filter, badge count |
| ShipStation | Web | ShipStation order fulfillment | Split view: ordered vs. being shipped side-by-side |
| Linear | Web | Linear issue board kanban view | Kanban columns by status: Submitted, Processing, Fulfilled, Confirmed |

**Mobbin Research (Employee Confirmation):**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| DoorDash Driver | Mobile | DoorDash driver delivery confirmation | Item checklist verification. Mobile-first, designed for speed |
| Deliveroo Rider | Mobile | Deliveroo rider order pickup confirm | Mark items as received checklist + Confirm All button |
| Uber Eats | Mobile | Uber Eats restaurant order accept | Item-by-item confirmation with urgency indicators |

**Stitch Prompts:**

- **Order Creation:** "Design a mobile-friendly order creation flow for a store manager ordering supplies. Step 1: browse catalog with search and category filters. Step 2: add items with box quantity steppers. Step 3: review summary. Step 4: submit confirmation. Modern SaaS style."
- **Order Queue:** "Design a web dashboard for managing incoming orders from multiple stores. Filterable table with columns: ticket number, store name, date, item count, status badge. Status filter chips. Stripe-like aesthetic."

**Emotional Design:** Adding items: scale-bounce on quantity counter. Submit button: satisfying press animation. Status timeline: step-by-step animation on load (100ms delay between nodes). Confirmed items: checkmark draw-on SVG. Full confirmation: success animation.

- [ ]  Research Mobbin — Order Creation (Instacart, Faire, DoorDash Merchant)
- [ ]  Research Mobbin — Order History (Shopify, Amazon, Linear)
- [ ]  Research Mobbin — Queue & Fulfillment (Shopify, ShipStation, Linear)
- [ ]  Research Mobbin — Employee Confirmation (DoorDash Driver, Deliveroo, Uber Eats)
- [ ]  Watch YouTube videos if shared
- [ ]  Generate Stitch variations for each sub-flow
- [ ]  Share top picks in group chat
- [ ]  Implement after Temur approves direction

---

# Track B — Munis

---

## 7.6 — Warehouse Cost Tracking (Rates + Expense Overview)

**Priority:** P0 MUST

**Depends on:** Nothing — can start immediately

**Why this matters:** The Super Admin needs to see current rates, update them, and track expense history. This is the financial control surface.

**Mobbin Research:**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| QuickBooks | Web | QuickBooks expense tracking dashboard | Expense categorization, cost breakdowns, period-over-period changes |
| Ramp | Web | Ramp expense management settings | Rate and policy settings. "Current vs. previous" rate display |
| Gusto | Web | Gusto payroll pay rates settings | Rate management: setting rates, effective dates, change history. Confirmation modal pattern |

**Stitch Prompt:** "Design an expense tracking dashboard for warehouse operations. Rate cards for: pallet delivery cost, monthly rent, container unload fee. Each shows current rate with edit icon. Below: recent invoices table with vendor, date, total, status. QuickBooks-inspired style."

**Emotional Design:** Rate change modal: clean fade-in, "old → new" comparison. No bouncy animations — financial UI should feel secure. Success indicator auto-dismisses.

- [ ]  Research Mobbin (QuickBooks, Ramp, Gusto)
- [ ]  Watch YouTube videos if shared
- [ ]  Generate 3-5 Stitch variations
- [ ]  Share top picks in group chat
- [ ]  Implement after Temur approves direction

---

## 7.7 — Invoice Upload & AI Parsing

**Priority:** P1 SHOULD

**Depends on:** 7.6

**Why this matters:** AI-assisted invoice scanning saves the Super Admin from manual data entry on every shipment invoice.

**Mobbin Research:**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Ramp | Web + Mobile | Ramp receipt upload expense capture | Upload → AI reads → extracted fields for review → confirm. Identical to our flow |
| Dext (Receipt Bank) | Mobile | Dext receipt capture scan | Camera capture, auto-crop, editable extracted results. "AI vs manual override" UX |
| Expensify | Mobile | Expensify receipt scan expense report | SmartScan: photo → processing animation → extracted fields. Confidence levels display |

**Stitch Prompt:** "Design an invoice upload and AI extraction flow. Step 1: drag-and-drop upload. Step 2: processing with scanning animation. Step 3: extracted fields in editable form. Step 4: confirm. Show AI confidence indicator per field. Modern SaaS style."

**Emotional Design:** Scanning animation sweeps across uploaded image. Extracted fields pop in with stagger. Low-confidence fields get subtle yellow highlight.

- [ ]  Research Mobbin (Ramp, Dext, Expensify)
- [ ]  Watch YouTube videos if shared
- [ ]  Generate 3-5 Stitch variations
- [ ]  Share top picks in group chat
- [ ]  Implement after Temur approves direction

---

## 7.8 — Analytics & Predictive Alerts

**Priority:** P1 SHOULD

**Depends on:** Nothing — can start in parallel with 7.6

**Why this matters:** The intelligence layer that turns raw data into actionable insights for the Super Admin.

**Mobbin Research:**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Stripe Dashboard | Web | Stripe analytics charts revenue | Date-range filterable charts, trend lines, period comparison |
| Mixpanel | Web | Mixpanel analytics insights dashboard | Multi-chart dashboard with filter bar and breakdowns by dimension |
| Amplitude | Web | Amplitude analytics comparison charts | Side-by-side comparison across segments (our dimension = store) |
| Datadog | Web | Datadog alerts monitoring dashboard | Alert cards with severity levels (Critical, Warning, OK) |

**Stitch Prompt:** "Design an analytics dashboard for a supply chain platform. Date range selector, line chart for ordering volume, bar chart comparing stores, predictive alert cards with severity badges. Stripe-inspired, data-dense but clean."

**Emotional Design:** Line charts draw left-to-right on load. Bar charts grow up from baseline. Critical alert cards slide in with slight shake. Date range selector has snappy transitions.

- [ ]  Research Mobbin (Stripe, Mixpanel, Amplitude, Datadog)
- [ ]  Watch YouTube videos if shared
- [ ]  Generate 3-5 Stitch variations
- [ ]  Share top picks in group chat
- [ ]  Implement after Temur approves direction

---

## 7.9 — Notifications & Alert Settings

**Priority:** P2 NICE TO HAVE

**Depends on:** 7.8

**Why this matters:** Configurable notification preferences prevent alert fatigue and ensure critical info reaches the right people.

**Mobbin Research:**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Slack | Mobile | Slack notification preferences settings | Granular toggle controls per notification type, grouping strategy |
| Linear | Web | Linear notification settings preferences | What triggers email vs in-app. Two-column layout |
| Stripe Dashboard | Web | Stripe alert notification banners | Warning banners with action buttons. Severity color coding |
| Figma | Web | Figma notification bell dropdown | Bell icon with unread badge, dropdown with grouped notifications |

**Stitch Prompt:** "Design a notification settings page for a SaaS platform. Two columns: notification type on left, email/in-app toggles on right. Group by category: Orders, Warehouse, Payments, Alerts. Clean, settings-page feel."

**Emotional Design:** New notification badge bounces on arrival. Dropdown slides with spring physics. Read/unread opacity transition. Mobile swipe-away dismiss gesture.

- [ ]  Research Mobbin (Slack, Linear, Stripe, Figma)
- [ ]  Watch YouTube videos if shared
- [ ]  Generate 3-5 Stitch variations
- [ ]  Share top picks in group chat
- [ ]  Implement after Temur approves direction

---

## 7.10 — Payment Processing (Hold-Capture Model)

**Priority:** P1 SHOULD

**Depends on:** Nothing — can start in parallel

**Why this matters:** Payment method management and payment status tracking are critical for financial operations across franchise locations.

**Mobbin Research (Payment Methods):**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Uber | Mobile | Uber payment methods list manage | Card list with brand icon, last 4 digits, default badge. Simple add/remove |
| Shopify | Web | Shopify billing payment methods | Business-context payment methods. Card on file with Change/Remove |
| Square | Web | Square payment methods business | Primary vs backup payment methods. Verify flow for new cards |

**Mobbin Research (Payment Status + Reconciliation):**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Stripe Dashboard | Web | Stripe payment status timeline | Created → Authorized → Captured with timestamps. Color coding |
| QuickBooks | Web | QuickBooks transaction history list | B2B payment history with filters and monthly totals |
| Wave | Web | Wave accounting payment tracking | Pending/partial/paid statuses. Payment against invoice amount |

**Stitch Prompts:**

- **Payment Methods:** "Design a payment method management page for a B2B platform. List of saved cards with brand icon, last 4 digits, default badge. Add new card button. Simple, secure feel."
- **Reconciliation:** "Design a payment reconciliation view for B2B supply chain. Transaction list with status timeline (Created → Authorized → Captured). Color coding: green=captured, yellow=pending, red=failed. Filters by store and date. Stripe-inspired."

**Emotional Design:** New card: card-flip animation revealing form. Success: green border flash. Payment timeline: step-by-step animation. Failed payments: persistent red indicator. Reconciliation: confident, precise control panel feel.

- [ ]  Research Mobbin — Payment Methods (Uber, Shopify, Square)
- [ ]  Research Mobbin — Status & Reconciliation (Stripe, QuickBooks, Wave)
- [ ]  Watch YouTube videos if shared
- [ ]  Generate Stitch variations for both sub-sections
- [ ]  Share top picks in group chat
- [ ]  Implement after Temur approves direction

---

# Shared Task — Both Developers

---

## 7.11 — Dynamic Box System (Item Detail Drawer)

**Priority:** P0 MUST

**Depends on:** 7.3 (Sardor) and 7.6 (Munis) should be done first

**Split:** Sardor owns the drawer shell + Overview tab. Munis owns Shipment History, Cost History, and Warehouse Stock tabs.

**Why this matters:** The Item Detail Drawer is a 4-tab slide-out panel showing everything about an item. Since it combines warehouse data and cost data, both developers contribute.

**Mobbin Research (Drawer Shell):**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Linear | Web | Linear issue detail drawer panel | Right-side drawer with tabs. Slide-in animation, tab bar, content loading |
| Stripe Dashboard | Web | Stripe customer detail drawer | Metadata at top, tabbed content below. Key stats before tabs |
| Airtable | Web | Airtable record expand detail view | Expanded record: field-value pairs in scrollable panel |

**Mobbin Research (Shipment History — Expandable Rows):**

| Company | Platform | Search on Mobbin | What to Study |
| --- | --- | --- | --- |
| Amazon Seller | Web | Amazon seller shipment details expand | Parent row with summary, expanding reveals per-item breakdown |
| Shopify | Web | Shopify order line items detail | Nested product/variant information displayed compactly |
| Flexport | Web | Flexport container contents breakdown | Container contents with expandable cargo lines |

**Stitch Prompt:** "Design a slide-out detail drawer for an inventory item in a supply chain platform. 4 tabs: Overview (item stats), Shipment History (expandable rows with box configs), Cost History (line chart), Warehouse Stock (pallet breakdown table). Linear/Stripe aesthetic."

**Emotional Design:** Drawer slides from right with spring damping (Framer Motion: damping 25, stiffness 300). Tab switching uses horizontal slide. Cost chart draws-in on tab focus. Expandable rows use smooth height accordion. Expand arrow rotates 90°.

**Sardor's tasks:**

- [ ]  Research Mobbin — Drawer Shell (Linear, Stripe, Airtable)
- [ ]  Generate Stitch variations for the drawer layout
- [ ]  Build the drawer component, tab bar, and Overview tab

**Munis's tasks:**

- [ ]  Research Mobbin — Shipment History (Amazon Seller, Shopify, Flexport)
- [ ]  Generate Stitch variations for the expandable rows + chart tabs
- [ ]  Build the Shipment History, Cost History, and Warehouse Stock tabs

---

# Quick Reference: Top 3 Mobbin Companies per Section

| Section | Assigned To | Top 3 Mobbin References |
| --- | --- | --- |
| 7.1 Sidebar Nav | Sardor | Shopify Admin, Linear, Notion |
| 7.2 Dashboard Home | Sardor | Square, Stripe, Shopify |
| 7.3 Warehouse | Sardor | ShipBob, Flexport, Sortly |
| 7.4 Stores Overview | Sardor | Toast, Gusto, Square |
| 7.5 Order Tickets | Sardor | Instacart, Faire, ShipStation |
| 7.6 Cost Tracking | Munis | QuickBooks, Ramp, Gusto |
| 7.7 Invoice AI | Munis | Ramp, Dext, Expensify |
| 7.8 Analytics | Munis | Stripe, Mixpanel, Datadog |
| 7.9 Notifications | Munis | Slack, Linear, Figma |
| 7.10 Payments | Munis | Uber, Stripe, QuickBooks |
| 7.11 Item Drawer | Both | Linear, Stripe, Airtable |

---

# Google Stitch AI — Quick Start

1. Go to [**stitch.withgoogle.com**](http://stitch.withgoogle.com) and sign in with your Google account
2. Write a detailed prompt describing the section you are working on (prompts provided above in each task)
3. Generate 3-5 variations by tweaking the prompt slightly
4. Screenshot your favorites and share in group chat alongside Mobbin screenshots
5. **Never copy Stitch code into our codebase** — use it for visual layout ideas only

---

# YouTube Videos

Temur will share curated YouTube videos in the team group chat. When a video is shared:

1. **Watch the full video** — do not skip. Temur picked it for a reason
2. **Take notes** — screenshot relevant moments and share in chat
3. **Connect to your task** — think about how the pattern applies to your current section
4. **Ask questions** — if unsure how it applies, ask before building

> These are NOT optional. Watch them before starting work on the related section.
> 

---

# Acceptance Criteria

- [ ]  Every section has Mobbin research screenshots shared in group chat
- [ ]  Every section has at least 3 Stitch variations shared in group chat
- [ ]  All YouTube videos shared by Temur have been watched and noted
- [ ]  Temur has approved the design direction for each section before coding begins
- [ ]  Implemented UI uses Framer Motion for the emotional design notes specified
- [ ]  No Stitch code was copy-pasted — all implementations use our component patterns
- [ ]  Sardor and Munis have not worked on each other's track sections
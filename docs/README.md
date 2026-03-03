# Laza Documentation

Laza is an inventory management SaaS built for a dessert cafe chain. It includes a public-facing website (menu, catering, franchise inquiries) and an internal dashboard for managing inventory, storage spaces, employees, and locations across multiple cafe sites.

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Supabase project (with migrations applied)
- Clerk account (with organization roles configured)
- Resend account (for transactional emails)

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

RESEND_API_KEY=
```

### Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Next.js + Turbopack)
npm run build        # Production build
npm run lint         # Run ESLint
```

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | Tech stack, project structure, data layer patterns |
| [Database Schema](./database-schema.md) | All tables, columns, enums, relationships |
| [Authentication](./authentication.md) | Clerk auth, roles, middleware, webhooks |
| [Admin Dashboard](./admin-dashboard.md) | All admin features and page flows |
| [Employee Dashboard](./employee-dashboard.md) | All employee features and page flows |
| [Inventory Flow](./inventory-flow.md) | Quantity updates, alerts, audit trail |
| [Notifications](./notifications.md) | Email system, templates, edge functions |
| [Public Site](./public-site.md) | Public-facing pages overview |
| [API Reference](./api-reference.md) | All queries, mutations, and hooks |

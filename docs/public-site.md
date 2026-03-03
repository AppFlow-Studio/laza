# Public Site

The public-facing website is accessible without authentication and serves as the marketing and customer-facing presence for Laza Dessert Cafe.

## Pages

### Menu (`/menu`)

Displays the full dessert menu for Laza.

**Components**: `MenuHeader`, `MenuCategories`

**SEO**: Comprehensive meta tags and Schema.org structured data (JSON-LD) with:
- Restaurant type, locations, hours, phone numbers, amenities
- Keywords targeting both "Laza" and "Chocolate Factory" (former brand name)

**Business Info:**
- Two NYC locations: Brooklyn (6740 5th Ave) and Astoria (25-33 Steinway St)
- Open hours: 2:00 PM - 2:00 AM, 7 days a week

### About (`/about`)

Brand story and heritage of Laza Dessert Cafe.

**Content:**
- Mission: "Playful, indulgent desserts with a luxe twist"
- Signature items: kunafa, sweet crepes, matcha drinks, milkshakes, coffee
- Video gallery showing preparation (waffles, kunafa, latte)
- FAQ section

### Catering (`/catering`)

Promotes custom dessert catering services for events.

**Features:**
- Video background
- Target events: weddings, parties, corporate gatherings
- Services: custom dessert platters, wedding cakes, corporate catering
- Free consultation offered
- `OrderForm` component for catering inquiries
- Sends confirmation email on submission (via `SendCateringConfirmationEmail`)

### Join Us / Franchise (`/join-us`)

Franchise opportunity waitlist and inquiry form.

**Features:**
- Franchise inquiry form with Zod validation
- Current locations and benefits of franchising
- Benefits: proven concept, comprehensive support, unique menu, growing market
- On submission, sends two emails:
  - Customer confirmation (`LazaFranchiseWaitlistConfirmation`)
  - Admin notification (`LazaFranchiseWaitlistNotification`)
- Detailed inquiry covers: contact info, motivation, experience, financial readiness, timeframe, due diligence

### Checkout (`/checkout`)

Currently redirects to `/menu`. Checkout is not yet implemented. Marked as `noindex` for SEO.

### Privacy Policy (`/privacy-policy`)

Standard privacy policy page covering:
- Data collection and usage
- Information sharing practices
- Security measures
- Cookie usage
- User rights

Contact: privacy@lazacafe.com. Last updated: January 2025.

### Terms & Conditions (`/terms-conditions`)

Standard terms covering:
- Use license
- Ordering and payment
- Delivery
- Refunds
- Food safety (allergies and dietary restrictions)
- Intellectual property

Contact: legal@lazacafe.com. Last updated: January 2025.

## Shared Components

- **Navbar** — Site-wide navigation header
- **Footer** — Site footer with links and social media
- **Animation components** — Framer Motion-based transitions and scroll effects

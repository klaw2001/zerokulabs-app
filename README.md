# ZeroKulabs CRM

Internal CRM system for ZeroKulabs pharmaceutical lab. Manages chatbot leads, VAPI voice AI follow-up calls, staff schedules, and enquiries.

## Features

- **Dashboard** — Analytics with KPI cards, charts (Recharts), and Excel export
- **Users** — Staff management with roles, working hours, and availability
- **Leads** — Chatbot leads with VAPI voice call integration and conversation history
- **Enquiries** — General enquiry management with staff assignment

## Tech Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- shadcn/ui components
- PostgreSQL (via `pg`)
- VAPI.ai for outbound voice calls
- NextAuth.js (credentials provider)
- TanStack Table, Recharts, XLSX

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
# Fill in your DATABASE_URL, VAPI keys, NEXTAUTH_SECRET
```

Generate a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 3. Database setup

The existing `conversations` and `leads` tables must exist in your PostgreSQL database.

To create the new tables and seed the admin user, hit this endpoint after starting the server:

```bash
curl -X POST http://localhost:3000/api/setup
```

This creates:
- `vapi_calls` table
- `users` table (with admin user: `admin@zerokulabs.com` / `admin123`)
- `enquiries` table
- Adds `phone` column to `leads`

**Change the admin password after first login.**

### 4. VAPI Setup

1. Create a VAPI account at [vapi.ai](https://vapi.ai)
2. Create a phone number in the VAPI dashboard
3. Create an assistant configured for intent verification
4. Add your `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, and `VAPI_ASSISTANT_ID` to `.env.local`
5. After deployment, configure the webhook URL in VAPI dashboard:
   ```
   https://your-domain.com/api/vapi/webhook
   ```

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

**Default admin credentials:**
- Email: `admin@zerokulabs.com`
- Password: `admin123`

## API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth authentication |
| `/api/setup` | POST | Database migration + admin seed |
| `/api/analytics` | GET | Dashboard analytics data |
| `/api/users` | GET, POST, PUT, DELETE | Staff management |
| `/api/leads` | GET | Leads with VAPI call data |
| `/api/leads/[id]` | GET | Lead detail + conversation history |
| `/api/vapi/trigger-call` | POST | Initiate VAPI outbound call |
| `/api/vapi/webhook` | POST | VAPI webhook event handler |
| `/api/vapi/calls/[id]` | PUT | Update call intent/notes |
| `/api/enquiries` | GET, POST, PUT | Enquiry management |
| `/api/export` | GET | Excel export (`?type=leads` or `?type=enquiries`) |

## Database Schema

The CRM adds these tables to your existing database:

```sql
-- Staff accounts
CREATE TABLE users ( ... );

-- VAPI call tracking
CREATE TABLE vapi_calls ( ... );

-- General enquiries
CREATE TABLE enquiries ( ... );
```

## Role Access

| Role | Dashboard | Users | Leads | Enquiries |
|------|-----------|-------|-------|-----------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Receptionist | ✅ | — | ✅ | ✅ |
| Doctor | ✅ | — | ✅ (view) | ✅ (view) |
| Nurse | ✅ | — | — | ✅ |

## Deployment (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables
4. Deploy
5. Add VAPI webhook URL: `https://your-app.vercel.app/api/vapi/webhook`

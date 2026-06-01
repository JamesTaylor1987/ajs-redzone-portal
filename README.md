# AJS Redzone Hardware Portal

Customer-facing ordering portal for AJS Redzone hardware (control panels, sensors, accessories). Built on **Next.js 14 (App Router) + Supabase + Vercel**, in line with the URS v0.4 (1 June 2026).

This is **Phase 1, evening 1** scaffold. What works tonight:

- Database-driven product catalogue (Supabase)
- Currency toggle GBP ↔ EUR with FX margin (URS FR-04)
- Basket with localStorage persistence
- Checkout form (contact, delivery, project details, optional install request)
- Server-side quote submission writing to Postgres
- Auto-generated `Q[YY]-RZ[####]` reference per URS Section 4 (annual reset)
- Quote confirmation page

What's **not** built yet (later this week):

- Magic-link return flow (Section 3.1)
- Account Information capture at acceptance (FR-16/17)
- Email notifications (FR-12/13/22/23)
- Order status updates + trigger emails (FR-33/34)
- Dataverse direct API integration (Section 5)
- Admin back-office / Gareth + Mick stock management
- FOC override
- Power BI feed

---

## Tonight's deploy: 5 steps

### 1. Supabase — create the project (3 min)

1. Sign up at <https://supabase.com>.
2. Create a new project named `ajs-redzone-portal`, region **London (eu-west-2)**. Save the database password.
3. When the project is ready, go to **SQL Editor** → **New query**.
4. Open `supabase/01_schema.sql` from this repo, paste, Run.
5. Same again with `supabase/02_seed.sql`. You should see 18 product rows inserted.
6. Go to **Settings → API**. Copy these three values:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** key
   - **service_role** secret key

### 2. Local environment — install and run (5 min)

```bash
cd "/Users/jamestaylor/Documents/Claude/Projects/Redzone Ordering Site/ajs-redzone-portal"
cp .env.local.example .env.local
# Edit .env.local and paste in the three Supabase values from step 1.

npm install
npm run dev
```

Open <http://localhost:3000>. You should see the catalogue with the 18 SKUs. Add some to the basket, hit Checkout, fill the form, submit — you'll be redirected to `/quote/Q26-RZ0001`. Go check the `quotes` table in Supabase, the row should be there.

### 3. Push to GitHub (3 min)

```bash
git init
git add .
git commit -m "Initial scaffold: Next.js + Supabase + catalogue, basket, checkout, Q26-RZ references"

# Create an empty repo at github.com/<you>/ajs-redzone-portal (private)
git branch -M main
git remote add origin git@github.com:<your-username>/ajs-redzone-portal.git
git push -u origin main
```

### 4. Vercel — connect and deploy (5 min)

1. <https://vercel.com> → **Add New… → Project**.
2. Import the `ajs-redzone-portal` GitHub repo.
3. Framework: Next.js (auto-detected). Leave build settings as default.
4. **Environment Variables** — add all five from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel preview URL, e.g. `https://ajs-redzone-portal.vercel.app`)
   - `NEXT_PUBLIC_FX_GBP_TO_EUR=1.17`
5. **Deploy**.

You'll get a `https://ajs-redzone-portal.vercel.app` URL in 60 seconds.

### 5. Smoke test the live deploy (2 min)

1. Open the Vercel URL.
2. Add 1× Siemens 8 I/O panel + 1× LRZ sensor to the basket.
3. Fill in the checkout form with your real email.
4. Submit. You should land on `/quote/Q26-RZ0001`.
5. In Supabase, check `quotes` and `quote_items` — row should be there.

If it all worked: **portal is live**. Tell Steve.

---

## When Marketing confirms the subdomain

Once Nathan signs off on `redzone.ajsspalding.co.uk`:

1. In Vercel → Project → Settings → Domains, add `redzone.ajsspalding.co.uk`.
2. Vercel shows you a CNAME record. Add it at your DNS provider.
3. SSL provisions automatically. Update `NEXT_PUBLIC_APP_URL` env var to the new URL.

---

## Project structure

```
ajs-redzone-portal/
├── src/
│   ├── app/
│   │   ├── layout.tsx              Global layout, Arial font, AJS metadata
│   │   ├── globals.css             Brand colour vars + Tailwind base
│   │   ├── page.tsx                Catalogue (server component, fetches from Supabase)
│   │   ├── api/quotes/route.ts     POST endpoint that allocates ref + writes quote
│   │   └── quote/[ref]/page.tsx    Confirmation page after submission
│   ├── components/
│   │   ├── PortalApp.tsx           Client wrapper: cart state, browse↔checkout flow
│   │   ├── Header.tsx              Brand header, currency toggle, basket button
│   │   ├── ProductGrid.tsx         Filterable panel + add-on grid
│   │   ├── CartDrawer.tsx          Side-drawer basket
│   │   └── CheckoutForm.tsx        Contact, delivery, project, install request
│   └── lib/
│       ├── types.ts                Domain types
│       ├── format.ts               Money + FX helpers (all pence)
│       ├── supabase-server.ts      Service + public Supabase clients (server)
│       └── supabase-browser.ts     Browser client (anon)
├── supabase/
│   ├── 01_schema.sql               Tables, indexes, ref allocator function, RLS
│   └── 02_seed.sql                 18 SKUs from Redzone_Costs_1.xlsx
├── next.config.mjs
├── tailwind.config.ts
├── package.json
└── .env.local.example
```

---

## Design notes (so future-you isn't confused)

**Money is pence.** Every monetary column is `bigint` pence in GBP. EUR is a display-only conversion computed client-side from the snapshotted FX rate. Never store floats.

**Quote refs come from Postgres.** `allocate_quote_ref()` reads the per-year sequence, increments atomically, and returns the formatted string. Annual reset is built in — at midnight on 1 January 2027 it'll start emitting `Q27-RZ0001`.

**Server re-prices on submit.** The `/api/quotes` handler doesn't trust client prices — it looks each SKU up in `products` and recalculates. Snapshots the unit price onto `quote_items` per URS FR-44.

**Catalogue is read-public, everything else is server-only.** RLS is on; `products` has a read-only `active=true` policy. `quotes` and `quote_items` have no public policies — only the service role key (server side) can read or write them. That stops anyone in the browser from listing other people's quotes.

**No customer login by design.** URS Section 3.1 mandates the magic-link model. Tonight's build stops short of the return flow — quotes submit and confirm, but the email + magic-link verification step lands in the next push.

---

## Known gaps / TODO list before week 1 sign-off

- **Email sending** (`/api/quotes/route.ts` writes the DB, doesn't email anyone yet). Provider: Resend is fastest; Microsoft Graph is AJS-aligned but needs IT to enable Mail.Send on the Azure AD app.
- **Magic-link generation + return route** (`/quote/[ref]/edit?token=…`).
- **Account Information form** at acceptance (FR-16/17), based on `CA-AC-0006`.
- **Dataverse integration** — server-side `lib/dataverse.ts`, called from quote submit and status changes.
- **Admin back-office** — `/admin/orders`, `/admin/products`, FOC toggle, magic-link resend.
- **Stock + lead-time edit UI** for Gareth & Mick.
- **Live FX rate** instead of the `NEXT_PUBLIC_FX_GBP_TO_EUR` placeholder.
- **Real product photography** to replace the SKU-placeholder squares.

---

## Brand

All UI uses AJS brand:

- Primary Blue `#1886a1`
- Dark Blue `#05618e`
- Darker Navy `#03415f` (header gradient)
- Light Grey `#e6ebed`
- Font: Arial

Configured in `tailwind.config.ts` and `globals.css`.

---

Built in collaboration with Claude. Anything that looks wrong — change it. The scaffold is a starting point, not a contract.

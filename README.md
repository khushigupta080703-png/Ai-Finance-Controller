AI Finance Controller — Multi-Source Reconciliation

Live demo: https://ai-finance-controller-f7u8aru4m-khushi-s.vercel.app/dashboard Track: AI Finance Controller — Multi-source reconciliation

The problem

Small businesses reconcile invoices against bank payments by hand — checking whether every invoice sent actually got paid, and flagging the ones that didn't. It's slow, error-prone, and doesn't scale past a handful of transactions a month.

This project builds an agent that closes that loop automatically: it takes a batch of invoices and bank payments, matches them, and reports both a measured match rate and an honest list of the ones it couldn't resolve.

What it does
Runs against a synthetic batch of 55 invoices and their corresponding bank payments (with intentional mismatches built in: missing payments, partial payments, and timing shifts).
Matches every invoice to a payment, or reports why it couldn't.
Reports a live match rate (currently ~85%) and a full exception list with a plain-language reason for every unresolved case.
Architecture — a two-pass agent

This is the core design decision, and it's deliberate:

Pass 1 — Deterministic exact match (no AI). Every invoice is first checked against payments for an exact match on reference number, amount, and date. ~72% of invoices resolve here. This is instant, free, and 100% reliable — there's no reason to spend an AI call on something a simple lookup can answer correctly.

Pass 2 — AI reasoning, only for ambiguous cases. The remaining ~28% (missing reference numbers, slightly-off dates, partial payments) go to a Groq-hosted LLM (openai/gpt-oss-120b), which is given the invoice plus its top candidate payments and asked to reason about whether any of them is a legitimate match, with explicit tolerance rules (±2% amount, ±5 days for bank clearing delay) and a required confidence score and explanation.

This split matters: it keeps the system fast and cheap (only ~15 of 55 invoices ever hit the AI), and it means every "exception" comes with a reason a human can actually act on, not just a boolean flag.

Tech stack
Next.js (App Router) + Tailwind + shadcn/ui
Prisma ORM + Postgres (Neon, serverless)
Groq API (openai/gpt-oss-120b) for the reasoning pass
Running it locally
bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

You'll need a .env file with:

DATABASE_URL="your-postgres-connection-string"
GROQ_API_KEY="your-groq-key"

Then open http://localhost:3000/dashboard and click "Run Reconciliation Agent".
![Architecture](./public/architecture-diagram.svg)

What broke, and how I got out

A few things went sideways during the build, and fixing them was as much part of the project as the reconciliation logic itself:

Prisma's CLI changed underneath me. prisma init on the version that installed by default no longer creates a schema.prisma file — it's shifted toward a new cloud-first "Developer Platform" CLI with commands like deploy and dev instead of the classic migrate dev I needed. Rather than fight an unfamiliar tool mid-build, I diagnosed the version mismatch and pinned the project to prisma@5.22.0 / @prisma/client@5.22.0, which restored the standard local-development workflow the rest of my setup depended on.

Local SQLite doesn't survive a serverless deploy. The app worked perfectly with a local SQLite file until I deployed to Vercel — SQLite can't persist across serverless invocations. I migrated the schema to Postgres (Neon), which meant regenerating the migration history from scratch (P3019 provider mismatch) and debugging an initial P1001 connection timeout that turned out to be a flaky network path rather than a config error.

A leftover config file broke the production build, not the dev server. next dev ran fine, but Vercel's build failed on prisma.config.ts — a file left behind from an earlier, incompatible Prisma version, invisible locally because dev mode doesn't type-check as strictly. Removing it fixed the build.

Takeaway: most of the debugging here wasn't about the AI logic — it was ordinary full-stack plumbing (tool versioning, environment parity between local and production, PATH/shell configuration on Windows). Being methodical about isolating where a failure was happening (build-time vs runtime, local vs deployed) was what got each one fixed.

Honest limitations
The synthetic data generator introduces a fixed set of mismatch patterns (missing payment, partial payment, reference-missing). Real bank statements will have messier variety — different date formats, multi-invoice payments, currency differences — that this version doesn't yet handle.
Confidence scoring on the "no match" path could be more consistent — a couple of exceptions currently report low confidence despite a clearly-reasoned explanation, which I'm still tuning in the prompt.
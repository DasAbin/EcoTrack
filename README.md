# EcoTrack - Personal and Community Eco-Impact Analyzer

EcoTrack helps users turn everyday habits into measurable climate impact.
Instead of filling long forms, users describe their day in plain language, and the app converts it into a structured eco score with practical improvement tips.

## Problem

Environmental awareness is high, but action is low. Most people cannot easily:

- quantify their daily CO2 impact,
- track progress over time,
- compare improvement fairly with peers.

Generic calculators are often manual-heavy and not adapted to the Indian context.

## Solution

EcoTrack is a web app where users can:

1. describe daily activities in natural language,
2. get an AI-generated activity breakdown,
3. receive an Eco Score and personalized suggestions,
4. track weekly/monthly trends,
5. compete on organization-level leaderboards ranked by "Most Improved".

## Core Features

- AI Natural Language Input (Gemini-powered extraction)
- Eco Score Engine using India-relevant emission factors
- Personalized improvement suggestions (3 per session)
- History dashboard with trend charts
- Community leaderboards by organization
- Multi-tenant org model for colleges and companies (`/org/[slug]`)

## Tech Stack

- Frontend and API: Next.js (App Router), React, TypeScript
- UI: Tailwind CSS, shadcn/ui
- Auth and Database: Supabase (PostgreSQL)
- AI Layer: Gemini API
- Charts: Recharts
- Deployment: Vercel

## Emission Factors (Current)

- Electricity: `0.82 kg CO2/kWh` (CEA India 2023)
- Car travel: `0.21 kg CO2/km` (IPCC AR6)
- Two-wheeler: `0.05 kg CO2/km` (IPCC AR6)
- Bus travel: `0.089 kg CO2/km` (IPCC AR6)
- Plastic item: `6 kg CO2e` (UNEP 2023 proxy)
- Water: `0.0003 kg CO2/litre` (WHO reference proxy)

## Data Model

High-level entities:

- `orgs`: institution or company records
- `profiles`: users mapped to orgs
- `scores`: daily entries with raw input, extracted fields, score breakdown, and tips

Leaderboard logic is based on rolling score-change metrics to reward improvement, not privilege.

## User Flow

```text
Sign up -> Join org via slug -> Describe day in plain text
-> AI extracts activity data -> Eco Score calculated
-> Suggestions shown -> Session saved -> Leaderboard updates
```

## Getting Started

### 1) Prerequisites

- Node.js 20+ (Node 22 recommended)
- npm 10+
- Supabase project (URL + anon key)
- Gemini API key

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment variables

Create a `.env` or `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 4) Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` - start local development server
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run seed` - run seed script

## Project Structure (High Level)

- `src/app` - routes, pages, API handlers
- `src/lib` - shared business logic and clients
- `scripts` - utility scripts (including seed)
- `supabase` - Supabase artifacts and setup

## Deployment

Recommended deployment target: Vercel.

Set the same environment variables in Vercel project settings, then deploy from `main`.

## Impact and Relevance

EcoTrack aligns with:

- UN SDG 12 (Responsible Consumption and Production)
- UN SDG 13 (Climate Action)
- institution-level sustainability reporting use cases

## Roadmap

- Maps-based commute auto-detection
- OCR for electricity bill import
- smarter behavioral insights
- city-level and campus-level dashboards

## License

Add a `LICENSE` file and update this section with your preferred license.

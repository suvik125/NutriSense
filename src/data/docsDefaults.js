// Pre-populated NutriSense & DIU_Coderunners Pitch Deck + Technical Documentation defaults

export const DEFAULT_DOCS_ACCESS = {
  visibilityEnabled: true,
  scheduleMode: 'always', // 'always' | 'scheduled' | 'duration'
  startAt: '',
  endAt: '',
  durationHours: 72,
  publishedAt: '2026-11-19T00:00:00.000Z',
};

export const DOCS_NAV_ITEMS = [
  { id: 'docs-pitch', label: 'A. Pitch Deck', group: 'Pitch Deck', keywords: 'yc problem solution why now market traction business competition vision' },
  { id: 'docs-team', label: 'Team: DIU_Coderunners', group: 'Pitch Deck', keywords: 'diu coderunners members tanisha suvik shihab kawsar musfiq github' },
  { id: 'docs-overview', label: 'B. Product Overview', group: 'Documentation', keywords: 'users students fitness goals use cases' },
  { id: 'docs-features', label: 'C. Feature Matrix', group: 'Documentation', keywords: 'live beta planned biometrics macro planner scanner reminders chatbot' },
  { id: 'docs-architecture', label: 'D. Architecture Diagram', group: 'Documentation', keywords: 'vite supabase postgresql gemini vercel edge architecture' },
  { id: 'docs-dataflow', label: 'E. Data Flow Diagram', group: 'Documentation', keywords: 'biometrics engine persistence meal plan context feedback' },
  { id: 'docs-stack', label: 'F. Technology Stack', group: 'Documentation', keywords: 'javascript html5 css3 vite supabase gemini vercel github' },
  { id: 'docs-api', label: 'G. API Documentation', group: 'Documentation', keywords: 'supabase queries upserts gemini generatecontent fallback' },
  { id: 'docs-data', label: 'H. Data Layer & RLS', group: 'Documentation', keywords: 'schema user_profiles user_health_profiles nutrition_targets rls privacy' },
  { id: 'docs-ai', label: 'I. AI Layer', group: 'Documentation', keywords: 'gemini flash context injection allergies illness generateAssistantReply' },
  { id: 'docs-roadmap', label: 'J. Product Roadmap', group: 'Documentation', keywords: 'mvp bangladeshi food barcode wearable mobile' },
  { id: 'docs-ops', label: 'K–M. Perf, Security & Analytics', group: 'Documentation', keywords: 'performance scalability security privacy analytics telemetry' },
  { id: 'docs-changelog', label: 'N–O. Contributors & Changelog', group: 'Documentation', keywords: 'v1.0.0 hackathon release contributors diu' },
];

export const DEFAULT_DOCS_CONTENT = {
  meta: {
    productName: 'NutriSense',
    tagline: 'AI-Powered Personalized Nutrition, Meal Planning & Fitness Companion',
    event: 'International AI Builders Congress 2026 (CloudCampBD)',
    teamName: 'DIU_Coderunners',
    university: 'Software Engineering Students · Daffodil International University (DIU)',
    version: 'v1.0.0 — Hackathon Release',
    appUrl: 'https://nutri-sense-gamma.vercel.app',
  },
  pitch: {
    slides: [
      {
        id: 'problem',
        label: '01 · Problem',
        title: 'Generic calorie trackers fail local diets and real-world health needs',
        body: 'Mainstream diet apps overwhelm users with cluttered spreadsheets, inaccurate Western food defaults, and rigid calorie formulas that ignore allergies, recovery states, and local Bangladeshi dietary patterns.',
        bullets: [
          'Over 70% of new calorie-tracker users drop off within 14 days due to repetitive manual entry.',
          'Traditional South Asian dishes (khichuri, ruti, bhorta, fish curry) lack accurate macro & portion baselines.',
          'Existing trackers break completely when a user gets a fever, cold, sore throat, or stomach upset.',
        ],
      },
      {
        id: 'solution',
        label: '02 · Solution',
        title: 'One-time smart onboarding with adaptive meal plans & AI guidance',
        body: 'NutriSense captures biometrics once after sign-in and transforms them into living calorie, macro, and micronutrient targets—driving a culturally authentic 7-day planner, dish scanner, food log, and context-aware nutrition assistant.',
        bullets: [
          'One-time post-sign-in biometrics onboarding synced permanently with Supabase.',
          'Mifflin-St Jeor macro & micronutrient calculator adjusting for Hypertension, Diabetes, PCOS, High Cholesterol, and Anemia.',
          'Instant "I\'m Feeling Unwell" recovery mode that swaps weekly meals to gentle Bangladeshi comfort dishes.',
        ],
      },
      {
        id: 'why-now',
        label: '03 · Why Now',
        title: 'Lightweight Gemini models + serverless Postgres unlock accessible clinical-grade UX',
        body: 'Fast, low-cost Gemini Flash APIs combined with Supabase Row-Level Security allow a student engineering team to ship sub-second personalized coaching and real-time multi-device sync with zero infrastructure overhead.',
        bullets: [
          'Low-latency Gemini Flash inference fits within mobile-first conversational budgets.',
          'Serverless PostgreSQL + Auth enables persistent profiles from day one.',
          'Rising preventive health awareness among university students and young professionals in Bangladesh.',
        ],
      },
      {
        id: 'demo',
        label: '04 · Product Demo',
        title: 'End-to-end daily companion from onboarding to dish logging',
        body: 'Explore the live NutriSense workflow: complete your biometric profile once, review live calorie rings and BMI gauges, swap Bangladeshi meals across Mon–Sun, scan dishes in the photo analyzer, and chat with NutriSense AI.',
        bullets: [
          'Live Calculator with instant cm/ft-in and kg/lb unit switching.',
          'Interactive 7-day Bangladeshi meal planner with 5 illness-recovery modes.',
          'My Foods dashboard with 7-day and 30-day macro intake charts plus smart hydration reminders.',
        ],
      },
      {
        id: 'market',
        label: '05 · Market Opportunity',
        title: 'Built first for Bangladesh & South Asia’s digital wellness wave',
        body: 'Serving 35M+ urban smartphone users, university students, and gym-goers across Bangladesh before expanding to broader South Asian diasporas who remain underserved by Western nutrition apps.',
        bullets: [
          'Initial Wedge: 4.5M+ Bangladeshi university students and young professionals tracking weight and fitness.',
          'Expansion Market: South Asian preventive nutrition & chronic condition management (hypertension, diabetes).',
          'Underserved by US/EU apps lacking local portion intuition and recovery workflows.',
        ],
      },
      {
        id: 'business-model',
        label: '06 · Business Model',
        title: 'Freemium core with Pro coaching & institutional wellness tiers',
        body: 'Keep biometrics calculation, daily food logging, and core Bangladeshi meal plans free to drive organic campus adoption while monetizing multimodal AI scanning and dietitian-backed plans.',
        bullets: [
          'Free Tier: Calculator, 7-day local meal planner, hydration alerts, and rule-based assistant.',
          'NutriSense Pro ($3/mo localized): Unlimited Gemini vision food scans, custom macro exports, and 30-day analytics.',
          'B2B Campus & Gym Partnerships: Co-branded member onboarding for fitness centers and university clinics.',
        ],
      },
      {
        id: 'traction',
        label: '07 · Traction & Readiness',
        title: 'Production web app deployed with full Supabase persistence & Gemini AI',
        body: 'Built and shipped by DIU_Coderunners for the International AI Builders Congress 2026 with automated unit tests, real PostgreSQL RLS schemas, and verified end-to-end user journeys.',
        bullets: [
          'Full 9-table Supabase PostgreSQL schema with strict Row-Level Security.',
          '32+ curated regular and recovery Bangladeshi meal templates with allergen guards.',
          'Deployed live on Vercel with responsive dark/light modes and browser notification reminders.',
        ],
      },
      {
        id: 'competition',
        label: '08 · Competition & Edge',
        title: 'Culturally native recovery adaptation beats bloated global logs',
        body: 'Unlike MyFitnessPal or HealthifyMe, NutriSense never buries new users under ads or raw databases—combining one-time setup, illness-aware swaps, and deterministic AI fallback in a fast ES-module bundle.',
        bullets: [
          'Zero ad clutter and clean single-screen onboarding.',
          'Dedicated illness recovery nutrition modes (Fever, Cold, Sore Throat, Stomach Upset, Fatigue).',
          'Resilient hybrid AI layer: Gemini Flash API enhanced with deterministic offline fallback.',
        ],
      },
      {
        id: 'gtm',
        label: '09 · Go-To-Market',
        title: 'Campus-first seeding from DIU across Dhaka fitness & student communities',
        body: 'Launch directly with DIU student clubs, university hostels, and local Dhaka gyms through shareable meal plans, QR code demo challenges, and nutrition micro-guides.',
        bullets: [
          'Phase 1: Daffodil International University (DIU) student & athletics pilot.',
          'Phase 2: Dhaka fitness studio partnerships and campus health ambassadors.',
          'Phase 3: Open Bangladeshi nutrition contributor catalog driven by community submissions.',
        ],
      },
      {
        id: 'vision',
        label: '10 · Long-Term Vision',
        title: 'The everyday personalized metabolic companion for South Asia',
        body: 'Bridge everyday kitchen staples with clinical-informed nutrition science—evolving into a seamless companion connecting wearable recovery signals, smart grocery lists, and culturally faithful AI coaching.',
        bullets: [
          'Hyper-local South Asian barcode & household bowl portion database.',
          'Wearable sleep/HRV integration to trigger fatigue & hydration adaptations automatically.',
          'Trusted companion for proactive family meal planning across generations.',
        ],
      },
    ],
  },
  team: [
    {
      id: 'tanisha',
      name: 'Tahsin Rahman Tanisha',
      role: 'Frontend & UI/UX Developer Lead',
      github: 'o7-Tanisha',
      email: 'tanisha.diu.swe@example.com',
      photoUrl: '',
      bio: 'Leads responsive dark/light UI systems, interactive charts, onboarding flows, and mobile accessibility across NutriSense.',
    },
    {
      id: 'suvik',
      name: 'Suvik Sarker Ronggon',
      role: 'Backend & Database Engineer',
      github: 'suvik125',
      email: 'suviksarkerronggon@gmail.com',
      photoUrl: '',
      bio: 'Architects Supabase PostgreSQL schemas, Row-Level Security policies, auth hydration, and workspace synchronization.',
    },
    {
      id: 'shihab',
      name: 'Saifur Shihab',
      role: 'AI Integration and Computer Vision',
      github: 'srs480',
      email: 'shihab.diu.swe@example.com',
      photoUrl: '',
      bio: 'Develops Gemini AI contextual prompting, dish photo analysis pipelines, and deterministic nutrition fallback engines.',
    },
    {
      id: 'kawsar',
      name: 'Kawsar Bhuiyan',
      role: 'Product Research & Testing Lead',
      github: 'kawsar3354802',
      email: 'kawsar.diu.swe@example.com',
      photoUrl: '',
      bio: 'Drives Bangladeshi dietary portion research, fitness goal calibration, user journey validation, and unit test coverage.',
    },
    {
      id: 'musfiq',
      name: 'Musfiq Faisal',
      role: 'Documentation & Quality Assurance Lead',
      github: 'mousefixbugs',
      email: 'musfiq.diu.swe@example.com',
      photoUrl: '',
      bio: 'Owns QA verification, end-to-end regression suites, technical documentation architecture, and pitch readiness.',
    },
  ],
  features: [
    {
      name: 'One-Time Biometrics Onboarding',
      status: 'Live',
      scope: 'Auth + Profile',
      summary: 'Detects first-time Supabase logins without auto-seeding defaults and opens a persistent profile setup modal.',
    },
    {
      name: 'Calorie, Macro & Micro Engine',
      status: 'Live',
      scope: 'Calculator',
      summary: 'Mifflin-St Jeor BMR/TDEE computation with condition adjustments (Diabetes, Hypertension, PCOS, Anemia) and cm/ft-in + kg/lb toggles.',
    },
    {
      name: 'Adaptive Weekly Meal Planner',
      status: 'Live',
      scope: 'Meal Plan',
      summary: '7-day Bangladeshi meal schedule with allergen filtering and 5 instant illness-recovery modes.',
    },
    {
      name: 'My Foods Dashboard & Logs',
      status: 'Live',
      scope: 'Tracking',
      summary: 'Daily food log search/filter, 7-day & 30-day macro trend charts, and Supabase persistence.',
    },
    {
      name: 'AI Dish Photo Scanner',
      status: 'Beta',
      scope: 'Scanner',
      summary: 'Visual dish recognition with portion multiplier (0.5x–1.5x), allergen conflict checks, and one-click logging.',
    },
    {
      name: 'Smart Hydration & Meal Reminders',
      status: 'Live',
      scope: 'Notifications',
      summary: 'Daily water counter (0/8 glasses), 2-hour hydration alerts, quiet hours, Web Notification API pushes, and Web Audio chime.',
    },
    {
      name: 'Gemini Nutrition Assistant',
      status: 'Live',
      scope: 'AI Layer',
      summary: 'Context-aware Gemini Flash assistant injecting user targets and illness state with deterministic local rule fallback.',
    },
    {
      name: 'Bangladeshi Barcode & Wearable Sync',
      status: 'Planned',
      scope: 'Roadmap',
      summary: 'Packaged local food barcode lookup and smartwatch recovery telemetry.',
    },
  ],
  techStack: [
    {
      layer: 'Frontend',
      stack: 'Vanilla JavaScript (ES Modules), HTML5, Tailwind CSS v4, Vite',
      details: 'Modular state-driven views without framework bloat, dual light/dark theme tokens, custom SVG macro charts, and responsive mobile bottom capsule navigation.',
    },
    {
      layer: 'Backend & Database',
      stack: 'Supabase (Auth + PostgreSQL + RLS)',
      details: 'Email/password authentication with 9 relational tables (user_profiles, user_health_profiles, nutrition_targets, meal_plans, food_logs, notifications, ai_chat_messages).',
    },
    {
      layer: 'AI Layer',
      stack: 'Google Gemini AI API (Gemini Flash / 3.5-flash-lite) + Local Fallback',
      details: 'Live Gemini generateContent calls enriched with user calories, protein goals, and active illness state, gracefully degrading to generateAssistantReply.',
    },
    {
      layer: 'Hosting & CI/CD',
      stack: 'GitHub + Vercel Edge Network',
      details: 'SPA rewrites via vercel.json ensuring direct refresh on /docs, /login, and /myfoods never yields a 404.',
    },
  ],
  technicalSections: {
    productOverview:
      'NutriSense is built for university students, young professionals, fitness enthusiasts, and households managing weight, hypertension, blood sugar, or seasonal recovery. Users calculate science-backed targets in under 60 seconds, generate a culturally familiar Bangladeshi weekly meal plan, log meals visually or manually in My Foods, and receive smart hydration and meal reminders aligned with quiet hours.',
    apiDocs:
      '1) Supabase Data Service (`src/services/supabaseDb.js`): Uses `@supabase/supabase-js` `.from().select().eq().maybeSingle()` on login to hydrate user workspaces (`user_profiles`, `user_health_profiles`, `nutrition_targets`, `meal_plans`, `meal_plan_items`, `food_logs`, `notification_preferences`, `notifications`, `ai_chat_messages`). Profile saves execute atomic parallel `.upsert(..., { onConflict: "user_id" })` mutations via `upsertProfileHealthAndTargets` and `upsertMealPlanAndItems`.\n\n2) Gemini Assistant Endpoint (`src/data/catalog.js`): `generateAssistantReply(userMessage, state)` calls Gemini `generateContent` using `VITE_GEMINI_API_KEY`, passing target calories, protein grams, and active illness mode as system context. When offline or unconfigured, it executes local deterministic guidance automatically.',
    dataLayer:
      'PostgreSQL Schema (`supabase/migrations/001_nutrisense_schema.sql`): Stores user identity (`user_profiles`), biometric onboarding & allergies (`user_health_profiles`), computed macro/micronutrient targets (`nutrition_targets`), 7x4 weekly meal schedules (`meal_plans` + `meal_plan_items`), daily entries (`food_logs`), reminders (`notification_preferences` + `notifications`), and conversation history (`ai_chat_messages`). Every table enforces `auth.uid() = user_id` Row-Level Security (RLS) so each account strictly isolates its personal health data. Docs admin metadata stays isolated in `localStorage` so public `/docs` edits never touch production user tables.',
    aiLayer:
      'NutriSense’s AI architecture pairs Gemini Flash natural language generation with live application state injection. Before every request, the assistant builder reads `nutritionTargets.targetCalories`, `nutritionTargets.proteinG`, and `profile.illnessMode` directly from the client store to personalize answers for Bangladeshi staple foods (e.g., khichuri, ruti, dal, grilled fish) alongside safety disclaimers. If an API key is absent or rate-limited, the local rule-based matcher (`generateAssistantReply`) ensures zero broken responses.',
    roadmap:
      '• Short-Term (Hackathon MVP): Complete biometrics onboarding, Mifflin-St Jeor nutrition calculator, 5 Bangladeshi recovery meal modes, My Foods dashboard, smart hydration notifications, and live `/docs` pitch portal.\n• Mid-Term (3–6 Months): Expand local Bangladeshi packaged food & restaurant nutrition database, barcode scanning, and Bengali voice/text food logging.\n• Long-Term (6–12 Months): Wearable sleep/step sync (Apple Health / Health Connect), smart weekly grocery list exports, and dietitian review workspaces.',
    performance:
      'Built on lightweight ES Modules and Vite tree-shaking with zero heavy runtime UI frameworks. Macro donut rings, BMI gauges, and weekly trend charts render as pure inline SVGs (`src/utils/charts.js`), delivering instantaneous transitions and minimal bundle footprint over campus mobile networks.',
    security:
      'All personal biometrics, food logs, and chat transcripts are protected behind Supabase Auth JWT sessions and Postgres RLS policies (`auth.uid() = user_id`). First-time sign-in avoids seeding synthetic user health profiles before consent. The `/docs` Admin Editor and visibility scheduler are gated behind an admin passcode so hackathon judges view a clean read-only showcase.',
    analytics:
      'Real-time client telemetry inside `/docs` safely inspects NutriSense’s live store and food catalog—surfacing total curated Bangladeshi meal templates, recovery slots, supported clinical conditions, allergen filters, active session mode, and user calorie target without exposing sensitive user credentials.',
    contributors:
      'Developed collaboratively by Team DIU_Coderunners (Department of Software Engineering, Daffodil International University — DIU) for the International AI Builders Congress 2026 hosted by CloudCampBD.',
    changelog:
      'v1.0.0 — Hackathon Release (DIU_Coderunners · Nov 2026)\n• Launched one-time post-sign-in Profile Setup modal backed by Supabase `user_health_profiles` detection.\n• Added authentic Bangladeshi meal catalog & 5 illness recovery modes (Fever, Cold, Stomach Upset, Sore Throat, Fatigue).\n• Integrated smart hydration counter (0/8 glasses), Web Notification API push alerts, and Web Audio chime.\n• Wired Gemini AI assistant with local deterministic fallback and live `/docs` YC Pitch Deck + Admin portal.',
  },
};

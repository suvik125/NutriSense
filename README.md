# 🥗 NutriSense — AI-Powered Nutrition, Meal Planning & Agentic RAG Copilot

**NutriSense** is a full-stack, AI-driven nutrition intelligence web application tailored for **South Asian (Bangladeshi) and global diets**. It combines real-time computer vision food scanning (`YOLOv8n` ONNX), adaptive 7-day illness-recovery meal planning, automated biometric calculations, one-click A4 PDF health reporting, and a grounded **Agentic RAG AI Copilot** capable of controlling the entire application via natural language.

🌐 **Live Demo:** [https://nutri-sense-gamma.vercel.app](https://nutri-sense-gamma.vercel.app)

![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Gemini API](https://img.shields.io/badge/Gemini_2.5_Flash-4285F4?style=flat&logo=google&logoColor=white)
![ONNX / YOLOv8](https://img.shields.io/badge/YOLOv8n_ONNX-005CED?style=flat&logo=onnx&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase_Postgres-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel_Serverless-000000?style=flat&logo=vercel&logoColor=white)

---

## ✨ Key Features

### 🤖 Agentic RAG AI Copilot (`RAG + Live System Control`)
* **Grounded Knowledge Retrieval:** Indexes the app's live user profile, daily logs, hydration stats, `MEAL_CATALOG`, `YOLO_NUTRITION_DB`, and `RECOVERY_MEALS` into cited context chunks (`[S1]`, `[S2]`, ...).
* **Multilingual Support:** Responds naturally in **English, Bangla, and Banglish** based on the user's input.
* **Live App Control:** Executes real-time actions directly from chat—switching views, toggling Dark/Light theme, activating Illness Recovery Modes, logging water/meals, swapping or regenerating meal plans, and triggering PDF exports.
* **Allergy Safety Guardrails:** Automatically cross-checks dish allergens against the user's profile and flags conflicts.
* **Zero-Crash Local Fallback:** Automatically falls back to deterministic local RAG responses if the upstream LLM is unreachable.

### 📸 AI Food Photo Scanner (`YOLOv8n` ONNX)
* Detects and classifies South Asian & global dishes directly from food photos using `YOLOv8n` Pretrained and `YOLOv8n Custom South Asian & Global Food-20` ONNX models.
* Estimates calories, protein, carbs, fat, and fiber, with one-tap logging into daily intake history.

### 🗓️ Adaptive 7-Day Meal Planner & Illness Recovery Modes
* Generates balanced weekly meal plans featuring realistic local dishes (e.g., *Bhuna Khichuri*, *Rui Fish Curry*, *Kacchi Biryani*) alongside international options.
* **Illness Recovery Adaptation:** Instant meal plan recalibration for **Fever**, **Cold & Congestion**, **Stomach Upset**, **Sore Throat**, and **Fatigue**.
* Supports single-slot meal swapping (`Breakfast`, `Lunch`, `Snack`, `Dinner`) and per-day or full-week regeneration.

### 🧮 Biometric Nutrition Calculator & Dashboard
* Calculates **BMR, TDEE, BMI**, and personalized daily macro targets using the **Mifflin-St Jeor** equation.
* Tracks live daily calorie consumption, remaining macros, and hydration progress (water glasses).

### 📄 Zero-Dependency A4 PDF Export
* Generates clean, print-ready A4 PDF reports directly in the browser via isolated hidden-iframe rendering—no heavy client-side PDF libraries required.
* Supports **Weekly Meal Plan**, **Food Logs**, **Nutrition Profile**, and **Full Health Report** exports from both the UI and chat commands.

### 🔐 Zero-Leak Security Architecture
* Client-side bundles never expose `GEMINI_API_KEY`.
* All production AI calls route through a **Vercel Serverless Proxy (`/api/chat`)** equipped with **Auto-Model Discovery** to prevent model deprecation `404` failures.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────┐
│                    Browser (Vanilla JS + Vite)                     │
│                                                                    │
│  UI Views (Home · Calculator · Planner · Scanner · My Foods)       │
│        │                                       ▲                   │
│        ▼                                       │ Live State Sync   │
│  ragChatbot.js ──► ragKnowledgeBase.js         │ (store.js)        │
│        │            (Catalog + YOLO DB +       │                   │
│        │             Recovery + Live State)    │                   │
│        ▼                                       │                   │
│  ragChatbotService.js ──► Action Executor ─────┴──► pdfExport.js   │
│        │                  (Navigate, Theme,          (A4 Print)    │
│        │                   Illness, Logs, Swap)                    │
└────────┼───────────────────────────────────────────────────────────┘
         │ POST /api/chat (Prompt only — No API Key in browser)
         ▼
┌────────────────────────────────────────────────────────────────────┐
│               Vercel Serverless Function (api/chat.js)             │
│  • Reads process.env.GEMINI_API_KEY & process.env.GEMINI_MODEL     │
│  • Auto-discovers active Flash models on fallback                  │
│  • Returns strict JSON { reply, actions, mode }                    │
└────────┬───────────────────────────────────────────────────────────┘
         │ HTTPS (Server-to-Server)
         ▼
┌──────────────────────────────┐     ┌───────────────────────────────┐
│  Google Gemini API           │     │  Supabase (PostgreSQL)        │
│  (gemini-2.5-flash)          │     │  User profiles & food logs    │
└──────────────────────────────┘     └───────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES Modules), HTML5, Vite, Tailwind CSS v4 |
| **AI & RAG Engine** | Google Gemini API (`gemini-2.5-flash`), Custom TF-IDF/Keyword RAG Retriever |
| **Computer Vision** | YOLOv8n Pretrained & Custom South Asian Food-20 (ONNX Runtime) |
| **Serverless Backend** | Vercel Serverless Functions (`api/chat.js`) |
| **Database** | Supabase (PostgreSQL) + Reactive Client Store |
| **PDF Generation** | Custom Client-Side Hidden Iframe A4 Print Engine |
| **Deployment** | Vercel (CI/CD via GitHub) |

---

## 📂 Project Structure

```text
NutriSense/
├── api/
│   └── chat.js                      # Secure Vercel Serverless Proxy (Gemini + Auto-Model Discovery)
├── public/                          # Static assets & ONNX model weights
├── src/
│   ├── components/
│   │   ├── ragChatbot.js            # Floating AI Copilot UI, source citations & quick actions
│   │   ├── modals.js                # App modals & notification drawers
│   │   └── toast.js                 # Non-blocking toast notifications
│   ├── data/
│   │   ├── catalog.js               # Meal catalog, illness recovery options & dietary rules
│   │   └── yoloFoodCatalog.js       # South Asian & global food nutrition database
│   ├── services/
│   │   ├── ragKnowledgeBase.js      # Grounded chunk builder & context retriever
│   │   ├── ragChatbotService.js     # Agentic prompt builder, proxy caller & system action executor
│   │   ├── pdfExportService.js      # Zero-dependency A4 PDF report generator
│   │   └── supabaseDb.js            # Supabase Postgres persistence layer
│   ├── state/
│   │   └── store.js                 # Centralized reactive application state
│   └── utils/
│       └── nutrition.js             # BMR/TDEE/BMI formulas, log summaries & allergy checker
├── index.html
├── package.json
└── README.md
```

---

## 🚀 Getting Started (Local Development)

### 1. Clone the repository
```bash
git clone [https://github.com/suvik125/NutriSense.git](https://github.com/suvik125/NutriSense.git)
cd NutriSense
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure local environment variables (Optional)
Create a `.env` file in the root directory (**never commit `.env` to GitHub**):
```env
VITE_GEMINI_API_KEY=your_google_ai_studio_key
VITE_GEMINI_MODEL=gemini-2.5-flash
```

### 4. Start the development server
```bash
npm run dev
```

---

## ☁️ Production Deployment (Vercel)

To keep API keys completely hidden from client bundles, configure **server-only** environment variables in **Vercel → Project Settings → Environment Variables**:

| Variable Name | Value | Scope |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Your Google AI Studio API Key (`AIza...`) | Production, Preview, Development (Secret) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Production, Preview, Development |

> **Security Note:** Do **not** prefix production Gemini keys with `VITE_` in Vercel. Always redeploy (with Build Cache disabled) after modifying environment variables.

---

## 💬 Try These AI Copilot Demo Prompts

* **Nutrition Comparison (Banglish):** `"Kacchi Biryani ar Bhuna Khichuri er moddhe kon tar calorie kom? Amar daily target er sathe compare koro"`
* **Illness Recovery + Navigation:** `"I have a fever, activate recovery mode & open planner"`
* **Live Logging:** `"Log 2 glasses of water & log 1 plate Rui Fish Curry for lunch"`
* **Meal Plan Control:** `"Switch to light mode & regenerate today meal plan"`
* **Instant PDF Export:** `"Download my weekly meal plan as PDF"`

---

## ⚠️ Disclaimer

NutriSense provides informational nutrition estimates and meal-planning assistance only. It is **not** a substitute for professional medical diagnosis, advice, or treatment.

---

## 📄 License

This project is developed for educational and hackathon/competition demonstration purposes.
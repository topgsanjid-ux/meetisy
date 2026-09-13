# ⚡ mvp_PRO — Async Meeting Automation Engine

> **Replace recurring, time-draining status meetings with high-fidelity voice/video updates and instant AI synthesis.**

mvp_PRO empowers remote engineering teams to share daily updates asynchronously. Voice and text standups are transcribed in sub-seconds with **Groq Whisper**, summarized into **4 actionable fields (Accomplished, Blockers, Next Steps, Decisions)** with **Groq Mixtral-8x7b**, and automatically broadcasted to leads and team members via **Resend email digests**.

---

## 🚀 Key Features

- **🎙️ Voice & Text Capture:** 1-click in-browser audio recording with real-time waveform pulse, audio playback preview, and text fallback with quick templates.
- **⚡ Sub-Second AI Transcription & Summarization:** Powered by Groq Cloud Whisper (`whisper-large-v3`) and Groq Mixtral (`mixtral-8x7b-32768`) to extract:
  1. `Accomplished / Completed`
  2. `Blockers & Impediments` (visually emphasized in glowing red)
  3. `Next Steps / Targets`
  4. `Key Architectural Decisions`
- **📊 "Daily Momentum" Visual Feed:** Top-level Urgent Blocker queue, 30-second audio snippet player, and search-filterable catchup feed.
- **🔐 Secure Authentication & Roles:** Email/password registration, PBKDF2 password hashing, JWT session cookies, and role switching (Team Member vs. Tech Lead/Manager).
- **📧 Automated Daily Digest & Email:** Instant email compilation with blocker alerts, live HTML template preview, and automated cron endpoint.
- **📁 Search & Archive:** Search across transcripts, historical blocker records, and team member activity.

---

## 🛠️ Quickstart Guide (Local Development)

### 1. Prerequisites
- **Node.js** 18+ installed
- **npm** (comes with Node.js)
- *(Optional)* Python 3.9+ with `openai-whisper` if you wish to run offline local Whisper CLI without Groq API.

### 2. Installation
```bash
# Clone or navigate to the project directory
cd "Standup AI"

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the template to `.env.local`:
```bash
cp .env.example .env.local
```

> **Note:** The application features complete zero-config fallbacks for AI, Auth, Storage, and Email. You can run the app locally out-of-the-box even before adding third-party API keys!

To enable live third-party cloud services, populate the keys in `.env.local`:
```env
# Groq API (Free key at https://console.groq.com/keys)
GROQ_API_KEY=gsk_your_groq_api_key

# Supabase (https://app.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Resend Email (https://resend.com)
RESEND_API_KEY=re_your_resend_key
DIGEST_EMAIL_FROM=standup@yourdomain.com

# AWS S3 (Optional for cloud media bucket)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET_NAME=your-bucket-name
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 👥 Demo Test Accounts

You can test authentication immediately using the 1-click test buttons on the [`/login`](http://localhost:3000/login) page:

| Account | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Sarah Chen** | `sarah.chen@engineering.io` | `password123` | Staff Backend Engineer |
| **Marcus Vance** | `marcus.vance@engineering.io` | `password123` | Tech Lead / Manager |
| **Alex Rivera** | `alex.rivera@engineering.io` | `password123` | Frontend Engineer |

---

## 🗄️ Database Setup (Supabase / PostgreSQL)

1. Open your Supabase SQL Editor.
2. Paste and run the contents of [`schema.sql`](./schema.sql).
3. Tables (`teams`, `users`, `standups`, `comments`), indexes, and RLS policies will be automatically provisioned.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register a new user with hashed password |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT session cookie |
| `GET` | `/api/auth/me` | Retrieve active authenticated user session |
| `POST` | `/api/auth/logout` | Invalidate session cookie |
| `POST` | `/api/upload` | Upload audio/video to S3 or local storage |
| `POST` | `/api/transcribe` | Transcribe audio via Groq Whisper & summarize with Mixtral |
| `GET` | `/api/standups` | Fetch recent team standups |
| `POST` | `/api/standups` | Publish new standup update to team feed |
| `POST` | `/api/digest` | Send on-demand team email digest via Resend |
| `GET/POST`| `/api/cron/digest` | Automated cron-triggerable midnight email dispatch |

---

## 📜 License
MIT License • Built for High-Velocity Remote Engineering Teams.

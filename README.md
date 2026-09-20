# IDFC FIRST Bank • WhatsApp Auto-Messaging Chatbot

A professional, bank-grade **WhatsApp Auto-Messaging Chatbot** integrated directly inside the **IDFC FIRST Bank Loan Origination & Disbursal Application**.

Designed for authorized loan officers to upload pre-qualified customer lists (Excel, CSV, JSON) and automatically dispatch approved loan notices via the **Official Meta WhatsApp Business Cloud API** with rate-limiting, duplicate protection, and real-time status tracking.

---

## 🚀 Key Features

* **🤖 Embedded Loan Assistant**: Conversational step-by-step chat workflow directly inside the bank's loan management interface.
* **📂 Multi-Format File Upload**: Parses Excel (`.xlsx`, `.xls`), CSV (`.csv`), and JSON (`.json`) containing `Name` and `Phone Number`.
* **🔒 Bank-Grade Customer Privacy**: Automatically masks all phone numbers in the UI (e.g., `+91 98*** **456`). Zero customer photos or unneeded PII displayed.
* **🛡️ Duplicate Protection**: Assigns a unique Campaign ID (`CAMP-IDFC-2026-XXXX`) and prevents accidental duplicate sends to the same recipient.
* **⚡ Rate Throttling & Live HUD**: Throttles messaging rate (e.g., 500ms–4000ms delay per message) to comply with Meta tier limits.
* **📡 Real-Time Status Streaming**: Uses Server-Sent Events (SSE) to display live progress (`Sent`, `Delivered`, `Failed`, `Remaining`).
* **🧪 Mandatory Test Mode**: Requires a test dispatch to an authorized number before unlocking the full broadcast.
* **🌐 Official WhatsApp Business Platform/API**: Built exclusively for Meta Graph API v19.0 with built-in safe Demo/Sandbox mode.

---

## 🏗️ Tech Stack

* **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React
* **Backend**: Node.js (v20+), Express.js, Multer, Axios, SheetJS (`xlsx`)
* **API Integration**: Official Meta WhatsApp Business Cloud API (`v19.0`)

---

## 📦 Project Structure

```text
├── client/                 # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatbotPanel.jsx           # 🤖 Conversational loan assistant interface
│   │   │   ├── CampaignDashboard.jsx      # 📋 Customer review table & sending history
│   │   │   ├── LoanPortfolioOverview.jsx  # 💼 Retail lending pipeline overview
│   │   │   ├── Navbar.jsx                 # IDFC FIRST Bank brand header
│   │   │   ├── WhatsAppConfigModal.jsx    # Official WhatsApp Cloud API settings
│   │   │   └── TestMessageModal.jsx       # Mandatory test verification dialog
│   │   ├── App.jsx                        # Main application coordinator with SSE
│   │   └── index.css                      # Tailwind v4 & IDFC theme styling
│   └── package.json
│
├── server/                 # Express.js Backend Server
│   ├── src/
│   │   ├── services/
│   │   │   ├── fileParser.js              # Excel, CSV, and JSON parser with phone sanitizer
│   │   │   ├── campaignQueue.js           # Duplicate-protected queue engine
│   │   │   └── whatsappService.js         # Official Meta Graph API client & Demo engine
│   │   └── server.js                      # Express server with SSE & upload endpoints
│   ├── .env.example                       # WhatsApp API configuration template
│   └── package.json
│
├── sample_customers.json                  # Sample pre-qualified customers (JSON)
├── sample_customers.csv                   # Sample pre-qualified customers (CSV)
├── sample_prequalified_customers.xlsx     # Sample pre-qualified customers (Excel)
└── package.json                           # Root scripts
```

---

## 🛠️ Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment (Optional for Live Meta API)

Create `server/.env` based on `server/.env.example`:

```env
DEMO_MODE=true # Keep true for safe sandbox testing, set to false for live WhatsApp API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WABA_ID=your_waba_id
WHATSAPP_ACCESS_TOKEN=your_system_user_access_token
WHATSAPP_TEMPLATE_NAME=idfc_loan_prequalified
WHATSAPP_LANGUAGE_CODE=en
```

### 3. Start the Servers

```bash
# From the root directory:
npm run server  # Runs backend on http://localhost:5000
npm run client  # Runs frontend on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## ⚖️ Compliance & Privacy

This application is strictly designed for **pre-qualified loan customer outreach** and complies with financial communication guidelines:
* Explicit representative authorization is required before every broadcast.
* Recipient phone numbers are masked in all interface views.
* Official Meta WhatsApp Cloud API endpoints are exclusively utilized.


# NSS Rudhirasena - Blood Donor Directory & Analytics

An intuitive, high-performance web platform built for **NSS Rudhirasena** to manage volunteer blood donors, track cooling period eligibility, and visualize real-time inventory and analytics.

---

## 🌟 Key Features

* **Live Google Sheets Integration**: Automated two-way sync with Google Sheets via Google Apps Script.
* **Smart Eligibility Calculator**: Calculates next eligible donation date based on donation type (*Whole Blood*, *Platelets*, *Plasma*) and gender intervals.
* **Interactive Donor Directory**: Multi-criteria search and filtering by Blood Group, Eligibility, Gender, Department, and Location.
* **Reports & Analytics Hub**:
  * 8-type Blood Group Inventory & Rarity Matrix.
  * Department and location participation charts.
  * Emergency Immediate Response Roster with 1-click Call & WhatsApp actions.
  * Export to CSV and print-friendly layouts.
* **Role-Based Security**: Passcode-protected administration interface.
* **Responsive & Accessible**: Optimized for mobile, tablet, and desktop with WCAG AA compliance.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, Vite, Tailwind CSS 4, Lucide React Icons
* **Backend**: Google Apps Script (Serverless Google Sheets API)
* **Design Standards**: Impeccable Craft & UI/UX Pro Max design intelligence

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18+
* npm or yarn

### Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd "NSS Rudhirasena website"

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 📋 Google Apps Script Deployment

1. Open your Google Sheet → **Extensions** → **Apps Script**.
2. Paste the code from `apps-script/Code.gs`.
3. Click **Deploy** → **New Deployment**.
4. Select **Web app** with access set to **Anyone**.
5. Copy the deployed Web App URL and update `API_URL` in `src/config.js`.

---

## 📄 License
MIT License. Built with ❤️ for NSS Rudhirasena.

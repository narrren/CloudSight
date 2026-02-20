# CloudSight Enterprise - Project Digest

**Project Name:** CloudSight Enterprise  
**Version:** 1.0.0  
**Type:** Chrome Extension (Manifest V3)  
**Description:** A comprehensive Multi-Cloud Cost Management Dashboard for AWS, Azure, and GCP.

---

## 🚀 Project Overview

CloudSight Enterprise is a browser extension designed to give DevOps engineers and managers a real-time "Single Pane of Glass" view of their cloud expenditures. It connects directly to cloud provider APIs to fetch running costs, forecasts them, and alerts user on budget overruns.

### Key Capabilities
1.  **Multi-Cloud Aggregation**: View AWS, Azure, and GCP costs in one currency.
2.  **Real-Time Data**: Fetches live data from cloud APIs (Cost Explorer, RateCard, Billing).
3.  **Secure**: Credentials are encrypted using AES-GCM and stored locally in the browser (`chrome.storage`). Keys never leave the user's machine.
4.  **Forecasting**: Linear projection of monthly spend based on current usage.
5.  **Budgeting**: User-defined monthly budget goals with visual tracking.
6.  **Interactive Dashboard**:
    *   **Cost Trend Analysis**: Visual chart of daily spending.
    *   **Provider Distribution**: Breakdown of cost by provider.
    *   **Top Services**: List of most expensive services (e.g., EC2, S3, Compute Engine).

---

## 🛠 Technology Stack

*   **Core**: HTML5, Vanilla JavaScript (ES6+)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Utility-first framework)
*   **Build Tool**: [Webpack](https://webpack.js.org/) (Module bundling, CSS extraction)
*   **Charts**: [Chart.js](https://www.chartjs.org/) (Data visualization)
*   **Icons**: Google Material Symbols
*   **Encryption**: Web Crypto API (SubtleCrypto)

---

## 📂 File Structure

```text
CloudSight/
├── dist/                   # Production build output (Load this in Chrome)
│   ├── background.bundle.js
│   ├── dashboard.bundle.js
│   ├── options.bundle.js
│   ├── dashboard.html
│   └── ...
├── src/                    # Source code
│   ├── background.js       # Background Service Worker (API fetching, Data processing)
│   ├── dashboard.js        # Dashboard UI logic (Charts, DOM manipulation)
│   ├── dashboard.html      # Main Dashboard View
│   ├── options.js          # Settings Page logic (Credential saving, Encryption)
│   ├── options.html        # Settings Page View
│   ├── cryptoUtils.js      # Encryption helper functions
│   ├── input.css           # Tailwind source CSS
│   └── styles.css          # Global styles
├── manifest.json           # Chrome Extension Manifest V3 configuration
├── webpack.config.js       # Webpack build configuration
├── tailwind.config.js      # Tailwind configuration
└── package.json            # Project dependencies and scripts
```

---

## 🔌 Architecture & Data Flow

1.  **Configuration**: User enters API Creds in `options.html`.
2.  **Storage**: Creds are encrypted and saved to `chrome.storage.local`.
3.  **Data Fetching**:
    *   `background.js` wakes up on alarm (every 6 hours) or manual refresh.
    *   Decrypts credentials.
    *   Calls Cloud APIs (AWS Cost Explorer, Azure Usage API, GCP Billing).
    *   Processes and aggregates data.
    *   Saves `dashboardData` to `chrome.storage.local`.
4.  **Visualization**:
    *   `dashboard.js` reads `dashboardData`.
    *   Renders Charts and KPIs.

### API Integration Status
*   **AWS**: Fully Integrated (Signed Requests via `aws-sdk` or custom signing).
*   **Azure**: Integrated (Bearer Token auth).
*   **GCP**: Integrated (Service Account JSON auth).

---

## 💻 Installation & Build Guide

### Prerequisites
*   Node.js (v14+)
*   npm

### 1. Setup
```bash
npm install
```

### 2. Build (Development & Production)
The project uses Webpack to bundle assets.
```bash
npm run build
```
*   This compiles `src/` into `dist/`.
*   Processes Tailwind CSS.

### 3. Load in Chrome
1.  Open **Chrome** -> **Extensions** (`chrome://extensions`).
2.  Enable **Developer Mode** (top right).
3.  Click **Load unpacked**.
4.  Select the `dist/` folder.

---

## ✨ Recent Updates (v1.0.0 Polish)
*   **Removed Demo Mode**: The app now strictly relies on real user data.
*   **Interactive Sidebar**: Sidebar buttons now scroll to specific dashboard sections.
*   **Dynamic Budgeting**: Users can set custom budget limits in Settings.
*   **Responsive Charting**: "1D", "7D", "30D" toggles now update date displays.

## ⚠️ Troubleshooting
*   **"No Data Found"**: Ensure credentials are correct in Settings. Check Console logs for API 403/401 errors.
*   **Visual Glitches**: Ensure `npm run build` was successful to regenerate CSS.

---
**Maintained by:** Naren Dey

# CloudSight

CloudSight project repository: Cloud Command Center Chrome Extension.

## Overview
A "Pro-Grade" Chrome Extension that visualizes **AWS, Azure, and Google Cloud (GCP)** Costs securely using official SDKs and direct API integrations. It features a serverless architecture running entirely in the browser.

## Features
- **Multi-Cloud Support**:
  - **AWS**: via Cost Explorer SDK (SigV4).
  - **Azure**: via Cost Management REST API (OAuth).
  - **GCP**: via Cloud Billing API (Signed JWTs).
- **Advanced Security**:
  - **Encrypted Storage**: Uses AES-GCM (Web Crypto API) to encrypt credentials at rest.                                            
- **Global Currency Support**:
  - View costs in USD, EUR, GBP, INR, or JPY.
- **Smart Alerts**:
  - **Budget Alerts**: Notifications when global spend exceeds limit.
  - **Anomaly Detection**: AI-driven alerts for cost spikes (>3x average daily spend).
- **Background Fetching**: Uses `chrome.alarms` to fetch data every 6 hours.

## Installation

### Method 1: Load Unpacked (Developer Mode)
1. Clone the repository:
   ```bash
   git clone https://github.com/narrren/CloudSignt.git
   cd CloudSight
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Open Chrome `chrome://extensions/`.
5. Enable **Developer mode**.
6. Click **Load unpacked** and select the `dist/` folder.

### Method 2: Install via ZIP (Distribution)
1. build the project or download `CloudSight-v1.0.zip`.
2. Extract the zip file.
3. Load the extracted folder via Chrome's "Load unpacked" button.

## Configuration
1. Click the extension icon and go to **Options**.
2. **General Settings**: Select your preferred currency and enable encryption.
3. Enter credentials for your cloud providers (AWS, Azure, GCP).
4. Click **Test Connection** to verify your keys.
   - *Note: Ensure your AWS user has `AWSCostExplorerReadOnlyAccess`. See Troubleshooting below.*.
5. Save.

## Troubleshooting

### AWS "GetCostAndUsage" Access Denied
If you see an error like `User is not authorized to perform: ce:GetCostAndUsage`, your IAM user needs permission to read billing data.

**Quick Fix:**
1. Go to AWS IAM Console -> Users -> Your User.
2. Add Permissions -> Attach policies directly.
3. Search for and attach **`AWSCostExplorerReadOnlyAccess`**.

**Root User Note:**
If you are using the Root account (not recommended), you must enable **"IAM User and Role Access to Billing Information"** in your Account Settings.

## Architecture
- **Manifest V3**: Secure and performant extension architecture.
- **Webpack**: Bundles modular code (AWS SDK, Jose, Chart.js) for the browser.
- **Service Worker**: Handles background fetching, encryption, and notifications.

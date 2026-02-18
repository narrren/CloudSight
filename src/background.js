import { CostExplorerClient, GetCostAndUsageCommand, GetCostForecastCommand }
    from "@aws-sdk/client-cost-explorer";
import { fetchAzureCost } from "./azureService";
import { fetchGCPCost } from "./gcpService";

// 1. Setup Alarm (Check cost every 6 hours)
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("fetchCloudCosts", { periodInMinutes: 360 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "fetchCloudCosts") fetchAllData();
});

// Added: Listen for manual refresh from options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "FORCE_REFRESH") {
        fetchAllData().then(() => {
            // Optional: send response back if needed
        });
    }
});

import { decryptData } from './cryptoUtils';

// Hardcoded Exchange Rates (Base USD) - In V2, fetch from API
const RATES = {
    'USD': 1.0,
    'EUR': 0.93,
    'GBP': 0.79,
    'INR': 83.5,
    'JPY': 150.2
};

// 2. Main Fetch Logic
async function fetchAllData() {
    const result = await chrome.storage.local.get(["cloudCreds", "encryptedCreds", "currency"]);

    // cloudCreds may be stored as null (not undefined) when encryption is enabled
    let creds = result.cloudCreds || null;
    const currency = result.currency || 'USD';
    const rate = RATES[currency] || 1.0;

    // Handle Encrypted credentials
    if (!creds && result.encryptedCreds) {
        try {
            creds = await decryptData(result.encryptedCreds);
        } catch (e) {
            console.error("Decryption failed in background", e);
            // Surface a clear error to the dashboard instead of silently failing
            chrome.storage.local.set({
                dashboardData: {
                    decryptionError: true,
                    errorMessage: 'Credential decryption failed. Please re-save your credentials in Settings.',
                    lastUpdated: new Date().toISOString(),
                    currency,
                    rate,
                    totalGlobal: 0,
                    aws: { totalCost: 0, error: true },
                    azure: { totalCost: 0, error: true },
                    gcp: { totalCost: 0, error: true }
                }
            });
            return;
        }
    }

    // If still no creds after decryption attempt, nothing is configured
    if (!creds || (!creds.aws?.key && !creds.azure?.client && !creds.gcp?.json)) {
        chrome.storage.local.set({
            dashboardData: {
                notConfigured: true,
                lastUpdated: new Date().toISOString(),
                currency,
                rate,
                totalGlobal: 0,
                aws: { totalCost: 0, error: true },
                azure: { totalCost: 0, error: true },
                gcp: { totalCost: 0, error: true }
            }
        });
        return;
    }


    // use Promise.allSettled to allow partial failures
    const results = await Promise.allSettled([
        creds.aws?.key ? fetchAWS(creds.aws) : Promise.reject("AWS Not Configured"),
        creds.azure?.client ? fetchAzureCost(creds.azure) : Promise.reject("Azure Not Configured"),
        creds.gcp?.json ? fetchGCPCost(creds.gcp) : Promise.reject("GCP Not Configured")
    ]);

    // Extract data safely — capture error reason for display
    const awsData = results[0].status === 'fulfilled'
        ? results[0].value
        : { totalCost: 0, error: true, errorMsg: String(results[0].reason?.message || results[0].reason || 'Unknown error') };
    const azureData = results[1].status === 'fulfilled'
        ? results[1].value
        : { totalCost: 0, error: true, errorMsg: String(results[1].reason?.message || results[1].reason || 'Unknown error') };
    const gcpData = results[2].status === 'fulfilled'
        ? results[2].value
        : { totalCost: 0, error: true, errorMsg: String(results[2].reason?.message || results[2].reason || 'Unknown error') };

    // Convert to User's Currency
    const convert = (val) => val * rate;

    const combined = {
        aws: awsData,
        azure: azureData,
        gcp: gcpData,
        totalGlobal: convert((awsData.totalCost || 0) + (azureData.totalCost || 0) + (gcpData.totalCost || 0)),
        lastUpdated: new Date().toISOString(),
        currency: currency,
        rate: rate // Store rate so popup knows
    };

    // Check Budgets (Limit converted approx to $1000 USD)
    const GLOBAL_LIMIT = 1000 * rate;

    if (combined.totalGlobal > GLOBAL_LIMIT) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: `Global Budget Exceeded!`,
            message: `Total spend is ${currency} ${combined.totalGlobal.toFixed(2)}`
        });
    }

    // Anomalies (AWS only for now)
    if (combined.aws && combined.aws.anomaly && combined.aws.anomaly.isAnomaly) {
        // Note: Anomaly numbers are in USD inside the AWS object.
        // We should convert them for the message
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'AWS Cost Spike Detected!',
            message: `Yesterday's spend (${currency} ${convert(combined.aws.anomaly.today).toFixed(2)}) is >3x higher than average.`
        });
    }

    chrome.storage.local.set({ dashboardData: combined });
}

// 3. AWS Implementation
async function fetchAWS(creds) {
    if (!creds.key || !creds.secret) {
        throw new Error('AWS credentials missing (key or secret is empty)');
    }

    const client = new CostExplorerClient({
        region: "us-east-1",
        credentials: {
            accessKeyId: creds.key.trim(),
            secretAccessKey: creds.secret.trim()
        }
    });

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    // ── A. Current month cost (critical — throw on failure) ───────────────
    let costResponse;
    try {
        costResponse = await client.send(new GetCostAndUsageCommand({
            TimePeriod: { Start: firstDay, End: tomorrow },
            Granularity: "MONTHLY",
            Metrics: ["UnblendedCost"],
            GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }]
        }));
    } catch (e) {
        const msg = e?.message || e?.name || String(e);
        throw new Error(msg);
    }

    // ── B. Forecast (optional — new accounts often lack enough data) ──────
    let forecastTotal = '0';
    try {
        if (tomorrow <= lastDay) {
            const fr = await client.send(new GetCostForecastCommand({
                TimePeriod: { Start: tomorrow, End: lastDay },
                Metric: "UNBLENDED_COST",
                Granularity: "MONTHLY"
            }));
            forecastTotal = fr.Total?.Amount || '0';
        }
    } catch (e) {
        console.warn('AWS Forecast skipped (normal for new accounts):', e?.message);
    }

    // ── C. 14-day daily history (optional) ───────────────────────────
    let history = [];
    try {
        const histStart = new Date();
        histStart.setDate(histStart.getDate() - 14);
        const hr = await client.send(new GetCostAndUsageCommand({
            TimePeriod: { Start: histStart.toISOString().split('T')[0], End: todayStr },
            Granularity: "DAILY",
            Metrics: ["UnblendedCost"]
        }));
        history = (hr.ResultsByTime || []).map(r => ({
            date: r.TimePeriod.Start,
            cost: parseFloat(r.Total?.UnblendedCost?.Amount || 0)
        }));
    } catch (e) {
        console.warn('AWS history skipped:', e?.message);
    }

    return {
        provider: 'AWS',
        totalCost: calculateTotal(costResponse),
        services: processServices(costResponse),
        forecast: forecastTotal,
        anomaly: detectAnomaly(history),
        history: history
    };
}


function detectAnomaly(history) {
    // history is now a plain array of { date, cost }
    if (!history || history.length < 3) return null;
    const dailyCosts = history.map(h => h.cost);
    const latestCost = dailyCosts[dailyCosts.length - 1];
    const previousCosts = dailyCosts.slice(0, dailyCosts.length - 1);
    const avg = previousCosts.reduce((a, b) => a + b, 0) / previousCosts.length;
    if (latestCost > (avg * 3) && latestCost > 1.0) {
        return { isAnomaly: true, today: latestCost, average: avg };
    }
    return null;
}

function processServices(response) {
    const results = response?.ResultsByTime;
    if (!results || results.length === 0) return [];
    const groups = results[0]?.Groups || [];
    return groups
        .map(g => ({ name: g.Keys[0], amount: parseFloat(g.Metrics.UnblendedCost.Amount) }))
        .filter(s => s.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
}

function calculateTotal(response) {
    const results = response?.ResultsByTime;
    if (!results || results.length === 0) return 0;
    const groups = results[0]?.Groups || [];
    return groups.reduce((acc, curr) => acc + parseFloat(curr.Metrics.UnblendedCost.Amount), 0);
}

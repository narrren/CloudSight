import { encryptData } from './cryptoUtils';

// ── Badge Helper ─────────────────────────────────────────────────────────────
function setBadge(provider, state) {
    const b = document.getElementById(`${provider}-badge`);
    if (!b) return;
    if (state === 'connected') {
        b.innerText = '✓ Connected';
        b.className = 'section-badge badge-connected';
    } else if (state === 'encrypted') {
        b.innerText = '🔐 Encrypted';
        b.className = 'section-badge badge-warn';
    } else {
        b.innerText = 'Not Connected';
        b.className = 'section-badge badge-nc';
    }
}

// ── Live Badge Update as User Types ─────────────────────────────────────────
function updateBadgesLive() {
    const awsKey = document.getElementById('awsKey')?.value?.trim();
    const awsSecret = document.getElementById('awsSecret')?.value?.trim();
    const azClient = document.getElementById('azClient')?.value?.trim();
    const gcpJson = document.getElementById('gcpJson')?.value?.trim();

    setBadge('aws', awsKey && awsSecret ? 'connected' : 'nc');
    setBadge('azure', azClient ? 'connected' : 'nc');
    setBadge('gcp', gcpJson ? 'connected' : 'nc');
}

['awsKey', 'awsSecret'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateBadgesLive);
});
['azTenant', 'azClient', 'azSecret', 'azSub'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateBadgesLive);
});
document.getElementById('gcpJson')?.addEventListener('input', updateBadgesLive);

// ── Load Saved Values on Page Open ──────────────────────────────────────────
chrome.storage.local.get(['cloudCreds', 'encryptedCreds', 'currency', 'isEncrypted'], (result) => {
    // Currency
    if (result.currency) {
        const sel = document.getElementById('currency');
        if (sel) sel.value = result.currency;
    }
    // Encryption toggle
    if (result.isEncrypted) {
        const chk = document.getElementById('encryptStore');
        if (chk) chk.checked = true;
    }

    const creds = result.cloudCreds;

    if (result.encryptedCreds && !creds) {
        // Credentials are encrypted — show encrypted badge, can't pre-fill
        setBadge('aws', 'encrypted');
        setBadge('azure', 'encrypted');
        setBadge('gcp', 'encrypted');
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerText = '🔐 Credentials are encrypted. Re-enter to update.';
            statusEl.className = 'status-msg';
        }
        return;
    }

    if (!creds) return;

    // Pre-fill AWS
    if (creds.aws?.key) {
        const k = document.getElementById('awsKey');
        const s = document.getElementById('awsSecret');
        if (k) k.value = creds.aws.key;
        if (s) s.value = creds.aws.secret || '';
        setBadge('aws', 'connected');
    }

    // Pre-fill Azure
    if (creds.azure?.client) {
        const fields = { azTenant: 'tenant', azClient: 'client', azSecret: 'secret', azSub: 'sub' };
        Object.entries(fields).forEach(([elId, key]) => {
            const el = document.getElementById(elId);
            if (el) el.value = creds.azure[key] || '';
        });
        setBadge('azure', 'connected');
    }

    // Pre-fill GCP
    if (creds.gcp?.json) {
        const j = document.getElementById('gcpJson');
        const b = document.getElementById('gcpBillingId');
        if (j) j.value = creds.gcp.json || '';
        if (b) b.value = creds.gcp.billingId || '';
        setBadge('gcp', 'connected');
    }
});

// ── Save Handler ─────────────────────────────────────────────────────────────
document.getElementById('save').addEventListener('click', async () => {
    const currency = document.getElementById('currency').value;
    const useEncryption = document.getElementById('encryptStore').checked;

    const creds = {
        aws: {
            key: document.getElementById('awsKey').value.trim(),
            secret: document.getElementById('awsSecret').value.trim()
        },
        azure: {
            tenant: document.getElementById('azTenant').value.trim(),
            client: document.getElementById('azClient').value.trim(),
            secret: document.getElementById('azSecret').value.trim(),
            sub: document.getElementById('azSub').value.trim()
        },
        gcp: {
            json: document.getElementById('gcpJson').value.trim(),
            billingId: document.getElementById('gcpBillingId').value.trim()
        }
    };

    // Validate: at least one provider must be filled
    const hasAWS = creds.aws.key && creds.aws.secret;
    const hasAzure = creds.azure.client && creds.azure.secret;
    const hasGCP = creds.gcp.json;

    if (!hasAWS && !hasAzure && !hasGCP) {
        const statusEl = document.getElementById('status');
        statusEl.innerText = '⚠ Please fill in at least one provider\'s credentials.';
        statusEl.className = 'status-msg error';
        return;
    }

    let storagePayload = { currency, isEncrypted: useEncryption };

    if (useEncryption) {
        try {
            const encryptedCreds = await encryptData(creds);
            storagePayload.encryptedCreds = encryptedCreds;
            storagePayload.cloudCreds = null;
        } catch (e) {
            alert('Encryption failed: ' + e);
            return;
        }
    } else {
        storagePayload.cloudCreds = creds;
        storagePayload.encryptedCreds = null;
    }

    chrome.storage.local.set(storagePayload, () => {
        const statusEl = document.getElementById('status');
        statusEl.innerText = '✓ Credentials saved successfully!';
        statusEl.className = 'status-msg success';
        setTimeout(() => {
            statusEl.innerText = 'Fill in your credentials above and click Save.';
            statusEl.className = 'status-msg';
        }, 4000);

        // Update badges immediately after save
        if (useEncryption) {
            setBadge('aws', 'encrypted');
            setBadge('azure', 'encrypted');
            setBadge('gcp', 'encrypted');
        } else {
            setBadge('aws', hasAWS ? 'connected' : 'nc');
            setBadge('azure', hasAzure ? 'connected' : 'nc');
            setBadge('gcp', hasGCP ? 'connected' : 'nc');
        }

        chrome.runtime.sendMessage({ action: 'FORCE_REFRESH' });
    });
});

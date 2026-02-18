import { encryptData } from './cryptoUtils';

document.getElementById('save').addEventListener('click', async () => {
    const currency = document.getElementById('currency').value;
    const useEncryption = document.getElementById('encryptStore').checked;

    const creds = {
        aws: {
            key: document.getElementById('awsKey').value,
            secret: document.getElementById('awsSecret').value
        },
        azure: {
            tenant: document.getElementById('azTenant').value,
            client: document.getElementById('azClient').value,
            secret: document.getElementById('azSecret').value,
            sub: document.getElementById('azSub').value
        },
        gcp: {
            json: document.getElementById('gcpJson').value,
            billingId: document.getElementById('gcpBillingId').value
        }
    };

    let storagePayload = {
        currency: currency,
        isEncrypted: useEncryption
    };

    if (useEncryption) {
        try {
            const encryptedCreds = await encryptData(creds);
            storagePayload.encryptedCreds = encryptedCreds;
            storagePayload.cloudCreds = null; // Clear plain text
        } catch (e) {
            alert("Encryption failed: " + e);
            return;
        }
    } else {
        storagePayload.cloudCreds = creds;
        storagePayload.encryptedCreds = null;
    }

    chrome.storage.local.set(storagePayload, () => {
        document.getElementById('status').innerText = 'Credentials Saved!';
        setTimeout(() => document.getElementById('status').innerText = '', 2000);
        chrome.runtime.sendMessage({ action: "FORCE_REFRESH" });
    });
});

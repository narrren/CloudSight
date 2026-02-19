document.addEventListener('DOMContentLoaded', async () => {
    // 1. Navigation Listeners (Always active)
    setupNavigation();

    // 2. Load Real Data
    await loadPopupData();
});

async function loadPopupData() {
    const result = await chrome.storage.local.get(['dashboardData']);
    const data = result.dashboardData;

    if (!data) {
        document.getElementById('total-spend').innerText = '$0.00';
        document.getElementById('forecast-spend').innerText = '$0.00';
        return;
    }

    const currency = data.currency || 'USD';
    const total = data.totalGlobal || 0;

    // Total Spend
    const totalEl = document.getElementById('total-spend');
    if (totalEl) totalEl.innerHTML = formatCurrency(total, currency);

    // Forecast
    const forecast = parseFloat(data.aws?.forecast || 0) + parseFloat(data.azure?.forecast || 0) + parseFloat(data.gcp?.forecast || 0);
    const forecastEl = document.getElementById('forecast-spend');
    if (forecastEl) forecastEl.innerText = formatCurrency(forecast, currency);

    // Provider Status (Active/Inactive based on error or cost)
    updateProviderStatus('filter-aws', data.aws);
    updateProviderStatus('filter-azure', data.azure);
    updateProviderStatus('filter-gcp', data.gcp);

    // Services List
    renderPopupServices(data);
}

function updateProviderStatus(id, providerData) {
    const el = document.getElementById(id);
    if (!el) return;

    // Logic: Active if no error and totalCost defined (even if 0, it's connected)
    // But user said "blank cause i have never used". So cost 0 is valid connection.
    // If error property exists, it's disconnected/issue.
    const isConnected = providerData && !providerData.error;

    if (isConnected) {
        el.classList.remove('grayscale', 'opacity-40');
        el.classList.add('opacity-100');
        el.setAttribute('title', 'Active');
    } else {
        el.classList.add('grayscale', 'opacity-40');
        el.classList.remove('opacity-100');
        el.setAttribute('title', 'Not Configured or Error');
    }
}

function renderPopupServices(data) {
    const list = document.getElementById('provider-list');
    if (!list) return;

    list.innerHTML = '';

    let services = [];
    if (data.aws?.services) services.push(...data.aws.services.map(s => ({ ...s, p: 'AWS', c: '#FF9900', i: 'dns' })));
    if (data.azure?.services) services.push(...data.azure.services.map(s => ({ ...s, p: 'Azure', c: '#0078D4', i: 'database' })));
    if (data.gcp?.services) services.push(...data.gcp.services.map(s => ({ ...s, p: 'GCP', c: '#DB4437', i: 'cloud_queue' })));

    if (services.length === 0) {
        list.innerHTML = `<div class="text-center text-slate-500 text-[10px] py-2">No active services.</div>`;
        return;
    }

    services.sort((a, b) => b.amount - a.amount);
    const top3 = services.slice(0, 3);
    const maxVal = top3[0].amount || 1;

    top3.forEach(s => {
        const pct = (s.amount / maxVal) * 100;
        const html = `
        <div class="flex items-center gap-3 py-2 px-2 rounded hover:bg-white/5 transition-colors cursor-pointer group">
            <div class="w-8 h-8 rounded flex items-center justify-center bg-[${s.c}]/10 border border-[${s.c}]/20 text-[${s.c}]" style="color:${s.c}; background-color: ${s.c}20;">
                <span class="material-symbols-outlined text-[16px]">${s.i}</span>
            </div>
            <div class="flex-1">
                <div class="flex justify-between text-[11px] mb-1">
                    <span class="text-slate-200 font-medium group-hover:text-white">${s.name}</span>
                    <span class="text-white font-mono font-semibold">${formatCurrency(s.amount)}</span>
                </div>
                <div class="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full w-[65%] rounded-full shadow-[0_0_8px_rgba(255,153,0,0.4)]" 
                         style="width: ${pct}%; background-color: ${s.c}"></div>
                </div>
            </div>
        </div>`;
        list.insertAdjacentHTML('beforeend', html);
    });
}

function formatCurrency(val, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(val);
}

function setupNavigation() {
    const btnOpen = document.getElementById('btn-open-dashboard');
    if (btnOpen) {
        btnOpen.addEventListener('click', () => {
            chrome.tabs.create({ url: 'dashboard.html' });
        });
    }

    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
        btnSettings.addEventListener('click', () => {
            if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
            else window.open(chrome.runtime.getURL('options.html'));
        });
    }
}

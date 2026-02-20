import './styles.css';
document.addEventListener('DOMContentLoaded', () => {
    loadData();

    document.getElementById('btn-open-dashboard').addEventListener('click', () => {
        chrome.tabs.create({ url: 'dashboard.html' });
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
});

function loadData() {
    chrome.storage.local.get(['dashboardData'], (result) => {
        if (result.dashboardData) {
            updatePopup(result.dashboardData);
        }
    });
}

function updatePopup(data) {
    const currency = data.currency || 'USD';
    const rate = data.rate || 1.0;
    const format = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(num);

    // 1. Total Spend
    document.getElementById('popup-total-spend').innerText = format(data.totalGlobal || 0);

    // 2. Forecast
    let totalForecast = 0;
    if (data.aws?.forecast) totalForecast += parseFloat(data.aws.forecast);
    if (data.azure?.forecast) totalForecast += parseFloat(data.azure.forecast);
    if (data.gcp?.forecast) totalForecast += parseFloat(data.gcp.forecast);

    document.getElementById('popup-forecast-spend').innerText = format(totalForecast * rate);

    // 3. Status
    const statusDot = document.getElementById('popup-status-dot');
    const statusText = document.getElementById('popup-status-text');
    let errors = [];
    if (data.aws?.error) errors.push("AWS");
    if (data.azure?.error) errors.push("Azure");
    if (data.gcp?.error) errors.push("GCP");

    if (errors.length > 0) {
        statusDot.classList.remove('bg-emerald-500');
        statusDot.classList.add('bg-rose-500');
        statusText.innerText = "Attention Needed";
    } else {
        statusDot.classList.remove('bg-rose-500');
        statusDot.classList.add('bg-emerald-500');
        statusText.innerText = "System Active";
    }

    // 4. Header Icons
    const toggleIcon = (id, active) => {
        const el = document.getElementById(id);
        if (active) {
            el.classList.remove('grayscale', 'opacity-40');
        } else {
            el.classList.add('grayscale', 'opacity-40');
        }
    };
    // Check if distinct provider data exists > 0 or no error
    toggleIcon('status-aws', (data.aws && !data.aws.error && data.aws.totalCost >= 0));
    toggleIcon('status-azure', (data.azure && !data.azure.error && data.azure.totalCost >= 0));
    toggleIcon('status-gcp', (data.gcp && !data.gcp.error && data.gcp.totalCost >= 0));

    // 5. Services List (Top 3)
    const listEl = document.getElementById('popup-services-list');
    listEl.innerHTML = '';

    let allServices = [];
    if (data.aws?.services) data.aws.services.forEach(s => allServices.push({ ...s, provider: 'AWS', color: '#FF9900' }));
    if (data.azure?.services) data.azure.services.forEach(s => allServices.push({ ...s, provider: 'Azure', color: '#0078D4' }));
    if (data.gcp?.services) data.gcp.services.forEach(s => allServices.push({ ...s, provider: 'GCP', color: '#DB4437' }));

    allServices.sort((a, b) => b.amount - a.amount);
    const top3 = allServices.slice(0, 3);
    const totalCalc = (data.aws?.totalCost || 0) + (data.azure?.totalCost || 0) + (data.gcp?.totalCost || 0);

    top3.forEach(s => {
        const amountConverted = s.amount * rate;
        const pct = totalCalc > 0 ? (s.amount / totalCalc) * 100 : 0; // Use raw calculation for pct

        const html = `
        <div class="flex items-center gap-3 py-1">
            <div class="w-6 h-6 rounded flex items-center justify-center bg-slate-800 text-[9px] font-bold border border-slate-700" style="color: ${s.color}">${s.provider}</div>
            <div class="flex-1">
                <div class="flex justify-between text-[11px] mb-1">
                    <span class="text-slate-300 truncate w-24">${s.name}</span>
                    <span class="text-white font-mono">${format(amountConverted)}</span>
                </div>
                <div class="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full rounded-full" style="width: ${pct}%; background-color: ${s.color}"></div>
                </div>
            </div>
        </div>
        `;
        listEl.insertAdjacentHTML('beforeend', html);
    });

    if (top3.length === 0) {
        listEl.innerHTML = '<div class="text-center text-[11px] text-slate-500">No active services found.</div>';
    }
}

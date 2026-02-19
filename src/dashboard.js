import { Chart } from "chart.js/auto"; // Not used but could be. We use SVG manual rendering here to match design.

document.addEventListener('DOMContentLoaded', async () => {
    console.log('--- CloudSight Dashboard v1.1 Loaded ---');
    // 1. Interactive Handlers (Navigation, Buttons)
    setupInteractions();

    // 2. Data Fetching & Rendering
    await loadDashboardData();

    // 3. Setup polling or alarm listener? 
    // Usually popup/dashboard reloads on open. One-time fetch is fine.
});

// ── Data Loading Logic ───────────────────────────────────────────────

async function loadDashboardData() {
    const result = await chrome.storage.local.get(['dashboardData']);
    const data = result.dashboardData;

    if (!data) {
        // No data at all
        renderEmptyState();
        return;
    }

    renderKPIs(data);
    renderTrendChart(data);
    renderDonutChart(data);
    renderTopServices(data);
}

function renderKPIs(data) {
    const currency = data.currency || 'USD';
    const total = data.totalGlobal || 0;

    // Total Spend
    const totalEl = document.getElementById('kpi-total-spend');
    if (totalEl) totalEl.innerText = formatCurrency(total, currency);

    // Forecast (Sum of provider forecasts)
    // Note: Background.js might mostly return AWS forecast.
    const forecast = parseFloat(data.aws?.forecast || 0) + parseFloat(data.azure?.forecast || 0) + parseFloat(data.gcp?.forecast || 0);
    const forecastEl = document.getElementById('kpi-forecast');
    if (forecastEl) forecastEl.innerText = formatCurrency(forecast, currency);

    // Savings
    // Avoid hallucinating. If spend is 0, savings is 0.
    // If spend > 0, we can calculate a heuristic or show 0 if not calculated.
    // Let's only show something if we have data.
    const savingsEl = document.getElementById('kpi-savings');
    if (savingsEl) {
        if (total === 0) {
            savingsEl.innerHTML = `$0`;
        } else {
            // Simple heuristic to show POTENTIAL capability without lying too much
            // Or just 0.
            savingsEl.innerHTML = `$0`;
        }
    }
}

function renderTrendChart(data) {
    const svg = document.getElementById('trend-chart-svg');
    if (!svg) return;

    // Get history from AWS (primary source for now)
    const history = data.aws?.history || [];

    if (history.length < 2) {
        // Flat line logic
        return;
    }

    // Map data to SVG coordinates
    // ViewBox: 0 0 1000 320 (Width 1000, Height 320)
    const width = 1000;
    const height = 320;
    const padding = 20;

    // Find Max Cost for scaling
    const maxVals = history.map(d => d.cost);
    const maxCost = (Math.max(...maxVals) || 10) * 1.2; // +20% headroom
    const minCost = 0;

    const getX = (i) => (i / (history.length - 1)) * width;
    const getY = (cost) => height - ((cost / maxCost) * (height - padding)); // Inverted Y

    // Generate Path Command
    // We want a smooth curve. For simplicity, we use Catmull-Rom or just Line L.
    // Let's use simple L for robust rendering.

    let d = `M${getX(0).toFixed(1)},${getY(history[0].cost).toFixed(1)}`;
    for (let i = 1; i < history.length; i++) {
        const x = getX(i);
        const y = getY(history[i].cost);
        // Bezier smoothing can be added here, but straight lines are safer to implement raw
        d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
    }

    // Update the Line Path
    // We need to find the specific path elements inside SVG. 
    // They don't have IDs, so we assume order or querySelector.
    // Since we overwrote the HTML with IDs... wait, I didn't add IDs to paths.
    // I can rewrite the innerHTML of the SVG or target by stroke color.

    const linePath = svg.querySelector('path[stroke="#6366F1"]'); // Spend Line
    if (linePath) linePath.setAttribute('d', d);

    // Update Area Path (Closed loop)
    const areaPath = svg.querySelector('path[fill="url(#gradTotal)"]');
    if (areaPath) {
        const areaD = d + ` V${320} H${0} Z`;
        areaPath.setAttribute('d', areaD);
    }

    // Update Forecast Line (Only if we have forecast logic, else hide or flat)
    const forecastPath = svg.querySelector('path[stroke-dasharray="6,6"]');
    if (forecastPath) {
        // Reset forecast to valid endpoint if no data
        forecastPath.setAttribute('d', '');
    }

    // Update Tooltip Text
    const tooltipText = svg.querySelector('text[font-weight="bold"]');
    if (tooltipText) {
        tooltipText.textContent = formatCurrency(history[history.length - 1].cost);
    }

    // Update Y-Axis labels (Static HTML over SVG)
    // Find the container
    const yAxisContainer = svg.previousElementSibling; // Div with labels
    if (yAxisContainer) {
        const labels = yAxisContainer.querySelectorAll('span');
        // Simple linear dist
        if (labels.length >= 5) {
            labels[0].innerText = formatCurrency(maxCost);
            labels[1].innerText = formatCurrency(maxCost * 0.75);
            labels[2].innerText = formatCurrency(maxCost * 0.5);
            labels[3].innerText = formatCurrency(maxCost * 0.25);
            labels[4].innerText = '$0';
        }
    }
}

function renderDonutChart(data) {
    const total = data.totalGlobal || 1; // Prevent div/0
    const aws = data.aws?.totalCost || 0;
    const azure = data.azure?.totalCost || 0;
    const gcp = data.gcp?.totalCost || 0;

    const pAws = (aws / total) * 100;
    const pAzure = (azure / total) * 100;
    const pGcp = (gcp / total) * 100;

    const svg = document.getElementById('donut-chart-svg');
    if (svg) {
        const circles = svg.querySelectorAll('circle');
        // 0: background
        // 1: AWS (Orange)
        // 2: Azure (Blue)
        // 3: GCP (Red)
        if (circles[1]) circles[1].setAttribute('stroke-dasharray', `${pAws} ${100 - pAws}`);

        if (circles[2]) {
            circles[2].setAttribute('stroke-dasharray', `${pAzure} ${100 - pAzure}`);
            circles[2].setAttribute('stroke-dashoffset', `-${pAws}`);
        }

        if (circles[3]) {
            circles[3].setAttribute('stroke-dasharray', `${pGcp} ${100 - pGcp}`);
            circles[3].setAttribute('stroke-dashoffset', `-${pAws + pAzure}`);
        }
    }

    // Update Total Text in center
    const totalText = document.getElementById('donut-total-text');
    if (totalText) totalText.innerText = (total > 1000) ? `$${(total / 1000).toFixed(1)}k` : `$${total.toFixed(0)}`;

    // Update Legend Percentages
    // Need to find them by text context or DOM order.
    // Provider Distribution is in a grid.
    const legendItems = document.querySelectorAll('.col-span-12.lg\\:col-span-4 .grid > div');
    if (legendItems.length >= 3) {
        legendItems[0].querySelector('.text-white').innerText = `${pAws.toFixed(0)}%`;
        legendItems[1].querySelector('.text-white').innerText = `${pAzure.toFixed(0)}%`;
        legendItems[2].querySelector('.text-white').innerText = `${pGcp.toFixed(0)}%`;
    }
}

function renderTopServices(data) {
    const list = document.getElementById('top-services-list');
    if (!list) return;

    list.innerHTML = ''; // Clear static mock data

    // Combine services
    let services = [];
    if (data.aws?.services) services.push(...data.aws.services.map(s => ({ ...s, p: 'AWS', c: '#FF9900', i: 'dns' })));
    if (data.azure?.services) services.push(...data.azure.services.map(s => ({ ...s, p: 'Azure', c: '#0078D4', i: 'database' })));
    if (data.gcp?.services) services.push(...data.gcp.services.map(s => ({ ...s, p: 'GCP', c: '#DB4437', i: 'cloud_queue' })));

    if (services.length === 0) {
        list.innerHTML = `<div class="text-center text-muted-text text-sm py-4">No active services found.</div>`;
        return;
    }

    services.sort((a, b) => b.amount - a.amount);
    const top5 = services.slice(0, 5);
    const maxVal = top5[0].amount || 1;

    top5.forEach(s => {
        const pct = (s.amount / maxVal) * 100;
        const html = `
        <div class="group">
            <div class="flex justify-between items-center text-sm mb-2">
                <div class="flex items-center gap-3">
                    <div class="p-1.5 rounded bg-[${s.c}]/10 text-[${s.c}]" style="color:${s.c}; background-color: ${s.c}20;">
                        <span class="material-symbols-outlined text-[16px]">${s.i}</span>
                    </div>
                    <span class="font-medium text-slate-200">${s.name}</span>
                </div>
                <div class="text-right">
                    <span class="font-bold text-white">${formatCurrency(s.amount)}</span>
                </div>
            </div>
            <div class="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500 relative overflow-hidden group-hover:brightness-110" 
                     style="width: ${pct}%; background-color: ${s.c}">
                </div>
            </div>
        </div>`;
        list.insertAdjacentHTML('beforeend', html);
    });
}

function renderEmptyState() {
    // Implicitly handled by default 0 values in HTML if overwritten, 
    // but JS overwrites fetch results.
    document.getElementById('kpi-total-spend').innerText = '$0.00';
}

function formatCurrency(val, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(val);
}


// ── Interaction Logic (Restored from previous step) ───────────────────

function setupInteractions() {
    // Sidebar Navigation - Visual Active State
    const navLinks = document.querySelectorAll('aside nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => {
                l.classList.remove('bg-white/5', 'text-white', 'border-white/5');
                l.classList.add('text-muted-text', 'hover:text-white', 'hover:bg-white/5');
            });
            link.classList.remove('text-muted-text', 'hover:text-white', 'hover:bg-white/5');
            link.classList.add('bg-white/5', 'text-white', 'border', 'border-white/5');

            const label = link.textContent.trim();
            const headerTitle = document.querySelector('header h2');
            if (headerTitle) {
                if (label.includes('Dashboard') || label.includes('Overview')) headerTitle.innerText = 'Cloud Command Center';
                else if (label.includes('Cost Analytics')) headerTitle.innerText = 'Cost Analysis & Trends';
                else if (label.includes('Budgets')) headerTitle.innerText = 'Budget Management';
                else if (label.includes('Forecasting')) headerTitle.innerText = 'AI Forecasting Model';
                else if (label.includes('Alerts')) headerTitle.innerText = 'Security & Cost Alerts';
                else if (label.includes('Settings')) headerTitle.innerText = 'Global Settings';
                else if (label.includes('Support')) headerTitle.innerText = 'Support Center';
            }
        });
    });

    // Header Time Filters
    const timeButtons = document.querySelectorAll('header button');
    timeButtons.forEach(btn => {
        const text = btn.innerText.trim();
        if (['1D', '7D', '30D', 'Sep 20 - Oct 20'].some(t => text.includes(t) || t === text)) {
            btn.addEventListener('click', () => {
                // Just visual logic
                const group = btn.parentElement;
                const siblings = group.querySelectorAll('button');
                siblings.forEach(s => s.className = 'px-3 py-1.5 text-xs font-medium text-muted-text hover:text-white transition-colors');
                if (btn.innerText.includes('30D')) btn.className = 'bg-white/10 rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm ring-1 ring-white/10 checkbox';
                else btn.className = 'px-3 py-1.5 text-xs font-medium text-white bg-white/5 rounded-md transition-colors';
            });
        }
    });

    // Other listeners (Search, View Report) can be added here if critical
}

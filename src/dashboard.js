import './styles.css';
import Chart from 'chart.js/auto';

let costChartInstance = null;
let currentData = null; // Store data for filtering

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // 1. Refresh button
    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('animate-spin');
            chrome.runtime.sendMessage({ action: "FORCE_REFRESH" }, () => {
                setTimeout(() => {
                    loadData();
                    refreshBtn.classList.remove('animate-spin');
                }, 2000);
            });
        });
    }

    // 2. Time Period Buttons & Date Display
    const timeButtons = [
        document.getElementById('btn-1d'),
        document.getElementById('btn-7d'),
        document.getElementById('btn-30d')
    ];
    const dateDisplay = document.querySelector('#date-range-display span');

    timeButtons.forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            // Remove active classes
            timeButtons.forEach(b => {
                if (b) b.className = "px-3 py-1.5 text-xs font-medium text-muted-text hover:text-white transition-colors cursor-pointer";
            });

            // Add active class
            e.target.className = "bg-white/10 rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm ring-1 ring-white/10 transition-colors cursor-default";

            const period = e.target.innerText.trim();

            // Update Date Display
            if (dateDisplay) {
                const today = new Date();
                const opts = { month: 'short', day: 'numeric' };
                if (period === '1D') {
                    dateDisplay.innerText = today.toLocaleDateString(undefined, opts);
                } else if (period === '7D') {
                    const past = new Date();
                    past.setDate(today.getDate() - 7);
                    dateDisplay.innerText = `${past.toLocaleDateString(undefined, opts)} - ${today.toLocaleDateString(undefined, opts)}`;
                } else {
                    const past = new Date();
                    past.setDate(today.getDate() - 30);
                    dateDisplay.innerText = `${past.toLocaleDateString(undefined, opts)} - ${today.toLocaleDateString(undefined, opts)}`;
                }
            }

            if (currentData) {
                renderChart(currentData, currentData.rate || 1.0, currentData.currency || 'USD', period);
            }
        });
    });

    // Chart Toggles (Visual only for now as we lack daily history for Azure/GCP)
    ['toggle-aws', 'toggle-azure', 'toggle-gcp'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', () => {
                const isActive = el.classList.contains('bg-white/10');
                if (isActive) {
                    el.classList.remove('bg-white/10', 'border', 'border-white/5');
                    el.classList.add('opacity-60', 'hover:opacity-100');
                    el.querySelector('span:last-child').className = "text-xs font-medium text-muted-text";
                } else {
                    el.classList.add('bg-white/10', 'border', 'border-white/5');
                    el.classList.remove('opacity-60', 'hover:opacity-100');
                    el.querySelector('span:last-child').className = "text-xs font-medium text-white";
                }
            });
        }
    });

    // 3. Sidebar Links
    const sidebarLinks = document.querySelectorAll('aside nav a');
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.innerText.trim();

        // Skip valid links logic
        if (href !== '#' && !href.startsWith('javascript')) return;

        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Map links to IDs
            let targetId = null;
            if (text.includes("Overview")) targetId = 'card-overview';
            else if (text.includes("Cost Analytics")) targetId = 'card-chart';
            else if (text.includes("Budgets")) targetId = 'card-budget';
            else if (text.includes("Forecasting")) targetId = 'card-forecast';
            else if (text.includes("Alerts")) targetId = 'card-system';
            else if (text.includes("Support")) {
                window.open("https://github.com/naren/CloudSight/issues", "_blank");
                return;
            }

            if (targetId) {
                const el = document.getElementById(targetId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight effect
                    el.classList.add('ring-2', 'ring-indigo-500', 'transition-all', 'duration-500');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500'), 1500);
                }
            }
        });
    });

    // 4. Sidebar Status Rows (Click to Configure)
    const providerRows = [
        { id: 'status-aws-container', tab: 'aws' },
        { id: 'status-azure-container', tab: 'azure' },
        { id: 'status-gcp-container', tab: 'gcp' }
    ];

    providerRows.forEach(p => {
        const el = document.getElementById(p.id);
        if (el) {
            el.addEventListener('click', () => {
                // Open Options page with specific tab
                if (chrome.runtime.openOptionsPage) {
                    // Start 1: We can't pass hash to openOptionsPage directly in all browsers nicely, 
                    // but we can open a new tab or rely on the options page checking storage/hash if we open it manually.
                    // chrome.runtime.openOptionsPage() usually focuses existing.
                    // Let's use window.open for specific hash target if supported, or standard way.
                    window.open(`options.html#${p.tab}`, '_blank');
                }
            });
        }
    });
});

function loadData() {
    chrome.storage.local.get(['dashboardData'], (result) => {
        const data = result.dashboardData;
        if (data) {
            currentData = data;
            updateDashboard(data);

            // Pass full data to status updater to check isDemo
            chrome.storage.local.get(['cloudCreds'], (credResult) => {
                updateSidebarStatus(credResult.cloudCreds, data.isDemo);
            });
        } else {
            // console.log("No dashboard data found.");
            updatePlaceholder("No Data Found");
            chrome.storage.local.get(['cloudCreds'], (credResult) => {
                updateSidebarStatus(credResult.cloudCreds, false);
                if (!credResult.cloudCreds) updatePlaceholder("Please Configure Settings");
            });
        }
    });
}

function updatePlaceholder(msg) {
    const placeholder = document.querySelector('#chart-container .text-muted-text');
    if (placeholder) placeholder.innerText = msg;
}

function updateSidebarStatus(creds) {
    // Helper to set Active
    const setActive = (textId, containerId, dotId = null) => {
        const textEx = document.getElementById(textId);
        const contEx = document.getElementById(containerId);
        if (textEx) {
            textEx.textContent = "Active";
            textEx.className = "text-[10px] text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded";
        }
        if (contEx) {
            contEx.classList.remove("opacity-60");
            contEx.classList.add("opacity-100");
        }
        if (dotId) {
            const dot = document.getElementById(dotId);
            if (dot) {
                dot.classList.remove("bg-red-500", "bg-gray-500");
                dot.classList.add("bg-emerald-500");
            }
        }
    };

    if (!creds) return;

    // AWS
    if (creds.aws && creds.aws.key) {
        setActive(null, 'status-aws-container', 'status-aws-dot');
    }

    // Azure
    if (creds.azure && creds.azure.clientId) {
        setActive('status-azure-text', 'status-azure-container');
    }

    // GCP
    if (creds.gcp && creds.gcp.json) {
        setActive('status-gcp-text', 'status-gcp-container');
    }
}

function updateDashboard(data) {
    const currency = data.currency || 'USD';
    const rate = data.rate || 1.0;
    const format = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(num);

    const totalEl = document.getElementById('total-spend');
    if (totalEl) totalEl.innerText = format(data.totalGlobal || 0);

    let totalForecast = 0;
    if (data.aws?.forecast) totalForecast += parseFloat(data.aws.forecast);
    if (data.azure?.forecast) totalForecast += parseFloat(data.azure.forecast);
    if (data.gcp?.forecast) totalForecast += parseFloat(data.gcp.forecast);
    if (document.getElementById('forecast-spend')) document.getElementById('forecast-spend').innerText = format(totalForecast * rate);

    // Dynamic Budget Limit
    const limitRaw = data.budgetLimit || 1000;
    const budgetLimit = limitRaw * rate;

    const usedPct = budgetLimit > 0 ? ((data.totalGlobal / budgetLimit) * 100).toFixed(0) : 0;
    const remaining = Math.max(0, budgetLimit - data.totalGlobal); // Don't show negative

    if (document.getElementById('budget-used')) document.getElementById('budget-used').innerText = usedPct + "%";
    if (document.getElementById('budget-remaining')) document.getElementById('budget-remaining').innerText = format(remaining);

    const budgetCircle = document.getElementById('budget-circle');
    // Ensure stroke-dasharray doesn't break if pct > 100
    const dashPct = Math.min(usedPct, 100);
    if (budgetCircle) budgetCircle.setAttribute("stroke-dasharray", `${dashPct}, 100`);

    const statusEl = document.getElementById('system-status');
    const alertPill = document.getElementById('alert-pill');
    const alertCountStr = document.getElementById('alert-count');
    const anomalyBadge = document.getElementById('anomaly-badge');

    let errors = [];
    if (data.aws?.error) errors.push(`AWS: ${data.aws.error}`);
    if (data.azure?.error) errors.push(`Azure: ${data.azure.error}`);
    if (data.gcp?.error) errors.push(`GCP: ${data.gcp.error}`);

    let statusText = "Active";
    let statusColor = "text-white";
    let alerts = [];

    // 1. Check Budget
    if (usedPct >= 100) {
        statusText = "Critical";
        statusColor = "text-red-500";
        alerts.push(`Budget Exceeded (${usedPct}%)`);
    } else if (usedPct >= 85) {
        statusText = "Warning";
        statusColor = "text-amber-500";
        alerts.push(`Budget Near Limit (${usedPct}%)`);
    }

    // 2. Check Errors
    // Fix: Ensure we display meaningful messages, not just 'true'
    const getErrorMsg = (err) => {
        if (typeof err === 'string') return err;
        if (err === true) return "Connection Failed (Check Credentials)";
        return "Unknown Error";
    };

    if (data.aws?.error) errors.push(`AWS: ${getErrorMsg(data.aws.error)}`);
    if (data.azure?.error) errors.push(`Azure: ${getErrorMsg(data.azure.error)}`);
    if (data.gcp?.error) errors.push(`GCP: ${getErrorMsg(data.gcp.error)}`);

    if (errors.length > 0) {
        statusText = "Attention";
        statusColor = "text-amber-500";
        alerts.push(...errors);
    }

    // 3. Render Status
    if (statusEl) {
        statusEl.innerText = statusText;
        statusEl.className = `text-3xl font-bold tracking-tight ${statusColor}`;

        // Make the card clickable for details
        const cardSystem = document.getElementById('card-system');
        if (cardSystem) {
            cardSystem.style.cursor = alerts.length > 0 ? 'pointer' : 'default';
            cardSystem.onclick = () => {
                if (alerts.length > 0) {
                    showAlertModal(alerts);
                }
            };
        }
    }

    // 4. Render Pill
    if (alertPill && alertCountStr) {
        if (alerts.length > 0) {
            alertPill.style.display = "inline-flex";
            alertCountStr.innerText = `${alerts.length} Alert(s)`;
            // Update pill color based on severity
            if (statusText === 'Critical') {
                alertPill.className = "flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[11px] font-medium text-red-500 border border-red-500/20 animate-pulse";
                alertPill.querySelector('span').className = "h-1.5 w-1.5 rounded-full bg-red-500";
            } else {
                alertPill.className = "flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-500 border border-amber-500/20 animate-pulse";
                alertPill.querySelector('span').className = "h-1.5 w-1.5 rounded-full bg-amber-500";
            }
        } else {
            alertPill.style.display = "none";
        }
    }

    // 5. Anomaly Badge
    if (data.aws?.anomaly?.isAnomaly && anomalyBadge) {
        anomalyBadge.style.setProperty('display', 'flex', 'important');
        alerts.push("Anomaly: Unusual Spend Detected in AWS");
    }
    if (document.getElementById('last-updated') && data.lastUpdated) {
        document.getElementById('last-updated').innerText = new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function showAlertModal(alerts) {
        const modal = document.getElementById('alert-modal');
        const content = document.getElementById('alert-modal-content');
        const list = document.getElementById('alert-list');
        const btnClose = document.getElementById('close-modal');
        const btnResolve = document.getElementById('btn-resolve');

        if (!modal || !list) return;

        // Populate List
        list.innerHTML = '';
        alerts.forEach(alertMsg => {
            // Determine icon and color based on content
            let icon = 'error';
            let colorClass = 'text-red-400';
            let borderClass = 'border-red-500/20';
            let bgClass = 'bg-red-500/10';

            if (alertMsg.includes("Warning") || alertMsg.includes("Attention") || alertMsg.includes("Near Limit")) {
                icon = 'warning';
                colorClass = 'text-amber-400';
                borderClass = 'border-amber-500/20';
                bgClass = 'bg-amber-500/10';
            } else if (alertMsg.includes("Info")) {
                icon = 'info';
                colorClass = 'text-blue-400';
                borderClass = 'border-blue-500/20';
                bgClass = 'bg-blue-500/10';
            }

            const item = `
                <div class="flex items-start gap-3 p-3 rounded-lg border ${borderClass} ${bgClass}">
                    <span class="material-symbols-outlined ${colorClass} text-[20px] mt-0.5">${icon}</span>
                    <span class="text-sm text-slate-200 font-medium leading-relaxed">${alertMsg}</span>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', item);
        });

        // Show Modal
        modal.classList.remove('hidden');
        // Small delay for transition
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        });

        const closeModal = () => {
            modal.classList.add('opacity-0');
            content.classList.remove('scale-100');
            content.classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 300);
        };

        btnClose.onclick = closeModal;
        btnResolve.onclick = closeModal;

        // Close on click outside
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }


    const awsCost = (data.aws?.totalCost || 0) * rate;
    const azureCost = (data.azure?.totalCost || 0) * rate;
    const gcpCost = (data.gcp?.totalCost || 0) * rate;
    const totalCalc = awsCost + azureCost + gcpCost;
    if (document.getElementById('dist-total')) document.getElementById('dist-total').innerText = (totalCalc / 1000).toFixed(1) + "k";

    const setDist = (id, cost) => {
        const el = document.getElementById(id);
        if (el && totalCalc > 0) el.innerText = Math.round((cost / totalCalc) * 100) + "%";
    };
    setDist('dist-aws-pct', awsCost);
    setDist('dist-azure-pct', azureCost);
    setDist('dist-gcp-pct', gcpCost);

    const listEl = document.getElementById('top-services-list');
    if (listEl) {
        listEl.innerHTML = '';
        let allServices = [];
        if (data.aws?.services) data.aws.services.forEach(s => allServices.push({ ...s, provider: 'AWS', color: '#FF9900' }));
        if (data.azure?.services) data.azure.services.forEach(s => allServices.push({ ...s, provider: 'Azure', color: '#0078D4' }));
        if (data.gcp?.services) data.gcp.services.forEach(s => allServices.push({ ...s, provider: 'GCP', color: '#DB4437' }));
        allServices.sort((a, b) => b.amount - a.amount);
        const top5 = allServices.slice(0, 5);
        top5.forEach(s => {
            const amountConverted = s.amount * rate;
            const pct = totalCalc > 0 ? (amountConverted / totalCalc) * 100 : 0;
            const html = `
            <div class="group">
                <div class="flex justify-between items-center text-sm mb-2">
                    <div class="flex items-center gap-3">
                        <div class="p-1.5 rounded" style="background-color: ${s.color}1a; color: ${s.color}">
                            <span class="material-symbols-outlined text-[16px]">dns</span>
                        </div>
                        <span class="font-medium text-slate-200">${s.name}</span>
                    </div>
                    <div class="text-right">
                        <span class="font-bold text-white">${format(amountConverted)}</span>
                    </div>
                </div>
                <div class="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div class="h-full rounded-full group-hover:brightness-110 transition-all duration-500" style="width: ${pct}%; background-color: ${s.color};"></div>
                </div>
            </div>`;
            listEl.insertAdjacentHTML('beforeend', html);
        });
        if (top5.length === 0) listEl.innerHTML = '<div class="text-center text-muted-text py-4">No data available</div>';
    }

    // Default to 14 days (or max available) initially
    renderChart(data, rate, currency, '30D');
}

function renderChart(data, rate, currency, period = '30D') {
    const ctx = document.getElementById('costChart');
    if (!ctx) return;

    if (costChartInstance) {
        costChartInstance.destroy();
    }

    let history = data.aws?.history || [];

    // Filter History based on Period
    // history is array of { date: 'YYYY-MM-DD', cost: number }
    // Sort just in case
    history.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Slice
    if (period === '1D') {
        history = history.slice(-1);
    } else if (period === '7D') {
        history = history.slice(-7);
    } else {
        // 30D or Max (we only have ~14 days usually)
        history = history.slice(-30);
    }

    const labels = history.map(h => new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const values = history.map(h => h.cost * rate);

    if (values.length === 0) {
        ctx.style.display = 'none';
        return;
    } else {
        ctx.style.display = 'block';
    }

    costChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'AWS Daily Cost',
                data: values,
                borderColor: '#5E6AD2',
                backgroundColor: 'rgba(94, 106, 210, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1E293B',
                    titleColor: '#F8FAFC',
                    bodyColor: '#F8FAFC',
                    borderColor: '#334155',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(context.raw)
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: { color: '#64748B', maxTicksLimit: 7 }
                },
                y: {
                    display: true,
                    grid: { color: '#334155', drawBorder: false },
                    ticks: { color: '#64748B', callback: (val) => val }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

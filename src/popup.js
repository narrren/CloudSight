import Chart from 'chart.js/auto';

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['dashboardData', 'lastUpdated'], (result) => {
        const data = result.dashboardData;
        if (!data) {
            const costEl = document.getElementById('total-cost');
            costEl.innerText = "Setup Required";
            costEl.style.fontSize = "20px";
            costEl.style.cursor = "pointer";
            costEl.style.color = "#3498db";
            costEl.title = "Click to Open Settings";
            costEl.onclick = () => chrome.runtime.openOptionsPage();
            return;
        }

        // 1. Text Updates
        // Use stored currency and rate
        const currency = data.currency || 'USD';
        const rate = data.rate || 1.0;
        const convert = (val) => val * rate;

        // Total Cost (already converted in background.js, or we convert here if not)
        // Background sets data.totalGlobal = convert(...)
        document.getElementById('total-cost').innerText = `${currency} ${data.totalGlobal.toFixed(2)}`;

        // Calculate Total Forecast
        // Note: Forecasts are raw numbers from APIs (USD or native), need manual conversion here.
        const awsForecast = data.aws ? parseFloat(data.aws.forecast) : 0;
        const azureForecast = data.azure ? parseFloat(data.azure.forecast) : 0;
        const gcpForecast = data.gcp ? parseFloat(data.gcp.forecast) : 0;

        const totalForecast = convert(awsForecast + azureForecast + gcpForecast);
        document.getElementById('forecast-cost').innerText = `${currency} ${totalForecast.toFixed(2)}`;

        document.getElementById('last-sync').innerText = data.lastUpdated
            ? new Date(data.lastUpdated).toLocaleTimeString()
            : "Never";

        // 2. Chart: Provider Breakdown
        const ctx = document.getElementById('serviceChart').getContext('2d');

        // Check which providers are active
        const labels = [];
        const values = [];
        const colors = [];

        // Values for chart should be in user currency
        if (data.aws && data.aws.totalCost > 0) {
            labels.push('AWS');
            values.push(convert(data.aws.totalCost));
            colors.push('#FF9900');
        }
        if (data.azure && data.azure.totalCost > 0) {
            labels.push('Azure');
            values.push(convert(data.azure.totalCost));
            colors.push('#0078D4');
        }
        if (data.gcp && data.gcp.totalCost > 0) {
            labels.push('GCP');
            values.push(convert(data.gcp.totalCost));
            colors.push('#4285F4');
        }

        // If no cost, show empty state
        if (labels.length === 0) {
            labels.push('No Cost Data');
            values.push(1);
            colors.push('#E0E0E0');
        }

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: 'Spend by Provider' }
                }
            }
        });
    });
});

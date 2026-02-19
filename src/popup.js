document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize State logic (Mock)
    const state = {
        aws: true,
        azure: false,
        gcp: false
    };

    // 2. Navigation: Open Dashboard
    const btnOpen = document.getElementById('btn-open-dashboard');
    if (btnOpen) {
        btnOpen.addEventListener('click', () => {
            chrome.tabs.create({ url: 'dashboard.html' });
        });
    }

    // 3. Navigation: Settings
    // Target the settings button in header (it has a settings icon)
    const settingsBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerHTML.includes('settings'));
    settingsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('options.html'));
            }
        });
    });

    // 4. Provider Filters (Interactive Toggles)
    // We target them by their titles which are unique in the HTML
    const awsFilter = document.querySelector('div[title="AWS Active"]');
    const azureFilter = document.querySelector('div[title="Azure Paused"]');
    const gcpFilter = document.querySelector('div[title="GCP Off"]');

    function toggleFilter(el, provider) {
        if (!el) return;
        state[provider] = !state[provider];

        // Visual Update
        if (state[provider]) {
            el.classList.remove('grayscale', 'opacity-40');
            el.classList.add('opacity-100');
            // Mock: Show toast or feedback?
        } else {
            el.classList.add('grayscale', 'opacity-40');
            el.classList.remove('opacity-100');
        }

        // Mock: Update Total Spend Text to simulate filtering
        updateSpendDisplay();
    }

    if (awsFilter) awsFilter.addEventListener('click', () => toggleFilter(awsFilter, 'aws'));
    if (azureFilter) azureFilter.addEventListener('click', () => toggleFilter(azureFilter, 'azure'));
    if (gcpFilter) gcpFilter.addEventListener('click', () => toggleFilter(gcpFilter, 'gcp'));

    function updateSpendDisplay() {
        const totalEl = document.getElementById('total-spend');
        if (!totalEl) return;

        // Simple mock math logic
        let base = 0;
        if (state.aws) base += 8450;
        if (state.azure) base += 2105;
        if (state.gcp) base += 890;
        // Default base overhead
        if (!state.aws && !state.azure && !state.gcp) base = 0;
        else base += 1005; // misc

        totalEl.innerHTML = `$${base.toLocaleString()}<span class="text-2xl text-slate-500 font-medium">.00</span>`;
    }

    // 5. Forecast Card Click -> Go to Dashboard Analytics (Mock)
    const forecastCard = document.getElementById('forecast-card'); // Need to ensure ID or select by content
    // We didn't add ID 'forecast-card', but we can select it
    const cards = document.querySelectorAll('.grid > div');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            // Visual feedback
            card.style.transform = 'scale(0.98)';
            setTimeout(() => card.style.transform = 'scale(1)', 100);

            // Navigate if it's not just a display
            // chrome.tabs.create({ url: 'dashboard.html' });
        });
    });

    // 6. Active Services List Items -> Click
    const serviceItems = document.querySelectorAll('#provider-list > div');
    serviceItems.forEach(item => {
        item.addEventListener('click', () => {
            chrome.tabs.create({ url: 'dashboard.html' });
        });
    });

});

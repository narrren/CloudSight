document.addEventListener('DOMContentLoaded', () => {
    // 1. Sidebar Navigation - Visual Active State
    const navLinks = document.querySelectorAll('aside nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // For now prevent navigation as it's a SPA-style static mockup

            // Remove active style from all
            navLinks.forEach(l => {
                l.classList.remove('bg-white/5', 'text-white', 'border-white/5');
                l.classList.add('text-muted-text', 'hover:text-white', 'hover:bg-white/5');
                const text = l.querySelector('span.text-sm');
                if (text) text.classList.remove('font-medium'); // Reset visual weight if needed
            });

            // Set active to clicked
            link.classList.remove('text-muted-text', 'hover:text-white', 'hover:bg-white/5');
            link.classList.add('bg-white/5', 'text-white', 'border', 'border-white/5');

            // Log for debug
            const label = link.textContent.trim();
            console.log(`Navigated to: ${label}`);

            // Optional: Update title/header based on selection
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

    // 2. Header Time Filters (1D, 7D, 30D)
    const timeButtons = document.querySelectorAll('header button');
    // This selects ALL buttons in header including search/anomaly. Narrow down?
    // The time buttons are in a div with border. Let's find based on text content.
    timeButtons.forEach(btn => {
        const text = btn.innerText.trim();
        if (['1D', '7D', '30D', 'Sep 20 - Oct 20'].some(t => text.includes(t) || t === text)) {
            btn.addEventListener('click', () => {
                // Reset basic styles on siblings in the group
                const group = btn.parentElement;
                const siblings = group.querySelectorAll('button');
                siblings.forEach(s => {
                    // Reset to default muted style
                    s.className = 'px-3 py-1.5 text-xs font-medium text-muted-text hover:text-white transition-colors';
                    // Remove specific active classes if present
                    if (s.innerText.includes('30D')) { // Special handling for 30D which had ring
                        s.className = 'px-3 py-1.5 text-xs font-medium text-muted-text hover:text-white transition-colors';
                    }
                });

                // Set active style on clicked
                btn.className = 'bg-white/10 rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm ring-1 ring-white/10 transition-all';

                // Update specific text if it was the Calendar one?
                if (text.includes('Sep')) {
                    // Just visual toggle
                }

                // Mock: Trigger Chart Update Animation
                updateChartMock();
            });
        }
    });

    // 3. Search Button
    const searchBtn = document.querySelector('header button .material-symbols-outlined:contains("search")')?.parentElement;
    // Selector :contains is jQuery-ish. Use standard check.
    const allHeaderBtns = document.querySelectorAll('header button');
    allHeaderBtns.forEach(btn => {
        if (btn.querySelector('.material-symbols-outlined')?.innerText === 'search') {
            btn.addEventListener('click', () => {
                // Visual feedback only
                btn.classList.add('ring-2', 'ring-primary');
                setTimeout(() => btn.classList.remove('ring-2', 'ring-primary'), 300);
            });
        }
    });

    // 4. View Report Button
    const viewReportBtn = document.querySelector('button:contains("View Report")');
    // Again, select by text manually
    const allBtns = document.querySelectorAll('button');
    allBtns.forEach(btn => {
        if (btn.innerText === 'View Report') {
            btn.addEventListener('click', () => {
                // Navigate to Cost Analytics
                const analyticsNav = Array.from(navLinks).find(l => l.innerText.includes('Cost Analytics'));
                if (analyticsNav) analyticsNav.click();
            });
        }
    });

    // 5. Chart Interaction (Mock Update)
    function updateChartMock() {
        // Find the SVG path for the chart line and animate/replace it slightly
        const chartPath = document.querySelector('svg path[stroke="#6366F1"]'); // Main blue line
        if (!chartPath) return;

        // Simple opacity fade to simulate data refresh
        chartPath.style.opacity = '0.5';
        setTimeout(() => chartPath.style.opacity = '1', 300);

        // Maybe update the current spend number randomly
        const currentSpendText = document.querySelector('svg text[font-weight="bold"]');
        if (currentSpendText) {
            // Keep it stable but flash
            currentSpendText.style.fill = '#fff';
            setTimeout(() => currentSpendText.style.fill = '#fff', 300);
        }
    }

    // 6. Savings Card Interaction
    const savingsCard = document.querySelector('.bg-gradient-to-br'); // The distinctive green card
    if (savingsCard) {
        savingsCard.addEventListener('click', () => {
            // Navigate to Budgets/Savings tab mock
            const budgetNav = Array.from(navLinks).find(l => l.innerText.includes('Budgets'));
            if (budgetNav) budgetNav.click();
        });
    }

});

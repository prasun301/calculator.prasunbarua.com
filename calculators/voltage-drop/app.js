document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('vd-form');
    const resultsContainer = document.getElementById('results-container');
    
    // Output elements
    const outVolts = document.getElementById('vd-volts');
    const outPercent = document.getElementById('vd-percent');
    const outStatus = document.getElementById('vd-status');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Get Input Values
        const sysType = document.getElementById('system-type').value;
        const rho = parseFloat(document.getElementById('material').value);
        const voltage = parseFloat(document.getElementById('voltage').value);
        const current = parseFloat(document.getElementById('current').value);
        const length = parseFloat(document.getElementById('length').value);
        const csa = parseFloat(document.getElementById('csa').value);

        // 2. Compute Voltage Drop
        let voltageDrop = 0;
        if (sysType === 'dc') {
            voltageDrop = (2 * length * current * rho) / csa;
        } else if (sysType === 'ac3') {
            voltageDrop = (Math.sqrt(3) * length * current * rho) / csa;
        }

        // 3. Compute Percentage Drop
        const dropPercent = (voltageDrop / voltage) * 100;

        // 4. Determine Compliance Status (Standard threshold: 3% for lighting, 5% max general)
        let statusText = "Pass (Safe)";
        let statusColor = "#10b981"; // Green
        
        if (dropPercent > 5) {
            statusText = "Fail (> 5% Loss)";
            statusColor = "#ef4444"; // Red
        } else if (dropPercent > 3) {
            statusText = "Warning (> 3% Loss)";
            statusColor = "#f59e0b"; // Orange
        }

        // 5. Update DOM
        outVolts.innerText = `${voltageDrop.toFixed(2)} V`;
        outPercent.innerText = `${dropPercent.toFixed(2)}%`;
        outStatus.innerText = statusText;
        outStatus.style.color = statusColor;

        // 6. Reveal Results
        resultsContainer.classList.remove('hidden');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});

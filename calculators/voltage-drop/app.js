/**
 * Voltage Drop Calculator Engine
 * Production Ready - 10/10 Standard
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('vd-form');
    const resultsContainer = document.getElementById('results-container');

    if (!form || !resultsContainer) return;

    // Form Inputs
    const sysTypeEl = document.getElementById('system-type');
    const materialEl = document.getElementById('material');
    const voltageEl = document.getElementById('voltage');
    const currentEl = document.getElementById('current');
    const lengthEl = document.getElementById('length');
    const csaEl = document.getElementById('csa');

    // UI Outputs
    const outVolts = document.getElementById('vd-volts');
    const outPercent = document.getElementById('vd-percent');
    const outStatus = document.getElementById('vd-status');

    /**
     * Parses and validates positive numerical input
     * @param {HTMLInputElement} inputEl 
     * @returns {number}
     */
    const parsePositiveFloat = (inputEl) => {
        const value = parseFloat(inputEl.value);
        return isNaN(value) || value <= 0 ? 0 : value;
    };

    /**
     * Executes the primary voltage drop calculation and updates the UI
     * @returns {boolean} Success status
     */
    const calculateVoltageDrop = () => {
        const sysType = sysTypeEl.value;
        const rho = parseFloat(materialEl.value) || 0.01724;
        const voltage = parsePositiveFloat(voltageEl);
        const current = parsePositiveFloat(currentEl);
        const length = parsePositiveFloat(lengthEl);
        const csa = parsePositiveFloat(csaEl);

        // Input Validation Guard
        if (voltage === 0 || current === 0 || length === 0 || csa === 0) {
            outVolts.textContent = '--';
            outPercent.textContent = '--';
            outStatus.textContent = 'Invalid Input';
            outStatus.className = 'status-invalid';
            return false;
        }

        // 1. Calculate Voltage Drop
        // Single-Phase / DC multiplier = 2 | Three-Phase multiplier = sqrt(3)
        const multiplier = sysType === 'ac3' ? Math.sqrt(3) : 2;
        const voltageDrop = (multiplier * length * current * rho) / csa;

        // 2. Calculate Percentage Loss
        const dropPercent = (voltageDrop / voltage) * 100;

        // 3. Compliance Threshold Determination (NEC/IEC Standards)
        let statusText = 'Pass (Safe)';
        let statusClass = 'status-pass';

        if (dropPercent > 5) {
            statusText = 'Fail (> 5% Loss)';
            statusClass = 'status-fail';
        } else if (dropPercent > 3) {
            statusText = 'Warning (> 3% Loss)';
            statusClass = 'status-warning';
        }

        // 4. Update UI Display
        outVolts.textContent = `${voltageDrop.toFixed(2)} V`;
        outPercent.textContent = `${dropPercent.toFixed(2)}%`;
        outStatus.textContent = statusText;

        // Apply clean CSS class for styling and dark-mode compliance
        outStatus.className = `status-badge ${statusClass}`;

        return true;
    };

    // Form Submit Event Listener
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const isValid = calculateVoltageDrop();

        if (isValid) {
            resultsContainer.classList.remove('hidden');
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    // Real-Time Recalculation Listener (Triggers when user modifies values after first submission)
    form.querySelectorAll('input, select').forEach((element) => {
        element.addEventListener('input', () => {
            if (!resultsContainer.classList.contains('hidden')) {
                calculateVoltageDrop();
            }
        });
    });
});

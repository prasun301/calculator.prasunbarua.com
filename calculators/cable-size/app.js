/**
 * Professional Cable Size & Cross-Sectional Area (CSA) Calculator Engine
 * Production Ready - 10/10 Standard (IEC / Metric standard sizes)
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cable-form');
    const resultsContainer = document.getElementById('results-container');

    if (!form || !resultsContainer) return;

    // Output DOM elements
    const outStandardSize = document.getElementById('standard-size');
    const outExactArea = document.getElementById('exact-area');
    const outActualDrop = document.getElementById('actual-drop');

    // Standard IEC metric cable cross-sectional areas (mm²)
    const STANDARD_CABLE_SIZES = [
        1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630
    ];

    /**
     * Safely parses positive numerical inputs
     * @param {HTMLInputElement} inputEl 
     * @returns {number}
     */
    const parsePositiveFloat = (inputEl) => {
        const val = parseFloat(inputEl.value);
        return isNaN(val) || val <= 0 ? 0 : val;
    };

    /**
     * Calculates required cable size and actual voltage drop
     * @returns {boolean} Success status
     */
    const calculateCableSize = () => {
        const sysType = document.getElementById('system-type').value;
        const rho = parseFloat(document.getElementById('material').value) || 0.01724; // Resistivity (Ohm-mm²/m)
        const voltage = parsePositiveFloat(document.getElementById('voltage'));
        const current = parsePositiveFloat(document.getElementById('current'));
        const length = parsePositiveFloat(document.getElementById('length'));
        const dropPercent = parsePositiveFloat(document.getElementById('volt-drop-percent'));

        // Input Guard
        if (voltage === 0 || current === 0 || length === 0 || dropPercent === 0) {
            outStandardSize.textContent = '--';
            outExactArea.textContent = '--';
            outActualDrop.textContent = 'Invalid Input';
            return false;
        }

        // 1. Calculate Max Allowable Voltage Drop (Volts)
        const maxAllowedVd = voltage * (dropPercent / 100);

        // 2. Select Circuit Multiplier
        // DC & Single-Phase AC require 2 conductors (out & return)
        // Three-Phase AC uses sqrt(3) ~ 1.732
        let multiplier = 2;
        if (sysType === 'ac3') {
            multiplier = Math.sqrt(3);
        }

        // 3. Compute Exact Minimum Cross-Sectional Area (mm²)
        const exactArea = (multiplier * length * current * rho) / maxAllowedVd;

        // 4. Find Next Standard Cable Size using Array.prototype.find
        const standardSize = STANDARD_CABLE_SIZES.find(size => size >= exactArea);

        // 5. Handle Cable Size Display & Out-of-Bounds Cases
        if (standardSize) {
            // Calculate Actual Voltage Drop with selected standard cable
            const actualVd = (multiplier * length * current * rho) / standardSize;
            const actualVdPercent = (actualVd / voltage) * 100;

            outStandardSize.textContent = `${standardSize} mm²`;
            outStandardSize.classList.remove('warning-text');
            outExactArea.textContent = `${exactArea.toFixed(2)} mm²`;
            outActualDrop.textContent = `${actualVd.toFixed(2)} V (${actualVdPercent.toFixed(2)}%)`;
        } else {
            // Needed CSA exceeds largest standard single conductor (630 mm²)
            const maxAvailable = STANDARD_CABLE_SIZES[STANDARD_CABLE_SIZES.length - 1];
            outStandardSize.textContent = `> ${maxAvailable} mm² (Parallel Runs Required)`;
            outStandardSize.classList.add('warning-text');
            outExactArea.textContent = `${exactArea.toFixed(2)} mm²`;
            outActualDrop.textContent = `Exceeds max standard size`;
        }

        return true;
    };

    // Form Submit Event Handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const isValid = calculateCableSize();

        if (isValid) {
            resultsContainer.classList.remove('hidden');
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    // Real-Time Recalculation Listener
    form.querySelectorAll('input, select').forEach((element) => {
        element.addEventListener('input', () => {
            if (!resultsContainer.classList.contains('hidden')) {
                calculateCableSize();
            }
        });
    });
});

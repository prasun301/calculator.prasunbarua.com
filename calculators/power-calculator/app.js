'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // Primary DOM Selectors (supports both structured ID layouts and template IDs)
    const systemTypeSelect = document.getElementById('system-type') || document.getElementById('type');
    const calcTargetSelect = document.getElementById('calc-target') || document.getElementById('mode');

    const calcBtn = document.getElementById('calc-btn') || document.querySelector('.calc-btn');
    const resetBtn = document.getElementById('reset-btn') || document.querySelector('.reset-btn');
    const resultsSection = document.getElementById('results-section') || document.getElementById('result');

    const resLabel1 = document.getElementById('res-label-1');
    const resVal1 = document.getElementById('res-val-1');
    const resLabel2 = document.getElementById('res-label-2');
    const resVal2 = document.getElementById('res-val-2');

    if (!calcBtn) return; // Safety check if element doesn't exist

    // Helper to highlight invalid input fields professionally
    const setFieldError = (inputEl, isError) => {
        if (!inputEl) return;
        if (isError) {
            inputEl.classList.add('input-error');
        } else {
            inputEl.classList.remove('input-error');
        }
    };

    // Helper to show inline warning banner instead of blocking alert popup
    const showNotification = (message, isError = true) => {
        let existingBanner = document.getElementById('power-alert-banner');
        if (!existingBanner) {
            existingBanner = document.createElement('div');
            existingBanner.id = 'power-alert-banner';
            existingBanner.className = isError ? 'error-banner' : 'success-banner';
            const container = calcBtn.closest('form') || calcBtn.parentElement;
            container.prepend(existingBanner);
            existingBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        existingBanner.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${isError ? 'error' : 'info'}</span> ${message}`;
        setTimeout(() => existingBanner?.remove(), 6000);
    };

    // Helper to get active input elements (static or dynamically created)
    const getInputs = () => ({
        V: document.getElementById('val-voltage') || document.getElementById('V'),
        I: document.getElementById('val-current') || document.getElementById('I'),
        P: document.getElementById('val-power') || document.getElementById('P'),
        PF: document.getElementById('val-pf') || document.getElementById('PF')
    });

    // Calculate Button Click Event
    calcBtn.addEventListener('click', (e) => {
        if (e) e.preventDefault();

        // Clear previous notifications and input errors
        const existingBanner = document.getElementById('power-alert-banner');
        if (existingBanner) existingBanner.remove();

        const inputs = getInputs();
        Object.values(inputs).forEach(input => setFieldError(input, false));

        const system = systemTypeSelect ? systemTypeSelect.value.toLowerCase() : '';
        const mode = calcTargetSelect ? calcTargetSelect.value.toUpperCase() : '';

        if (!system || !mode) {
            showNotification('Please select both System Type and Calculation Target.');
            return;
        }

        const isAc = !system.includes('dc');

        const valV = inputs.V ? parseFloat(inputs.V.value) : NaN;
        const valI = inputs.I ? parseFloat(inputs.I.value) : NaN;
        const valP = inputs.P ? parseFloat(inputs.P.value) : NaN;
        const valPF = isAc ? (inputs.PF ? parseFloat(inputs.PF.value) : 1.0) : 1.0;

        // Determine required fields for current mode
        let requiredFields = [];
        if (mode === 'POWER' || mode === 'P') {
            requiredFields = [{ el: inputs.V, val: valV }, { el: inputs.I, val: valI }];
            if (isAc) requiredFields.push({ el: inputs.PF, val: valPF });
        } else if (mode === 'VOLTAGE' || mode === 'V') {
            requiredFields = [{ el: inputs.P, val: valP }, { el: inputs.I, val: valI }];
            if (isAc) requiredFields.push({ el: inputs.PF, val: valPF });
        } else if (mode === 'CURRENT' || mode === 'I') {
            requiredFields = [{ el: inputs.P, val: valP }, { el: inputs.V, val: valV }];
            if (isAc) requiredFields.push({ el: inputs.PF, val: valPF });
        }

        // Validate required inputs
        let hasError = false;
        requiredFields.forEach(field => {
            if (isNaN(field.val)) {
                setFieldError(field.el, true);
                hasError = true;
            }
        });

        if (hasError) {
            showNotification('Please enter valid numeric values for all required fields.');
            return;
        }

        if (isAc && (valPF < 0 || valPF > 1)) {
            setFieldError(inputs.PF, true);
            showNotification('Power Factor (cosφ) must be between 0 and 1.');
            return;
        }

        let calculatedP, calculatedV, calculatedI, apparentS;
        const sqrt3 = Math.sqrt(3);

        try {
            if (mode === 'POWER' || mode === 'P') {
                if (system.includes('dc')) {
                    calculatedP = valV * valI;
                    apparentS = calculatedP;
                } else if (system.includes('1ph') || system.includes('1-phase')) {
                    calculatedP = valV * valI * valPF;
                    apparentS = valV * valI;
                } else if (system.includes('3ph') || system.includes('3-phase')) {
                    calculatedP = sqrt3 * valV * valI * valPF;
                    apparentS = sqrt3 * valV * valI;
                }
            } else if (mode === 'VOLTAGE' || mode === 'V') {
                if (valI === 0) throw new Error('Current cannot be zero.');
                // Auto-detect if input power was entered in kW or W
                const pWatts = valP < 1000 ? valP * 1000 : valP;

                if (system.includes('dc')) {
                    calculatedV = pWatts / valI;
                    apparentS = pWatts;
                } else if (system.includes('1ph') || system.includes('1-phase')) {
                    if (valPF === 0) throw new Error('Power Factor cannot be zero.');
                    calculatedV = pWatts / (valI * valPF);
                    apparentS = calculatedV * valI;
                } else if (system.includes('3ph') || system.includes('3-phase')) {
                    if (valPF === 0) throw new Error('Power Factor cannot be zero.');
                    calculatedV = pWatts / (sqrt3 * valI * valPF);
                    apparentS = sqrt3 * calculatedV * valI;
                }
                calculatedP = pWatts;
            } else if (mode === 'CURRENT' || mode === 'I') {
                if (valV === 0) throw new Error('Voltage cannot be zero.');
                const pWatts = valP < 1000 ? valP * 1000 : valP;

                if (system.includes('dc')) {
                    calculatedI = pWatts / valV;
                    apparentS = pWatts;
                } else if (system.includes('1ph') || system.includes('1-phase')) {
                    if (valPF === 0) throw new Error('Power Factor cannot be zero.');
                    calculatedI = pWatts / (valV * valPF);
                    apparentS = valV * calculatedI;
                } else if (system.includes('3ph') || system.includes('3-phase')) {
                    if (valPF === 0) throw new Error('Power Factor cannot be zero.');
                    calculatedI = pWatts / (sqrt3 * valV * valPF);
                    apparentS = sqrt3 * valV * calculatedI;
                }
                calculatedP = pWatts;
            }

            // Convert Watts and VA to kW and kVA
            const kW = calculatedP / 1000;
            const kVA = apparentS / 1000;

            // Display Results
            if (resLabel1 && resVal1 && resLabel2 && resVal2) {
                if (mode === 'POWER' || mode === 'P') {
                    resLabel1.textContent = 'ACTIVE REAL POWER (P)';
                    resVal1.textContent = `${kW.toFixed(4)} kW`;

                    resLabel2.textContent = 'APPARENT POWER (S)';
                    resVal2.textContent = system.includes('dc') ? `${kW.toFixed(4)} kW` : `${kVA.toFixed(4)} kVA`;
                } else if (mode === 'VOLTAGE' || mode === 'V') {
                    resLabel1.textContent = 'CALCULATED VOLTAGE (V)';
                    resVal1.textContent = `${calculatedV.toFixed(4)} V`;

                    resLabel2.textContent = 'APPARENT POWER (S)';
                    resVal2.textContent = system.includes('dc') ? `${kW.toFixed(4)} kW` : `${kVA.toFixed(4)} kVA`;
                } else if (mode === 'CURRENT' || mode === 'I') {
                    resLabel1.textContent = 'CALCULATED CURRENT (I)';
                    resVal1.textContent = `${calculatedI.toFixed(4)} A`;

                    resLabel2.textContent = 'APPARENT POWER (S)';
                    resVal2.textContent = system.includes('dc') ? `${kW.toFixed(4)} kW` : `${kVA.toFixed(4)} kVA`;
                }
                resultsSection.style.display = 'block';
            } else if (resultsSection) {
                // Single container output fallback
                let textResult = '';
                if (mode === 'POWER' || mode === 'P') {
                    textResult = `⚡ Real Power = ${kW.toFixed(4)} kW | Apparent Power = ${kVA.toFixed(4)} kVA`;
                } else if (mode === 'VOLTAGE' || mode === 'V') {
                    textResult = `⚡ Voltage = ${calculatedV.toFixed(4)} V`;
                } else if (mode === 'CURRENT' || mode === 'I') {
                    textResult = `⚡ Current = ${calculatedI.toFixed(4)} A`;
                }

                resultsSection.innerHTML = textResult;
                resultsSection.style.display = 'block';
            }

            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } catch (err) {
            showNotification(err.message || 'Invalid calculation parameters.');
        }
    });

    // Reset Button Click Event
    resetBtn.addEventListener('click', (e) => {
        if (e) e.preventDefault();

        const inputs = getInputs();
        Object.values(inputs).forEach(input => {
            if (input) {
                input.value = '';
                setFieldError(input, false);
            }
        });

        const banner = document.getElementById('power-alert-banner');
        if (banner) banner.remove();

        if (resultsSection) {
            if (resLabel1 && resVal1) {
                resultsSection.style.display = 'none';
            } else {
                resultsSection.innerHTML = 'Result will appear here';
            }
        }
    });
});

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Selectors
    const systemTypeSelect = document.getElementById('system-type');
    const calcTargetSelect = document.getElementById('calc-target');
    const pfTargetOption = document.getElementById('pf-target-opt');

    // Input Groups
    const groupVoltage = document.getElementById('group-voltage');
    const groupCurrent = document.getElementById('group-current');
    const groupPower = document.getElementById('group-power');
    const groupPf = document.getElementById('group-pf');

    // Input Fields
    const inputVoltage = document.getElementById('val-voltage');
    const inputCurrent = document.getElementById('val-current');
    const inputPower = document.getElementById('val-power');
    const inputPf = document.getElementById('val-pf');

    // Action Controls
    const calcForm = document.getElementById('power-form');
    const calcBtn = document.getElementById('calc-btn');

    // Results DOM
    const resultsContainer = document.getElementById('results-container');
    const resLabel1 = document.getElementById('res-label-1');
    const resVal1 = document.getElementById('res-val-1');
    const resLabel2 = document.getElementById('res-label-2');
    const resVal2 = document.getElementById('res-val-2');
    const secondaryBox = document.getElementById('secondary-result-box');

    if (!calcForm) return;

    // Helper: Highlight / clear field errors
    const setFieldError = (inputEl, isError) => {
        if (!inputEl) return;
        if (isError) {
            inputEl.classList.add('input-error');
        } else {
            inputEl.classList.remove('input-error');
        }
    };

    // Helper: Show inline alert banner
    const showNotification = (message, isError = true) => {
        let existingBanner = document.getElementById('power-alert-banner');
        if (!existingBanner) {
            existingBanner = document.createElement('div');
            existingBanner.id = 'power-alert-banner';
            existingBanner.className = isError ? 'error-banner' : 'success-banner';
            calcForm.prepend(existingBanner);
        }
        existingBanner.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${isError ? 'error' : 'info'}</span> ${message}`;
        existingBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // Helper: Clear alert banner
    const clearNotification = () => {
        const existingBanner = document.getElementById('power-alert-banner');
        if (existingBanner) existingBanner.remove();
    };

    // Dynamic UI Update: Adjust visibility of inputs based on System and Mode
    const updateVisibility = () => {
        const isDc = systemTypeSelect.value === 'dc';
        const target = calcTargetSelect.value;

        // Toggle Power Factor target option in dropdown
        if (isDc) {
            pfTargetOption.style.display = 'none';
            if (calcTargetSelect.value === 'pf') {
                calcTargetSelect.value = 'power';
            }
        } else {
            pfTargetOption.style.display = 'block';
        }

        const currentTarget = calcTargetSelect.value;

        // Show/hide fields depending on target
        groupPower.style.display = currentTarget === 'power' ? 'none' : 'flex';
        groupVoltage.style.display = currentTarget === 'voltage' ? 'none' : 'flex';
        groupCurrent.style.display = currentTarget === 'current' ? 'none' : 'flex';

        // Power factor input is hidden in DC mode or when solving for PF
        if (isDc || currentTarget === 'pf') {
            groupPf.style.display = 'none';
        } else {
            groupPf.style.display = 'flex';
        }
    };

    // Attach visibility listeners
    systemTypeSelect.addEventListener('change', updateVisibility);
    calcTargetSelect.addEventListener('change', updateVisibility);

    // Initial visibility state
    updateVisibility();

    // Perform Calculation
    calcForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearNotification();

        // Clear field error highlights
        [inputVoltage, inputCurrent, inputPower, inputPf].forEach(input => setFieldError(input, false));

        const system = systemTypeSelect.value;
        const target = calcTargetSelect.value;
        const isDc = system === 'dc';

        const V = parseFloat(inputVoltage.value);
        const I = parseFloat(inputCurrent.value);
        const P = parseFloat(inputPower.value);
        const PF = isDc ? 1.0 : parseFloat(inputPf.value);

        const sqrt3 = Math.sqrt(3);
        let hasError = false;

        // Dynamic validation based on selected target
        if (target === 'power') {
            if (isNaN(V) || V < 0) { setFieldError(inputVoltage, true); hasError = true; }
            if (isNaN(I) || I < 0) { setFieldError(inputCurrent, true); hasError = true; }
            if (!isDc && (isNaN(PF) || PF < 0 || PF > 1)) { setFieldError(inputPf, true); hasError = true; }
        } else if (target === 'voltage') {
            if (isNaN(P) || P < 0) { setFieldError(inputPower, true); hasError = true; }
            if (isNaN(I) || I <= 0) { setFieldError(inputCurrent, true); hasError = true; }
            if (!isDc && (isNaN(PF) || PF <= 0 || PF > 1)) { setFieldError(inputPf, true); hasError = true; }
        } else if (target === 'current') {
            if (isNaN(P) || P < 0) { setFieldError(inputPower, true); hasError = true; }
            if (isNaN(V) || V <= 0) { setFieldError(inputVoltage, true); hasError = true; }
            if (!isDc && (isNaN(PF) || PF <= 0 || PF > 1)) { setFieldError(inputPf, true); hasError = true; }
        } else if (target === 'pf') {
            if (isNaN(P) || P < 0) { setFieldError(inputPower, true); hasError = true; }
            if (isNaN(V) || V <= 0) { setFieldError(inputVoltage, true); hasError = true; }
            if (isNaN(I) || I <= 0) { setFieldError(inputCurrent, true); hasError = true; }
        }

        if (hasError) {
            showNotification('Please enter valid positive values for all required fields.');
            return;
        }

        try {
            let resP, resV, resI, resPF, resS;

            if (target === 'power') {
                if (system === 'dc') {
                    resP = V * I;
                    resS = resP;
                } else if (system === '1phase') {
                    resP = V * I * PF;
                    resS = V * I;
                } else if (system === '3phase') {
                    resP = sqrt3 * V * I * PF;
                    resS = sqrt3 * V * I;
                }

                resLabel1.textContent = 'Calculated Active Power (P)';
                resVal1.textContent = resP >= 1000 
                    ? `${(resP / 1000).toFixed(3)} kW (${resP.toFixed(2)} W)` 
                    : `${resP.toFixed(2)} W`;

                secondaryBox.style.display = 'block';
                resLabel2.textContent = 'Apparent Power (S)';
                resVal2.textContent = isDc 
                    ? `${(resP / 1000).toFixed(3)} kW` 
                    : `${(resS / 1000).toFixed(3)} kVA (${resS.toFixed(2)} VA)`;

            } else if (target === 'voltage') {
                if (system === 'dc') {
                    resV = P / I;
                    resS = P;
                } else if (system === '1phase') {
                    resV = P / (I * PF);
                    resS = resV * I;
                } else if (system === '3phase') {
                    resV = P / (sqrt3 * I * PF);
                    resS = sqrt3 * resV * I;
                }

                resLabel1.textContent = 'Calculated Voltage (V)';
                resVal1.textContent = `${resV.toFixed(2)} Volts`;

                secondaryBox.style.display = 'block';
                resLabel2.textContent = 'Apparent Power (S)';
                resVal2.textContent = isDc 
                    ? `${(P / 1000).toFixed(3)} kW` 
                    : `${(resS / 1000).toFixed(3)} kVA`;

            } else if (target === 'current') {
                if (system === 'dc') {
                    resI = P / V;
                    resS = P;
                } else if (system === '1phase') {
                    resI = P / (V * PF);
                    resS = V * resI;
                } else if (system === '3phase') {
                    resI = P / (sqrt3 * V * PF);
                    resS = sqrt3 * V * resI;
                }

                resLabel1.textContent = 'Calculated Current (I)';
                resVal1.textContent = `${resI.toFixed(2)} Amps`;

                secondaryBox.style.display = 'block';
                resLabel2.textContent = 'Apparent Power (S)';
                resVal2.textContent = isDc 
                    ? `${(P / 1000).toFixed(3)} kW` 
                    : `${(resS / 1000).toFixed(3)} kVA`;

            } else if (target === 'pf') {
                if (system === '1phase') {
                    resS = V * I;
                    resPF = P / resS;
                } else if (system === '3phase') {
                    resS = sqrt3 * V * I;
                    resPF = P / resS;
                }

                if (resPF > 1.0) {
                    showNotification('Calculated Power Factor exceeds 1.0. Active power (W) cannot exceed Apparent power (VA). Check your inputs.');
                    setFieldError(inputPower, true);
                    return;
                }

                resLabel1.textContent = 'Calculated Power Factor (PF)';
                resVal1.textContent = `${resPF.toFixed(4)} (${(resPF * 100).toFixed(2)}%)`;

                secondaryBox.style.display = 'block';
                resLabel2.textContent = 'Apparent Power (S)';
                resVal2.textContent = `${(resS / 1000).toFixed(3)} kVA`;
            }

            // Reveal Results Container
            resultsContainer.classList.remove('hidden');
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } catch (err) {
            showNotification('Error performing calculation. Please check your numerical inputs.');
        }
    });
});

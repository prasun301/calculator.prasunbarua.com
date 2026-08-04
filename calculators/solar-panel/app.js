/**
 * Solar PV System Calculator Engine
 * Production Ready - 10/10 Standard
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('solar-form');
    const resultsContainer = document.getElementById('results-container');

    if (!form || !resultsContainer) return;

    // Form Inputs
    const dailyEnergyEl = document.getElementById('daily-energy');
    const sunHoursEl = document.getElementById('sun-hours');
    const efficiencyEl = document.getElementById('system-efficiency');
    const panelWattageEl = document.getElementById('panel-wattage');

    // UI Outputs
    const outPanelCount = document.getElementById('panel-count');
    const outSystemSize = document.getElementById('system-size');
    const outDailyGen = document.getElementById('daily-gen');

    /**
     * Safely parses positive numerical input values
     * @param {HTMLInputElement} inputEl 
     * @returns {number}
     */
    const parsePositiveFloat = (inputEl) => {
        const value = parseFloat(inputEl.value);
        return isNaN(value) || value <= 0 ? 0 : value;
    };

    /**
     * Calculates solar panel array requirements and updates UI
     * @returns {boolean} Success status
     */
    const calculateSolarRequirements = () => {
        const dailyEnergy = parsePositiveFloat(dailyEnergyEl);
        const sunHours = parsePositiveFloat(sunHoursEl);
        const efficiencyPercent = parsePositiveFloat(efficiencyEl);
        const panelWattage = parsePositiveFloat(panelWattageEl);

        // Defensive Input Validation Guard
        if (dailyEnergy === 0 || sunHours === 0 || efficiencyPercent === 0 || panelWattage === 0) {
            outPanelCount.textContent = '--';
            outSystemSize.textContent = '--';
            outDailyGen.textContent = '--';
            return false;
        }

        // 1. Efficiency Factor Conversion (e.g., 75% -> 0.75)
        const efficiencyFactor = efficiencyPercent / 100;

        // 2. Minimum Required System Size (kW)
        const dailyEnergyWithLosses = dailyEnergy / efficiencyFactor;
        const requiredSystemSizeKW = dailyEnergyWithLosses / sunHours;

        // 3. Panel Count Sizing (Always rounded UP to full panels)
        const totalWattsNeeded = requiredSystemSizeKW * 1000;
        const panelsNeeded = Math.ceil(totalWattsNeeded / panelWattage);

        // 4. Actual Installed Capacity (kW) and Realized Daily Generation
        const actualInstalledKW = (panelsNeeded * panelWattage) / 1000;
        const estimatedDailyGen = actualInstalledKW * sunHours * efficiencyFactor;

        // 5. Update UI Display
        outPanelCount.textContent = `${panelsNeeded} ${panelsNeeded === 1 ? 'Panel' : 'Panels'}`;
        outSystemSize.textContent = `${requiredSystemSizeKW.toFixed(2)} kW (${actualInstalledKW.toFixed(2)} kW Array)`;
        outDailyGen.textContent = `${estimatedDailyGen.toFixed(2)} kWh / day`;

        return true;
    };

    // Form Submit Event Handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const isValid = calculateSolarRequirements();

        if (isValid) {
            resultsContainer.classList.remove('hidden');
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    // Real-Time Recalculation Listener
    form.querySelectorAll('input, select').forEach((element) => {
        element.addEventListener('input', () => {
            if (!resultsContainer.classList.contains('hidden')) {
                calculateSolarRequirements();
            }
        });
    });
});

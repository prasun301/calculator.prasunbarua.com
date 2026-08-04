document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('solar-form');
    const resultsContainer = document.getElementById('results-container');
    
    // Output elements
    const outPanelCount = document.getElementById('panel-count');
    const outSystemSize = document.getElementById('system-size');
    const outDailyGen = document.getElementById('daily-gen');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Gather Inputs
        const dailyEnergy = parseFloat(document.getElementById('daily-energy').value);
        const sunHours = parseFloat(document.getElementById('sun-hours').value);
        const efficiencyPercent = parseFloat(document.getElementById('system-efficiency').value);
        const panelWattage = parseFloat(document.getElementById('panel-wattage').value);

        // 2. Compute Efficiency Factor (e.g., 75% -> 0.75)
        const efficiency = efficiencyPercent / 100;

        // 3. Calculate Required System Size in Kilowatts (kW)
        // Formula: Adjusted Energy = Daily Energy / Efficiency
        const adjustedEnergy = dailyEnergy / efficiency;
        const systemSizeKW = adjustedEnergy / sunHours;

        // 4. Calculate Number of Panels
        const totalWattsNeeded = systemSizeKW * 1000;
        const rawPanelCount = totalWattsNeeded / panelWattage;
        const panelsNeeded = Math.ceil(rawPanelCount); // Always round up to next full panel

        // 5. Calculate Actual Estimated Daily Generation with standard rounded panels
        const actualInstalledWatts = panelsNeeded * panelWattage;
        const actualInstalledKW = actualInstalledWatts / 1000;
        const estimatedDailyGen = actualInstalledKW * sunHours * efficiency;

        // 6. Update DOM
        outPanelCount.innerText = `${panelsNeeded} Panels`;
        outSystemSize.innerText = `${systemSizeKW.toFixed(2)} kW`;
        outDailyGen.innerText = `${estimatedDailyGen.toFixed(2)} kWh`;

        // 7. Reveal Results
        resultsContainer.classList.remove('hidden');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cable-form');
    const resultsContainer = document.getElementById('results-container');
    
    // Output fields
    const outStandardSize = document.getElementById('standard-size');
    const outExactArea = document.getElementById('exact-area');
    const outActualDrop = document.getElementById('actual-drop');

    // Standard metric cable sizes (mm²)
    const standardCableSizes = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630];

    form.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent page reload

        // 1. Gather Inputs
        const sysType = document.getElementById('system-type').value;
        const rho = parseFloat(document.getElementById('material').value); // Resistivity
        const voltage = parseFloat(document.getElementById('voltage').value);
        const current = parseFloat(document.getElementById('current').value);
        const length = parseFloat(document.getElementById('length').value);
        const dropPercent = parseFloat(document.getElementById('volt-drop-percent').value);

        // 2. Calculate Maximum Allowable Voltage Drop (Volts)
        const maxVd = voltage * (dropPercent / 100);

        // 3. Calculate Minimum Cross-Sectional Area (mm²)
        let exactArea = 0;
        if (sysType === 'dc') {
            // DC & Single Phase: A = (2 * L * I * rho) / Vd
            exactArea = (2 * length * current * rho) / maxVd;
        } else if (sysType === 'ac3') {
            // Three Phase: A = (sqrt(3) * L * I * rho) / Vd
            exactArea = (Math.sqrt(3) * length * current * rho) / maxVd;
        }

        // 4. Find the next standard cable size
        let standardSize = standardCableSizes[standardCableSizes.length - 1]; // Default to largest
        for (let i = 0; i < standardCableSizes.length; i++) {
            if (standardCableSizes[i] >= exactArea) {
                standardSize = standardCableSizes[i];
                break;
            }
        }

        // 5. Calculate the *Actual* Voltage Drop with the selected standard cable
        let actualVd = 0;
        if (sysType === 'dc') {
            actualVd = (2 * length * current * rho) / standardSize;
        } else {
            actualVd = (Math.sqrt(3) * length * current * rho) / standardSize;
        }
        
        const actualVdPercent = (actualVd / voltage) * 100;

        // 6. Update the DOM
        outStandardSize.innerText = `${standardSize} mm²`;
        outExactArea.innerText = `${exactArea.toFixed(2)} mm²`;
        outActualDrop.innerText = `${actualVd.toFixed(2)}V (${actualVdPercent.toFixed(2)}%)`;

        // 7. Show results
        resultsContainer.classList.remove('hidden');
        
        // Optional: Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});

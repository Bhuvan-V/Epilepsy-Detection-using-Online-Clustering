let chart;
let miniChart;

let rawX = [];
let rawY = [];

let threshold = 300;

const fileInput = document.getElementById('fileInput');
const slider = document.getElementById('thresholdSlider');

fileInput.addEventListener('change', loadFile);
slider.addEventListener('input', updateThreshold);

function loadFile(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split("\n").slice(1);

        rawX = [];
        rawY = [];

        rows.forEach(row => {
            const cols = row.split(",");
            if (cols.length === 2) {
                rawX.push(parseInt(cols[0]));
                rawY.push(parseFloat(cols[1]));
            }
        });

        renderChart();
    };

    reader.readAsText(file);
}

function updateThreshold(event) {
    threshold = parseInt(event.target.value);

    document.getElementById("thresholdDisplay").innerText = threshold;
    document.getElementById("thresholdVal").innerText = threshold;

    renderChart();
}

function renderChart() {

    if (rawX.length === 0) return;

    let reducedX = [];
    let reducedY = [];
    let driftPoints = [];

    for (let i = 0; i < rawX.length; i += 10) {
        reducedX.push(rawX[i]);
        reducedY.push(rawY[i]);

        if (rawY[i] > threshold) {
            driftPoints.push({x: rawX[i], y: rawY[i]});
        }
    }

    document.getElementById("totalSignals").innerText = rawX.length;
    document.getElementById("driftCount").innerText = driftPoints.length;

    document.getElementById("explanation").innerText =
        `Out of ${rawX.length} EEG signals, ${driftPoints.length} exceeded the threshold.
         These indicate abnormal brain activity patterns and possible seizure events.`;

    const ctx = document.getElementById('myChart').getContext('2d');

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: reducedX,
            datasets: [
                {
                    label: 'Distance',
                    data: reducedY,
                    borderColor: '#38bdf8',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.3
                },
                {
                    label: 'Threshold',
                    data: reducedX.map(() => threshold),
                    borderColor: 'red',
                    borderDash: [5,5],
                    pointRadius: 0
                },
                {
                    label: 'Drift Points',
                    data: driftPoints,
                    backgroundColor: 'red',
                    pointRadius: 4,
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            animation: { duration: 1500 },
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                zoom: {
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x'
                    },
                    pan: {
                        enabled: true,
                        mode: 'x'
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Signal Number' }
                },
                y: {
                    title: { display: true, text: 'Distance' }
                }
            }
        }
    });

    // MINI CHART
    let driftValues = rawY.filter(v => v > threshold);

    const ctx2 = document.getElementById('miniChart').getContext('2d');

    if (miniChart) miniChart.destroy();

    miniChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: driftValues.map((_, i) => i + 1),
            datasets: [{
                label: 'Drift Distances',
                data: driftValues,
                backgroundColor: '#f87171'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Download graph
function downloadChart() {
    const link = document.createElement('a');
    link.download = 'eeg_graph.png';
    link.href = chart.toBase64Image();
    link.click();
}

// Reset zoom
function resetZoom() {
    if (chart) chart.resetZoom();
}
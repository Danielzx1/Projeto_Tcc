export class ChartManager {
    constructor() {
        this.chart = null;
        this.maxDataPoints = 20; // Quantos pontos mostrar no gráfico
    }

    init(ctx) {
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Bateria (%)',
                        borderColor: '#00e05e',
                        backgroundColor: 'rgba(0, 224, 94, 0.1)',
                        data: [],
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Água (%)',
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        data: [],
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { display: false } // Esconde legenda de tempo pra ficar limpo
                },
                plugins: {
                    legend: { labels: { color: 'white' } }
                }
            }
        });
    }

    updateChart(battery, water) {
        if (!this.chart) return;

        const now = new Date().toLocaleTimeString();

        // Adiciona dados
        this.chart.data.labels.push(now);
        this.chart.data.datasets[0].data.push(battery);
        this.chart.data.datasets[1].data.push(water);

        // Remove antigos para não pesar
        if (this.chart.data.labels.length > this.maxDataPoints) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
            this.chart.data.datasets[1].data.shift();
        }

        this.chart.update('none'); // 'none' para animação suave
    }
}
/**
 * Analytics Component
 */

import api from '../api/index.js';
import { formatCurrency, renderErrorBanner } from '../display-utils.js';

export async function renderAnalytics(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        const data = await api.getAnalytics();
        const summary = data.summary || {};

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                <p class="text-gray-600 dark:text-gray-400">Detailed insights and visualizations</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Matters Timeline -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Matters by Year</h3>
                    <div class="chart-container">
                        <canvas id="timeline-chart"></canvas>
                    </div>
                </div>

                <!-- Spending Analysis -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Spending</h3>
                    <div class="chart-container">
                        <canvas id="monthly-spending-chart"></canvas>
                    </div>
                </div>

                <!-- Matters by Month -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Matters by Month</h3>
                    <div class="chart-container">
                        <canvas id="frequency-chart"></canvas>
                    </div>
                </div>

                <!-- Stats Summary -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Summary Statistics</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Total Matters</span>
                            <span class="font-semibold text-gray-900 dark:text-white">${data.total ?? 0}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Total Spent</span>
                            <span class="font-semibold text-gray-900 dark:text-white">${formatCurrency(summary.total_cost_cents, { fromCents: true, placeholder: '$0.00' })}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Average Cost per Matter</span>
                            <span class="font-semibold text-gray-900 dark:text-white">${formatCurrency(summary.avg_cost_cents, { fromCents: true, placeholder: '$0.00' })}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Most Expensive Matter</span>
                            <span class="font-semibold text-gray-900 dark:text-white">${formatCurrency(summary.max_cost_cents, { fromCents: true, placeholder: '$0.00' })}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Average Days Between</span>
                            <span class="font-semibold text-gray-900 dark:text-white">${summary.avg_days_between ?? 0} days</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Longest Streak</span>
                            <span class="font-semibold text-gray-900 dark:text-white">${data.max_streak ?? 0} days</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Render charts with real data
        renderCharts(data);

    } catch (error) {
        container.innerHTML = renderErrorBanner(error, 'Error! Failed to load analytics:');
    }
}

function renderCharts(data) {
    // Prepare data for charts
    const byYear = data.by_year || {};
    const byMonth = data.by_month || {};
    const spendingByMonth = data.spending_by_month || {};

    // Sort years and get data
    const years = Object.keys(byYear).sort();
    const yearCounts = years.map(y => byYear[y]);

    // Sort months and get data (last 12 months)
    const months = Object.keys(byMonth).sort();
    const recentMonths = months.slice(-12);
    const monthCounts = recentMonths.map(m => byMonth[m]);
    const monthLabels = recentMonths.map(m => {
        const [year, month] = m.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    // Spending by month (convert cents to dollars)
    const spendingMonths = Object.keys(spendingByMonth).sort().slice(-12);
    const spendingData = spendingMonths.map(m => (spendingByMonth[m] || 0) / 100);
    const spendingLabels = spendingMonths.map(m => {
        const [year, month] = m.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    // Timeline chart (matters by year)
    const timelineCtx = document.getElementById('timeline-chart');
    if (timelineCtx && window.Chart) {
        new Chart(timelineCtx, {
            type: 'bar',
            data: {
                labels: years.length > 0 ? years : ['No data'],
                datasets: [{
                    label: 'Matters per Year',
                    data: years.length > 0 ? yearCounts : [0],
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }

    // Monthly spending chart
    const spendingCtx = document.getElementById('monthly-spending-chart');
    if (spendingCtx && window.Chart) {
        new Chart(spendingCtx, {
            type: 'bar',
            data: {
                labels: spendingLabels.length > 0 ? spendingLabels : ['No data'],
                datasets: [{
                    label: 'Monthly Spending ($)',
                    data: spendingLabels.length > 0 ? spendingData : [0],
                    backgroundColor: 'rgba(34, 197, 94, 0.5)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    // Matters by month chart
    const frequencyCtx = document.getElementById('frequency-chart');
    if (frequencyCtx && window.Chart) {
        new Chart(frequencyCtx, {
            type: 'line',
            data: {
                labels: monthLabels.length > 0 ? monthLabels : ['No data'],
                datasets: [{
                    label: 'Matters per Month',
                    data: monthLabels.length > 0 ? monthCounts : [0],
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }
}

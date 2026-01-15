/**
 * Analytics Component
 */

import api from '../api/index.js';
import { renderErrorBanner } from '../display-utils.js';

export async function renderAnalytics(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        const data = await api.getAnalytics();

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                <p class="text-gray-600 dark:text-gray-400">Detailed insights and visualizations</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Matters Timeline -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Matters Timeline</h3>
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

                <!-- Frequency Heatmap Placeholder -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Matter Frequency</h3>
                    <div class="chart-container">
                        <canvas id="frequency-chart"></canvas>
                    </div>
                </div>

                <!-- Stats Summary -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Summary Statistics</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Average Cost per Matter</span>
                            <span class="font-semibold text-gray-900 dark:text-white">$1,234.56</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Average Days Between</span>
                            <span class="font-semibold text-gray-900 dark:text-white">45 days</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Longest Streak</span>
                            <span class="font-semibold text-gray-900 dark:text-white">120 days</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Most Expensive Matter</span>
                            <span class="font-semibold text-gray-900 dark:text-white">$5,000.00</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Render placeholder charts
        renderCharts();

    } catch (error) {
        container.innerHTML = renderErrorBanner(error, 'Error! Failed to load analytics:');
    }
}

function renderCharts() {
    // Timeline chart
    const timelineCtx = document.getElementById('timeline-chart');
    if (timelineCtx && window.Chart) {
        new Chart(timelineCtx, {
            type: 'bar',
            data: {
                labels: ['2023', '2024', '2025'],
                datasets: [{
                    label: 'Matters per Year',
                    data: [3, 5, 2],
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
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Monthly Spending ($)',
                    data: [0, 1200, 0, 2300, 1300, 0],
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
                }
            }
        });
    }

    // Frequency chart
    const frequencyCtx = document.getElementById('frequency-chart');
    if (frequencyCtx && window.Chart) {
        new Chart(frequencyCtx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Matters per Week',
                    data: [1, 0, 2, 1],
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

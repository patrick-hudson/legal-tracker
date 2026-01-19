/**
 * Dashboard Component
 */

import api from '../api/index.js';
import {
    formatCurrency,
    formatDate,
    formatInt,
    escapeHtml,
    renderErrorBanner,
    PLACEHOLDER
} from '../display-utils.js';

export async function renderDashboard(container) {
    // Show loading state
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        const data = await api.getDashboard();

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p class="text-gray-600 dark:text-gray-400">Overview of your legal matter tracking</p>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <!-- Days Since Last Matter -->
                <div class="stat-card bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Days Since Last</p>
                            <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2">${formatInt(data.days_since, { placeholder: '0' })}</p>
                        </div>
                        <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <svg class="w-8 h-8 text-blue-600 dark:text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Total Matters -->
                <div class="stat-card bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Matters</p>
                            <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2">${formatInt(data.stats?.total_matters, { placeholder: '0' })}</p>
                        </div>
                        <div class="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                            <svg class="w-8 h-8 text-red-600 dark:text-red-300" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Lifetime Spent -->
                <div class="stat-card bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Lifetime Spent</p>
                            <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2">${formatCurrency(data.lifetime_spent, { fromCents: true, placeholder: '$0.00' })}</p>
                        </div>
                        <div class="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                            <svg class="w-8 h-8 text-green-600 dark:text-green-300" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Current Streak -->
                <div class="stat-card bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Current Streak</p>
                            <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2">${formatInt(data.days_since, { placeholder: '0' })} days</p>
                        </div>
                        <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                            <svg class="w-8 h-8 text-purple-600 dark:text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <!-- Matters Over Time -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Matters Over Time</h3>
                    <div class="chart-container">
                        <canvas id="matters-chart"></canvas>
                    </div>
                </div>

                <!-- Spending Trend -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cumulative Spending</h3>
                    <div class="chart-container">
                        <canvas id="spending-chart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Recent Matters -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Matters</h3>
                        <a href="#/matters" class="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium">
                            View all →
                        </a>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" class="px-6 py-3">Date</th>
                                    <th scope="col" class="px-6 py-3">Note</th>
                                    <th scope="col" class="px-6 py-3">Cost</th>
                                </tr>
                            </thead>
                            <tbody id="recent-matters-tbody">
                                ${renderRecentMatters(data.recent_matters || [])}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Render charts
        renderCharts(data);

        // Add click handler for recent matters rows
        const tbody = document.getElementById('recent-matters-tbody');
        tbody?.addEventListener('click', (e) => {
            const row = e.target.closest('tr[data-matter-id]');
            if (row) {
                window.location.hash = `/matters/${row.dataset.matterId}`;
            }
        });

    } catch (error) {
        container.innerHTML = renderErrorBanner(error, 'Error! Failed to load dashboard:');
    }
}

function renderRecentMatters(matters) {
    if (!matters || matters.length === 0) {
        return '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">No matters recorded yet</td></tr>';
    }

    return matters.map(matter => `
        <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover-row cursor-pointer" data-matter-id="${matter.id}">
            <td class="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                ${formatDate(matter.matter_date, { format: 'datetime', placeholder: PLACEHOLDER.DASH })}
            </td>
            <td class="px-6 py-4 max-w-xs">
                <span class="line-clamp-2 break-words">${escapeHtml(matter.note, 'No note')}</span>
            </td>
            <td class="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                ${formatCurrency(matter.cost, { fromCents: true })}
            </td>
        </tr>
    `).join('');
}

function renderCharts(data) {
    const mattersCtx = document.getElementById('matters-chart');
    const spendingCtx = document.getElementById('spending-chart');

    // Get chart data from API response
    const charts = data.charts || {};
    const byMonth = charts.by_month || {};
    const spendingByMonth = charts.spending_by_month || {};

    // Sort months and get last 6 months of data
    const months = Object.keys(byMonth).sort();
    const recentMonths = months.slice(-6);
    const monthCounts = recentMonths.map(m => byMonth[m]);
    const monthLabels = recentMonths.map(m => {
        const [year, month] = m.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short' });
    });

    // Calculate cumulative spending over time
    const spendingMonths = Object.keys(spendingByMonth).sort().slice(-6);
    let cumulative = 0;
    const cumulativeData = [];
    const spendingLabels = [];
    for (const m of spendingMonths) {
        cumulative += (spendingByMonth[m] || 0) / 100; // Convert cents to dollars
        cumulativeData.push(cumulative);
        const [year, month] = m.split('-');
        const date = new Date(year, parseInt(month) - 1);
        spendingLabels.push(date.toLocaleDateString('en-US', { month: 'short' }));
    }

    if (mattersCtx && window.Chart) {
        new Chart(mattersCtx, {
            type: 'line',
            data: {
                labels: monthLabels.length > 0 ? monthLabels : ['No data'],
                datasets: [{
                    label: 'Matters',
                    data: monthLabels.length > 0 ? monthCounts : [0],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
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

    if (spendingCtx && window.Chart) {
        new Chart(spendingCtx, {
            type: 'line',
            data: {
                labels: spendingLabels.length > 0 ? spendingLabels : ['No data'],
                datasets: [{
                    label: 'Cumulative Spending ($)',
                    data: spendingLabels.length > 0 ? cumulativeData : [0],
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
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
}


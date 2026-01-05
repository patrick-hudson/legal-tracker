/**
 * Data Management Component
 * Sample data and Wipe functionalities
 */

import api from '../api.js';

export async function renderDataManagement(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Data Management</h1>
                <p class="text-gray-600 dark:text-gray-400">Sample data and database management</p>
            </div>

            <!-- 4-column grid for all cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <!-- Sample Data -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-green-500">
                    <h3 class="text-lg font-semibold text-green-600 dark:text-green-500 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"></path>
                            <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"></path>
                            <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"></path>
                        </svg>
                        Sample Data
                    </h3>
                    <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                        <p class="text-sm text-green-800 dark:text-green-400 font-semibold mb-2">Add test data</p>
                        <ul class="list-disc list-inside text-xs text-green-700 dark:text-green-300 space-y-1">
                            <li>Generate random matters</li>
                            <li>Use predefined datasets</li>
                            <li>Custom matter counts</li>
                        </ul>
                        <p class="text-xs text-green-700 dark:text-green-300 mt-2 italic">
                            Non-destructive operation.
                        </p>
                    </div>
                    <div class="space-y-3">
                        <div id="sample-datasets-loading" class="text-sm text-gray-500 dark:text-gray-400">
                            Loading datasets...
                        </div>
                        <div id="sample-datasets-container" class="hidden space-y-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Dataset</label>
                                <select id="sample-dataset-select" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <option value="generate">Generate New</option>
                                </select>
                            </div>
                            <div id="sample-dataset-info" class="text-xs text-gray-500 dark:text-gray-400 hidden"></div>
                            <div id="custom-count-container">
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Count (1-1000)</label>
                                <input type="number" id="sample-count-input" value="25" min="1" max="1000" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            </div>
                        </div>
                        <div id="sample-action-buttons" class="space-y-2">
                            <button id="populate-sample-btn" class="w-full text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 text-sm font-semibold">
                                Populate Data
                            </button>
                            <button id="regenerate-samples-btn" class="w-full text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-lg px-4 py-2 text-xs">
                                Regenerate Files
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Wipe Matters Only -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-orange-500">
                    <h3 class="text-lg font-semibold text-orange-600 dark:text-orange-500 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        Wipe Matters
                    </h3>
                    <div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
                        <p class="text-sm text-orange-800 dark:text-orange-400 font-semibold mb-2">Deletes:</p>
                        <ul class="list-disc list-inside text-xs text-orange-700 dark:text-orange-300 space-y-1">
                            <li>All matter records</li>
                            <li>Matter timestamps</li>
                            <li>Last matter date</li>
                        </ul>
                        <p class="text-xs text-orange-700 dark:text-orange-300 mt-2 font-semibold">Preserves:</p>
                        <ul class="list-disc list-inside text-xs text-orange-700 dark:text-orange-300 space-y-1">
                            <li>All settings (fees, drain rate)</li>
                            <li>Admin users & sessions</li>
                        </ul>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-orange-600 dark:text-orange-400 font-mono text-xs">WIPE MATTERS</code>
                            </label>
                            <input
                                type="text"
                                id="wipe-matters-confirmation"
                                placeholder="WIPE MATTERS"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-orange-500 focus:border-orange-500">
                        </div>
                        <button id="wipe-matters-btn" class="w-full text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold" disabled>
                            Wipe Matters
                        </button>
                    </div>
                </div>

                <!-- Wipe Matters + Settings -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-amber-500">
                    <h3 class="text-lg font-semibold text-amber-600 dark:text-amber-500 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                        </svg>
                        Wipe + Reset
                    </h3>
                    <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                        <p class="text-sm text-amber-800 dark:text-amber-400 font-semibold mb-2">Deletes:</p>
                        <ul class="list-disc list-inside text-xs text-amber-700 dark:text-amber-300 space-y-1">
                            <li>All matter records</li>
                            <li>Lifetime fees → $0</li>
                            <li>Drain rate → 0</li>
                            <li>Auto-drain → disabled</li>
                            <li>Drain timer → reset</li>
                        </ul>
                        <p class="text-xs text-amber-700 dark:text-amber-300 mt-2 font-semibold">Preserves:</p>
                        <ul class="list-disc list-inside text-xs text-amber-700 dark:text-amber-300 space-y-1">
                            <li>Admin users & sessions</li>
                        </ul>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-amber-600 dark:text-amber-400 font-mono text-xs">WIPE SETTINGS</code>
                            </label>
                            <input
                                type="text"
                                id="wipe-matters-settings-confirmation"
                                placeholder="WIPE SETTINGS"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-amber-500 focus:border-amber-500">
                        </div>
                        <button id="wipe-matters-settings-btn" class="w-full text-white bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold" disabled>
                            Wipe + Reset
                        </button>
                    </div>
                </div>

                <!-- Wipe Everything (Factory Reset) -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-red-500">
                    <h3 class="text-lg font-semibold text-red-600 dark:text-red-500 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        Factory Reset
                    </h3>
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                        <p class="text-sm text-red-800 dark:text-red-400 font-semibold mb-2">Deletes:</p>
                        <ul class="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-1">
                            <li>All matter records</li>
                            <li>All settings → defaults</li>
                            <li>All admin users</li>
                            <li>All active sessions</li>
                            <li>Bootstrap tokens</li>
                        </ul>
                        <p class="text-xs text-red-700 dark:text-red-300 mt-2 font-semibold">Result:</p>
                        <ul class="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-1">
                            <li>Fresh install state</li>
                        </ul>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-red-600 dark:text-red-400 font-mono text-xs">WIPE EVERYTHING</code>
                            </label>
                            <input
                                type="text"
                                id="wipe-confirmation"
                                placeholder="WIPE EVERYTHING"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-red-500 focus:border-red-500">
                        </div>
                        <button id="wipe-everything-btn" class="w-full text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold" disabled>
                            Factory Reset
                        </button>
                    </div>
                </div>
            </div>
        `;

        setupEventListeners();

    } catch (error) {
        container.innerHTML = `
            <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                <span class="font-medium">Error!</span> Failed to load data management: ${error.message}
            </div>
        `;
    }
}

function setupEventListeners() {
    // Load available sample datasets
    (async () => {
        try {
            const { samples } = await api.listSampleDatasets();
            const loadingEl = document.getElementById('sample-datasets-loading');
            const containerEl = document.getElementById('sample-datasets-container');

            if (samples.length === 0) {
                loadingEl.innerHTML = `
                    <div class="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p class="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                            No sample datasets found. Generate sample files first.
                        </p>
                        <button id="generate-samples-first-btn" class="text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm">
                            Generate Sample Files
                        </button>
                    </div>
                `;

                document.getElementById('sample-action-buttons').classList.add('hidden');

                document.getElementById('generate-samples-first-btn')?.addEventListener('click', async () => {
                    const btn = document.getElementById('generate-samples-first-btn');
                    btn.disabled = true;
                    btn.textContent = 'Generating...';

                    try {
                        const response = await api.regenerateSampleFiles();
                        showToast(`Successfully generated ${response.files_regenerated} sample files`, 'success');
                        location.reload();
                    } catch (error) {
                        showToast(`Error: ${error.message}`, 'error');
                        btn.disabled = false;
                        btn.textContent = 'Generate Sample Files';
                    }
                });

                return;
            }

            document.getElementById('sample-action-buttons').classList.remove('hidden');

            const select = document.getElementById('sample-dataset-select');
            const info = document.getElementById('sample-dataset-info');
            const customContainer = document.getElementById('custom-count-container');

            while (select.options.length > 1) {
                select.remove(1);
            }

            samples.forEach(sample => {
                const option = document.createElement('option');
                option.value = sample.id;
                option.textContent = `${sample.name} (${sample.matter_count} matters)`;
                option.dataset.description = sample.description;
                option.dataset.count = sample.matter_count;
                select.appendChild(option);
            });

            select.addEventListener('change', (e) => {
                const isGenerate = e.target.value === 'generate';
                customContainer.style.display = isGenerate ? 'block' : 'none';

                if (!isGenerate) {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    info.textContent = `${selectedOption.dataset.description} (${selectedOption.dataset.count} matters)`;
                    info.classList.remove('hidden');
                } else {
                    info.classList.add('hidden');
                }
            });

            loadingEl.classList.add('hidden');
            containerEl.classList.remove('hidden');
        } catch (error) {
            document.getElementById('sample-datasets-loading').textContent = 'Failed to load datasets';
            console.error('Failed to load sample datasets:', error);
        }
    })();

    // Populate sample data
    document.getElementById('populate-sample-btn')?.addEventListener('click', async () => {
        const select = document.getElementById('sample-dataset-select');
        const source = select.value;
        const count = parseInt(document.getElementById('sample-count-input').value);

        const isGenerate = source === 'generate';
        const confirmMsg = isGenerate
            ? `This will generate ${count} random sample matters. Continue?`
            : `This will load ${select.options[select.selectedIndex].dataset.count} matters from "${select.options[select.selectedIndex].textContent}". Continue?`;

        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            const btn = document.getElementById('populate-sample-btn');
            btn.disabled = true;
            btn.textContent = 'Populating...';

            const response = await api.populateSampleData(
                isGenerate ? 'generate' : source,
                isGenerate ? count : undefined
            );
            showToast(`Successfully added ${response.matters_added} sample matters ($${response.total_cost_added.toFixed(2)})`, 'success');

            btn.disabled = false;
            btn.textContent = 'Populate Sample Data';
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('populate-sample-btn');
            btn.disabled = false;
            btn.textContent = 'Populate Sample Data';
        }
    });

    // Regenerate sample files
    document.getElementById('regenerate-samples-btn')?.addEventListener('click', async () => {
        if (!confirm('This will regenerate all sample JSON files with new random data. The database will not be affected. Continue?')) {
            return;
        }

        try {
            const btn = document.getElementById('regenerate-samples-btn');
            btn.disabled = true;
            btn.textContent = 'Regenerating...';

            const response = await api.regenerateSampleFiles();
            showToast(`Successfully regenerated ${response.files_regenerated} sample files`, 'success');

            const { samples } = await api.listSampleDatasets();
            const select = document.getElementById('sample-dataset-select');
            while (select.options.length > 1) {
                select.remove(1);
            }
            samples.forEach(sample => {
                const option = document.createElement('option');
                option.value = sample.id;
                option.textContent = `${sample.name} (${sample.matter_count} matters)`;
                option.dataset.description = sample.description;
                option.dataset.count = sample.matter_count;
                select.appendChild(option);
            });

            btn.disabled = false;
            btn.textContent = 'Regenerate All Sample Files';
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('regenerate-samples-btn');
            btn.disabled = false;
            btn.textContent = 'Regenerate All Sample Files';
        }
    });

    // Wipe matters confirmation input
    document.getElementById('wipe-matters-confirmation')?.addEventListener('input', (e) => {
        const btn = document.getElementById('wipe-matters-btn');
        btn.disabled = e.target.value !== 'WIPE MATTERS';
    });

    // Wipe matters
    document.getElementById('wipe-matters-btn')?.addEventListener('click', async () => {
        const confirmation = document.getElementById('wipe-matters-confirmation').value;

        if (confirmation !== 'WIPE MATTERS') {
            showToast('Please type the confirmation text exactly', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete all matter records?\n\nThis will remove all matters but keep your admin account and settings.\n\nThis action CANNOT be undone!')) {
            return;
        }

        try {
            const btn = document.getElementById('wipe-matters-btn');
            btn.disabled = true;
            btn.textContent = 'Wiping matters...';

            const response = await api.wipeMatters(confirmation);

            showToast(response.message || `Successfully deleted ${response.matters_deleted} matters`, 'success');

            document.getElementById('wipe-matters-confirmation').value = '';
            btn.disabled = true;
            btn.textContent = 'Wipe Matters Data';
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('wipe-matters-btn');
            btn.disabled = true;
            btn.textContent = 'Wipe Matters Data';
        }
    });

    // Wipe matters + settings - confirmation input only (uniform with other wipes)
    document.getElementById('wipe-matters-settings-confirmation')?.addEventListener('input', (e) => {
        const btn = document.getElementById('wipe-matters-settings-btn');
        btn.disabled = e.target.value !== 'WIPE SETTINGS';
    });

    // Wipe matters + settings
    document.getElementById('wipe-matters-settings-btn')?.addEventListener('click', async () => {
        const confirmation = document.getElementById('wipe-matters-settings-confirmation').value;

        if (confirmation !== 'WIPE SETTINGS') {
            showToast('Please type the confirmation text exactly', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete all matters AND reset all settings?\n\nThis will:\n- Delete all matter records\n- Reset lifetime legal fees to $0\n- Reset drain rate to 0\n- Disable auto-drain\n- Reset drain timer\n\nYour admin account will be preserved.\n\nThis action CANNOT be undone!')) {
            return;
        }

        try {
            const btn = document.getElementById('wipe-matters-settings-btn');
            btn.disabled = true;
            btn.textContent = 'Wiping...';

            const response = await api.wipeMattersAndSettings(confirmation);

            showToast(response.message || `Successfully deleted ${response.matters_deleted} matters and reset settings`, 'success');

            document.getElementById('wipe-matters-settings-confirmation').value = '';
            btn.disabled = true;
            btn.textContent = 'Wipe + Reset';
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('wipe-matters-settings-btn');
            btn.disabled = true;
            btn.textContent = 'Wipe + Reset';
        }
    });

    // Wipe everything confirmation input
    document.getElementById('wipe-confirmation')?.addEventListener('input', (e) => {
        const btn = document.getElementById('wipe-everything-btn');
        btn.disabled = e.target.value !== 'WIPE EVERYTHING';
    });

    // Wipe everything
    document.getElementById('wipe-everything-btn')?.addEventListener('click', async () => {
        const confirmation = document.getElementById('wipe-confirmation').value;

        if (confirmation !== 'WIPE EVERYTHING') {
            showToast('Please type the confirmation text exactly', 'error');
            return;
        }

        if (!confirm('ARE YOU ABSOLUTELY SURE?\n\nThis will WIPE EVERYTHING and reset the database to fresh install state:\n\n- All matter records\n- All settings (reset to defaults)\n- All admin sessions (you will be logged out)\n- ALL admin users (including you!)\n\nYou will be redirected to create a new admin account.\n\nThis action CANNOT be undone!')) {
            return;
        }

        try {
            const btn = document.getElementById('wipe-everything-btn');
            btn.disabled = true;
            btn.textContent = 'Wiping everything...';

            const response = await api.wipeAllData(confirmation);

            showToast(
                `Database wiped successfully! Redirecting to setup new admin account...`,
                'success'
            );

            document.getElementById('wipe-confirmation').value = '';

            setTimeout(() => {
                window.location.href = response.bootstrap_url;
            }, 1500);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('wipe-everything-btn');
            btn.disabled = true;
            btn.textContent = 'Wipe Everything';
        }
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        'bg-blue-500'
    } text-white`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

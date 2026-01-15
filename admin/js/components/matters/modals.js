/**
 * Matters - Add/Create Modals
 */

import api from '../../api/index.js';
import { showToast } from './shared.js';

export function showAddSingleModal(loadMatters) {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Single Matter</h3>
                <form id="add-single-form">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date & Time</label>
                        <input type="datetime-local" name="matter_date" required class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note</label>
                        <input type="text" name="note" required class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost ($)</label>
                        <input type="number" step="0.01" name="cost" required class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="flex-1 text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">Save</button>
                        <button type="button" class="flex-1 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white" onclick="this.closest('.fixed').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#add-single-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.createMatter({
                matter_date: formData.get('matter_date'),
                note: formData.get('note'),
                cost: parseFloat(formData.get('cost')) // Send as dollars, server converts to cents
            });
            modal.remove();
            showToast('Matter added successfully', 'success');
            await loadMatters();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });
}

export function showAddMultipleModal(loadMatters) {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full m-4">
                <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Multiple Matters</h3>
                <form id="add-multiple-form">
                    <div id="matter-rows" class="space-y-3 mb-4 max-h-96 overflow-y-auto">
                        ${createMatterRow(0)}
                    </div>
                    <button type="button" id="add-row-btn" class="mb-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 text-sm">+ Add Row</button>
                    <div class="flex gap-2">
                        <button type="submit" class="flex-1 text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2">Save All</button>
                        <button type="button" class="flex-1 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white" onclick="this.closest('.fixed').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    let rowCount = 1;
    const container = modal.querySelector('#matter-rows');

    // Update delete button states based on row count
    function updateDeleteButtons() {
        const rows = container.querySelectorAll('.matter-row');
        const deleteButtons = container.querySelectorAll('.delete-row-btn');
        deleteButtons.forEach(btn => {
            btn.disabled = rows.length <= 1;
            btn.classList.toggle('opacity-30', rows.length <= 1);
            btn.classList.toggle('cursor-not-allowed', rows.length <= 1);
        });
    }

    // Handle delete row clicks via event delegation
    container.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-row-btn');
        if (!deleteBtn) return;

        const rows = container.querySelectorAll('.matter-row');
        if (rows.length <= 1) return; // Keep at least one row

        deleteBtn.closest('.matter-row').remove();
        updateDeleteButtons();
    });

    modal.querySelector('#add-row-btn').addEventListener('click', () => {
        container.insertAdjacentHTML('beforeend', createMatterRow(rowCount++));
        updateDeleteButtons();
    });

    // Initialize delete button state
    updateDeleteButtons();

    modal.querySelector('#add-multiple-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const rows = modal.querySelectorAll('.matter-row');
        const matters = [];

        rows.forEach(row => {
            const date = row.querySelector('[name$="_date"]').value;
            const note = row.querySelector('[name$="_note"]').value;
            const cost = row.querySelector('[name$="_cost"]').value;

            if (date && note && cost) {
                matters.push({
                    matter_date: date,
                    note: note,
                    cost: parseFloat(cost) // Send as dollars, server converts to cents
                });
            }
        });

        if (matters.length === 0) {
            showToast('Please add at least one matter', 'error');
            return;
        }

        try {
            const result = await api.bulkCreateMatters(matters);
            modal.remove();
            showToast(`${result.created} matter(s) added successfully`, 'success');
            await loadMatters();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });
}

function createMatterRow(index) {
    return `
        <div class="matter-row grid grid-cols-12 gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg items-center">
            <div class="col-span-4">
                <input type="datetime-local" name="matter_${index}_date" class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2 dark:bg-gray-600 dark:border-gray-500 dark:text-white" required>
            </div>
            <div class="col-span-4">
                <input type="text" name="matter_${index}_note" placeholder="Note" class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2 dark:bg-gray-600 dark:border-gray-500 dark:text-white" required>
            </div>
            <div class="col-span-3">
                <input type="number" step="0.01" name="matter_${index}_cost" placeholder="Cost ($)" class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2 dark:bg-gray-600 dark:border-gray-500 dark:text-white" required>
            </div>
            <div class="col-span-1 flex justify-center">
                <button type="button" class="delete-row-btn p-1 text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded" title="Remove row">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

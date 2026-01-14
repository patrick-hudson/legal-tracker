/**
 * Data Management - AI Settings Page
 * API configuration, model selection, spice levels, and sample data generation
 */

import api from '../../api.js';
import { renderErrorBanner } from '../../display-utils.js';
import { showConfirm, showCustomModal } from '../../modal.js';
import {
    state,
    loadState,
    getDefaultPrompt,
    getSpiceLevelName,
    getEffectiveSpiceLevel,
    hasCustomSpiceLevel,
    showToast,
    showPersistentToast,
    dismissPersistentToast,
    SPICE_INSTRUCTIONS
} from './shared.js';

// Render a per-type spice level card
function renderPerTypeCard(type, title, description) {
    const typeSettings = state.aiSettings.perType?.[type] || { spiceLevel: '', customPrompt: '' };
    const effectiveSpice = typeSettings.spiceLevel || state.aiSettings.spiceLevel || '1';
    const isCustom = hasCustomSpiceLevel(type);

    return `
        <div class="border ${isCustom ? 'border-orange-300 dark:border-orange-600' : 'border-gray-200 dark:border-gray-700'} rounded-lg p-4 relative">
            ${isCustom ? '<span class="absolute -top-2 right-2 text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">Custom</span>' : ''}
            <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-semibold text-gray-900 dark:text-white">${title}</h4>
                <button data-type="${type}" class="reset-type-btn text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${!isCustom ? 'invisible' : ''}">
                    reset
                </button>
            </div>
            <p class="text-[11px] text-gray-500 dark:text-gray-400 mb-3">${description}</p>
            <select data-type="${type}" class="per-type-spice-select bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="" ${!isCustom ? 'selected' : ''}>Use Default (${getSpiceLevelName(state.aiSettings.spiceLevel)})</option>
                ${[1, 2, 3, 4, 5, 6, 7, 8].map(level => `
                    <option value="${level}" ${typeSettings.spiceLevel === String(level) ? 'selected' : ''}>
                        ${level === 8 ? '8 - THE FINAL FORM' : `${level} - ${getSpiceLevelName(String(level))}`}
                    </option>
                `).join('')}
            </select>
            <div class="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                Effective: <span class="font-medium ${parseInt(effectiveSpice) >= 6 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}">${getSpiceLevelName(effectiveSpice)}</span>
            </div>
        </div>
    `;
}

export async function renderAiSettings(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        await loadState();

        container.innerHTML = `
            <div class="mb-4">
                <nav class="text-sm mb-2">
                    <a href="#/data-management" class="text-blue-600 hover:underline dark:text-blue-400">Data Management</a>
                    <span class="text-gray-500 dark:text-gray-400 mx-2">/</span>
                    <span class="text-gray-700 dark:text-gray-300">AI Settings</span>
                </nav>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">AI Settings</h1>
                <p class="text-gray-600 dark:text-gray-400">Configure Claude AI integration and generate sample data</p>
            </div>

            <!-- API Configuration Section -->
            <div class="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center mb-4">
                    <svg class="w-6 h-6 mr-3 text-blue-600 dark:text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
                    </svg>
                    <div>
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Claude API Configuration</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Connect to Anthropic's Claude for AI-powered features</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- API Key Section -->
                    <div class="space-y-4">
                        <h3 class="text-md font-semibold text-blue-600 dark:text-blue-500 flex items-center">
                            API Configuration
                            <span id="claude-key-status" class="ml-2 text-xs ${state.isClaudeKeyValidated ? 'text-green-600 dark:text-green-400' : state.hasClaudeApiKey ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}">
                                ${state.isClaudeKeyValidated ? '✓ validated' : state.hasClaudeApiKey ? '⚠ not validated' : ''}
                            </span>
                        </h3>

                        ${state.isClaudeKeyValidated ? `
                        <!-- Validated state: compact display -->
                        <div id="api-key-validated-section" class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div class="flex items-center">
                                <svg class="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                                </svg>
                                <span class="text-sm font-medium text-green-800 dark:text-green-300">API Key Validated</span>
                            </div>
                            <button id="clear-claude-key" class="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:underline">
                                Clear key
                            </button>
                        </div>
                        ` : `
                        <!-- Not validated: show input form -->
                        <div id="api-key-input-section">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key</label>
                            <div class="flex gap-2">
                                <input type="password" id="claude-api-key-input"
                                    value=""
                                    placeholder="sk-ant-api03-..."
                                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <button id="toggle-claude-key" class="px-3 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">
                                    Show
                                </button>
                            </div>
                            <button id="validate-save-claude-key" class="w-full mt-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium">
                                Validate & Save
                            </button>
                        </div>
                        `}

                        <!-- Model Selection -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Model <span class="text-xs text-gray-400 font-normal">(auto-saves)</span></label>
                            <select id="claude-model-select"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-200 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
                                ${!state.isClaudeKeyValidated ? 'disabled' : ''}>
                                <option value="">${state.isClaudeKeyValidated ? 'Select a model...' : 'Validate API key first'}</option>
                                ${state.availableModels.map(m => `<option value="${m.id}" ${m.id === state.aiSettings.selectedModel ? 'selected' : ''}>${m.name}</option>`).join('')}
                            </select>
                        </div>

                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            Get your API key from <a href="https://console.anthropic.com/" target="_blank" class="text-blue-600 hover:underline dark:text-blue-400">console.anthropic.com</a>
                        </p>
                    </div>

                    <!-- Description Configuration -->
                    <div id="description-settings-section" class="space-y-4 ${!state.isClaudeKeyValidated || !state.aiSettings.selectedModel ? 'opacity-50 pointer-events-none' : ''}">
                        <h3 class="text-md font-semibold text-purple-600 dark:text-purple-500 flex items-center">
                            Description Settings
                            <span id="description-settings-notice" class="ml-2 text-xs font-normal text-gray-400 ${state.isClaudeKeyValidated && state.aiSettings.selectedModel ? 'hidden' : ''}">${!state.isClaudeKeyValidated ? '(requires validated API key)' : '(select a model to enable)'}</span>
                        </h3>

                        <!-- Spice Level - Button Group -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Spice Level</label>
                            <div id="spice-level-buttons" class="flex flex-wrap gap-1" role="group">
                                ${[1, 2, 3, 4, 5, 6, 7, 8].map(level => {
                                    const isSelected = state.aiSettings.spiceLevel === String(level);
                                    let btnClass = 'spice-btn px-3 py-2 text-xs font-medium border rounded-lg ';
                                    if (isSelected) {
                                        if (level === 8) btnClass += 'bg-gradient-to-r from-black via-purple-900 to-red-900 text-white border-purple-900 animate-pulse';
                                        else if (level === 7) btnClass += 'bg-gradient-to-r from-purple-600 via-red-600 to-orange-500 text-white border-purple-600';
                                        else if (level === 6) btnClass += 'bg-red-600 text-white border-red-600';
                                        else btnClass += 'bg-purple-600 text-white border-purple-600';
                                    } else {
                                        btnClass += 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700';
                                    }
                                    return `<button type="button" data-level="${level}" class="${btnClass}" ${!state.isClaudeKeyValidated ? 'disabled' : ''}>${level === 8 ? '☠️ FINAL FORM' : getSpiceLevelName(String(level))}</button>`;
                                }).join('')}
                            </div>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Controls the tone of AI-generated descriptions (levels 6+ may cause existential dread)</p>
                        </div>

                        <!-- Prompt Section -->
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt</label>
                                <label class="flex items-center cursor-pointer">
                                    <input type="checkbox" id="use-custom-prompt" ${!state.isClaudeKeyValidated ? 'disabled' : ''} ${state.aiSettings.customPrompt ? 'checked' : ''}
                                        class="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600">
                                    <span class="ml-2 text-xs text-gray-600 dark:text-gray-400">Override with custom prompt</span>
                                </label>
                            </div>

                            <!-- Default prompt display -->
                            <div id="default-prompt-display" class="${state.aiSettings.customPrompt ? 'hidden' : ''}">
                                <textarea id="default-prompt-textarea" rows="4" readonly
                                    class="bg-gray-100 border border-gray-300 text-gray-600 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 cursor-not-allowed"
                                    >${getDefaultPrompt(state.aiSettings.spiceLevel)}</textarea>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    This prompt updates automatically when you change the spice level.
                                </p>
                            </div>

                            <!-- Custom prompt editor -->
                            <div id="custom-prompt-editor" class="${state.aiSettings.customPrompt ? '' : 'hidden'}">
                                <textarea id="prompt-textarea" rows="4" placeholder="Enter your custom prompt for generating matter descriptions..."
                                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-200 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
                                    ${!state.isClaudeKeyValidated ? 'disabled' : ''}>${state.aiSettings.customPrompt || ''}</textarea>
                                <div class="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                    <p class="text-xs text-purple-800 dark:text-purple-300">
                                        <strong>Tip:</strong> Use <code class="bg-purple-200 dark:bg-purple-700 px-1 rounded">{count}</code> as a placeholder for the number of matters.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Preview & Save -->
                        <div class="flex gap-2">
                            <button id="preview-descriptions-btn"
                                class="flex-1 text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                ${!state.isClaudeKeyValidated || !state.aiSettings.selectedModel ? 'disabled' : ''}>
                                Preview (5 samples)
                            </button>
                            <button id="save-ai-settings-btn" class="flex-1 text-white bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" ${!state.isClaudeKeyValidated ? 'disabled' : ''}>
                                Save Prompt
                            </button>
                        </div>

                        <!-- Preview Area -->
                        <div id="preview-area" class="hidden">
                            <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                                <p class="text-sm font-medium text-purple-800 dark:text-purple-400 mb-2">Preview:</p>
                                <ul id="preview-list" class="text-sm text-purple-700 dark:text-purple-300 space-y-1 list-disc list-inside"></ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Per-Type Spice Settings Section -->
            <div id="per-type-settings-section" class="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${!state.isClaudeKeyValidated || !state.aiSettings.selectedModel ? 'opacity-50 pointer-events-none' : ''}">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center">
                        <svg class="w-6 h-6 mr-3 text-orange-600 dark:text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                        </svg>
                        <div>
                            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Per-Type Spice Settings</h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Customize spice levels for each generation type</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button id="apply-default-to-all-btn" class="text-xs text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 border border-orange-300 dark:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded px-2 py-1">
                            Apply Default to All
                        </button>
                        <button id="reset-all-to-default-btn" class="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 py-1">
                            Reset All to Default
                        </button>
                    </div>
                </div>

                <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Each type can have its own spice level, or use the default (${getSpiceLevelName(state.aiSettings.spiceLevel)}) set above.
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${renderPerTypeCard('matters', 'Matters', 'Legal matter descriptions')}
                    ${renderPerTypeCard('notes', 'Private Notes', 'Note content for matters')}
                    ${renderPerTypeCard('attachments', 'Attachments', 'Generated document content')}
                    ${renderPerTypeCard('auditLog', 'Audit Log', 'System log entries')}
                </div>
            </div>

            <!-- Sample Data Generation Section -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center">
                        <svg class="w-6 h-6 mr-3 text-green-600 dark:text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"></path>
                            <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"></path>
                            <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"></path>
                        </svg>
                        <div>
                            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Sample Data Generation</h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Generate test data for matters, notes, and attachments</p>
                        </div>
                    </div>
                </div>

                <div id="sample-data-section">
                    <div id="sample-datasets-loading" class="text-sm text-gray-500 dark:text-gray-400">
                        Loading datasets...
                    </div>
                    <div id="sample-datasets-container" class="hidden">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Dataset</label>
                                <select id="sample-dataset-select" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <option value="generate">Generate New</option>
                                </select>
                            </div>
                            <div id="custom-count-container">
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Count (1-1000)</label>
                                <input type="number" id="sample-count-input" value="25" min="1" max="1000" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            </div>
                        </div>
                        <div id="sample-dataset-info" class="text-xs text-gray-500 dark:text-gray-400 hidden mb-4"></div>
                        <div id="sample-action-buttons" class="flex gap-2">
                            <button id="populate-sample-btn" class="flex-1 text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 text-sm font-semibold">
                                Populate Data
                            </button>
                            <button id="regenerate-samples-btn" class="text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-lg px-4 py-2 text-xs">
                                Regenerate Files
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupEventListeners();

        // Initialize Flowbite components
        if (typeof window.initFlowbite === 'function') {
            window.initFlowbite();
        }

    } catch (error) {
        container.innerHTML = renderErrorBanner(error, 'Error! Failed to load AI settings:');
    }
}

function setupEventListeners() {
    // Toggle API key visibility
    document.getElementById('toggle-claude-key')?.addEventListener('click', (e) => {
        const input = document.getElementById('claude-api-key-input');
        if (input.type === 'password') {
            input.type = 'text';
            e.target.textContent = 'Hide';
        } else {
            input.type = 'password';
            e.target.textContent = 'Show';
        }
    });

    // Validate & Save API key handler
    async function handleValidateClaudeKey() {
        const input = document.getElementById('claude-api-key-input');
        const apiKey = input.value.trim();

        if (!apiKey) {
            showToast('Please enter an API key', 'error');
            return;
        }

        if (!apiKey.startsWith('sk-ant-')) {
            showToast('Invalid API key format. Should start with sk-ant-', 'error');
            return;
        }

        const btn = document.getElementById('validate-save-claude-key');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<span class="flex items-center justify-center"><span class="spinner-sm mr-2"></span>Validating...</span>';

        try {
            const response = await api.validateAndSaveClaudeApiKey(apiKey);

            // Update state
            state.hasClaudeApiKey = true;
            state.isClaudeKeyValidated = true;
            state.availableModels = response.models || [];

            // Update UI - status badge
            const statusEl = document.getElementById('claude-key-status');
            statusEl.textContent = '✓ validated';
            statusEl.className = 'ml-2 text-xs text-green-600 dark:text-green-400';

            // Replace input section with validated section
            const inputSection = document.getElementById('api-key-input-section');
            if (inputSection) {
                const validatedHtml = `
                    <div id="api-key-validated-section" class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div class="flex items-center">
                            <svg class="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                            <span class="text-sm font-medium text-green-800 dark:text-green-300">API Key Validated</span>
                        </div>
                        <button id="clear-claude-key" class="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:underline">
                            Clear key
                        </button>
                    </div>
                `;
                inputSection.outerHTML = validatedHtml;
                document.getElementById('clear-claude-key')?.addEventListener('click', handleClearClaudeKey);
            }

            // Update model dropdown
            const modelSelect = document.getElementById('claude-model-select');
            modelSelect.disabled = false;
            modelSelect.innerHTML = '<option value="">Select a model...</option>' +
                state.availableModels.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

            updatePreviewButtonState();
            updateDescriptionSectionState();

            showToast(`API key validated successfully! Found ${state.availableModels.length} models.`, 'success');
        } catch (error) {
            showToast(`Validation failed: ${error.message}`, 'error');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    document.getElementById('validate-save-claude-key')?.addEventListener('click', handleValidateClaudeKey);

    // Clear API key handler
    async function handleClearClaudeKey() {
        const confirmed = await showConfirm('Are you sure you want to remove the Claude API key? AI features will be disabled.', {
            title: 'Clear API Key',
            confirmText: 'Clear',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            await api.clearClaudeApiKey();

            // Update state
            state.hasClaudeApiKey = false;
            state.isClaudeKeyValidated = false;
            state.availableModels = [];
            state.aiSettings.selectedModel = '';

            // Update UI - status
            const statusEl = document.getElementById('claude-key-status');
            statusEl.textContent = '';
            statusEl.className = 'ml-2 text-xs text-gray-400';

            // Replace validated section with input section
            const validatedSection = document.getElementById('api-key-validated-section');
            if (validatedSection) {
                const inputHtml = `
                    <div id="api-key-input-section">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key</label>
                        <div class="flex gap-2">
                            <input type="password" id="claude-api-key-input"
                                value=""
                                placeholder="sk-ant-api03-..."
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <button id="toggle-claude-key" class="px-3 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">
                                Show
                            </button>
                        </div>
                        <button id="validate-save-claude-key" class="w-full mt-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium">
                            Validate & Save
                        </button>
                    </div>
                `;
                validatedSection.outerHTML = inputHtml;

                // Re-attach event handlers
                document.getElementById('toggle-claude-key')?.addEventListener('click', (e) => {
                    const input = document.getElementById('claude-api-key-input');
                    if (input.type === 'password') {
                        input.type = 'text';
                        e.target.textContent = 'Hide';
                    } else {
                        input.type = 'password';
                        e.target.textContent = 'Show';
                    }
                });
                document.getElementById('validate-save-claude-key')?.addEventListener('click', handleValidateClaudeKey);
            }

            // Update model dropdown
            const modelSelect = document.getElementById('claude-model-select');
            modelSelect.disabled = true;
            modelSelect.innerHTML = '<option value="">Validate API key first</option>';

            updatePreviewButtonState();
            updateDescriptionSectionState();

            showToast('API key cleared', 'success');
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    document.getElementById('clear-claude-key')?.addEventListener('click', handleClearClaudeKey);

    // Model selection change - auto-save
    document.getElementById('claude-model-select')?.addEventListener('change', async (e) => {
        const newModel = e.target.value;
        if (!newModel) return;

        state.aiSettings.selectedModel = newModel;
        updatePreviewButtonState();
        updateDescriptionSectionState();

        try {
            await api.saveAiSettings({
                model: newModel,
                spiceLevel: state.aiSettings.spiceLevel,
                customPrompt: state.aiSettings.customPrompt
            });
            showToast(`Model updated to ${e.target.options[e.target.selectedIndex].text}`, 'success');
        } catch (error) {
            showToast(`Failed to save model: ${error.message}`, 'error');
        }
    });

    // Spice level button group
    document.querySelectorAll('.spice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            state.aiSettings.spiceLevel = level;

            // Update button styles
            document.querySelectorAll('.spice-btn').forEach(b => {
                const btnLevel = b.dataset.level;
                b.classList.remove('bg-purple-600', 'bg-red-600', 'bg-gradient-to-r', 'from-purple-600', 'via-red-600', 'to-orange-500', 'from-black', 'via-purple-900', 'to-red-900', 'text-white', 'border-purple-600', 'border-red-600', 'border-purple-900', 'animate-pulse');

                if (btnLevel === level) {
                    b.classList.remove('bg-white', 'text-gray-700', 'border-gray-300', 'hover:bg-gray-50', 'dark:bg-gray-800', 'dark:text-gray-300', 'dark:border-gray-600', 'dark:hover:bg-gray-700');
                    if (level === '8') {
                        b.classList.add('bg-gradient-to-r', 'from-black', 'via-purple-900', 'to-red-900', 'text-white', 'border-purple-900', 'animate-pulse');
                    } else if (level === '7') {
                        b.classList.add('bg-gradient-to-r', 'from-purple-600', 'via-red-600', 'to-orange-500', 'text-white', 'border-purple-600');
                    } else if (level === '6') {
                        b.classList.add('bg-red-600', 'text-white', 'border-red-600');
                    } else {
                        b.classList.add('bg-purple-600', 'text-white', 'border-purple-600');
                    }
                } else {
                    b.classList.add('bg-white', 'text-gray-700', 'border-gray-300', 'hover:bg-gray-50', 'dark:bg-gray-800', 'dark:text-gray-300', 'dark:border-gray-600', 'dark:hover:bg-gray-700');
                }
            });

            // Update the default prompt textarea
            const defaultPromptTextarea = document.getElementById('default-prompt-textarea');
            if (defaultPromptTextarea) {
                defaultPromptTextarea.value = getDefaultPrompt(level);
            }

            // Update per-type dropdown "Use Default" options to show new default
            document.querySelectorAll('.per-type-spice-select').forEach(select => {
                const defaultOption = select.querySelector('option[value=""]');
                if (defaultOption) {
                    defaultOption.textContent = `Use Default (${getSpiceLevelName(level)})`;
                }
                // Also update effective display for types using default
                const typeSpice = state.aiSettings.perType?.[select.dataset.type]?.spiceLevel;
                if (!typeSpice) {
                    updatePerTypeCardUI(select.dataset.type, '');
                }
            });
        });
    });

    // Toggle custom prompt
    document.getElementById('use-custom-prompt')?.addEventListener('change', (e) => {
        const defaultDisplay = document.getElementById('default-prompt-display');
        const customEditor = document.getElementById('custom-prompt-editor');
        const textarea = document.getElementById('prompt-textarea');

        if (e.target.checked) {
            defaultDisplay?.classList.add('hidden');
            customEditor?.classList.remove('hidden');
            textarea?.focus();
        } else {
            defaultDisplay?.classList.remove('hidden');
            customEditor?.classList.add('hidden');
            state.aiSettings.customPrompt = '';
            if (textarea) textarea.value = '';
        }
    });

    // Custom prompt text change
    document.getElementById('prompt-textarea')?.addEventListener('input', (e) => {
        const checkbox = document.getElementById('use-custom-prompt');
        if (checkbox?.checked) {
            state.aiSettings.customPrompt = e.target.value;
        }
    });

    // Preview descriptions
    document.getElementById('preview-descriptions-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('preview-descriptions-btn');
        const previewArea = document.getElementById('preview-area');
        const previewList = document.getElementById('preview-list');

        btn.disabled = true;
        btn.innerHTML = '<span class="flex items-center justify-center"><span class="spinner-sm mr-2"></span>Generating...</span>';
        previewArea.classList.add('hidden');

        try {
            const response = await api.previewAiDescriptions({
                count: 5,
                spiceLevel: state.aiSettings.spiceLevel,
                customPrompt: state.aiSettings.customPrompt
            });

            previewList.innerHTML = response.descriptions
                .map(desc => `<li>${desc}</li>`)
                .join('');
            previewArea.classList.remove('hidden');
        } catch (error) {
            showToast(`Preview failed: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Preview (5 samples)';
            updatePreviewButtonState();
        }
    });

    // Save AI settings
    document.getElementById('save-ai-settings-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('save-ai-settings-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            await api.saveAiSettings({
                model: state.aiSettings.selectedModel,
                spiceLevel: state.aiSettings.spiceLevel,
                customPrompt: state.aiSettings.customPrompt
            });

            showToast('Prompt settings saved', 'success');
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Prompt';
        }
    });

    // Per-type spice level selectors
    document.querySelectorAll('.per-type-spice-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const type = e.target.dataset.type;
            const newSpiceLevel = e.target.value;

            try {
                await api.saveAiSettingsForType(type, { spiceLevel: newSpiceLevel });

                // Update local state
                if (!state.aiSettings.perType) {
                    state.aiSettings.perType = {};
                }
                if (!state.aiSettings.perType[type]) {
                    state.aiSettings.perType[type] = { spiceLevel: '', customPrompt: '' };
                }
                state.aiSettings.perType[type].spiceLevel = newSpiceLevel;

                // Update UI to reflect custom/default state
                updatePerTypeCardUI(type, newSpiceLevel);

                const displayName = type === 'auditLog' ? 'Audit Log' : type.charAt(0).toUpperCase() + type.slice(1);
                const effectiveSpice = newSpiceLevel || state.aiSettings.spiceLevel || '1';
                showToast(`${displayName} spice set to ${getSpiceLevelName(effectiveSpice)}`, 'success');
            } catch (error) {
                showToast(`Failed to save: ${error.message}`, 'error');
            }
        });
    });

    // Reset individual type buttons
    document.querySelectorAll('.reset-type-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const type = e.target.dataset.type;

            try {
                await api.resetAiSettingsForType(type);

                // Update local state
                if (state.aiSettings.perType?.[type]) {
                    state.aiSettings.perType[type].spiceLevel = '';
                    state.aiSettings.perType[type].customPrompt = '';
                }

                // Update UI
                const select = document.querySelector(`.per-type-spice-select[data-type="${type}"]`);
                if (select) {
                    select.value = '';
                }
                updatePerTypeCardUI(type, '');

                const displayName = type === 'auditLog' ? 'Audit Log' : type.charAt(0).toUpperCase() + type.slice(1);
                showToast(`${displayName} reset to default`, 'success');
            } catch (error) {
                showToast(`Failed to reset: ${error.message}`, 'error');
            }
        });
    });

    // Apply default to all types
    document.getElementById('apply-default-to-all-btn')?.addEventListener('click', async () => {
        try {
            await api.applyDefaultToAllTypes();

            // Update local state - set all types to use the current default
            const defaultSpice = state.aiSettings.spiceLevel || '1';
            const types = ['matters', 'notes', 'attachments', 'auditLog'];
            types.forEach(type => {
                if (!state.aiSettings.perType) state.aiSettings.perType = {};
                if (!state.aiSettings.perType[type]) state.aiSettings.perType[type] = { spiceLevel: '', customPrompt: '' };
                state.aiSettings.perType[type].spiceLevel = defaultSpice;
            });

            // Update all selects and UI
            document.querySelectorAll('.per-type-spice-select').forEach(select => {
                select.value = defaultSpice;
                updatePerTypeCardUI(select.dataset.type, defaultSpice);
            });

            showToast(`Applied "${getSpiceLevelName(defaultSpice)}" to all types`, 'success');
        } catch (error) {
            showToast(`Failed to apply: ${error.message}`, 'error');
        }
    });

    // Reset all to default
    document.getElementById('reset-all-to-default-btn')?.addEventListener('click', async () => {
        try {
            const types = ['matters', 'notes', 'attachments', 'auditLog'];

            // Reset each type
            for (const type of types) {
                await api.resetAiSettingsForType(type);
                if (state.aiSettings.perType?.[type]) {
                    state.aiSettings.perType[type].spiceLevel = '';
                    state.aiSettings.perType[type].customPrompt = '';
                }
            }

            // Update all selects and UI
            document.querySelectorAll('.per-type-spice-select').forEach(select => {
                select.value = '';
                updatePerTypeCardUI(select.dataset.type, '');
            });

            showToast('All types reset to use default', 'success');
        } catch (error) {
            showToast(`Failed to reset: ${error.message}`, 'error');
        }
    });

    // Load sample datasets
    loadSampleDatasets();
}

function updatePreviewButtonState() {
    const btn = document.getElementById('preview-descriptions-btn');
    if (btn) {
        btn.disabled = !state.isClaudeKeyValidated || !state.aiSettings.selectedModel;
    }
}

function updateDescriptionSectionState() {
    const descriptionSection = document.getElementById('description-settings-section');
    if (!descriptionSection) return;

    const isFullyEnabled = state.isClaudeKeyValidated && state.aiSettings.selectedModel;

    if (isFullyEnabled) {
        descriptionSection.classList.remove('opacity-50', 'pointer-events-none');
    } else {
        descriptionSection.classList.add('opacity-50', 'pointer-events-none');
    }

    const notice = document.getElementById('description-settings-notice');
    if (notice) {
        if (isFullyEnabled) {
            notice.classList.add('hidden');
        } else {
            notice.classList.remove('hidden');
            notice.textContent = !state.isClaudeKeyValidated ? '(requires validated API key)' : '(select a model to enable)';
        }
    }

    document.querySelectorAll('.spice-btn').forEach(btn => {
        btn.disabled = !isFullyEnabled;
    });

    const textarea = document.getElementById('prompt-textarea');
    const customPromptCheckbox = document.getElementById('use-custom-prompt');
    const saveBtn = document.getElementById('save-ai-settings-btn');

    if (customPromptCheckbox) customPromptCheckbox.disabled = !isFullyEnabled;
    if (textarea) textarea.disabled = !isFullyEnabled;
    if (saveBtn) saveBtn.disabled = !isFullyEnabled;

    // Also update per-type settings section
    const perTypeSection = document.getElementById('per-type-settings-section');
    if (perTypeSection) {
        if (isFullyEnabled) {
            perTypeSection.classList.remove('opacity-50', 'pointer-events-none');
        } else {
            perTypeSection.classList.add('opacity-50', 'pointer-events-none');
        }
    }
}

// Update UI for a per-type card after settings change
function updatePerTypeCardUI(type, spiceLevel) {
    const isCustom = !!spiceLevel;
    const effectiveSpice = spiceLevel || state.aiSettings.spiceLevel || '1';

    // Find the card container
    const select = document.querySelector(`.per-type-spice-select[data-type="${type}"]`);
    if (!select) return;

    const card = select.closest('.border');
    if (!card) return;

    // Update card border color
    if (isCustom) {
        card.classList.remove('border-gray-200', 'dark:border-gray-700');
        card.classList.add('border-orange-300', 'dark:border-orange-600');
    } else {
        card.classList.remove('border-orange-300', 'dark:border-orange-600');
        card.classList.add('border-gray-200', 'dark:border-gray-700');
    }

    // Update or add/remove the "Custom" badge
    let badge = card.querySelector('.absolute.-top-2');
    if (isCustom) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'absolute -top-2 right-2 text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded';
            badge.textContent = 'Custom';
            card.appendChild(badge);
        }
    } else if (badge) {
        badge.remove();
    }

    // Update reset button visibility
    const resetBtn = card.querySelector('.reset-type-btn');
    if (resetBtn) {
        if (isCustom) {
            resetBtn.classList.remove('invisible');
        } else {
            resetBtn.classList.add('invisible');
        }
    }

    // Update effective spice display
    const effectiveDisplay = card.querySelector('.mt-2.text-\\[11px\\]');
    if (effectiveDisplay) {
        const spiceColorClass = parseInt(effectiveSpice) >= 6 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400';
        effectiveDisplay.innerHTML = `Effective: <span class="font-medium ${spiceColorClass}">${getSpiceLevelName(effectiveSpice)}</span>`;
    }
}

async function loadSampleDatasets() {
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

        // Setup populate button
        setupPopulateButton();

        // Setup regenerate button
        document.getElementById('regenerate-samples-btn')?.addEventListener('click', async () => {
            const confirmed = await showConfirm('This will regenerate all sample JSON files with new random data. The database will not be affected. Continue?', {
                title: 'Regenerate Sample Files',
                confirmText: 'Regenerate',
                cancelText: 'Cancel',
                type: 'info'
            });

            if (!confirmed) return;

            try {
                const btn = document.getElementById('regenerate-samples-btn');
                btn.disabled = true;
                btn.textContent = 'Regenerating...';

                const response = await api.regenerateSampleFiles();
                showToast(`Successfully regenerated ${response.files_regenerated} sample files`, 'success');

                location.reload();
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
                const btn = document.getElementById('regenerate-samples-btn');
                btn.disabled = false;
                btn.textContent = 'Regenerate Files';
            }
        });

    } catch (error) {
        document.getElementById('sample-datasets-loading').textContent = 'Failed to load datasets';
        console.error('Failed to load sample datasets:', error);
    }
}

function setupPopulateButton() {
    document.getElementById('populate-sample-btn')?.addEventListener('click', async () => {
        const select = document.getElementById('sample-dataset-select');
        const source = select.value;
        const count = parseInt(document.getElementById('sample-count-input').value);
        const isGenerate = source === 'generate';

        // If using a predefined dataset, use simple confirm
        if (!isGenerate) {
            const confirmMsg = `This will load ${select.options[select.selectedIndex].dataset.count} matters from "${select.options[select.selectedIndex].textContent}". Continue?`;
            const confirmed = await showConfirm(confirmMsg, {
                title: 'Populate Sample Data',
                confirmText: 'Populate',
                cancelText: 'Cancel',
                type: 'info'
            });

            if (!confirmed) return;

            try {
                const btn = document.getElementById('populate-sample-btn');
                btn.disabled = true;
                btn.textContent = 'Populating...';

                const response = await api.populateSampleData(source);
                showToast(`Successfully added ${response.matters_added} sample matters ($${response.total_cost_added.toFixed(2)})`, 'success');

                btn.disabled = false;
                btn.textContent = 'Populate Data';
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
                const btn = document.getElementById('populate-sample-btn');
                btn.disabled = false;
                btn.textContent = 'Populate Data';
            }
            return;
        }

        // For "Generate New", show the advanced options modal
        await showGenerateModal(count);
    });
}

async function showGenerateModal(count) {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const formatDate = (d) => d.toISOString().split('T')[0];

    const modalContent = `
        <div class="space-y-4">
            <!-- Quick Generate Section -->
            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-semibold text-green-800 dark:text-green-400">Quick Generate</p>
                        <p class="text-xs text-green-700 dark:text-green-300">Generate ${count} matters with default settings</p>
                    </div>
                    <button id="modal-quick-generate-btn" class="text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 text-sm font-semibold">
                        Generate Now
                    </button>
                </div>
            </div>

            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Advanced Options</p>

                <!-- Count -->
                <div class="mb-4">
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Number of Matters</label>
                    <input type="number" id="modal-count-input" value="${count}" min="1" max="1000"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                </div>

                <!-- Date Range -->
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                        <input type="date" id="modal-start-date" value="${formatDate(oneYearAgo)}"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                        <input type="date" id="modal-end-date" value="${formatDate(today)}"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                </div>

                <!-- Cost Range -->
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Min Cost ($)</label>
                        <input type="number" id="modal-min-cost" value="100" min="0" step="1"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Cost ($)</label>
                        <input type="number" id="modal-max-cost" value="50000" min="0" step="1"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                </div>

                <!-- Cents Handling -->
                <div class="mb-4">
                    <label class="flex items-center cursor-pointer">
                        <input type="checkbox" id="modal-whole-dollars" checked
                            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                        <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Whole dollars only</span>
                    </label>
                </div>

                <!-- AI Descriptions -->
                <div class="mb-4">
                    <label class="flex items-center cursor-pointer ${!state.isClaudeKeyValidated || !state.aiSettings.selectedModel ? 'opacity-50' : ''}">
                        <input type="checkbox" id="modal-use-ai" ${!state.isClaudeKeyValidated || !state.aiSettings.selectedModel ? 'disabled' : ''}
                            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                        <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Use AI for matter descriptions</span>
                    </label>
                    ${!state.hasClaudeApiKey
                        ? '<p class="text-xs text-amber-600 dark:text-amber-400 ml-6">Configure Claude API key above</p>'
                        : !state.isClaudeKeyValidated
                        ? '<p class="text-xs text-amber-600 dark:text-amber-400 ml-6">Validate your API key above</p>'
                        : !state.aiSettings.selectedModel
                        ? '<p class="text-xs text-amber-600 dark:text-amber-400 ml-6">Select a model above</p>'
                        : `<p class="text-xs text-gray-500 dark:text-gray-400 ml-6">Using: <span class="font-medium">${getSpiceLevelName(state.aiSettings.spiceLevel)}</span> spice level</p>`
                    }
                </div>

                <!-- Private Notes Generation -->
                <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Private Notes</p>
                    <div class="mb-3">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="modal-generate-notes"
                                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Generate private notes for matters</span>
                        </label>
                    </div>
                    <div id="notes-options" class="hidden ml-6 space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Percentage of matters with notes</label>
                            <div class="flex items-center gap-2">
                                <input type="range" id="modal-notes-percentage" min="0" max="100" value="30"
                                    class="w-full h-2 bg-gray-200 rounded-lg cursor-pointer dark:bg-gray-700">
                                <span id="notes-percentage-display" class="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">30%</span>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Min notes per matter</label>
                                <input type="number" id="modal-min-notes" value="1" min="1" max="10"
                                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max notes per matter</label>
                                <input type="number" id="modal-max-notes" value="3" min="1" max="10"
                                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Attachments Generation -->
                <div class="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                    <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">Document Attachments</p>
                    <div class="mb-3">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="modal-generate-attachments"
                                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Generate AI legal documents</span>
                        </label>
                    </div>
                    <div id="attachments-options" class="hidden ml-6 space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Percentage of matters with documents</label>
                            <div class="flex items-center gap-2">
                                <input type="range" id="modal-attachments-percentage" min="0" max="100" value="25"
                                    class="w-full h-2 bg-gray-200 rounded-lg cursor-pointer dark:bg-gray-700">
                                <span id="attachments-percentage-display" class="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">25%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Audit Log Generation -->
                <div class="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                    <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">Audit Log Entries</p>
                    <div class="mb-3">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="modal-generate-audit-log"
                                class="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500">
                            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Generate audit log entries</span>
                        </label>
                    </div>
                    <div id="audit-log-options" class="hidden ml-6 space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Number of entries (50-500)</label>
                            <input type="number" id="modal-audit-log-count" value="100" min="50" max="500"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                <input type="date" id="modal-audit-log-start-date" value="${formatDate(oneYearAgo)}"
                                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                <input type="date" id="modal-audit-log-end-date" value="${formatDate(today)}"
                                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="flex items-center cursor-pointer ${!state.isClaudeKeyValidated || !state.aiSettings.selectedModel ? 'opacity-50' : ''}">
                                <input type="checkbox" id="modal-audit-log-use-ai" ${!state.isClaudeKeyValidated || !state.aiSettings.selectedModel ? 'disabled' : ''}
                                    class="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500">
                                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Use AI for realistic entries</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div id="modal-status-area" class="hidden">
                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div class="flex items-center">
                        <div class="spinner-sm mr-2"></div>
                        <span id="modal-status-text" class="text-sm text-blue-800 dark:text-blue-400">Generating...</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    let capturedFormValues = null;

    const result = await showCustomModal({
        title: 'Generate Sample Data',
        content: modalContent,
        size: 'md',
        buttons: [
            { text: 'Cancel', type: 'secondary', value: 'cancel' },
            { text: 'Generate', type: 'primary', value: 'generate' }
        ],
        onOpen: (modal) => {
            // Wire up notes checkbox toggle
            const notesCheckbox = modal.querySelector('#modal-generate-notes');
            const notesOptions = modal.querySelector('#notes-options');
            notesCheckbox?.addEventListener('change', (e) => {
                if (e.target.checked) {
                    notesOptions?.classList.remove('hidden');
                } else {
                    notesOptions?.classList.add('hidden');
                }
            });

            // Wire up percentage slider display
            const percentageSlider = modal.querySelector('#modal-notes-percentage');
            const percentageDisplay = modal.querySelector('#notes-percentage-display');
            percentageSlider?.addEventListener('input', (e) => {
                if (percentageDisplay) {
                    percentageDisplay.textContent = `${e.target.value}%`;
                }
            });

            // Wire up attachments checkbox toggle
            const attachmentsCheckbox = modal.querySelector('#modal-generate-attachments');
            const attachmentsOptions = modal.querySelector('#attachments-options');
            attachmentsCheckbox?.addEventListener('change', (e) => {
                if (e.target.checked) {
                    attachmentsOptions?.classList.remove('hidden');
                } else {
                    attachmentsOptions?.classList.add('hidden');
                }
            });

            // Wire up attachments percentage slider display
            const attachmentsPercentageSlider = modal.querySelector('#modal-attachments-percentage');
            const attachmentsPercentageDisplay = modal.querySelector('#attachments-percentage-display');
            attachmentsPercentageSlider?.addEventListener('input', (e) => {
                if (attachmentsPercentageDisplay) {
                    attachmentsPercentageDisplay.textContent = `${e.target.value}%`;
                }
            });

            // Wire up audit log checkbox toggle
            const auditLogCheckbox = modal.querySelector('#modal-generate-audit-log');
            const auditLogOptions = modal.querySelector('#audit-log-options');
            auditLogCheckbox?.addEventListener('change', (e) => {
                if (e.target.checked) {
                    auditLogOptions?.classList.remove('hidden');
                } else {
                    auditLogOptions?.classList.add('hidden');
                }
            });

            // Wire up quick generate button
            const quickBtn = modal.querySelector('#modal-quick-generate-btn');
            quickBtn?.addEventListener('click', async () => {
                const statusArea = modal.querySelector('#modal-status-area');
                const statusText = modal.querySelector('#modal-status-text');
                statusArea.classList.remove('hidden');
                statusText.textContent = `Generating ${count} matters with defaults...`;
                quickBtn.disabled = true;
                quickBtn.textContent = 'Generating...';

                modal.querySelectorAll('.modal-action-btn').forEach(btn => btn.disabled = true);

                showPersistentToast(`Generating ${count} matters... please wait`, 'loading');

                try {
                    const response = await api.populateSampleData('generate', { count });
                    dismissPersistentToast();
                    showToast(`Successfully added ${response.matters_added} sample matters ($${response.total_cost_added.toFixed(2)})`, 'success');
                    modal.querySelector('.modal-close')?.click();
                } catch (error) {
                    dismissPersistentToast();
                    statusArea.classList.add('hidden');
                    quickBtn.disabled = false;
                    quickBtn.textContent = 'Generate Now';
                    modal.querySelectorAll('.modal-action-btn').forEach(btn => btn.disabled = false);
                    showToast(`Error: ${error.message}`, 'error');
                }
            });

            // Capture form values before button click
            modal.querySelectorAll('.modal-action-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    capturedFormValues = {
                        count: parseInt(modal.querySelector('#modal-count-input')?.value || count),
                        startDate: modal.querySelector('#modal-start-date')?.value,
                        endDate: modal.querySelector('#modal-end-date')?.value,
                        minCost: parseFloat(modal.querySelector('#modal-min-cost')?.value || 100),
                        maxCost: parseFloat(modal.querySelector('#modal-max-cost')?.value || 50000),
                        wholeDollars: modal.querySelector('#modal-whole-dollars')?.checked ?? true,
                        useAi: modal.querySelector('#modal-use-ai')?.checked ?? false,
                        generateNotes: modal.querySelector('#modal-generate-notes')?.checked ?? false,
                        notesPercentage: parseInt(modal.querySelector('#modal-notes-percentage')?.value || 30),
                        minNotes: parseInt(modal.querySelector('#modal-min-notes')?.value || 1),
                        maxNotes: parseInt(modal.querySelector('#modal-max-notes')?.value || 3),
                        generateAttachments: modal.querySelector('#modal-generate-attachments')?.checked ?? false,
                        attachmentsPercentage: parseInt(modal.querySelector('#modal-attachments-percentage')?.value || 25),
                        generateAuditLog: modal.querySelector('#modal-generate-audit-log')?.checked ?? false,
                        auditLogCount: parseInt(modal.querySelector('#modal-audit-log-count')?.value || 100),
                        auditLogStartDate: modal.querySelector('#modal-audit-log-start-date')?.value,
                        auditLogEndDate: modal.querySelector('#modal-audit-log-end-date')?.value,
                        auditLogUseAi: modal.querySelector('#modal-audit-log-use-ai')?.checked ?? false
                    };
                }, { capture: true });
            });
        }
    });

    // Handle Generate button click
    if (result === 'generate' && capturedFormValues) {
        const {
            count: modalCount, startDate, endDate, minCost, maxCost, wholeDollars, useAi,
            generateNotes, notesPercentage, minNotes, maxNotes,
            generateAttachments, attachmentsPercentage,
            generateAuditLog, auditLogCount, auditLogStartDate, auditLogEndDate, auditLogUseAi
        } = capturedFormValues;

        // Validation
        if (modalCount < 1 || modalCount > 1000) {
            showToast('Count must be between 1 and 1000', 'error');
            return;
        }
        if (minCost < 0 || maxCost < 0 || minCost > maxCost) {
            showToast('Invalid cost range', 'error');
            return;
        }

        let loadingMsg = `Generating ${modalCount} matters`;
        if (useAi) loadingMsg += ` with AI (${getSpiceLevelName(state.aiSettings.spiceLevel)})`;
        if (generateNotes) loadingMsg += ` + notes`;
        if (generateAttachments) loadingMsg += ` + documents`;
        if (generateAuditLog) loadingMsg += ` + ${auditLogCount} audit entries`;
        loadingMsg += '... please wait';
        showPersistentToast(loadingMsg, 'loading');

        const btn = document.getElementById('populate-sample-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = useAi
                ? '<span class="flex items-center justify-center"><span class="spinner-sm mr-2"></span>Generating with AI...</span>'
                : 'Generating...';
        }

        try {
            const response = await api.populateSampleData('generate', {
                count: modalCount,
                startDate,
                endDate,
                minCostDollars: minCost,
                maxCostDollars: maxCost,
                wholeDollarsOnly: wholeDollars,
                useAiDescriptions: useAi,
                spiceLevelOverride: useAi ? state.aiSettings.spiceLevel : undefined,
                generatePrivateNotes: generateNotes,
                notesPercentage: generateNotes ? notesPercentage : undefined,
                minNotesPerMatter: generateNotes ? minNotes : undefined,
                maxNotesPerMatter: generateNotes ? maxNotes : undefined,
                generateAttachments: generateAttachments,
                attachmentsPercentage: generateAttachments ? attachmentsPercentage : undefined
            });

            // Generate audit log if requested
            let auditLogResult = null;
            if (generateAuditLog) {
                try {
                    auditLogResult = await api.populateAuditLogSampleData({
                        count: auditLogCount,
                        startDate: auditLogStartDate,
                        endDate: auditLogEndDate,
                        useAi: auditLogUseAi,
                        spiceLevelOverride: auditLogUseAi ? state.aiSettings.spiceLevel : undefined
                    });
                } catch (auditError) {
                    console.error('Failed to generate audit log entries:', auditError);
                }
            }

            dismissPersistentToast();
            const aiNote = response.used_ai_descriptions ? ` (AI @ ${getSpiceLevelName(state.aiSettings.spiceLevel)})` : '';
            const notesNote = response.private_notes_generated ? ` + ${response.private_notes_generated} notes` : '';
            const attachmentsNote = response.attachments_generated ? ` + ${response.attachments_generated} documents` : '';
            const auditLogNote = auditLogResult?.created ? ` + ${auditLogResult.created} audit entries` : '';
            showToast(`Successfully added ${response.matters_added} sample matters ($${response.total_cost_added.toFixed(2)})${aiNote}${notesNote}${attachmentsNote}${auditLogNote}`, 'success');
        } catch (error) {
            dismissPersistentToast();
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Populate Data';
            }
        }
    }
}

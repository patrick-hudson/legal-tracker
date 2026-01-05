/**
 * Data Management Component
 * Claude AI integration, Sample data, and Wipe functionalities
 */

import api from '../api.js';
import { renderErrorBanner } from '../display-utils.js';
import { showConfirm, showCustomModal } from '../modal.js';

// Track Claude API state
let hasClaudeApiKey = false;
let isClaudeKeyValidated = false;
let availableModels = [];
let aiSettings = {
    selectedModel: '',
    spiceLevel: '1',
    customPrompt: ''
};

// Base prompt template (spice instructions are added dynamically)
const BASE_PROMPT = `Generate exactly {count} unique legal matter descriptions for a law firm billing tracker. Each description should be a brief phrase (5-15 words) describing a legal service or matter type.

Include variety: contracts, litigation, IP, employment, regulatory, real estate, corporate, tax matters, etc.`;

// Spice level instructions appended to prompt
const SPICE_INSTRUCTIONS = {
    '1': 'Use a professional, straightforward tone. Keep descriptions formal and corporate.',
    '2': 'Add subtle, dry humor. Keep it professional but with understated wit.',
    '3': 'Be witty and clever. Use mild wordplay and light sarcasm where appropriate.',
    '4': 'Be dramatic and theatrical. Make descriptions slightly absurd but still believable.',
    '5': 'Go completely unhinged. Be wildly creative, absurd, and maximally entertaining while still being legal-adjacent.',
    '6': 'CHAOTIC EVIL MODE: Maximum depravity. Every description must contain at least one terrible pun, dripping sarcasm, or absurdist legal nightmare. Channel the energy of a sleep-deprived lawyer who has seen too much and fears nothing. Mock the legal system while technically describing billable work. Be viciously funny.',
    '7': 'ELDRITCH LEGAL HORROR: You are a cosmic entity that has consumed 10,000 law firms and absorbed their collective trauma. Generate descriptions that make readers question reality, legality, and their life choices simultaneously. Every phrase should be a war crime against professionalism. Puns are mandatory. Sanity is optional. These descriptions should make opposing counsel weep and judges recuse themselves out of sheer confusion. Go absolutely feral.'
};

// Get the full default prompt for a given spice level
function getDefaultPrompt(spiceLevel) {
    const spiceInstruction = SPICE_INSTRUCTIONS[spiceLevel] || SPICE_INSTRUCTIONS['1'];
    return `${BASE_PROMPT}

Tone: ${spiceInstruction}

Return ONLY a JSON array of strings, no other text.`;
}

// Spice level name helper
function getSpiceLevelName(level) {
    const names = {
        '1': 'Professional',
        '2': 'Dry Humor',
        '3': 'Witty',
        '4': 'Dramatic',
        '5': 'Unhinged',
        '6': 'Chaotic Evil',
        '7': 'Eldritch Horror'
    };
    return names[level] || 'Professional';
}

export async function renderDataManagement(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        // Load settings including AI configuration
        const settingsResponse = await api.getSettings();
        hasClaudeApiKey = settingsResponse.hasClaudeApiKey || false;
        isClaudeKeyValidated = settingsResponse.isClaudeKeyValidated || false;
        aiSettings = settingsResponse.aiSettings || { selectedModel: '', spiceLevel: '1', customPrompt: '' };

        // If key is validated, try to load models
        if (hasClaudeApiKey && isClaudeKeyValidated) {
            try {
                const modelsResponse = await api.getClaudeModels();
                availableModels = modelsResponse.models || [];
            } catch (e) {
                console.warn('Failed to load models:', e);
                availableModels = [];
            }
        }

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Data Management</h1>
                <p class="text-gray-600 dark:text-gray-400">AI integration, sample data, and database management</p>
            </div>

            <!-- AI Configuration Section - Collapsible -->
            <div class="mb-6">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <!-- Collapsible Header -->
                    <button type="button" id="ai-section-toggle" class="flex items-center justify-between w-full p-4 text-left border-b border-gray-200 dark:border-gray-700 rounded-t-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" aria-expanded="true" aria-controls="ai-section-content">
                        <div class="flex items-center">
                            <svg class="w-6 h-6 mr-3 text-blue-600 dark:text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
                            </svg>
                            <div>
                                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Claude AI Integration</h2>
                                <p class="text-sm text-gray-500 dark:text-gray-400">Configure AI-powered matter descriptions</p>
                            </div>
                        </div>
                        <svg id="ai-section-chevron" class="w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>

                    <!-- Collapsible Content (state persisted via localStorage) -->
                    <div id="ai-section-content" class="p-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Claude API Integration -->
                            <div class="space-y-4">
                                <h3 class="text-md font-semibold text-blue-600 dark:text-blue-500 flex items-center">
                                    API Configuration
                                    <span id="claude-key-status" class="ml-2 text-xs ${isClaudeKeyValidated ? 'text-green-600 dark:text-green-400' : hasClaudeApiKey ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}">
                                        ${isClaudeKeyValidated ? '✓ validated' : hasClaudeApiKey ? '⚠ not validated' : ''}
                                    </span>
                                </h3>

                                <!-- API Key Section - different views for validated vs not -->
                                ${isClaudeKeyValidated ? `
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
                                        ${!isClaudeKeyValidated ? 'disabled' : ''}>
                                        <option value="">${isClaudeKeyValidated ? 'Select a model...' : 'Validate API key first'}</option>
                                        ${availableModels.map(m => `<option value="${m.id}" ${m.id === aiSettings.selectedModel ? 'selected' : ''}>${m.name}</option>`).join('')}
                                    </select>
                                </div>

                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Get your API key from <a href="https://console.anthropic.com/" target="_blank" class="text-blue-600 hover:underline dark:text-blue-400">console.anthropic.com</a>
                                </p>
                            </div>

                            <!-- Description Configuration -->
                            <div id="description-settings-section" class="space-y-4 ${!isClaudeKeyValidated || !aiSettings.selectedModel ? 'opacity-50 pointer-events-none' : ''}">
                                <h3 class="text-md font-semibold text-purple-600 dark:text-purple-500 flex items-center">
                                    Description Settings
                                    <span id="description-settings-notice" class="ml-2 text-xs font-normal text-gray-400 ${isClaudeKeyValidated && aiSettings.selectedModel ? 'hidden' : ''}">${!isClaudeKeyValidated ? '(requires validated API key)' : '(select a model to enable)'}</span>
                                </h3>

                                <!-- Spice Level - Button Group -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Spice Level</label>
                                    <div id="spice-level-buttons" class="inline-flex rounded-lg shadow-sm" role="group">
                                        <button type="button" data-level="1" class="spice-btn px-3 py-2 text-xs font-medium rounded-l-lg border ${aiSettings.spiceLevel === '1' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'}" ${!isClaudeKeyValidated ? 'disabled' : ''}>
                                            Professional
                                        </button>
                                        <button type="button" data-level="2" class="spice-btn px-3 py-2 text-xs font-medium border-t border-b ${aiSettings.spiceLevel === '2' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'}" ${!isClaudeKeyValidated ? 'disabled' : ''}>
                                            Dry Humor
                                        </button>
                                        <button type="button" data-level="3" class="spice-btn px-3 py-2 text-xs font-medium border ${aiSettings.spiceLevel === '3' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'}" ${!isClaudeKeyValidated ? 'disabled' : ''}>
                                            Witty
                                        </button>
                                        <button type="button" data-level="4" class="spice-btn px-3 py-2 text-xs font-medium border-t border-b ${aiSettings.spiceLevel === '4' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'}" ${!isClaudeKeyValidated ? 'disabled' : ''}>
                                            Dramatic
                                        </button>
                                        <button type="button" data-level="5" class="spice-btn px-3 py-2 text-xs font-medium border-t border-b ${aiSettings.spiceLevel === '5' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'}" ${!isClaudeKeyValidated ? 'disabled' : ''}>
                                            Unhinged
                                        </button>
                                        <button type="button" data-level="6" class="spice-btn px-3 py-2 text-xs font-medium border ${aiSettings.spiceLevel === '6' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'}" ${!isClaudeKeyValidated ? 'disabled' : ''}>
                                            Chaotic Evil
                                        </button>
                                        <button type="button" data-level="7" class="spice-btn px-3 py-2 text-xs font-medium rounded-r-lg border ${aiSettings.spiceLevel === '7' ? 'bg-gradient-to-r from-purple-600 via-red-600 to-orange-500 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'}" ${!isClaudeKeyValidated ? 'disabled' : ''}>
                                            Eldritch Horror
                                        </button>
                                    </div>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Controls the tone of AI-generated descriptions (levels 6-7 may cause existential dread)</p>
                                </div>

                                <!-- Prompt Section -->
                                <div>
                                    <div class="flex justify-between items-center mb-2">
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt</label>
                                        <label class="flex items-center cursor-pointer">
                                            <input type="checkbox" id="use-custom-prompt" ${!isClaudeKeyValidated ? 'disabled' : ''} ${aiSettings.customPrompt ? 'checked' : ''}
                                                class="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600">
                                            <span class="ml-2 text-xs text-gray-600 dark:text-gray-400">Override with custom prompt</span>
                                        </label>
                                    </div>

                                    <!-- Default prompt display (read-only, shown when not using custom) -->
                                    <div id="default-prompt-display" class="${aiSettings.customPrompt ? 'hidden' : ''}">
                                        <textarea id="default-prompt-textarea" rows="5" readonly
                                            class="bg-gray-100 border border-gray-300 text-gray-600 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 cursor-not-allowed"
                                            >${getDefaultPrompt(aiSettings.spiceLevel)}</textarea>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            This prompt updates automatically when you change the spice level.
                                        </p>
                                    </div>

                                    <!-- Custom prompt editor (shown when using custom) -->
                                    <div id="custom-prompt-editor" class="${aiSettings.customPrompt ? '' : 'hidden'}">
                                        <textarea id="prompt-textarea" rows="5" placeholder="Enter your custom prompt for generating matter descriptions..."
                                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-200 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
                                            ${!isClaudeKeyValidated ? 'disabled' : ''}>${aiSettings.customPrompt || ''}</textarea>
                                        <div class="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                            <p class="text-xs text-purple-800 dark:text-purple-300">
                                                <strong>Tip:</strong> Use <code class="bg-purple-200 dark:bg-purple-700 px-1 rounded">{count}</code> as a placeholder for the number of matters. When generating sample data, this gets replaced with the count from the form (e.g., "Generate {count} descriptions" becomes "Generate 25 descriptions").
                                            </p>
                                        </div>

                                        <!-- Collapsible default prompt reference -->
                                        <details class="mt-2">
                                            <summary class="text-xs text-purple-600 dark:text-purple-400 cursor-pointer hover:underline">
                                                View current default prompt for reference
                                            </summary>
                                            <div id="default-prompt-reference" class="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap">${getDefaultPrompt(aiSettings.spiceLevel)}</div>
                                        </details>
                                    </div>
                                </div>

                                <!-- Preview & Save -->
                                <div class="flex gap-2">
                                    <button id="preview-descriptions-btn"
                                        class="flex-1 text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        ${!isClaudeKeyValidated || !aiSettings.selectedModel ? 'disabled' : ''}>
                                        Preview (5 samples)
                                    </button>
                                    <button id="save-ai-settings-btn" class="flex-1 text-white bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" ${!isClaudeKeyValidated ? 'disabled' : ''}>
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
                </div>
            </div>

            <!-- Sample Data and Wipe Section -->
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
                    <details class="mb-4">
                        <summary class="text-xs text-orange-600 dark:text-orange-400 cursor-pointer hover:underline font-medium">What will be affected?</summary>
                        <div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mt-2">
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
                    </details>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirmation required: type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-orange-600 dark:text-orange-400 font-mono text-xs">WIPE MATTERS</code>
                            </label>
                            <input
                                type="text"
                                id="wipe-matters-confirmation"
                                placeholder="WIPE MATTERS"
                                autocomplete="off"
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
                    <details class="mb-4">
                        <summary class="text-xs text-amber-600 dark:text-amber-400 cursor-pointer hover:underline font-medium">What will be affected?</summary>
                        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2">
                            <p class="text-sm text-amber-800 dark:text-amber-400 font-semibold mb-2">Resets:</p>
                            <ul class="list-disc list-inside text-xs text-amber-700 dark:text-amber-300 space-y-1">
                                <li>All matter records</li>
                                <li>Lifetime fees → $0</li>
                                <li>Drain rate → 0</li>
                                <li>Auto-drain → disabled</li>
                                <li>Drain timer → reset</li>
                                <li>API key → cleared</li>
                                <li>Auth required → disabled</li>
                                <li>IP whitelist → cleared</li>
                                <li>Claude API key → cleared</li>
                                <li>AI settings → defaults</li>
                            </ul>
                            <p class="text-xs text-amber-700 dark:text-amber-300 mt-2 font-semibold">Preserves:</p>
                            <ul class="list-disc list-inside text-xs text-amber-700 dark:text-amber-300 space-y-1">
                                <li>Admin users & sessions</li>
                            </ul>
                        </div>
                    </details>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirmation required: type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-amber-600 dark:text-amber-400 font-mono text-xs">WIPE SETTINGS</code>
                            </label>
                            <input
                                type="text"
                                id="wipe-matters-settings-confirmation"
                                placeholder="WIPE SETTINGS"
                                autocomplete="off"
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
                    <details class="mb-4">
                        <summary class="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:underline font-medium">What will be affected?</summary>
                        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-2">
                            <p class="text-sm text-red-800 dark:text-red-400 font-semibold mb-2">Deletes everything:</p>
                            <ul class="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-1">
                                <li>All matter records</li>
                                <li>All settings → defaults</li>
                                <li>All admin users</li>
                                <li>All active sessions</li>
                                <li>Bootstrap tokens</li>
                                <li>API key, auth settings, IP whitelist</li>
                                <li>Claude API key and AI settings</li>
                            </ul>
                            <p class="text-xs text-red-700 dark:text-red-300 mt-2 font-semibold">Result:</p>
                            <ul class="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-1">
                                <li>Fresh install state</li>
                            </ul>
                        </div>
                    </details>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirmation required: type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-red-600 dark:text-red-400 font-mono text-xs">WIPE EVERYTHING</code>
                            </label>
                            <input
                                type="text"
                                id="wipe-confirmation"
                                placeholder="WIPE EVERYTHING"
                                autocomplete="off"
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

        // Initialize Flowbite components for dynamically created content
        if (typeof window.initFlowbite === 'function') {
            window.initFlowbite();
        }

    } catch (error) {
        container.innerHTML = renderErrorBanner(error, 'Error! Failed to load data management:');
    }
}

function setupEventListeners() {
    // ========== Claude API Integration Section ==========

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

    // Clear placeholder when user starts typing
    document.getElementById('claude-api-key-input')?.addEventListener('focus', (e) => {
        if (e.target.value === '••••••••••••••••') {
            e.target.value = '';
            e.target.type = 'text';
            document.getElementById('toggle-claude-key').textContent = 'Hide';
        }
    });

    // Validate & Save API key handler (named function for re-attachment after DOM changes)
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
            hasClaudeApiKey = true;
            isClaudeKeyValidated = true;
            availableModels = response.models || [];

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

                // Re-attach clear button handler
                document.getElementById('clear-claude-key')?.addEventListener('click', handleClearClaudeKey);
            }

            // Update UI - model dropdown
            const modelSelect = document.getElementById('claude-model-select');
            modelSelect.disabled = false;
            modelSelect.innerHTML = '<option value="">Select a model...</option>' +
                availableModels.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

            // Update UI - preview button and description section
            updatePreviewButtonState();
            updateDescriptionSectionState();

            showToast(`API key validated successfully! Found ${availableModels.length} models.`, 'success');
        } catch (error) {
            showToast(`Validation failed: ${error.message}`, 'error');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    document.getElementById('validate-save-claude-key')?.addEventListener('click', handleValidateClaudeKey);

    // Clear API key handler (named function for re-attachment after DOM changes)
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
            hasClaudeApiKey = false;
            isClaudeKeyValidated = false;
            availableModels = [];
            aiSettings.selectedModel = '';

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

                // Re-attach event handlers for the new elements
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

            // Update UI - model dropdown
            const modelSelect = document.getElementById('claude-model-select');
            modelSelect.disabled = true;
            modelSelect.innerHTML = '<option value="">Validate API key first</option>';

            // Update UI - preview button and description section
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
        if (!newModel) return; // Don't save if "Select a model..." is chosen

        aiSettings.selectedModel = newModel;
        updatePreviewButtonState();
        updateDescriptionSectionState();

        // Auto-save the model selection
        try {
            await api.saveAiSettings({
                model: newModel,
                spiceLevel: aiSettings.spiceLevel,
                customPrompt: aiSettings.customPrompt
            });
            showToast(`Model updated to ${e.target.options[e.target.selectedIndex].text}`, 'success');
        } catch (error) {
            showToast(`Failed to save model: ${error.message}`, 'error');
        }
    });

    // ========== Collapsible AI Section ==========

    // Apply saved collapsed state from localStorage on page load
    const aiSectionCollapsed = localStorage.getItem('aiSectionCollapsed') === 'true';
    if (aiSectionCollapsed) {
        const content = document.getElementById('ai-section-content');
        const chevron = document.getElementById('ai-section-chevron');
        const toggle = document.getElementById('ai-section-toggle');
        if (content && chevron && toggle) {
            content.classList.add('hidden');
            chevron.classList.add('rotate-180');
            toggle.setAttribute('aria-expanded', 'false');
        }
    }

    // Toggle collapsible AI section
    document.getElementById('ai-section-toggle')?.addEventListener('click', () => {
        const content = document.getElementById('ai-section-content');
        const chevron = document.getElementById('ai-section-chevron');
        const toggle = document.getElementById('ai-section-toggle');

        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            chevron.classList.remove('rotate-180');
            toggle.setAttribute('aria-expanded', 'true');
            localStorage.setItem('aiSectionCollapsed', 'false');
        } else {
            content.classList.add('hidden');
            chevron.classList.add('rotate-180');
            toggle.setAttribute('aria-expanded', 'false');
            localStorage.setItem('aiSectionCollapsed', 'true');
        }
    });

    // ========== Description Configuration Section ==========

    // Spice level button group
    document.querySelectorAll('.spice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            aiSettings.spiceLevel = level;

            // Update button styles
            document.querySelectorAll('.spice-btn').forEach(b => {
                const btnLevel = b.dataset.level;
                // Remove all possible active styles
                b.classList.remove('bg-purple-600', 'bg-red-600', 'bg-gradient-to-r', 'from-purple-600', 'via-red-600', 'to-orange-500', 'text-white', 'border-purple-600', 'border-red-600');

                if (btnLevel === level) {
                    b.classList.remove('bg-white', 'text-gray-700', 'border-gray-300', 'hover:bg-gray-50', 'dark:bg-gray-800', 'dark:text-gray-300', 'dark:border-gray-600', 'dark:hover:bg-gray-700');
                    // Apply level-specific styling
                    if (level === '7') {
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

            // Update the default prompt textarea with the new spice level
            const defaultPromptTextarea = document.getElementById('default-prompt-textarea');
            if (defaultPromptTextarea) {
                defaultPromptTextarea.value = getDefaultPrompt(level);
            }

            // Also update the default prompt reference in the custom prompt section
            const defaultPromptReference = document.getElementById('default-prompt-reference');
            if (defaultPromptReference) {
                defaultPromptReference.textContent = getDefaultPrompt(level);
            }
        });
    });

    // Toggle custom prompt - show/hide the two different sections
    document.getElementById('use-custom-prompt')?.addEventListener('change', (e) => {
        const defaultDisplay = document.getElementById('default-prompt-display');
        const customEditor = document.getElementById('custom-prompt-editor');
        const textarea = document.getElementById('prompt-textarea');

        if (e.target.checked) {
            // Show custom editor, hide default display
            defaultDisplay?.classList.add('hidden');
            customEditor?.classList.remove('hidden');
            textarea?.focus();
        } else {
            // Show default display, hide custom editor
            defaultDisplay?.classList.remove('hidden');
            customEditor?.classList.add('hidden');
            // Clear custom prompt when unchecking
            aiSettings.customPrompt = '';
            if (textarea) textarea.value = '';
        }
    });

    // Custom prompt text change
    document.getElementById('prompt-textarea')?.addEventListener('input', (e) => {
        const checkbox = document.getElementById('use-custom-prompt');
        if (checkbox?.checked) {
            aiSettings.customPrompt = e.target.value;
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
                spiceLevel: aiSettings.spiceLevel,
                customPrompt: aiSettings.customPrompt
            });

            // Display preview
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
                model: aiSettings.selectedModel,
                spiceLevel: aiSettings.spiceLevel,
                customPrompt: aiSettings.customPrompt
            });

            showToast('Prompt settings saved', 'success');
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Prompt';
        }
    });

    // Helper to update preview button state
    function updatePreviewButtonState() {
        const btn = document.getElementById('preview-descriptions-btn');
        if (btn) {
            btn.disabled = !isClaudeKeyValidated || !aiSettings.selectedModel;
        }
    }

    // Helper to update Description Settings section enabled/disabled state
    function updateDescriptionSectionState() {
        const descriptionSection = document.getElementById('description-settings-section');
        if (!descriptionSection) return;

        const isFullyEnabled = isClaudeKeyValidated && aiSettings.selectedModel;

        // The section is styled with pointer-events-none when disabled via CSS classes in the template
        // We need to toggle the opacity and pointer-events classes
        if (isFullyEnabled) {
            descriptionSection.classList.remove('opacity-50', 'pointer-events-none');
        } else {
            descriptionSection.classList.add('opacity-50', 'pointer-events-none');
        }

        // Update the notice text based on current state
        const notice = document.getElementById('description-settings-notice');
        if (notice) {
            if (isFullyEnabled) {
                notice.classList.add('hidden');
            } else {
                notice.classList.remove('hidden');
                // Update text based on what's missing
                if (!isClaudeKeyValidated) {
                    notice.textContent = '(requires validated API key)';
                } else {
                    notice.textContent = '(select a model to enable)';
                }
            }
        }

        // Update spice buttons
        document.querySelectorAll('.spice-btn').forEach(btn => {
            btn.disabled = !isFullyEnabled;
        });

        // Update form controls
        const textarea = document.getElementById('prompt-textarea');
        const customPromptCheckbox = document.getElementById('use-custom-prompt');
        const saveBtn = document.getElementById('save-ai-settings-btn');

        if (customPromptCheckbox) customPromptCheckbox.disabled = !isFullyEnabled;
        if (textarea) textarea.disabled = !isFullyEnabled;
        if (saveBtn) saveBtn.disabled = !isFullyEnabled;
    }

    // ========== Sample Data Section ==========

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

    // Populate sample data - show options modal
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
                                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600">
                            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Whole dollars only</span>
                        </label>
                        <p class="text-xs text-gray-500 dark:text-gray-400 ml-6">Uncheck to include random cents (e.g., $1,234.56)</p>
                    </div>

                    <!-- AI Descriptions -->
                    <div class="mb-4">
                        <label class="flex items-center cursor-pointer ${!isClaudeKeyValidated || !aiSettings.selectedModel ? 'opacity-50' : ''}">
                            <input type="checkbox" id="modal-use-ai" ${!isClaudeKeyValidated || !aiSettings.selectedModel ? 'disabled' : ''}
                                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600">
                            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Use AI for matter descriptions</span>
                        </label>
                        ${!hasClaudeApiKey
                            ? '<p class="text-xs text-amber-600 dark:text-amber-400 ml-6">Configure Claude API key above to enable AI descriptions</p>'
                            : !isClaudeKeyValidated
                            ? '<p class="text-xs text-amber-600 dark:text-amber-400 ml-6">Validate your API key above to enable AI descriptions</p>'
                            : !aiSettings.selectedModel
                            ? '<p class="text-xs text-amber-600 dark:text-amber-400 ml-6">Select a model above to enable AI descriptions</p>'
                            : `<p class="text-xs text-gray-500 dark:text-gray-400 ml-6">Model: <span class="font-medium">${aiSettings.selectedModel}</span> | Spice: <span class="font-medium">${getSpiceLevelName(aiSettings.spiceLevel)}</span></p>`
                        }
                    </div>
                </div>

                <!-- Status area for generation progress -->
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

        // Store captured form values for use after modal closes
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
                // Wire up the quick generate button
                const quickBtn = modal.querySelector('#modal-quick-generate-btn');
                quickBtn?.addEventListener('click', async () => {
                    const statusArea = modal.querySelector('#modal-status-area');
                    const statusText = modal.querySelector('#modal-status-text');
                    statusArea.classList.remove('hidden');
                    statusText.textContent = `Generating ${count} matters with defaults...`;
                    quickBtn.disabled = true;
                    quickBtn.textContent = 'Generating...';

                    // Disable all modal buttons during generation
                    modal.querySelectorAll('.modal-action-btn').forEach(btn => btn.disabled = true);

                    try {
                        const response = await api.populateSampleData('generate', { count });
                        showToast(`Successfully added ${response.matters_added} sample matters ($${response.total_cost_added.toFixed(2)})`, 'success');
                        // Close modal by clicking the close button
                        modal.querySelector('.modal-close')?.click();
                    } catch (error) {
                        statusArea.classList.add('hidden');
                        quickBtn.disabled = false;
                        quickBtn.textContent = 'Generate Now';
                        modal.querySelectorAll('.modal-action-btn').forEach(btn => btn.disabled = false);
                        showToast(`Error: ${error.message}`, 'error');
                    }
                });

                // Capture form values before any button click closes the modal
                modal.querySelectorAll('.modal-action-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        capturedFormValues = {
                            count: parseInt(modal.querySelector('#modal-count-input')?.value || count),
                            startDate: modal.querySelector('#modal-start-date')?.value,
                            endDate: modal.querySelector('#modal-end-date')?.value,
                            minCost: parseFloat(modal.querySelector('#modal-min-cost')?.value || 100),
                            maxCost: parseFloat(modal.querySelector('#modal-max-cost')?.value || 50000),
                            wholeDollars: modal.querySelector('#modal-whole-dollars')?.checked ?? true,
                            useAi: modal.querySelector('#modal-use-ai')?.checked ?? false
                        };
                    }, { capture: true }); // Use capture to run before the modal's click handler
                });
            }
        });

        // Handle Generate button click
        if (result === 'generate' && capturedFormValues) {
            const { count: modalCount, startDate, endDate, minCost, maxCost, wholeDollars, useAi } = capturedFormValues;

            // Validation
            if (modalCount < 1 || modalCount > 1000) {
                showToast('Count must be between 1 and 1000', 'error');
                return;
            }
            if (minCost < 0 || maxCost < 0) {
                showToast('Cost values must be positive', 'error');
                return;
            }
            if (minCost > maxCost) {
                showToast('Minimum cost cannot exceed maximum cost', 'error');
                return;
            }

            const btn = document.getElementById('populate-sample-btn');
            btn.disabled = true;
            btn.innerHTML = useAi
                ? '<span class="flex items-center justify-center"><span class="spinner-sm mr-2"></span>Generating with AI...</span>'
                : 'Generating...';

            try {
                const response = await api.populateSampleData('generate', {
                    count: modalCount,
                    startDate,
                    endDate,
                    minCostDollars: minCost,
                    maxCostDollars: maxCost,
                    wholeDollarsOnly: wholeDollars,
                    useAiDescriptions: useAi,
                    spiceLevelOverride: useAi ? aiSettings.spiceLevel : undefined
                });

                const aiNote = response.used_ai_descriptions ? ` (AI @ ${getSpiceLevelName(aiSettings.spiceLevel)})` : '';
                showToast(`Successfully added ${response.matters_added} sample matters ($${response.total_cost_added.toFixed(2)})${aiNote}`, 'success');
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Populate Data';
            }
        }
    });

    // Regenerate sample files
    document.getElementById('regenerate-samples-btn')?.addEventListener('click', async () => {
        const confirmed = await showConfirm('This will regenerate all sample JSON files with new random data. The database will not be affected. Continue?', {
            title: 'Regenerate Sample Files',
            confirmText: 'Regenerate',
            cancelText: 'Cancel',
            type: 'info'
        });

        if (!confirmed) {
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

    // Enter key triggers wipe matters button
    document.getElementById('wipe-matters-confirmation')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const btn = document.getElementById('wipe-matters-btn');
            if (!btn.disabled) {
                btn.click();
            }
        }
    });

    // Wipe matters
    document.getElementById('wipe-matters-btn')?.addEventListener('click', async () => {
        const confirmation = document.getElementById('wipe-matters-confirmation').value;

        if (confirmation !== 'WIPE MATTERS') {
            showToast('Please type the confirmation text exactly', 'error');
            return;
        }

        const confirmed = await showConfirm('Are you sure you want to delete all matter records?\n\nThis will remove all matters but keep your admin account and settings.\n\nThis action CANNOT be undone!', {
            title: 'Wipe Matters',
            confirmText: 'Wipe Matters',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) {
            return;
        }

        try {
            const btn = document.getElementById('wipe-matters-btn');
            btn.disabled = true;
            btn.textContent = 'Wiping matters...';

            const response = await api.wipeMatters(confirmation);

            showToast(response.message || `Successfully deleted ${response.matters_deleted} matters. Refreshing...`, 'success');

            // Reload page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 1500);
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

    // Enter key triggers wipe + reset button
    document.getElementById('wipe-matters-settings-confirmation')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const btn = document.getElementById('wipe-matters-settings-btn');
            if (!btn.disabled) {
                btn.click();
            }
        }
    });

    // Wipe matters + settings
    document.getElementById('wipe-matters-settings-btn')?.addEventListener('click', async () => {
        const confirmation = document.getElementById('wipe-matters-settings-confirmation').value;

        if (confirmation !== 'WIPE SETTINGS') {
            showToast('Please type the confirmation text exactly', 'error');
            return;
        }

        const confirmed = await showConfirm('Are you sure you want to delete all matters AND reset all settings?\n\nThis will:\n- Delete all matter records\n- Reset lifetime legal fees to $0\n- Reset drain rate to 0\n- Disable auto-drain\n- Reset drain timer\n- Clear API key\n- Disable authentication requirement\n- Clear IP whitelist\n- Clear Claude API key and AI settings\n\nYour admin account will be preserved.\n\nThis action CANNOT be undone!', {
            title: 'Wipe + Reset',
            confirmText: 'Wipe + Reset',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) {
            return;
        }

        try {
            const btn = document.getElementById('wipe-matters-settings-btn');
            btn.disabled = true;
            btn.textContent = 'Wiping...';

            const response = await api.wipeMattersAndSettings(confirmation);

            showToast(response.message || `Successfully deleted ${response.matters_deleted} matters and reset settings. Refreshing...`, 'success');

            // Reload page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 1500);
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

    // Enter key triggers factory reset button
    document.getElementById('wipe-confirmation')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const btn = document.getElementById('wipe-everything-btn');
            if (!btn.disabled) {
                btn.click();
            }
        }
    });

    // Wipe everything
    document.getElementById('wipe-everything-btn')?.addEventListener('click', async () => {
        const confirmation = document.getElementById('wipe-confirmation').value;

        if (confirmation !== 'WIPE EVERYTHING') {
            showToast('Please type the confirmation text exactly', 'error');
            return;
        }

        const confirmed = await showConfirm('ARE YOU ABSOLUTELY SURE?\n\nThis will WIPE EVERYTHING and reset the database to fresh install state:\n\n- All matter records\n- All settings (reset to defaults)\n- All admin sessions (you will be logged out)\n- ALL admin users (including you!)\n\nYou will be redirected to create a new admin account.\n\nThis action CANNOT be undone!', {
            title: 'Factory Reset',
            confirmText: 'Factory Reset',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) {
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

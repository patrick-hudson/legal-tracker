/**
 * Shared state, constants, and utilities for Data Management pages
 */

import api from '../../api.js';

// Track Claude API state
export const state = {
    hasClaudeApiKey: false,
    isClaudeKeyValidated: false,
    availableModels: [],
    aiSettings: {
        selectedModel: '',
        spiceLevel: '1',
        customPrompt: '',
        // Per-type settings (empty string = use default)
        perType: {
            matters: { spiceLevel: '', customPrompt: '' },
            notes: { spiceLevel: '', customPrompt: '' },
            attachments: { spiceLevel: '', customPrompt: '' },
            auditLog: { spiceLevel: '', customPrompt: '' }
        }
    },
    // Backup & Restore state
    backupStats: null,
    selectedRestoreFile: null,
    restorePreview: null,
    // Storage settings state
    storageSettings: null,
    storageTestPassed: false,
    // Data counts for overview
    dataCounts: null
};

// Base prompt template (spice instructions are added dynamically)
export const BASE_PROMPT = `Generate exactly {count} unique legal matter descriptions for a law firm billing tracker. Each description should be a brief phrase (5-15 words) describing a legal service or matter type.

Include variety: contracts, litigation, IP, employment, regulatory, real estate, corporate, tax matters, etc.`;

// Spice level instructions appended to prompt
export const SPICE_INSTRUCTIONS = {
    '1': 'Use a professional, straightforward tone. Keep descriptions formal and corporate.',
    '2': 'Add subtle, dry humor. Keep it professional but with understated wit.',
    '3': 'Be witty and clever. Use mild wordplay and light sarcasm where appropriate.',
    '4': 'Be dramatic and theatrical. Make descriptions slightly absurd but still believable.',
    '5': 'Go completely unhinged. Be wildly creative, absurd, and maximally entertaining while still being legal-adjacent.',
    '6': 'CHAOTIC EVIL MODE: Maximum depravity. Every description must contain at least one terrible pun, dripping sarcasm, or absurdist legal nightmare. Channel the energy of a sleep-deprived lawyer who has seen too much and fears nothing. Mock the legal system while technically describing billable work. Be viciously funny.',
    '7': 'ELDRITCH LEGAL HORROR: You are a cosmic entity that has consumed 10,000 law firms and absorbed their collective trauma. Generate descriptions that make readers question reality, legality, and their life choices simultaneously. Every phrase should be a war crime against professionalism. Puns are mandatory. Sanity is optional. These descriptions should make opposing counsel weep and judges recuse themselves out of sheer confusion. Go absolutely feral.',
    '8': 'THE FINAL FORM: You have transcended legal reality itself. Combine puns, existential dread, cosmic horror, time paradoxes, and bureaucratic nightmares. Each description should feel like a fever dream about law school that makes Franz Kafka weep with envy. Reference interdimensional disputes, sentient contracts, emotional support evidence, and crimes against grammar. Reality is optional. Sanity is forbidden.'
};

// Get the full default prompt for a given spice level
export function getDefaultPrompt(spiceLevel) {
    const spiceInstruction = SPICE_INSTRUCTIONS[spiceLevel] ?? SPICE_INSTRUCTIONS['1'];
    return `${BASE_PROMPT}

Tone: ${spiceInstruction}

Return ONLY a JSON array of strings, no other text.`;
}

// Spice level name helper
export function getSpiceLevelName(level) {
    const names = {
        '1': 'Professional',
        '2': 'Dry Humor',
        '3': 'Witty',
        '4': 'Dramatic',
        '5': 'Unhinged',
        '6': 'Chaotic Evil',
        '7': 'Eldritch Horror',
        '8': 'THE FINAL FORM'
    };
    return names[level] ?? 'Professional';
}

// Get effective spice level for a type (resolves to default if not set)
export function getEffectiveSpiceLevel(type) {
    const typeSettings = state.aiSettings.perType?.[type];
    const typeSpice = typeSettings?.spiceLevel;
    // Return type-specific if set, otherwise return default
    return typeSpice || state.aiSettings.spiceLevel || '1';
}

// Check if type has a custom (non-default) spice level
export function hasCustomSpiceLevel(type) {
    const typeSettings = state.aiSettings.perType?.[type];
    return !!(typeSettings?.spiceLevel);
}

// Format bytes to human-readable size
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Load initial state from API
export async function loadState() {
    try {
        const settingsResponse = await api.getSettings();
        state.hasClaudeApiKey = settingsResponse.hasClaudeApiKey ?? false;
        state.isClaudeKeyValidated = settingsResponse.isClaudeKeyValidated ?? false;

        // Load AI settings with per-type defaults
        const defaultPerType = {
            matters: { spiceLevel: '', customPrompt: '' },
            notes: { spiceLevel: '', customPrompt: '' },
            attachments: { spiceLevel: '', customPrompt: '' },
            auditLog: { spiceLevel: '', customPrompt: '' }
        };
        state.aiSettings = {
            selectedModel: settingsResponse.aiSettings?.selectedModel ?? '',
            spiceLevel: settingsResponse.aiSettings?.spiceLevel ?? '1',
            customPrompt: settingsResponse.aiSettings?.customPrompt ?? '',
            perType: settingsResponse.aiSettings?.perType ?? defaultPerType
        };

        // If key is validated, try to load models
        if (state.hasClaudeApiKey && state.isClaudeKeyValidated) {
            try {
                const modelsResponse = await api.getClaudeModels();
                state.availableModels = modelsResponse.models ?? [];
            } catch (e) {
                console.warn('Failed to load models:', e);
                state.availableModels = [];
            }
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
        throw error;
    }
}

// Load backup stats
export async function loadBackupStats() {
    try {
        state.backupStats = await api.getBackupStats();
        return state.backupStats;
    } catch (error) {
        console.error('Failed to load backup stats:', error);
        throw error;
    }
}

// Load storage settings
export async function loadStorageSettings() {
    try {
        state.storageSettings = await api.getStorageSettings();
        // Enable save if already configured
        if (state.storageSettings.storage_backend === 'filesystem' || state.storageSettings.has_s3_config) {
            state.storageTestPassed = true;
        }
        return state.storageSettings;
    } catch (error) {
        console.error('Failed to load storage settings:', error);
        throw error;
    }
}

// Toast notification helpers
export function showToast(message, type = 'info') {
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

// Persistent toast that stays until dismissed
let persistentToast = null;

export function showPersistentToast(message, type = 'info') {
    // Remove existing persistent toast if any
    dismissPersistentToast();

    persistentToast = document.createElement('div');
    persistentToast.className = `toast p-4 rounded-lg shadow-lg flex items-center ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'loading' ? 'bg-blue-500' :
        'bg-blue-500'
    } text-white`;

    if (type === 'loading') {
        persistentToast.innerHTML = `<span class="spinner-sm mr-2"></span><span>${message}</span>`;
    } else {
        persistentToast.textContent = message;
    }

    document.body.appendChild(persistentToast);
    return persistentToast;
}

export function dismissPersistentToast() {
    if (persistentToast) {
        persistentToast.style.opacity = '0';
        setTimeout(() => {
            persistentToast?.remove();
            persistentToast = null;
        }, 300);
    }
}

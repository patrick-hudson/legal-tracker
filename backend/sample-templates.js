/**
 * Sample Templates Module
 * Loads and provides access to word banks for sample data generation
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Template directory path
const TEMPLATES_DIR = join(__dirname, 'data', 'sample-templates');

// Cache for loaded templates
let mattersData = null;
let lawyersData = null;
let clientsData = null;
let notesData = null;
let attachmentsData = null;
let auditLogData = null;

/**
 * Load JSON file from templates directory
 */
function loadTemplate(filename) {
    const filepath = join(TEMPLATES_DIR, filename);
    const content = readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
}

/**
 * Get matters template data (lazy load)
 */
export function getMattersTemplates() {
    if (!mattersData) {
        mattersData = loadTemplate('matters.json');
    }
    return mattersData;
}

/**
 * Get lawyers template data (lazy load)
 */
export function getLawyersTemplates() {
    if (!lawyersData) {
        lawyersData = loadTemplate('lawyers.json');
    }
    return lawyersData;
}

/**
 * Get clients template data (lazy load)
 */
export function getClientsTemplates() {
    if (!clientsData) {
        clientsData = loadTemplate('clients.json');
    }
    return clientsData;
}

/**
 * Get notes template data (lazy load)
 */
export function getNotesTemplates() {
    if (!notesData) {
        notesData = loadTemplate('notes.json');
    }
    return notesData;
}

/**
 * Get attachments template data (lazy load)
 */
export function getAttachmentsTemplates() {
    if (!attachmentsData) {
        attachmentsData = loadTemplate('attachments.json');
    }
    return attachmentsData;
}

/**
 * Get audit log template data (lazy load)
 */
export function getAuditLogTemplates() {
    if (!auditLogData) {
        auditLogData = loadTemplate('audit-log.json');
    }
    return auditLogData;
}

// ============================================================================
// Matter Description Generation
// ============================================================================

/**
 * Get a random matter description from the word bank
 */
export function getRandomMatterDescription() {
    const { descriptions } = getMattersTemplates();
    return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * Generate a matter description using templates for more variety
 */
export function generateMatterDescription() {
    const data = getMattersTemplates();

    // 70% chance to use a predefined description, 30% to use template
    if (Math.random() < 0.7) {
        return data.descriptions[Math.floor(Math.random() * data.descriptions.length)];
    }

    // Use template pattern
    const { prefixes, actions, subjects } = data.templates;
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];

    return `${prefix} ${subject} - ${action}`;
}

/**
 * Get multiple unique matter descriptions
 */
export function getMatterDescriptions(count) {
    const { descriptions } = getMattersTemplates();
    const result = [];
    const used = new Set();

    for (let i = 0; i < count; i++) {
        // Try to get unique descriptions, but allow duplicates if we run out
        let description;
        let attempts = 0;

        do {
            description = generateMatterDescription();
            attempts++;
        } while (used.has(description) && attempts < 10);

        used.add(description);
        result.push(description);
    }

    return result;
}

// ============================================================================
// Lawyer/Counsel Generation
// ============================================================================

/**
 * Get a random lawyer from the word bank
 */
export function getRandomLawyer() {
    const { lawyers } = getLawyersTemplates();
    return lawyers[Math.floor(Math.random() * lawyers.length)];
}

/**
 * Get a random opposing counsel from the word bank
 */
export function getRandomOpposingCounsel() {
    const { opposingCounsel } = getLawyersTemplates();
    return opposingCounsel[Math.floor(Math.random() * opposingCounsel.length)];
}

// ============================================================================
// Client Generation
// ============================================================================

/**
 * Get a random client (individual or company)
 */
export function getRandomClient() {
    const { individuals, companies } = getClientsTemplates();

    // 40% chance of individual, 60% chance of company
    if (Math.random() < 0.4) {
        return individuals[Math.floor(Math.random() * individuals.length)];
    }
    return companies[Math.floor(Math.random() * companies.length)];
}

/**
 * Get a random individual client
 */
export function getRandomIndividualClient() {
    const { individuals } = getClientsTemplates();
    return individuals[Math.floor(Math.random() * individuals.length)];
}

/**
 * Get a random company client
 */
export function getRandomCompanyClient() {
    const { companies } = getClientsTemplates();
    return companies[Math.floor(Math.random() * companies.length)];
}

// ============================================================================
// Private Note Generation
// ============================================================================

/**
 * Interaction types available for notes
 */
export const INTERACTION_TYPES = [
    'phone_call',
    'email',
    'meeting',
    'court_appearance',
    'filing',
    'letter_sent',
    'letter_received',
    'note'
];

/**
 * Get a random note by type
 */
export function getRandomNoteByType(type) {
    const { byType } = getNotesTemplates();
    const notes = byType[type] || byType.note;
    return notes[Math.floor(Math.random() * notes.length)];
}

/**
 * Get a random note with its type
 */
export function getRandomNote() {
    const type = INTERACTION_TYPES[Math.floor(Math.random() * INTERACTION_TYPES.length)];
    const content = getRandomNoteByType(type);
    return { content, type };
}

/**
 * Generate multiple notes for a matter
 * @param {number} count - Number of notes to generate
 * @param {string[]} [allowedTypes] - Optional array of allowed interaction types
 */
export function generateNotes(count, allowedTypes = null) {
    const types = allowedTypes || INTERACTION_TYPES;
    const notes = [];

    for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const content = getRandomNoteByType(type);
        notes.push({ content, type });
    }

    return notes;
}

// ============================================================================
// Attachment/Document Generation
// ============================================================================

/**
 * Document types available for generation
 */
export const DOCUMENT_TYPES = [
    'demand_letter',
    'cease_desist',
    'complaint',
    'motion_dismiss',
    'settlement_offer',
    'invoice',
    'retainer_agreement',
    'deposition_summary'
];

/**
 * Get a random document type
 */
export function getRandomDocumentType() {
    return DOCUMENT_TYPES[Math.floor(Math.random() * DOCUMENT_TYPES.length)];
}

/**
 * Get document template by type
 */
export function getDocumentTemplate(docType) {
    const { documentTypes } = getAttachmentsTemplates();
    return documentTypes[docType];
}

/**
 * Generate document content from template
 * @param {string} docType - Document type
 * @param {Object} context - Context for template substitution
 */
export function generateDocumentFromTemplate(docType, context = {}) {
    const template = getDocumentTemplate(docType);
    if (!template) {
        throw new Error(`Unknown document type: ${docType}`);
    }

    // Get random filename from type
    const filenames = template.filenames;
    const filename = filenames[Math.floor(Math.random() * filenames.length)];

    // Fill in template placeholders
    let content = template.template;
    const defaults = {
        caseNumber: `${new Date().getFullYear()}-CV-${String(Math.floor(Math.random() * 90000) + 10000)}`,
        opposingParty: getRandomClient().name,
        ourClient: getRandomClient().name,
        date: new Date().toLocaleDateString(),
        matterDescription: context.matterDescription || 'Legal matter requiring attention',
        amount: (context.amount || (Math.random() * 50000 + 1000)).toFixed(2),
        lawyerName: getRandomLawyer().name,
        firmName: getRandomLawyer().firm,
        witnessName: getRandomIndividualClient().name,
        invoiceNumber: `INV-${Date.now()}`,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        expirationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()
    };

    const values = { ...defaults, ...context };

    for (const [key, value] of Object.entries(values)) {
        content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return {
        filename,
        content,
        docType,
        docName: template.name
    };
}

// ============================================================================
// Audit Log Generation
// ============================================================================

/**
 * Log levels available
 */
export const LOG_LEVELS = ['INFO', 'WARNING', 'ERROR', 'SECURITY', 'DEBUG'];

/**
 * Get distribution weights for log levels
 * INFO: 60%, WARNING: 15%, ERROR: 10%, SECURITY: 10%, DEBUG: 5%
 */
export function getLogLevelDistribution() {
    return {
        INFO: 0.60,
        WARNING: 0.15,
        ERROR: 0.10,
        SECURITY: 0.10,
        DEBUG: 0.05
    };
}

/**
 * Get a random log level based on distribution
 */
export function getRandomLogLevel() {
    const distribution = getLogLevelDistribution();
    const rand = Math.random();
    let cumulative = 0;

    for (const [level, weight] of Object.entries(distribution)) {
        cumulative += weight;
        if (rand < cumulative) {
            return level;
        }
    }

    return 'INFO'; // fallback
}

/**
 * Get a random audit log entry for a given level
 */
export function getRandomAuditEntry(level) {
    const { byLevel } = getAuditLogTemplates();
    const entries = byLevel[level] || byLevel.INFO;
    return entries[Math.floor(Math.random() * entries.length)];
}

/**
 * Get a random username from the word bank
 */
export function getRandomUsername() {
    const { usernames } = getAuditLogTemplates();
    // 80% chance of returning a username, 20% null (system actions)
    if (Math.random() < 0.8) {
        return usernames[Math.floor(Math.random() * usernames.length)];
    }
    return null;
}

/**
 * Get a random IP address from the word bank
 */
export function getRandomIpAddress() {
    const { ipAddresses } = getAuditLogTemplates();
    return ipAddresses[Math.floor(Math.random() * ipAddresses.length)];
}

/**
 * Generate a complete audit log entry
 * @param {Date} timestamp - Optional timestamp for the entry
 */
export function generateAuditLogEntry(timestamp = null) {
    const level = getRandomLogLevel();
    const entry = getRandomAuditEntry(level);

    return {
        level,
        action_type: entry.action_type,
        entity_type: entry.entity_type,
        summary: entry.summary,
        username: getRandomUsername(),
        ip_address: getRandomIpAddress(),
        timestamp: timestamp || new Date(),
        stack_trace: entry.stack_trace || null,
        duration_ms: entry.duration_ms || null
    };
}

/**
 * Generate multiple audit log entries within a date range
 * @param {number} count - Number of entries to generate
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 */
export function generateAuditLogEntries(count, startDate, endDate) {
    const entries = [];
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const rangeMs = endMs - startMs;

    for (let i = 0; i < count; i++) {
        // Generate random timestamp within range, weighted toward business hours
        let timestamp = new Date(startMs + Math.random() * rangeMs);

        // 70% chance to be during business hours (9 AM - 6 PM)
        if (Math.random() < 0.7) {
            const hour = 9 + Math.floor(Math.random() * 9);
            const minute = Math.floor(Math.random() * 60);
            timestamp.setHours(hour, minute);
        }

        entries.push(generateAuditLogEntry(timestamp));
    }

    // Sort by timestamp
    entries.sort((a, b) => a.timestamp - b.timestamp);

    return entries;
}

// ============================================================================
// Case Number Generation
// ============================================================================

const CASE_NUMBER_PREFIXES = ['CV', 'CR', 'FA', 'PR', 'BK', 'AP', 'MC'];

/**
 * Generate a case number
 * @param {number} year - Optional year for the case number
 */
export function generateCaseNumber(year = null) {
    const caseYear = year || new Date().getFullYear();
    const prefix = CASE_NUMBER_PREFIXES[Math.floor(Math.random() * CASE_NUMBER_PREFIXES.length)];
    const number = String(Math.floor(Math.random() * 90000) + 10000);
    return `${caseYear}-${prefix}-${number}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Shuffle an array (Fisher-Yates)
 */
export function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Get random integer in range [min, max] inclusive
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get random date in range
 */
export function randomDate(startDate, endDate) {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    return new Date(startMs + Math.random() * (endMs - startMs));
}

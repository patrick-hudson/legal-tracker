/**
 * Data API Methods
 * Sample data, wipe operations, backup/restore, analytics, audit log
 */

export const dataMethods = {
    // Dashboard
    async getDashboard() {
        return this.request('/dashboard');
    },

    // Analytics
    async getAnalytics(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/analytics${queryString ? '?' + queryString : ''}`);
    },

    // Sample data management
    async listSampleDatasets() {
        return this.request('/data/samples');
    },

    async populateSampleData(source, options = {}) {
        const {
            count,
            startDate,
            endDate,
            minCostDollars,
            maxCostDollars,
            wholeDollarsOnly,
            useAiDescriptions,
            spiceLevelOverride,
            generatePrivateNotes,
            notesPercentage,
            minNotesPerMatter,
            maxNotesPerMatter,
            generateAttachments,
            attachmentsPercentage,
            lawyerPercentage,
            opposingCounselPercentage,
            caseNumberPercentage
        } = options;

        return this.request('/data/populate-sample', {
            method: 'POST',
            body: JSON.stringify({
                source,
                count,
                startDate,
                endDate,
                minCostDollars,
                maxCostDollars,
                wholeDollarsOnly,
                useAiDescriptions,
                spiceLevelOverride,
                generatePrivateNotes,
                notesPercentage,
                minNotesPerMatter,
                maxNotesPerMatter,
                generateAttachments,
                attachmentsPercentage,
                lawyerPercentage,
                opposingCounselPercentage,
                caseNumberPercentage
            })
        });
    },

    async regenerateSampleFiles() {
        return this.request('/data/regenerate-samples', {
            method: 'POST',
            body: JSON.stringify({})
        });
    },

    // Wipe operations
    async wipeMatters(confirmation) {
        return this.request('/data/wipe-matters', {
            method: 'POST',
            body: JSON.stringify({ confirmation })
        });
    },

    async wipeMattersAndSettings(confirmation) {
        return this.request('/data/wipe-matters-and-settings', {
            method: 'POST',
            body: JSON.stringify({ confirmation })
        });
    },

    async wipeAllData(confirmation) {
        return this.request('/data/wipe', {
            method: 'POST',
            body: JSON.stringify({ confirmation })
        });
    },

    async wipeAuditLog(confirmation) {
        return this.request('/data/wipe-audit-log', {
            method: 'POST',
            body: JSON.stringify({ confirmation })
        });
    }
};

export const backupMethods = {
    async getBackupStats() {
        return this.request('/backup/stats');
    },

    async createBackup(options = {}) {
        const { includeAttachments = true, includeAuditLog = false, s3Mode = 'full' } = options;

        const response = await fetch(`${this.baseURL}/backup`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ includeAttachments, includeAuditLog, s3Mode })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        // Return blob for download
        const blob = await response.blob();
        const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'backup.zip';
        return { blob, filename };
    },

    async previewBackup(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseURL}/backup/preview`, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }
        return data;
    },

    async restoreBackup(file, confirmation) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('confirmation', confirmation);

        const response = await fetch(`${this.baseURL}/restore`, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }
        return data;
    }
};

export const auditLogMethods = {
    async getAuditLog(params = {}) {
        // Filter out undefined/null values to avoid sending "undefined" as string
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        );
        const queryString = new URLSearchParams(cleanParams).toString();
        return this.request(`/audit-log${queryString ? `?${queryString}` : ''}`);
    },

    async getAuditLogEntry(id) {
        return this.request(`/audit-log/${id}`);
    },

    async getAuditLogFilters() {
        return this.request('/audit-log/filters');
    },

    async getAuditLogStats() {
        return this.request('/audit-log/stats');
    },

    async exportAuditLog(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        );
        const queryString = new URLSearchParams(cleanParams).toString();
        const response = await fetch(`${this.baseURL}/audit-log/export${queryString ? `?${queryString}` : ''}`, {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        return response.blob();
    },

    async populateAuditLogSampleData(options = {}) {
        const { count, startDate, endDate, useAi, spiceLevelOverride } = options;
        return this.request('/data/populate-audit-log', {
            method: 'POST',
            body: JSON.stringify({ count, startDate, endDate, useAi, spiceLevelOverride })
        });
    }
};

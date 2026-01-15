/**
 * Attachments API Methods
 * File attachment operations
 */

export const attachmentMethods = {
    async getAttachments(matterId) {
        return this.request(`/matters/${matterId}/attachments`);
    },

    async uploadAttachment(matterId, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        if (options.document_date) {
            formData.append('document_date', options.document_date);
        }
        if (options.direction) {
            formData.append('direction', options.direction);
        }

        const url = `${this.baseURL}/matters/${matterId}/attachments`;
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
            // Note: Do NOT set Content-Type header - browser sets it with boundary
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }
        return data;
    },

    async updateAttachment(attachmentId, data) {
        return this.request(`/attachments/${attachmentId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteAttachment(attachmentId) {
        return this.request(`/attachments/${attachmentId}`, {
            method: 'DELETE'
        });
    },

    async downloadAttachment(attachmentId, filename) {
        // Use direct browser navigation for downloads
        // This allows the server to redirect to S3 presigned URLs without CORS issues
        // The browser handles the redirect natively and triggers the download
        const url = `${this.baseURL}/attachments/${attachmentId}/download`;

        // Create a hidden link and click it to trigger download
        // Using window.open or location.href would navigate away from the page
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    async getPresignedUrl(attachmentId, expiresIn = 3600) {
        return this.request(`/attachments/${attachmentId}/presigned-url?expiresIn=${expiresIn}`);
    }
};

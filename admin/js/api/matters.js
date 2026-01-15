/**
 * Matters API Methods
 * Matter CRUD operations
 */

export const matterMethods = {
    async getMatters(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/matters${queryString ? '?' + queryString : ''}`);
    },

    async getMatter(id) {
        return this.request(`/matters/${id}`);
    },

    async createMatter(data) {
        return this.request('/matters', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateMatter(id, data) {
        return this.request(`/matters/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteMatter(id) {
        return this.request(`/matters/${id}`, {
            method: 'DELETE'
        });
    },

    async bulkCreateMatters(matters) {
        return this.request('/matters/bulk', {
            method: 'POST',
            body: JSON.stringify({ matters })
        });
    },

    async bulkUpdateMatters(updates) {
        return this.request('/matters/bulk', {
            method: 'PUT',
            body: JSON.stringify({ updates })
        });
    },

    async deleteMatters(ids) {
        return this.request('/matters/bulk', {
            method: 'DELETE',
            body: JSON.stringify({ ids })
        });
    },

    async getMatterTimeline(matterId, order = 'desc') {
        return this.request(`/matters/${matterId}/timeline?order=${order}`);
    },

    async exportMatters(options = {}) {
        const { ids, includePrivateNotes, format = 'csv' } = options;
        const params = new URLSearchParams();

        if (format) params.set('format', format);
        if (ids && ids.length > 0) params.set('ids', ids.join(','));
        if (includePrivateNotes) params.set('includePrivateNotes', 'true');

        const queryString = params.toString();
        const response = await fetch(`${this.baseURL}/matters/export${queryString ? '?' + queryString : ''}`, {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        return response.blob();
    }
};

/**
 * Notes API Methods
 * Private notes CRUD operations
 */

export const noteMethods = {
    async getPrivateNotes(matterId) {
        return this.request(`/matters/${matterId}/notes`);
    },

    async createPrivateNote(matterId, noteContent, options = {}) {
        return this.request(`/matters/${matterId}/notes`, {
            method: 'POST',
            body: JSON.stringify({
                note_content: noteContent,
                interaction_date: options.interaction_date,
                interaction_type: options.interaction_type
            })
        });
    },

    async updatePrivateNote(noteId, noteContent, options = {}) {
        return this.request(`/notes/${noteId}`, {
            method: 'PUT',
            body: JSON.stringify({
                note_content: noteContent,
                interaction_date: options.interaction_date,
                interaction_type: options.interaction_type
            })
        });
    },

    async deletePrivateNote(noteId) {
        return this.request(`/notes/${noteId}`, {
            method: 'DELETE'
        });
    }
};

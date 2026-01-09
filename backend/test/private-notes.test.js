import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../server.js';
import crypto from 'crypto';
import { hashPassword } from '../auth.js';

describe('Private Notes Tests', () => {
  let server;
  let baseURL;
  let adminCookie;
  let testMatterId;
  const PASSWORD_SALT = 'test-salt-for-testing';

  before(async () => {
    // Set test password salt
    process.env.PASSWORD_SALT = PASSWORD_SALT;

    // Create server with test configuration
    server = await createServer({
      logger: false,
      dbPath: ':memory:',
      requireAuth: false
    });

    const address = await server.listen({ port: 0, host: '127.0.0.1' });
    const port = server.server.address().port;
    baseURL = `http://127.0.0.1:${port}`;

    // Create test admin user
    const username = 'testadmin';
    const password = 'testpass123';
    const message = username + ':' + password + ':' + PASSWORD_SALT;
    const hashedPassword = crypto.createHash('sha256').update(message).digest('hex');
    const passwordHash = await hashPassword(hashedPassword);

    // Manually insert admin user into database
    const { adminUsersDb } = server.db;
    adminUsersDb.create(username, passwordHash, 'test@example.com');

    // Login to get cookie
    const loginResponse = await fetch(`${baseURL}/admin/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, hashedPassword })
    });
    const setCookie = loginResponse.headers.get('set-cookie');
    adminCookie = setCookie.split(';')[0];

    // Create a test matter for note tests
    const matterResponse = await fetch(`${baseURL}/admin/api/matters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({
        matter_date: '2024-12-01T10:00:00.000Z',
        note: 'Test matter for private notes',
        cost: 500.75
      })
    });
    const matterData = await matterResponse.json();
    testMatterId = matterData.matter.id;
  });

  after(async () => {
    await server.close();
  });

  describe('Private Notes CRUD Operations', () => {
    let testNoteId;

    it('should create a private note for a matter', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          note_content: 'This is a private admin note'
        })
      });

      assert.strictEqual(response.status, 201);
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.note);
      assert.strictEqual(data.note.note_content, 'This is a private admin note');
      assert.strictEqual(data.note.matter_id, testMatterId);
      assert.ok(data.note.id);
      testNoteId = data.note.id;
    });

    it('should list private notes for a matter', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/notes`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.ok(Array.isArray(data.notes));
      assert.strictEqual(data.notes.length, 1);
      assert.strictEqual(data.notes[0].note_content, 'This is a private admin note');
    });

    it('should update a private note', async () => {
      const response = await fetch(`${baseURL}/admin/api/notes/${testNoteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          note_content: 'Updated private note content'
        })
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.note.note_content, 'Updated private note content');
    });

    it('should get matter details including private notes', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      // The API returns matter data directly, not wrapped in {matter: ...}
      assert.ok(data.id);
      assert.strictEqual(data.id, testMatterId);
      assert.ok(Array.isArray(data.private_notes));
      assert.strictEqual(data.private_notes.length, 1);
      assert.strictEqual(data.private_notes[0].note_content, 'Updated private note content');
    });

    it('should create multiple notes for same matter', async () => {
      // Create two more notes
      await fetch(`${baseURL}/admin/api/matters/${testMatterId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ note_content: 'Second note' })
      });

      await fetch(`${baseURL}/admin/api/matters/${testMatterId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ note_content: 'Third note' })
      });

      // Verify all notes exist
      const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/notes`, {
        headers: { 'Cookie': adminCookie }
      });

      const data = await response.json();
      assert.strictEqual(data.notes.length, 3);
    });

    it('should delete a private note', async () => {
      const response = await fetch(`${baseURL}/admin/api/notes/${testNoteId}`, {
        method: 'DELETE',
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.success, true);

      // Verify note is deleted
      const listResponse = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/notes`, {
        headers: { 'Cookie': adminCookie }
      });
      const listData = await listResponse.json();
      assert.strictEqual(listData.notes.length, 2);
      assert.ok(!listData.notes.find(n => n.id === testNoteId));
    });
  });

  describe('Private Notes Access Control', () => {
    it('should NOT include private notes in public matter list', async () => {
      const response = await fetch(`${baseURL}/api/matters`);
      assert.strictEqual(response.status, 200);
      const matters = await response.json();

      // Public API should NOT include private_notes field
      for (const matter of matters) {
        assert.strictEqual(matter.private_notes, undefined, 'Public API should not expose private_notes');
      }
    });

    it('should reject creating notes without authentication', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_content: 'Unauthorized note' })
      });

      assert.strictEqual(response.status, 401);
    });

    it('should reject listing notes without authentication', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/notes`);
      assert.strictEqual(response.status, 401);
    });

    it('should reject updating notes without authentication', async () => {
      const response = await fetch(`${baseURL}/admin/api/notes/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_content: 'Unauthorized update' })
      });

      assert.strictEqual(response.status, 401);
    });

    it('should reject deleting notes without authentication', async () => {
      const response = await fetch(`${baseURL}/admin/api/notes/1`, {
        method: 'DELETE'
      });

      assert.strictEqual(response.status, 401);
    });
  });

  describe('Private Notes Error Handling', () => {
    it('should return 404 for notes on non-existent matter', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/99999/notes`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 404);
    });

    it('should return 404 when updating non-existent note', async () => {
      const response = await fetch(`${baseURL}/admin/api/notes/99999`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ note_content: 'Update non-existent' })
      });

      assert.strictEqual(response.status, 404);
    });

    it('should return 404 when deleting non-existent note', async () => {
      const response = await fetch(`${baseURL}/admin/api/notes/99999`, {
        method: 'DELETE',
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 404);
    });

    it('should reject creating note with empty content', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ note_content: '' })
      });

      assert.strictEqual(response.status, 400);
    });

    it('should reject creating note with missing content', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({})
      });

      assert.strictEqual(response.status, 400);
    });
  });

  describe('Private Notes Cascade Delete', () => {
    let cascadeMatterId;
    let cascadeNoteIds = [];

    before(async () => {
      // Create a matter for cascade delete test
      const matterResponse = await fetch(`${baseURL}/admin/api/matters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          matter_date: '2024-12-15T10:00:00.000Z',
          note: 'Matter for cascade delete test',
          cost: 100
        })
      });
      const matterData = await matterResponse.json();
      cascadeMatterId = matterData.matter.id;

      // Add multiple notes to this matter
      for (let i = 0; i < 3; i++) {
        const noteResponse = await fetch(`${baseURL}/admin/api/matters/${cascadeMatterId}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': adminCookie
          },
          body: JSON.stringify({ note_content: `Cascade test note ${i + 1}` })
        });
        const noteData = await noteResponse.json();
        cascadeNoteIds.push(noteData.note.id);
      }
    });

    it('should have created notes for cascade test', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/${cascadeMatterId}/notes`, {
        headers: { 'Cookie': adminCookie }
      });
      const data = await response.json();
      assert.strictEqual(data.notes.length, 3);
    });

    it('should delete all notes when matter is deleted', async () => {
      // Delete the matter
      const deleteResponse = await fetch(`${baseURL}/admin/api/matters/${cascadeMatterId}`, {
        method: 'DELETE',
        headers: { 'Cookie': adminCookie }
      });
      assert.strictEqual(deleteResponse.status, 200);

      // Verify notes are gone (matter no longer exists)
      const notesResponse = await fetch(`${baseURL}/admin/api/matters/${cascadeMatterId}/notes`, {
        headers: { 'Cookie': adminCookie }
      });
      assert.strictEqual(notesResponse.status, 404);
    });
  });

  describe('Sample Data Generation with Notes', () => {
    before(async () => {
      // Wait to avoid rate limits from previous tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should generate sample data with private notes', async () => {
      const response = await fetch(`${baseURL}/admin/api/data/populate-sample`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          source: 'generate',
          count: 10,
          generatePrivateNotes: true,
          notesPercentage: 100, // 100% ensures all matters get notes
          minNotesPerMatter: 1,
          maxNotesPerMatter: 3
        })
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.matters_added, 10);
      assert.ok(data.private_notes_generated !== undefined, 'Response should include private_notes_generated count');
      assert.ok(data.private_notes_generated > 0, 'Should have generated some notes');
    });

    it('should not generate notes when generatePrivateNotes is false', async () => {
      const response = await fetch(`${baseURL}/admin/api/data/populate-sample`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          source: 'generate',
          count: 5,
          generatePrivateNotes: false
        })
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.matters_added, 5);
      // private_notes_generated should be 0 when not generating notes
      assert.strictEqual(data.private_notes_generated, 0);
    });
  });

  describe('CSV Export with Selection and Private Notes', () => {
    let exportMatterIds = [];

    before(async () => {
      // Create several matters for export tests
      for (let i = 0; i < 5; i++) {
        const response = await fetch(`${baseURL}/admin/api/matters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': adminCookie
          },
          body: JSON.stringify({
            matter_date: `2024-11-${10 + i}T10:00:00.000Z`,
            note: `Export test matter ${i}`,
            cost: 100 + (i * 10)
          })
        });
        const data = await response.json();
        exportMatterIds.push(data.matter.id);
      }

      // Add private notes to first 3 matters
      for (let i = 0; i < 3; i++) {
        await fetch(`${baseURL}/admin/api/matters/${exportMatterIds[i]}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': adminCookie
          },
          body: JSON.stringify({ note_content: `Private note for matter ${i}` })
        });
      }
    });

    it('should export all matters when no IDs specified', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/export`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.headers.get('content-type'), 'text/csv');

      const csv = await response.text();
      const lines = csv.trim().split('\n');

      // Should have header + at least 5 data rows (our test matters)
      assert.ok(lines.length >= 6, `Expected at least 6 lines (header + 5 matters), got ${lines.length}`);

      // Header should not include private_notes
      assert.strictEqual(lines[0], 'id,matter_date,note,days_since,cost,created_at');
    });

    it('should export only selected matters when IDs specified', async () => {
      const selectedIds = [exportMatterIds[0], exportMatterIds[2]];
      const response = await fetch(`${baseURL}/admin/api/matters/export?ids=${selectedIds.join(',')}`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const csv = await response.text();
      const lines = csv.trim().split('\n');

      // Should have header + 2 data rows
      assert.strictEqual(lines.length, 3, `Expected 3 lines (header + 2 matters), got ${lines.length}`);

      // Verify the exported IDs match
      const exportedIds = lines.slice(1).map(line => parseInt(line.split(',')[0]));
      assert.deepStrictEqual(exportedIds.sort(), selectedIds.sort());
    });

    it('should include private notes column when includePrivateNotes=true', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/export?ids=${exportMatterIds[0]}&includePrivateNotes=true`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const csv = await response.text();
      const lines = csv.trim().split('\n');

      // Header should include private_notes
      assert.ok(lines[0].includes('private_notes'), 'Header should include private_notes column');
      assert.strictEqual(lines[0], 'id,matter_date,note,days_since,cost,created_at,private_notes');

      // Data row should contain the private note
      assert.ok(lines[1].includes('Private note for matter 0'), 'CSV should contain the private note content');
    });

    it('should not include private notes column when includePrivateNotes=false or not specified', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/export?ids=${exportMatterIds[0]}`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const csv = await response.text();
      const lines = csv.trim().split('\n');

      // Header should NOT include private_notes
      assert.ok(!lines[0].includes('private_notes'), 'Header should not include private_notes column');
    });

    it('should handle matters with no private notes in export', async () => {
      // Export matter index 4 which has no private notes
      const response = await fetch(`${baseURL}/admin/api/matters/export?ids=${exportMatterIds[4]}&includePrivateNotes=true`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const csv = await response.text();
      const lines = csv.trim().split('\n');

      // Should still have the column, but empty
      assert.ok(lines[0].includes('private_notes'));
      // Last field should be empty (just quotes)
      assert.ok(lines[1].endsWith('""'), 'Private notes field should be empty for matter without notes');
    });

    it('should concatenate multiple notes for a matter with pipe separator', async () => {
      // Add a second note to the first matter
      await fetch(`${baseURL}/admin/api/matters/${exportMatterIds[0]}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ note_content: 'Second private note' })
      });

      const response = await fetch(`${baseURL}/admin/api/matters/export?ids=${exportMatterIds[0]}&includePrivateNotes=true`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const csv = await response.text();

      // Should contain both notes separated by |
      assert.ok(csv.includes('Private note for matter 0'), 'Should include first note');
      assert.ok(csv.includes('Second private note'), 'Should include second note');
      assert.ok(csv.includes(' | '), 'Notes should be separated by pipe');
    });

    it('should export all matters when empty ids parameter is provided', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/export?ids=`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const csv = await response.text();
      const lines = csv.trim().split('\n');

      // Should export all matters (at least the 5 we created)
      assert.ok(lines.length >= 6, 'Should export all matters when ids is empty');
    });

    it('should handle invalid ids gracefully', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/export?ids=invalid,abc,999999`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const csv = await response.text();
      const lines = csv.trim().split('\n');

      // Should only have header row since no valid/existing IDs
      // (999999 is valid integer but doesn't exist, invalid and abc are filtered out)
      assert.ok(lines.length >= 1, 'Should have at least header');
    });

    it('should export as JSON when format=json', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/export?format=json`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      assert.ok(response.headers.get('content-type').includes('application/json'), 'Content-Type should be application/json');

      const data = await response.json();
      assert.ok(Array.isArray(data), 'JSON export should be an array');
      assert.ok(data.length >= 5, 'Should have at least 5 matters');

      // Check structure of first matter
      const matter = data[0];
      assert.ok(matter.id !== undefined, 'Matter should have id');
      assert.ok(matter.matter_date !== undefined, 'Matter should have matter_date');
      assert.ok(matter.note !== undefined, 'Matter should have note');
      assert.ok(matter.cost !== undefined, 'Matter should have cost');
      assert.ok(matter.created_at !== undefined, 'Matter should have created_at');
      // Should NOT have private_notes unless requested
      assert.strictEqual(matter.private_notes, undefined, 'Should not include private_notes by default');
    });

    it('should export JSON with private notes when includePrivateNotes=true', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/export?format=json&ids=${exportMatterIds[0]}&includePrivateNotes=true`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();

      assert.strictEqual(data.length, 1, 'Should export only 1 matter');
      const matter = data[0];

      // Should have private_notes as an array
      assert.ok(Array.isArray(matter.private_notes), 'private_notes should be an array');
      assert.ok(matter.private_notes.length >= 1, 'Should have at least 1 private note');

      // Check structure of private note
      const note = matter.private_notes[0];
      assert.ok(note.id !== undefined, 'Note should have id');
      assert.ok(note.note_content !== undefined, 'Note should have note_content');
      assert.ok(note.created_at !== undefined, 'Note should have created_at');
    });

    it('should export selected matters as JSON', async () => {
      const selectedIds = [exportMatterIds[1], exportMatterIds[3]];
      const response = await fetch(`${baseURL}/admin/api/matters/export?format=json&ids=${selectedIds.join(',')}`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();

      assert.strictEqual(data.length, 2, 'Should export only 2 matters');
      const exportedIds = data.map(m => m.id).sort();
      assert.deepStrictEqual(exportedIds, selectedIds.sort(), 'Should match selected IDs');
    });
  });

  describe('Wipe Operations Include Notes', () => {
    let wipeMatterId;

    before(async () => {
      // Create a matter with notes for wipe test
      const matterResponse = await fetch(`${baseURL}/admin/api/matters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          matter_date: '2024-12-20T10:00:00.000Z',
          note: 'Matter for wipe test',
          cost: 200
        })
      });
      const matterData = await matterResponse.json();
      wipeMatterId = matterData.matter.id;

      // Add a note
      await fetch(`${baseURL}/admin/api/matters/${wipeMatterId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ note_content: 'Note to be wiped' })
      });
    });

    it('should wipe matters and their notes', async () => {
      // Verify note exists first
      const notesBefore = await fetch(`${baseURL}/admin/api/matters/${wipeMatterId}/notes`, {
        headers: { 'Cookie': adminCookie }
      });
      const beforeData = await notesBefore.json();
      assert.strictEqual(beforeData.notes.length, 1);

      // Wipe matters
      const wipeResponse = await fetch(`${baseURL}/admin/api/data/wipe-matters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ confirmation: 'WIPE MATTERS' })
      });
      assert.strictEqual(wipeResponse.status, 200);
      const wipeData = await wipeResponse.json();
      assert.ok(wipeData.matters_deleted > 0);

      // Verify all matters and notes are gone
      const mattersAfter = await fetch(`${baseURL}/admin/api/matters`, {
        headers: { 'Cookie': adminCookie }
      });
      const mattersData = await mattersAfter.json();
      assert.strictEqual(mattersData.total, 0);
    });
  });
});

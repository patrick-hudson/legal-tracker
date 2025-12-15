import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../server.js';
import crypto from 'crypto';
import { hashPassword } from '../auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test Validation Report Generator
 *
 * This test suite generates a detailed JSON report showing:
 * - Actual API requests sent
 * - Actual responses received
 * - Validation assertions performed
 * - Pass/fail status with evidence
 *
 * Output: test-validation-report.json (log-ingest ready)
 */

const validationLog = [];

function logValidation(test) {
  validationLog.push({
    timestamp: new Date().toISOString(),
    test_name: test.name,
    test_suite: test.suite,
    request: test.request,
    response: test.response,
    database_state: test.database_state || null,
    operations: test.operations || null,
    test_cases: test.test_cases || null,
    assertions: test.assertions,
    assertion_summary: {
      total: test.assertions ? test.assertions.length : 0,
      passed: test.assertions ? test.assertions.filter(a => a.passed).length : 0,
      failed: test.assertions ? test.assertions.filter(a => a.passed === false).length : 0
    },
    status: test.status,
    duration_ms: test.duration_ms,
    execution_details: test.execution_details || null
  });
}

describe('Validation Report Generator', () => {
  let server;
  let baseURL;
  let adminCookie;
  const PASSWORD_SALT = 'test-validation-salt';
  const startTime = Date.now();

  beforeEach(async () => {
    process.env.PASSWORD_SALT = PASSWORD_SALT;

    server = await createServer({
      logger: false,
      dbPath: ':memory:',
      requireAuth: false
    });

    const address = await server.listen({ port: 0, host: '127.0.0.1' });
    const port = server.server.address().port;
    baseURL = `http://127.0.0.1:${port}`;

    // Create admin user
    const username = 'admin';
    const password = 'admin12345';
    const message = username + ':' + password + ':' + PASSWORD_SALT;
    const hashedPassword = crypto.createHash('sha256').update(message).digest('hex');
    const passwordHash = await hashPassword(hashedPassword);
    server.db.adminUsersDb.create(username, passwordHash, 'admin@test.com');

    // Login
    const loginResponse = await fetch(`${baseURL}/admin/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, hashedPassword })
    });
    const setCookie = loginResponse.headers.get('set-cookie');
    adminCookie = setCookie ? setCookie.split(';')[0] : null;
  });

  afterEach(async () => {
    await server.close();
  });

  it('[VALIDATION] Create matter with $200.50 and verify exact storage', async () => {
    const testStart = Date.now();
    const executionSteps = [];

    const testData = {
      suite: 'Dollar Precision Validation',
      name: 'Decimal cents preservation ($200.50)',
      request: {
        method: 'POST',
        url: '/api/matters',
        headers: { 'Content-Type': 'application/json' },
        body: {
          matter_date: '2024-06-15T14:30:00.000Z',
          note: 'Test matter for $200.50',
          cost: 200.50
        },
        body_raw_json: JSON.stringify({
          matter_date: '2024-06-15T14:30:00.000Z',
          note: 'Test matter for $200.50',
          cost: 200.50
        }, null, 2)
      },
      response: null,
      assertions: [],
      execution_details: executionSteps
    };

    // Step 1: Get initial database state
    executionSteps.push({
      step: 1,
      action: 'GET_INITIAL_STATE',
      timestamp: new Date().toISOString(),
      description: 'Fetch initial status before creating matter'
    });
    const initialStatusRes = await fetch(`${baseURL}/api/status`);
    const initialStatus = await initialStatusRes.json();
    executionSteps[0].result = {
      lifetime_spent: initialStatus.lifetime_spent,
      total_matters: initialStatus.stats.total_matters,
      days_since: initialStatus.days_since
    };

    // Step 2: Make create request
    const createStart = Date.now();
    executionSteps.push({
      step: 2,
      action: 'POST_CREATE_MATTER',
      timestamp: new Date().toISOString(),
      description: 'Create matter via POST /api/matters',
      request_url: `${baseURL}/api/matters`,
      request_headers: { 'Content-Type': 'application/json' },
      request_body: testData.request.body
    });

    const createRes = await fetch(`${baseURL}/api/matters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData.request.body)
    });

    const createDuration = Date.now() - createStart;
    testData.response = {
      status: createRes.status,
      status_text: createRes.statusText,
      headers: {
        'content-type': createRes.headers.get('content-type')
      },
      body: await createRes.json(),
      duration_ms: createDuration
    };
    executionSteps[1].result = {
      status: testData.response.status,
      duration_ms: createDuration,
      response_body: testData.response.body
    };

    // Assertion 1: Status code
    testData.assertions.push({
      type: 'status_code',
      description: 'HTTP status should be 201 Created',
      expected: 201,
      actual: testData.response.status,
      passed: testData.response.status === 201,
      severity: 'critical'
    });

    // Step 3: Retrieve created matter from database
    const retrieveStart = Date.now();
    executionSteps.push({
      step: 3,
      action: 'GET_VERIFY_MATTER',
      timestamp: new Date().toISOString(),
      description: 'Retrieve matter from database to verify storage',
      request_url: `${baseURL}/api/matters`
    });

    const listRes = await fetch(`${baseURL}/api/matters`);
    const matters = await listRes.json();
    const created = matters.find(i => i.id === testData.response.body.id);

    const retrieveDuration = Date.now() - retrieveStart;
    testData.response.retrieved = {
      status: listRes.status,
      body: created,
      duration_ms: retrieveDuration,
      total_matters_returned: matters.length
    };
    executionSteps[2].result = {
      status: listRes.status,
      duration_ms: retrieveDuration,
      total_matters: matters.length,
      found_matter: created,
      cost_in_db: created?.cost,
      cost_type: typeof created?.cost
    };

    // Step 4: Get final database state
    executionSteps.push({
      step: 4,
      action: 'GET_FINAL_STATE',
      timestamp: new Date().toISOString(),
      description: 'Fetch final status after creating matter'
    });
    const finalStatusRes = await fetch(`${baseURL}/api/status`);
    const finalStatus = await finalStatusRes.json();
    executionSteps[3].result = {
      lifetime_spent: finalStatus.lifetime_spent,
      total_matters: finalStatus.stats.total_matters,
      days_since: finalStatus.days_since
    };

    testData.database_state = {
      before: executionSteps[0].result,
      after: executionSteps[3].result,
      changes: {
        lifetime_spent_delta: finalStatus.lifetime_spent - initialStatus.lifetime_spent,
        total_matters_delta: finalStatus.stats.total_matters - initialStatus.stats.total_matters,
        days_since_reset: initialStatus.days_since !== 0 && finalStatus.days_since === 0
      }
    };

    // Assertion 2: Cost precision
    const inputCost = testData.request.body.cost;
    const storedCost = created.cost;
    const centsStored = Math.round(storedCost * 100);
    const centsExpected = Math.round(inputCost * 100);

    testData.assertions.push({
      type: 'cost_precision',
      description: 'Cost should be exactly $200.50 with proper decimal precision',
      input_value: inputCost,
      input_cents: centsExpected,
      expected: 200.50,
      actual: storedCost,
      actual_cents: centsStored,
      precision_check: {
        stored_as_string: String(storedCost),
        has_decimal: String(storedCost).includes('.'),
        decimal_places: String(storedCost).split('.')[1]?.length || 0
      },
      passed: storedCost === 200.50,
      severity: 'critical'
    });

    // Assertion 3: Note preserved
    testData.assertions.push({
      type: 'data_integrity',
      field: 'note',
      description: 'Note field should be preserved exactly as sent',
      expected: testData.request.body.note,
      actual: created.note,
      character_count_expected: testData.request.body.note.length,
      character_count_actual: created.note.length,
      passed: created.note === testData.request.body.note,
      severity: 'high'
    });

    // Assertion 4: Date preserved
    testData.assertions.push({
      type: 'data_integrity',
      field: 'matter_date',
      description: 'Matter date should be preserved',
      expected: testData.request.body.matter_date,
      actual: created.matter_date,
      passed: created.matter_date === testData.request.body.matter_date,
      severity: 'high'
    });

    // Assertion 5: Lifetime spent updated correctly
    testData.assertions.push({
      type: 'financial_calculation',
      description: 'Lifetime spent should increase by exact cost amount',
      initial_lifetime_spent: initialStatus.lifetime_spent,
      cost_added: inputCost,
      expected_new_total: initialStatus.lifetime_spent + inputCost,
      actual_new_total: finalStatus.lifetime_spent,
      difference: Math.abs(finalStatus.lifetime_spent - (initialStatus.lifetime_spent + inputCost)),
      tolerance: 0.01,
      passed: Math.abs(finalStatus.lifetime_spent - (initialStatus.lifetime_spent + inputCost)) < 0.01,
      severity: 'critical'
    });

    testData.status = testData.assertions.every(a => a.passed) ? 'PASS' : 'FAIL';
    testData.duration_ms = Date.now() - testStart;

    logValidation(testData);

    // Actual assertions for test framework
    assert.strictEqual(testData.response.status, 201);
    assert.strictEqual(created.cost, 200.50);
    assert.strictEqual(created.note, testData.request.body.note);
  });

  it('[VALIDATION] Bulk create 10 matters and verify all stored correctly', async () => {
    const testStart = Date.now();
    const executionSteps = [];

    const inputMatters = Array.from({ length: 10 }, (_, i) => ({
      matter_date: new Date(2024, 5, i + 1, 10, 0, 0).toISOString(),
      note: `Bulk test ${i + 1}`,
      cost: parseFloat((100 + i * 50.25).toFixed(2))
    }));

    const testData = {
      suite: 'Bulk Operations Validation',
      name: 'Bulk create 10 matters',
      request: {
        method: 'POST',
        url: '/admin/api/matters/bulk',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': '[REDACTED]'
        },
        body: { matters: inputMatters },
        matter_count: inputMatters.length,
        total_cost_sum: inputMatters.reduce((sum, inc) => sum + inc.cost, 0),
        cost_breakdown: inputMatters.map((inc, i) => ({
          index: i,
          note: inc.note,
          cost: inc.cost,
          cost_cents: Math.round(inc.cost * 100)
        }))
      },
      response: null,
      assertions: [],
      execution_details: executionSteps
    };

    // Step 1: Get initial state
    executionSteps.push({
      step: 1,
      action: 'GET_INITIAL_STATE',
      timestamp: new Date().toISOString(),
      description: 'Fetch database state before bulk operation'
    });
    const initialStatusRes = await fetch(`${baseURL}/api/status`);
    const initialStatus = await initialStatusRes.json();
    executionSteps[0].result = {
      lifetime_spent: initialStatus.lifetime_spent,
      total_matters: initialStatus.stats.total_matters
    };

    // Step 2: Make bulk request
    const bulkStart = Date.now();
    executionSteps.push({
      step: 2,
      action: 'POST_BULK_CREATE',
      timestamp: new Date().toISOString(),
      description: 'Bulk create 10 matters via admin API',
      request_url: `${baseURL}/admin/api/matters/bulk`,
      matters_sent: inputMatters.length
    });

    const bulkRes = await fetch(`${baseURL}/admin/api/matters/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({ matters: inputMatters })
    });

    const bulkDuration = Date.now() - bulkStart;
    testData.response = {
      status: bulkRes.status,
      status_text: bulkRes.statusText,
      headers: {
        'content-type': bulkRes.headers.get('content-type')
      },
      body: await bulkRes.json(),
      duration_ms: bulkDuration
    };
    executionSteps[1].result = {
      status: testData.response.status,
      duration_ms: bulkDuration,
      created_count: testData.response.body.created,
      error_count: testData.response.body.errors?.length || 0,
      results: testData.response.body.results
    };

    // Assertion 1: All created
    testData.assertions.push({
      type: 'bulk_creation_count',
      description: 'All 10 matters should be created successfully',
      expected: 10,
      actual: testData.response.body.created,
      passed: testData.response.body.created === 10,
      severity: 'critical'
    });

    // Assertion 2: No errors
    testData.assertions.push({
      type: 'bulk_errors',
      description: 'Bulk operation should complete without errors',
      expected: 0,
      actual: testData.response.body.errors.length,
      error_details: testData.response.body.errors,
      passed: testData.response.body.errors.length === 0,
      severity: 'critical'
    });

    // Step 3: Retrieve and verify each matter
    const retrieveStart = Date.now();
    executionSteps.push({
      step: 3,
      action: 'GET_VERIFY_ALL_MATTERS',
      timestamp: new Date().toISOString(),
      description: 'Retrieve all matters to verify bulk creation'
    });

    const listRes = await fetch(`${baseURL}/api/matters`);
    const allMatters = await listRes.json();
    const retrieveDuration = Date.now() - retrieveStart;

    testData.response.retrieved = {
      status: listRes.status,
      count: allMatters.length,
      matters: allMatters,
      duration_ms: retrieveDuration
    };
    executionSteps[2].result = {
      status: listRes.status,
      duration_ms: retrieveDuration,
      total_matters_in_db: allMatters.length
    };

    // Step 4: Get final state
    executionSteps.push({
      step: 4,
      action: 'GET_FINAL_STATE',
      timestamp: new Date().toISOString(),
      description: 'Fetch database state after bulk operation'
    });
    const finalStatusRes = await fetch(`${baseURL}/api/status`);
    const finalStatus = await finalStatusRes.json();
    executionSteps[3].result = {
      lifetime_spent: finalStatus.lifetime_spent,
      total_matters: finalStatus.stats.total_matters
    };

    testData.database_state = {
      before: executionSteps[0].result,
      after: executionSteps[3].result,
      changes: {
        lifetime_spent_delta: finalStatus.lifetime_spent - initialStatus.lifetime_spent,
        total_matters_delta: finalStatus.stats.total_matters - initialStatus.stats.total_matters,
        expected_cost_increase: testData.request.total_cost_sum,
        actual_cost_increase: finalStatus.lifetime_spent - initialStatus.lifetime_spent,
        cost_delta_matches: Math.abs((finalStatus.lifetime_spent - initialStatus.lifetime_spent) - testData.request.total_cost_sum) < 0.01
      }
    };

    // Assertion 3: Verify each matter's cost individually
    const costValidations = inputMatters.map((input, idx) => {
      const stored = allMatters.find(inc => inc.note === input.note);
      const inputCents = Math.round(input.cost * 100);
      const storedCents = stored ? Math.round(stored.cost * 100) : null;

      return {
        index: idx,
        note: input.note,
        input_cost: input.cost,
        input_cents: inputCents,
        stored_cost: stored?.cost,
        stored_cents: storedCents,
        stored_id: stored?.id,
        match: stored?.cost === input.cost,
        cents_match: storedCents === inputCents,
        found_in_db: !!stored
      };
    });

    testData.assertions.push({
      type: 'individual_cost_validation',
      description: 'Each matter cost should match input exactly',
      validations: costValidations,
      total_verified: costValidations.length,
      all_matched: costValidations.every(v => v.match),
      passed: costValidations.every(v => v.match),
      severity: 'critical'
    });

    // Assertion 4: Lifetime spent calculation
    testData.assertions.push({
      type: 'financial_calculation',
      description: 'Lifetime spent should increase by sum of all matter costs',
      initial_lifetime_spent: initialStatus.lifetime_spent,
      total_costs_added: testData.request.total_cost_sum,
      expected_new_total: initialStatus.lifetime_spent + testData.request.total_cost_sum,
      actual_new_total: finalStatus.lifetime_spent,
      difference: Math.abs((finalStatus.lifetime_spent - initialStatus.lifetime_spent) - testData.request.total_cost_sum),
      tolerance: 0.01,
      passed: Math.abs((finalStatus.lifetime_spent - initialStatus.lifetime_spent) - testData.request.total_cost_sum) < 0.01,
      severity: 'critical'
    });

    testData.status = testData.assertions.every(a => a.passed) ? 'PASS' : 'FAIL';
    testData.duration_ms = Date.now() - testStart;

    logValidation(testData);

    // Actual assertions
    assert.strictEqual(testData.response.body.created, 10);
    assert.ok(costValidations.every(v => v.match));
  });

  it('[VALIDATION] Rounding edge cases - verify database storage', async () => {
    const testStart = Date.now();
    const testCases = [
      { input: 100.125, expected: 100.13, description: 'Three decimals round up' },
      { input: 100.124, expected: 100.12, description: 'Three decimals round down' },
      { input: 0.004, expected: 0.00, description: 'Near-zero rounds to 0' },
      { input: 0.005, expected: 0.01, description: 'Half-cent rounds up' },
      { input: 99.999, expected: 100.00, description: 'Many nines round to 100' }
    ];

    const testData = {
      suite: 'Rounding Validation',
      name: 'Edge case rounding verification',
      test_cases: [],
      assertions: []
    };

    for (const { input, expected, description } of testCases) {
      const caseStart = Date.now();

      // Create matter
      const createRes = await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: `Rounding test: ${description}`,
          cost: input
        })
      });

      const createData = await createRes.json();

      // Retrieve
      const listRes = await fetch(`${baseURL}/api/matters`);
      const matters = await listRes.json();
      const stored = matters.find(i => i.id === createData.id);

      // Calculate what should be in database (cents)
      const expectedCents = Math.round(input * 100);
      const expectedDollars = expectedCents / 100;

      const caseResult = {
        description,
        input_dollars: input,
        expected_cents: expectedCents,
        expected_dollars: expectedDollars,
        actual_dollars: stored.cost,
        passed: stored.cost === expectedDollars,
        duration_ms: Date.now() - caseStart
      };

      testData.test_cases.push(caseResult);

      testData.assertions.push({
        type: 'rounding_validation',
        description,
        input: input,
        expected: expectedDollars,
        actual: stored.cost,
        passed: stored.cost === expectedDollars
      });
    }

    testData.status = testData.assertions.every(a => a.passed) ? 'PASS' : 'FAIL';
    testData.duration_ms = Date.now() - testStart;

    logValidation(testData);

    // Actual assertions
    assert.ok(testData.assertions.every(a => a.passed));
  });

  it('[VALIDATION] lifetime_spent calculation across operations', async () => {
    const testStart = Date.now();
    const operations = [];
    const executionSteps = [];

    const testData = {
      suite: 'Data Consistency Validation',
      name: 'lifetime_spent calculation accuracy',
      request: {
        method: 'SEQUENTIAL_OPERATIONS',
        description: 'Create 3 matters and verify lifetime_spent updates incrementally'
      },
      response: null,
      assertions: [],
      execution_details: executionSteps
    };

    // Step 1: Get initial state
    executionSteps.push({
      step: 1,
      action: 'GET_INITIAL_STATE',
      timestamp: new Date().toISOString(),
      description: 'Fetch initial lifetime_spent before adding matters'
    });
    let statusRes = await fetch(`${baseURL}/api/status`);
    let status = await statusRes.json();
    executionSteps[0].result = {
      lifetime_spent: status.lifetime_spent,
      total_matters: status.stats.total_matters
    };

    operations.push({
      step: 'initial_state',
      lifetime_spent: status.lifetime_spent,
      matter_count: status.stats.total_matters
    });

    // Add 3 matters with known costs
    const costs = [100.50, 250.75, 49.99];
    const expectedTotal = costs.reduce((sum, c) => sum + c, 0);

    for (let i = 0; i < costs.length; i++) {
      // Create matter
      const createStart = Date.now();
      executionSteps.push({
        step: executionSteps.length + 1,
        action: `POST_MATTER_${i + 1}`,
        timestamp: new Date().toISOString(),
        description: `Create matter ${i + 1} with cost $${costs[i]}`,
        cost_added: costs[i]
      });

      await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: `Cost test ${i}`, cost: costs[i] })
      });

      // Verify state
      statusRes = await fetch(`${baseURL}/api/status`);
      status = await statusRes.json();
      const createDuration = Date.now() - createStart;

      const prevOperation = operations[operations.length - 1];
      const prevLifetimeSpent = prevOperation.lifetime_spent !== undefined
        ? prevOperation.lifetime_spent
        : prevOperation.actual_total;
      const expectedNewTotal = prevLifetimeSpent + costs[i];
      const actualNewTotal = status.lifetime_spent;
      const match = Math.abs(actualNewTotal - expectedNewTotal) < 0.01;

      executionSteps[executionSteps.length - 1].result = {
        status: 200,
        duration_ms: createDuration,
        previous_lifetime_spent: prevLifetimeSpent,
        cost_added: costs[i],
        expected_new_total: expectedNewTotal,
        actual_new_total: actualNewTotal,
        difference: Math.abs(actualNewTotal - expectedNewTotal),
        match
      };

      operations.push({
        step: `add_matter_${i + 1}`,
        cost_added: costs[i],
        expected_total: expectedNewTotal,
        actual_total: actualNewTotal,
        match
      });

      // Add assertion for each step
      testData.assertions.push({
        type: 'incremental_lifetime_spent',
        description: `Lifetime spent should increase by $${costs[i]} after matter ${i + 1}`,
        step: i + 1,
        previous_total: prevLifetimeSpent,
        cost_added: costs[i],
        expected_new_total: expectedNewTotal,
        actual_new_total: actualNewTotal,
        difference: Math.abs(actualNewTotal - expectedNewTotal),
        tolerance: 0.01,
        passed: match,
        severity: 'critical'
      });
    }

    // Final validation
    const finalLifetimeSpent = status.lifetime_spent;
    const initialLifetimeSpent = operations[0].lifetime_spent;

    testData.assertions.push({
      type: 'total_lifetime_spent',
      description: 'Final lifetime_spent should equal initial + sum of all costs',
      initial_lifetime_spent: initialLifetimeSpent,
      costs_added: costs,
      sum_of_costs: expectedTotal,
      expected_final_total: initialLifetimeSpent + expectedTotal,
      actual_final_total: finalLifetimeSpent,
      difference: Math.abs(finalLifetimeSpent - (initialLifetimeSpent + expectedTotal)),
      tolerance: 0.01,
      passed: Math.abs(finalLifetimeSpent - (initialLifetimeSpent + expectedTotal)) < 0.01,
      severity: 'critical'
    });

    testData.operations = operations;
    testData.database_state = {
      before: executionSteps[0].result,
      after: {
        lifetime_spent: finalLifetimeSpent,
        total_matters: status.stats.total_matters
      },
      changes: {
        lifetime_spent_delta: finalLifetimeSpent - initialLifetimeSpent,
        total_matters_delta: status.stats.total_matters - operations[0].matter_count,
        expected_lifetime_spent_increase: expectedTotal,
        actual_lifetime_spent_increase: finalLifetimeSpent - initialLifetimeSpent
      }
    };

    testData.status = testData.assertions.every(a => a.passed) ? 'PASS' : 'FAIL';
    testData.duration_ms = Date.now() - testStart;

    logValidation(testData);

    // Actual assertions
    assert.ok(testData.assertions.every(a => a.passed));
  });

  it('[VALIDATION] Pagination - verify no data loss or duplication', async () => {
    const testStart = Date.now();

    // Create 25 matters
    const matters = Array.from({ length: 25 }, (_, i) => ({
      matter_date: new Date(2024, 0, i + 1).toISOString(),
      note: `Pagination test ${String(i + 1).padStart(3, '0')}`,
      cost: (i + 1) * 10
    }));

    await fetch(`${baseURL}/admin/api/matters/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({ matters })
    });

    // Fetch page 1
    const page1Res = await fetch(`${baseURL}/admin/api/matters?page=1&limit=10`, {
      headers: { 'Cookie': adminCookie }
    });
    const page1Data = await page1Res.json();

    // Fetch page 2
    const page2Res = await fetch(`${baseURL}/admin/api/matters?page=2&limit=10`, {
      headers: { 'Cookie': adminCookie }
    });
    const page2Data = await page2Res.json();

    // Fetch page 3
    const page3Res = await fetch(`${baseURL}/admin/api/matters?page=3&limit=10`, {
      headers: { 'Cookie': adminCookie }
    });
    const page3Data = await page3Res.json();

    const allPagedMatters = [
      ...page1Data.matters,
      ...page2Data.matters,
      ...page3Data.matters
    ];

    const allPagedIds = allPagedMatters.map(i => i.id);
    const uniqueIds = new Set(allPagedIds);

    const testData = {
      suite: 'Pagination Validation',
      name: 'Verify no data loss or duplication',
      input: {
        total_created: 25,
        page_size: 10
      },
      pages: {
        page_1: {
          count: page1Data.matters.length,
          ids: page1Data.matters.map(i => i.id)
        },
        page_2: {
          count: page2Data.matters.length,
          ids: page2Data.matters.map(i => i.id)
        },
        page_3: {
          count: page3Data.matters.length,
          ids: page3Data.matters.map(i => i.id)
        }
      },
      assertions: [
        {
          type: 'page_counts',
          description: 'Each page should have correct count',
          page_1_count: page1Data.matters.length,
          page_2_count: page2Data.matters.length,
          page_3_count: page3Data.matters.length,
          passed: page1Data.matters.length === 10 &&
                  page2Data.matters.length === 10 &&
                  page3Data.matters.length === 5
        },
        {
          type: 'no_duplicates',
          description: 'No matter should appear on multiple pages',
          total_matters: allPagedIds.length,
          unique_matters: uniqueIds.size,
          passed: allPagedIds.length === uniqueIds.size
        },
        {
          type: 'complete_dataset',
          description: 'All created matters should be present',
          expected_total: 25,
          actual_total: allPagedIds.length,
          passed: allPagedIds.length === 25
        }
      ],
      status: null,
      duration_ms: Date.now() - testStart
    };

    testData.status = testData.assertions.every(a => a.passed) ? 'PASS' : 'FAIL';

    logValidation(testData);

    // Actual assertions
    assert.strictEqual(allPagedIds.length, uniqueIds.size, 'No duplicates');
    assert.strictEqual(allPagedIds.length, 25, 'All matters present');
  });

  it('[FINAL] Generate validation report', async () => {
    // Wait a moment to ensure all logs are captured
    await new Promise(resolve => setTimeout(resolve, 100));

    const report = {
      report_metadata: {
        generated_at: new Date().toISOString(),
        test_suite: 'Validation Report Generator',
        total_duration_ms: Date.now() - startTime,
        total_validations: validationLog.length
      },
      summary: {
        total_tests: validationLog.length,
        passed: validationLog.filter(t => t.status === 'PASS').length,
        failed: validationLog.filter(t => t.status === 'FAIL').length,
        pass_rate: (validationLog.filter(t => t.status === 'PASS').length / validationLog.length * 100).toFixed(2) + '%'
      },
      validations: validationLog
    };

    // Generate Markdown report
    const generateMarkdown = (report) => {
      const { summary, validations, report_metadata } = report;
      const passed = summary.passed;
      const failed = summary.failed;
      const passIcon = '✅';
      const failIcon = '❌';
      const statusBadge = failed === 0 ? '🟢 **ALL TESTS PASSING**' : '🔴 **SOME TESTS FAILING**';

      let md = `# Validation Test Report\n\n`;
      md += `${statusBadge}\n\n`;
      md += `**Generated:** ${new Date(report_metadata.generated_at).toLocaleString()}\n\n`;

      // Summary table
      md += `## Summary\n\n`;
      md += `| Metric | Value |\n`;
      md += `|--------|-------|\n`;
      md += `| Total Tests | ${summary.total_tests} |\n`;
      md += `| ${passIcon} Passed | ${passed} |\n`;
      md += `| ${failIcon} Failed | ${failed} |\n`;
      md += `| Pass Rate | ${summary.pass_rate} |\n`;
      md += `| Duration | ${report_metadata.total_duration_ms}ms |\n\n`;

      // Test results
      md += `## Test Results\n\n`;

      validations.forEach((test, idx) => {
        const status = test.status === 'PASS' ? passIcon : failIcon;
        const statusText = test.status === 'PASS' ? 'PASS' : 'FAIL';
        const suite = test.test_suite || test.suite || 'Unknown Suite';
        const name = test.test_name || test.name || 'Unknown Test';

        md += `### ${idx + 1}. ${suite} - ${name}\n\n`;
        md += `**Status:** ${status} ${statusText} | **Duration:** ${test.duration_ms}ms\n\n`;

        // Request details
        if (test.request) {
          md += `<details>\n<summary>Request Details</summary>\n\n`;
          if (test.request.method) {
            md += `**Method:** \`${test.request.method}\`\n\n`;
          }
          if (test.request.url) {
            md += `**URL:** \`${test.request.url}\`\n\n`;
          }
          if (test.request.description) {
            md += `**Description:** ${test.request.description}\n\n`;
          }

          if (test.request.body_raw_json) {
            md += `**Body:**\n\`\`\`json\n${test.request.body_raw_json}\n\`\`\`\n\n`;
          } else if (test.request.body) {
            md += `**Body:**\n\`\`\`json\n${JSON.stringify(test.request.body, null, 2)}\n\`\`\`\n\n`;
          }
          md += `</details>\n\n`;
        }

        // Response details
        if (test.response) {
          md += `<details>\n<summary>Response Details</summary>\n\n`;
          md += `**Status:** ${test.response.status} ${test.response.status_text || ''}\n\n`;
          md += `**Duration:** ${test.response.duration_ms}ms\n\n`;
          if (test.response.body) {
            md += `**Body:**\n\`\`\`json\n${JSON.stringify(test.response.body, null, 2)}\n\`\`\`\n\n`;
          }
          md += `</details>\n\n`;
        }

        // Assertions
        md += `**Assertions:**\n\n`;
        md += `| # | Type | Description | Result |\n`;
        md += `|---|------|-------------|--------|\n`;
        test.assertions.forEach((assertion, aIdx) => {
          const aStatus = assertion.passed ? passIcon : failIcon;
          md += `| ${aIdx + 1} | ${assertion.type} | ${assertion.description} | ${aStatus} |\n`;
        });
        md += `\n`;

        // Assertion details in collapsible sections
        test.assertions.forEach((assertion, aIdx) => {
          md += `<details>\n<summary>Assertion ${aIdx + 1}: ${assertion.description}</summary>\n\n`;
          md += `**Type:** ${assertion.type}\n\n`;
          md += `**Severity:** ${assertion.severity || 'medium'}\n\n`;
          md += `**Result:** ${assertion.passed ? passIcon + ' PASS' : failIcon + ' FAIL'}\n\n`;

          // Show expected vs actual
          if (assertion.expected !== undefined && assertion.actual !== undefined) {
            md += `**Expected:** \`${JSON.stringify(assertion.expected)}\`\n\n`;
            md += `**Actual:** \`${JSON.stringify(assertion.actual)}\`\n\n`;
          }

          // Additional details
          const detailKeys = Object.keys(assertion).filter(k =>
            !['type', 'description', 'passed', 'severity', 'expected', 'actual'].includes(k)
          );
          if (detailKeys.length > 0) {
            md += `**Details:**\n\`\`\`json\n${JSON.stringify(
              detailKeys.reduce((obj, key) => ({ ...obj, [key]: assertion[key] }), {}),
              null,
              2
            )}\n\`\`\`\n\n`;
          }

          md += `</details>\n\n`;
        });

        // Database state changes
        if (test.database_state) {
          md += `<details>\n<summary>Database State Changes</summary>\n\n`;
          md += `\`\`\`json\n${JSON.stringify(test.database_state, null, 2)}\n\`\`\`\n\n`;
          md += `</details>\n\n`;
        }

        md += `---\n\n`;
      });

      return md;
    };

    // Write JSON report
    const jsonPath = path.join(__dirname, '..', 'test-validation-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Write Markdown report
    const mdPath = path.join(__dirname, '..', 'test-validation-report.md');
    fs.writeFileSync(mdPath, generateMarkdown(report));

    console.log('\n' + '='.repeat(80));
    console.log('VALIDATION REPORTS GENERATED');
    console.log('='.repeat(80));
    console.log(`JSON: ${jsonPath}`);
    console.log(`Markdown: ${mdPath}`);
    console.log(`Total Validations: ${report.summary.total_tests}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Pass Rate: ${report.summary.pass_rate}`);
    console.log('='.repeat(80) + '\n');

    // Assert reports were generated successfully
    assert.ok(fs.existsSync(jsonPath), 'JSON report should exist');
    assert.ok(fs.existsSync(mdPath), 'Markdown report should exist');
    assert.strictEqual(report.summary.failed, 0, 'All validations should pass');
  });
});

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const payload = {
  question: 'What should I understand about this situation?', mode: 'open',
  cards: [
    { name: 'The Moon', reversed: false, position: 'PAST' },
    { name: 'Two of Cups', reversed: true, position: 'PRESENT' },
    { name: 'The Star', reversed: false, position: 'POSSIBILITY' },
  ],
};

function loadHandler(modelResults) {
  const source = fs.readFileSync('infra/lambda/reading.js', 'utf8');
  const module = { exports: {} };
  const requests = [];
  const resultQueue = Array.isArray(modelResults) ? [...modelResults] : [modelResults];
  class SecretsManagerClient { async send() { return { SecretString: 'test-key' }; } }
  class GetSecretValueCommand {}
  const context = {
    module, exports: module.exports, console,
    process: { env: { OPENAI_API_KEY_SECRET_ARN: 'test-secret' } }, AbortSignal,
    require(name) {
      if (name === '@aws-sdk/client-secrets-manager') return { SecretsManagerClient, GetSecretValueCommand };
      return require(name);
    },
    fetch: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return { ok: true, json: async () => resultQueue.shift() };
    },
  };
  vm.runInNewContext(source, context, { filename: 'reading.js' });
  return { handler: module.exports.handler, requests };
}

function outputJson(value, extra = []) {
  return { output: [...extra, { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value), annotations: [] }] }] };
}

function routeJson(agentMode, intent) {
  return outputJson({ agentMode, intent });
}

test('returns one agent clarification', async () => {
  const { handler, requests } = loadHandler([routeJson('oracle', 'relationship'), outputJson({
    type: 'clarification', agentMode: 'oracle', intent: 'relationship', reason: 'The timeframe changes the framing.',
    clarificationQuestion: 'What timeframe would you like to explore?', headline: null,
    verdict: null, symbolicLikelihood: null, evidenceSummary: null, interpretation: null, timing: null, hiddenFactor: null, uncertainty: null, followUps: [],
  })]);
  const result = await handler({ httpMethod: 'POST', body: JSON.stringify(payload) });
  const body = JSON.parse(result.body);
  assert.equal(result.statusCode, 200);
  assert.equal(body.type, 'clarification');
  assert.equal(body.clarification.intent, 'relationship');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].model, 'gpt-5-nano');
  assert.equal(requests[0].reasoning.effort, 'minimal');
  assert.equal(requests[1].tools, undefined);
  assert.equal(requests[1].reasoning.effort, 'low');
  assert.equal(requests[1].max_output_tokens, 2400);
});

test('handles an incomplete model response without parsing truncated JSON', async () => {
  const { handler } = loadHandler([routeJson('oracle', 'general'), {
    status: 'incomplete',
    incomplete_details: { reason: 'max_output_tokens' },
    output: [{ type: 'message', content: [{ type: 'output_text', text: '{"type":"reading"' }] }],
  }]);
  const result = await handler({ httpMethod: 'POST', body: JSON.stringify(payload) });
  assert.equal(result.statusCode, 500);
  assert.equal(JSON.parse(result.body).error, 'The reading could not be generated');
});

test('returns a researched reading and its sources', async () => {
  const source = { type: 'web_search_call', action: { sources: [{ title: 'Official source', url: 'https://example.com/facts' }] } };
  const { handler, requests } = loadHandler([routeJson('research', 'sports'), outputJson({
    type: 'reading', agentMode: 'research', intent: 'sports', reason: null, clarificationQuestion: null,
    verdict: 'lean_yes', symbolicLikelihood: 64,
    headline: 'Momentum meets uncertainty', evidenceSummary: 'Current form is mixed.',
    interpretation: 'The spread points to pressure rather than certainty.',
    timing: 'Near the next fixture.', hiddenFactor: 'A late lineup change.',
    uncertainty: 'Lineups can change.', followUps: ['Explore momentum', 'Draw a clarifier', 'Review the evidence'],
  }, [source])]);
  const result = await handler({ httpMethod: 'POST', body: JSON.stringify(payload) });
  const body = JSON.parse(result.body);
  assert.equal(body.type, 'reading');
  assert.equal(body.agent.researched, true);
  assert.equal(body.agent.mode, 'research');
  assert.equal(requests.length, 2);
  assert.equal(requests[1].tools[0].type, 'web_search');
  assert.equal(body.reading.verdict, 'lean_yes');
  assert.equal(body.reading.symbolicLikelihood, 64);
  assert.equal(body.agent.sources[0].url, 'https://example.com/facts');
  assert.equal(body.reading.followUps.length, 3);
});

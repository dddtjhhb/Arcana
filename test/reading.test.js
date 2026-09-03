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

function loadHandler(modelResult) {
  const source = fs.readFileSync('infra/lambda/reading.js', 'utf8');
  const module = { exports: {} };
  const requests = [];
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
      return { ok: true, json: async () => modelResult };
    },
  };
  vm.runInNewContext(source, context, { filename: 'reading.js' });
  return { handler: module.exports.handler, requests };
}

function outputJson(value, extra = []) {
  return { output: [...extra, { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value), annotations: [] }] }] };
}

test('returns one agent clarification', async () => {
  const { handler, requests } = loadHandler(outputJson({
    type: 'clarification', intent: 'relationship', reason: 'The timeframe changes the framing.',
    clarificationQuestion: 'What timeframe would you like to explore?', headline: null,
    evidenceSummary: null, interpretation: null, groundedGuidance: null, uncertainty: null, followUps: [],
  }));
  const result = await handler({ httpMethod: 'POST', body: JSON.stringify(payload) });
  const body = JSON.parse(result.body);
  assert.equal(result.statusCode, 200);
  assert.equal(body.type, 'clarification');
  assert.equal(body.clarification.intent, 'relationship');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].tools[0].type, 'web_search');
});

test('returns a researched reading and its sources', async () => {
  const source = { type: 'web_search_call', action: { sources: [{ title: 'Official source', url: 'https://example.com/facts' }] } };
  const { handler } = loadHandler(outputJson({
    type: 'reading', intent: 'sports', reason: null, clarificationQuestion: null,
    headline: 'Momentum meets uncertainty', evidenceSummary: 'Current form is mixed.',
    interpretation: 'The spread points to pressure rather than certainty.',
    groundedGuidance: 'Treat the cards as one lens beside current evidence.',
    uncertainty: 'Lineups can change.', followUps: ['Explore momentum', 'Draw a clarifier', 'Review the evidence'],
  }, [source]));
  const result = await handler({ httpMethod: 'POST', body: JSON.stringify(payload) });
  const body = JSON.parse(result.body);
  assert.equal(body.type, 'reading');
  assert.equal(body.agent.researched, true);
  assert.equal(body.agent.sources[0].url, 'https://example.com/facts');
  assert.equal(body.reading.followUps.length, 3);
});

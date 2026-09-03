'use strict';

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secrets = new SecretsManagerClient({});
let cachedApiKey;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });
  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return response(400, { error: 'Request body must be valid JSON' }); }

  const error = validate(payload);
  if (error) return response(400, { error });

  try {
    const result = await runAgent(await getApiKey(), payload);
    const decision = parseOutputJson(result);
    const sources = extractSources(result.output);
    const researched = result.output?.some((item) => item.type === 'web_search_call') || sources.length > 0;

    if (decision.type === 'clarification') {
      return response(200, { type: 'clarification', clarification: {
        question: decision.clarificationQuestion,
        reason: decision.reason,
        intent: decision.intent,
      } });
    }

    return response(200, { type: 'reading', reading: {
      headline: decision.headline,
      evidenceSummary: decision.evidenceSummary,
      interpretation: decision.interpretation,
      groundedGuidance: decision.groundedGuidance,
      uncertainty: decision.uncertainty,
      followUps: decision.followUps,
    }, agent: { intent: decision.intent, researched, sources } });
  } catch (error) {
    console.error('Agent run failed', error);
    return response(500, { error: 'The reading could not be generated' });
  }
};

function validate({ question, mode = 'open', cards, followUp, history = [] }) {
  if (typeof question !== 'string' || !question.trim()) return 'A question is required';
  if (question.length > 1000) return 'The question is too long';
  if (!['open', 'relationship', 'match'].includes(mode)) return 'Unknown reading mode';
  if (!Array.isArray(cards) || cards.length !== 3) return 'Exactly three cards are required';
  if (cards.some((card) => !card || typeof card.name !== 'string' || typeof card.reversed !== 'boolean' || typeof card.position !== 'string')) return 'Each card must include name, orientation, and position';
  if (followUp !== undefined && (typeof followUp !== 'string' || followUp.length > 500)) return 'The follow-up is invalid';
  if (!Array.isArray(history) || history.length > 8) return 'Conversation history is invalid';
  return null;
}

async function runAgent(apiKey, payload) {
  const apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(25000),
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      max_output_tokens: 1100,
      tools: [{ type: 'web_search' }],
      tool_choice: 'auto',
      include: ['web_search_call.action.sources'],
      instructions: [
        'You are Arcana, an interactive tarot agent for reflection and possibility—not certainty.',
        'First decide whether one concise clarification is genuinely necessary. If so, return type clarification and ask only one useful question.',
        'Otherwise interpret the exact cards, positions, orientations, combinations, and user context.',
        'Use web search only when current, public, verifiable facts materially affect the question, such as sports fixtures, form, injuries, companies, schools, laws, weather, or schedules.',
        'Never search for private individuals, personal profiles, contact details, or supposed private thoughts. Relationship questions alone never justify web search.',
        'When research is used, distinguish factual evidence from symbolic tarot interpretation and acknowledge uncertainty.',
        'Never claim guaranteed knowledge of the future, private thoughts, or supernatural certainty.',
        'For health, legal, financial, or safety-sensitive topics, keep the reading reflective and recommend appropriate professional help when relevant.',
        'Return only JSON matching the schema.',
      ].join(' '),
      input: sessionContext(payload),
      text: { format: { type: 'json_schema', name: 'arcana_agent_result', strict: true, schema: agentSchema() } },
    }),
  });
  if (!apiResponse.ok) {
    console.error('OpenAI request failed', apiResponse.status, await apiResponse.text());
    throw new Error(`OpenAI request failed with ${apiResponse.status}`);
  }
  return apiResponse.json();
}

function agentSchema() {
  return {
    type: 'object', additionalProperties: false,
    properties: {
      type: { type: 'string', enum: ['clarification', 'reading'] },
      intent: { type: 'string', enum: ['general', 'relationship', 'career', 'decision', 'sports', 'finance', 'wellbeing', 'other'] },
      reason: { type: ['string', 'null'] },
      clarificationQuestion: { type: ['string', 'null'] },
      headline: { type: ['string', 'null'] },
      evidenceSummary: { type: ['string', 'null'] },
      interpretation: { type: ['string', 'null'] },
      groundedGuidance: { type: ['string', 'null'] },
      uncertainty: { type: ['string', 'null'] },
      followUps: { type: 'array', minItems: 0, maxItems: 3, items: { type: 'string' } },
    },
    required: ['type', 'intent', 'reason', 'clarificationQuestion', 'headline', 'evidenceSummary', 'interpretation', 'groundedGuidance', 'uncertainty', 'followUps'],
  };
}

function sessionContext({ question, mode = 'open', cards, followUp, history = [] }) {
  const cardSummary = cards.map((card, index) => `${index + 1}. ${card.position}: ${card.name} — ${card.reversed ? 'reversed' : 'upright'}`).join('\n');
  const prior = history.slice(-8).map((item) => `${item.role}: ${String(item.content).slice(0, 1200)}`).join('\n');
  return `Reading mode: ${mode}\nUser question: ${question.trim()}\nCards:\n${cardSummary}${prior ? `\nConversation so far:\n${prior}` : ''}${followUp ? `\nLatest user answer or follow-up: ${followUp.trim()}` : ''}`;
}

function parseOutputJson(result) {
  const text = result.output_text || extractOutputText(result.output);
  if (!text) throw new Error('Model response did not contain output text');
  return JSON.parse(text);
}

function extractOutputText(output = []) {
  return output.flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('\n');
}

function extractSources(output = []) {
  const annotations = output.flatMap((item) => item.content || []).flatMap((item) => item.annotations || []);
  const toolSources = output.filter((item) => item.type === 'web_search_call').flatMap((item) => item.action?.sources || []);
  const sources = [
    ...annotations.filter((item) => item.type === 'url_citation').map((item) => ({ title: item.title, url: item.url })),
    ...toolSources.map((item) => ({ title: item.title || item.url, url: item.url })),
  ].filter((item) => item.url);
  return [...new Map(sources.map((item) => [item.url, { title: item.title || item.url, url: item.url }])).values()].slice(0, 6);
}

async function getApiKey() {
  if (cachedApiKey) return cachedApiKey;
  if (!process.env.OPENAI_API_KEY_SECRET_ARN) throw new Error('OPENAI_API_KEY_SECRET_ARN is not configured');
  const secret = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.OPENAI_API_KEY_SECRET_ARN }));
  if (!secret.SecretString) throw new Error('OpenAI secret is empty');
  try { const parsed = JSON.parse(secret.SecretString); cachedApiKey = parsed.OPENAI_API_KEY || parsed.apiKey; }
  catch { cachedApiKey = secret.SecretString; }
  if (!cachedApiKey) throw new Error('OpenAI API key is missing from the secret');
  return cachedApiKey;
}

function response(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

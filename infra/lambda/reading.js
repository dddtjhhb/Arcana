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
    const apiKey = await getApiKey();
    const route = await routeQuestion(apiKey, payload.question);
    const result = await runAgent(apiKey, payload, route);
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
      verdict: decision.verdict,
      symbolicLikelihood: decision.symbolicLikelihood,
      headline: decision.headline,
      evidenceSummary: decision.evidenceSummary,
      interpretation: decision.interpretation,
      timing: decision.timing,
      hiddenFactor: decision.hiddenFactor,
      uncertainty: decision.uncertainty,
      followUps: decision.followUps,
    }, agent: { mode: route.agentMode, intent: route.intent, researched, sources } });
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

async function routeQuestion(apiKey, question) {
  const apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(5000),
    body: JSON.stringify({
      model: process.env.OPENAI_ROUTER_MODEL || 'gpt-5-nano',
      max_output_tokens: 300,
      reasoning: { effort: 'minimal' },
      instructions: [
        'Classify the request for a tarot application.',
        'Choose oracle for personal, relationship, academic, career, wellbeing, and decision predictions that can be answered from the cards.',
        'Choose research only when up-to-date public facts materially affect the answer or the user explicitly asks for current verification or web research.',
        'Sports match predictions, recent form, injuries, schedules, laws, weather, prices, and current company facts require research.',
        'Questions such as whether the user will be admitted, contacted, promoted, or reconciled remain oracle unless current factual research is explicitly requested.',
      ].join(' '),
      input: question.trim(),
      text: { format: { type: 'json_schema', name: 'arcana_route', strict: true, schema: {
        type: 'object', additionalProperties: false,
        properties: {
          agentMode: { type: 'string', enum: ['oracle', 'research'] },
          intent: { type: 'string', enum: ['general', 'relationship', 'career', 'decision', 'sports', 'finance', 'wellbeing', 'other'] },
        },
        required: ['agentMode', 'intent'],
      } } },
    }),
  });
  if (!apiResponse.ok) {
    console.error('OpenAI routing failed', apiResponse.status, await apiResponse.text());
    throw new Error(`OpenAI routing failed with ${apiResponse.status}`);
  }
  return parseOutputJson(await apiResponse.json());
}

async function runAgent(apiKey, payload, route) {
  const researchEnabled = route.agentMode === 'research';
  const requestBody = {
    model: process.env.OPENAI_MODEL || 'gpt-5-mini',
    max_output_tokens: 2400,
    reasoning: { effort: 'low' },
    instructions: [
      'You are Arcana, an incisive, atmospheric tarot reader. Give the user the felt experience of a real reading, not a generic coaching report.',
      `The routing decision is ${route.agentMode} mode with ${route.intent} intent. Follow that route.`,
      'For oracle mode, lead with a direct directional verdict, then interpret the exact cards, positions, reversals, and combinations as a symbolic forecast.',
      'The symbolicLikelihood is narrative tarot symbolism, not a statistical probability. Use it to express how strongly the spread leans yes or no. Do not imply measured odds.',
      'Keep the interpretation vivid and specific. State the likely trajectory, timing window, and hidden factor. Do not produce checklists or long practical action plans unless the user explicitly asks what to do.',
      'In research mode, use web search for the current public facts that materially affect the request, then clearly separate verified evidence from tarot interpretation.',
      'Never mix astrology into a tarot reading unless the user supplies birth data and explicitly requests astrology.',
      'Ask one concise clarification only when a missing detail would materially change the reading; otherwise read the spread immediately.',
      'Never search for private individuals, personal profiles, contact details, or supposed private thoughts. Relationship questions alone never justify web search.',
      'Never claim guaranteed knowledge of the future, private thoughts, or supernatural certainty.',
      'For health, legal, financial, or safety-sensitive topics, keep the reading reflective and avoid definitive professional claims.',
    ].join(' '),
    input: sessionContext(payload),
    text: { format: { type: 'json_schema', name: 'arcana_agent_result', strict: true, schema: agentSchema() } },
  };
  if (researchEnabled) {
    requestBody.tools = [{ type: 'web_search' }];
    requestBody.tool_choice = 'auto';
    requestBody.include = ['web_search_call.action.sources'];
  }
  const apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(22000),
    body: JSON.stringify(requestBody),
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
      agentMode: { type: 'string', enum: ['oracle', 'research'] },
      intent: { type: 'string', enum: ['general', 'relationship', 'career', 'decision', 'sports', 'finance', 'wellbeing', 'other'] },
      reason: { type: ['string', 'null'] },
      clarificationQuestion: { type: ['string', 'null'] },
      verdict: { type: ['string', 'null'], enum: ['strong_yes', 'lean_yes', 'uncertain', 'lean_no', 'strong_no', null] },
      symbolicLikelihood: { type: ['integer', 'null'], minimum: 0, maximum: 100 },
      headline: { type: ['string', 'null'] },
      evidenceSummary: { type: ['string', 'null'] },
      interpretation: { type: ['string', 'null'] },
      timing: { type: ['string', 'null'] },
      hiddenFactor: { type: ['string', 'null'] },
      uncertainty: { type: ['string', 'null'] },
      followUps: { type: 'array', minItems: 0, maxItems: 3, items: { type: 'string' } },
    },
    required: ['type', 'agentMode', 'intent', 'reason', 'clarificationQuestion', 'verdict', 'symbolicLikelihood', 'headline', 'evidenceSummary', 'interpretation', 'timing', 'hiddenFactor', 'uncertainty', 'followUps'],
  };
}

function sessionContext({ question, mode = 'open', cards, followUp, history = [] }) {
  const cardSummary = cards.map((card, index) => `${index + 1}. ${card.position}: ${card.name} — ${card.reversed ? 'reversed' : 'upright'}`).join('\n');
  const prior = history.slice(-8).map((item) => `${item.role}: ${String(item.content).slice(0, 1200)}`).join('\n');
  return `Reading mode: ${mode}\nUser question: ${question.trim()}\nCards:\n${cardSummary}${prior ? `\nConversation so far:\n${prior}` : ''}${followUp ? `\nLatest user answer or follow-up: ${followUp.trim()}` : ''}`;
}

function parseOutputJson(result) {
  const text = result.output_text || extractOutputText(result.output);
  if (result.status === 'incomplete') {
    const reason = result.incomplete_details?.reason || 'unknown reason';
    throw new Error(`Model response was incomplete: ${reason}`);
  }
  if (!text) throw new Error('Model response did not contain output text');
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Model returned invalid structured JSON (${text.length} characters)`, { cause: error });
  }
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

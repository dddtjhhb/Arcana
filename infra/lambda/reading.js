'use strict';

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secrets = new SecretsManagerClient({});
let cachedApiKey;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { error: 'Request body must be valid JSON' });
  }

  const validationError = validate(payload);
  if (validationError) return response(400, { error: validationError });

  try {
    const apiKey = await getApiKey();
    const modelResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildModelRequest(payload)),
      signal: AbortSignal.timeout(25000),
    });

    if (!modelResponse.ok) {
      console.error('OpenAI request failed', modelResponse.status, await modelResponse.text());
      return response(502, { error: 'The reading service is temporarily unavailable' });
    }

    const result = await modelResponse.json();
    const outputText = result.output_text || extractOutputText(result.output);
    if (!outputText) throw new Error('Model response did not contain output text');
    return response(200, { reading: JSON.parse(outputText) });
  } catch (error) {
    console.error('Reading generation failed', error);
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

function buildModelRequest({ question, mode = 'open', cards, followUp, history = [] }) {
  const cardSummary = cards.map((card, index) => `${index + 1}. ${card.position}: ${card.name} — ${card.reversed ? 'reversed' : 'upright'}`).join('\n');
  const priorContext = history.slice(-8).map((item) => `${item.role}: ${String(item.content).slice(0, 1200)}`).join('\n');
  return {
    model: process.env.OPENAI_MODEL || 'gpt-5-mini',
    max_output_tokens: 900,
    instructions: [
      'You are Arcana, an interactive tarot guide for reflection and possibility—not certainty.',
      'Interpret the exact cards, their positions, upright/reversed orientations, combinations, and the user question.',
      'Never claim guaranteed knowledge of the future, another person’s private thoughts, or supernatural certainty.',
      'Be specific and emotionally intelligent. Avoid generic mystical filler.',
      'For health, legal, financial, or safety-sensitive topics, keep the reading reflective and recommend appropriate professional help when relevant.',
      'If current external facts would help, say what should be researched; do not pretend you searched the web.',
      'Return only JSON matching the supplied schema.',
    ].join(' '),
    input: `Reading mode: ${mode}\nUser question: ${question.trim()}\nCards:\n${cardSummary}${priorContext ? `\nConversation so far:\n${priorContext}` : ''}${followUp ? `\nUser follow-up: ${followUp.trim()}` : ''}`,
    text: { format: {
      type: 'json_schema', name: 'interactive_tarot_reading', strict: true,
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          headline: { type: 'string' }, interpretation: { type: 'string' }, groundedGuidance: { type: 'string' },
          followUps: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
          needsResearch: { type: 'boolean' }, researchSuggestion: { type: ['string', 'null'] },
        },
        required: ['headline', 'interpretation', 'groundedGuidance', 'followUps', 'needsResearch', 'researchSuggestion'],
      },
    } },
  };
}

async function getApiKey() {
  if (cachedApiKey) return cachedApiKey;
  if (!process.env.OPENAI_API_KEY_SECRET_ARN) throw new Error('OPENAI_API_KEY_SECRET_ARN is not configured');
  const secret = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.OPENAI_API_KEY_SECRET_ARN }));
  if (!secret.SecretString) throw new Error('OpenAI secret is empty');
  try {
    const parsed = JSON.parse(secret.SecretString);
    cachedApiKey = parsed.OPENAI_API_KEY || parsed.apiKey;
  } catch {
    cachedApiKey = secret.SecretString;
  }
  if (!cachedApiKey) throw new Error('OpenAI API key is missing from the secret');
  return cachedApiKey;
}

function extractOutputText(output = []) {
  return output.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text;
}

function response(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

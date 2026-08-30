'use strict';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { error: 'Request body must be valid JSON' });
  }

  const { question, mode = 'open', cards } = payload;
  if (typeof question !== 'string' || !Array.isArray(cards) || cards.length !== 3) {
    return response(400, {
      error: 'question and exactly three cards are required',
    });
  }

  return response(200, {
    status: 'ready-for-llm',
    message: 'The AWS API contract is working. LLM generation is added in step two.',
    reading: { question, mode, cards },
  });
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

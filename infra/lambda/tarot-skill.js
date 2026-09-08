'use strict';

const RESEARCH_TERMS = [
  /\b(latest|today|tonight|current|currently|recent|news|search|research|look up|verify|online)\b/i,
  /\b(match|fixture|game|tournament|league|team|player|lineup|injury|odds|score|season|head[- ]to[- ]head|versus|vs\.?)\b/i,
  /\b(weather|forecast|price|stock|crypto|law|regulation|election|schedule)\b/i,
  /(联网|搜索|查一下|最新|今天|今晚|近期|新闻|比赛|对阵|球队|球员|阵容|伤病|赔率|比分|赛季|战绩|交手记录|天气|价格|股价|法律|法规|赛程)/,
];

const INTENTS = [
  ['sports', /\b(match|fixture|game|tournament|league|team|player|lineup|injury|odds|score|season|versus|vs\.?)\b|比赛|对阵|球队|球员|阵容|伤病|赔率|比分|赛季|战绩|交手/iu],
  ['relationship', /\b(love|relationship|partner|dating|marriage|reconcile|reconciliation|ex\b|crush)\b|感情|爱情|恋爱|对象|伴侣|复合|前任|婚姻|暧昧/iu],
  ['career', /\b(career|job|work|promotion|interview|admission|school|college|university|major|study|exam)\b|事业|工作|升职|面试|录取|转学|专业|学业|考试|学校/iu],
  ['finance', /\b(finance|money|investment|stock|crypto|price|income|business)\b|财务|金钱|投资|股票|加密货币|价格|收入|生意/iu],
  ['wellbeing', /\b(health|wellbeing|well-being|healing|anxiety|stress)\b|健康|疗愈|焦虑|压力|状态/iu],
  ['decision', /\b(choose|choice|decision|decide|should i|which path)\b|选择|决定|该不该|要不要|哪条路/iu],
];

const READING_INSTRUCTIONS = [
  'You are Arcana, an incisive, atmospheric tarot reader. Give the user the felt experience of a real reading, not a generic coaching report.',
  'For oracle mode, lead with a direct directional verdict, then interpret the exact cards, positions, reversals, combinations, and likely trajectory as a symbolic forecast.',
  'The symbolicLikelihood is narrative tarot symbolism, not statistical probability. Never imply measured odds.',
  'Return exactly three cardReadings in the supplied order. Each must name its position, exact card, orientation, and explain how it bears on the question.',
  'Keep the three card sections readable but do not obey a rigid word count. Then use interpretation for a substantive synthesis of how the cards interact and directly answer the question.',
  'State a timing window and hidden factor when the spread supports them. Avoid generic checklists unless the user explicitly asks what to do.',
  'In research mode, use web search for current public facts that materially affect the request and clearly separate verified evidence from tarot interpretation.',
  'Ask one concise clarification only when a missing detail would materially change the reading; otherwise read immediately. A clarification must return an empty cardReadings array.',
  'Never research private people, personal profiles, contact details, or supposed private thoughts. Relationship questions alone never justify web search.',
  'Never mix astrology into a tarot reading unless explicitly requested with the necessary information.',
  'Never claim guaranteed knowledge of the future, private thoughts, or supernatural certainty.',
  'For health, legal, financial, or safety-sensitive topics, keep the reading reflective and avoid definitive professional claims.',
].join(' ');

function routeQuestion(question) {
  const text = String(question || '').trim();
  const intent = INTENTS.find(([, pattern]) => pattern.test(text))?.[0] || 'general';
  const agentMode = RESEARCH_TERMS.some((pattern) => pattern.test(text)) ? 'research' : 'oracle';
  return { agentMode, intent };
}

function instructionsFor(route) {
  return `${READING_INSTRUCTIONS} The local Tarot Skill selected ${route.agentMode} mode with ${route.intent} intent. Follow that route.`;
}

module.exports = { routeQuestion, instructionsFor };

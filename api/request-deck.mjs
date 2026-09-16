const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_BODY_BYTES = 16 * 1024;
const requestBuckets = new Map();
const supportedLanguages = new Set(['en', 'pl', 'ua', 'ru']);

const mailCopy = {
  en: {
    subject: 'EverRoot — project materials request received',
    hello: name => `Hello ${name},`,
    thanks: 'Thank you for your interest in EverRoot.',
    received: 'We have received your request for the current project materials.',
    status: 'EverRoot is currently in pre-development, with supplier quotations, site conditions, water supply and timber-market assumptions being validated. We prefer to send the latest reviewed materials rather than an outdated investment deck automatically.',
    followup: 'We will reply with the most current project information available.',
    regards: 'Best regards'
  },
  pl: {
    subject: 'EverRoot — otrzymaliśmy prośbę o materiały projektu',
    hello: name => `Dzień dobry ${name},`,
    thanks: 'Dziękujemy za zainteresowanie projektem EverRoot.',
    received: 'Otrzymaliśmy prośbę o aktualne materiały projektu.',
    status: 'EverRoot znajduje się obecnie na etapie przygotowawczym. Weryfikujemy oferty dostawców, warunki działki, źródło wody oraz założenia rynku drewna. Zamiast automatycznie wysyłać nieaktualną prezentację inwestycyjną, wolimy przesłać najnowsze zweryfikowane materiały.',
    followup: 'Odpowiemy, przesyłając najbardziej aktualne informacje o projekcie.',
    regards: 'Z poważaniem'
  },
  ua: {
    subject: 'EverRoot — запит на матеріали проєкту отримано',
    hello: name => `Вітаємо, ${name}!`,
    thanks: 'Дякуємо за інтерес до EverRoot.',
    received: 'Ми отримали ваш запит на актуальні матеріали проєкту.',
    status: 'EverRoot зараз перебуває на передпроєктній стадії: ми перевіряємо пропозиції постачальників, умови ділянки, водопостачання та припущення щодо ринку деревини. Тому замість автоматичного надсилання застарілої інвестиційної презентації ми надаємо лише актуальні перевірені матеріали.',
    followup: 'Ми відповімо та надішлемо найактуальнішу доступну інформацію про проєкт.',
    regards: 'З повагою'
  },
  ru: {
    subject: 'EverRoot — запрос на материалы проекта получен',
    hello: name => `Здравствуйте, ${name}!`,
    thanks: 'Спасибо за интерес к EverRoot.',
    received: 'Мы получили ваш запрос на актуальные материалы проекта.',
    status: 'EverRoot сейчас находится на предпроектной стадии: мы проверяем предложения поставщиков, условия участка, водоснабжение и предпосылки рынка древесины. Поэтому вместо автоматической отправки устаревшей инвестиционной презентации мы предпочитаем отправлять только актуальные проверенные материалы.',
    followup: 'Мы ответим и отправим наиболее актуальную доступную информацию о проекте.',
    regards: 'С уважением'
  }
};

function clean(value, maxLength, multiline = false) {
  if (typeof value !== 'string') return '';
  const withoutControls = multiline
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    : value.replace(/[\u0000-\u001F\u007F]/g, ' ');
  return withoutControls.trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

function getOrigin(request) {
  return request.headers.get('origin') || '';
}

function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    return url.origin;
  } catch {
    return '';
  }
}

function allowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => normalizeOrigin(value.trim()))
    .filter(Boolean);
  return new Set(configured);
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Origin'
  };
  if (allowedOrigins().has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(origin, status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), ...extraHeaders }
  });
}

function rateLimited(request) {
  const ip = clean(request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown', 100);
  const now = Date.now();
  const recent = (requestBuckets.get(ip) || []).filter(timestamp => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return true;
  recent.push(now);
  requestBuckets.set(ip, recent);
  if (requestBuckets.size > 1000) {
    for (const [key, values] of requestBuckets) {
      if (!values.some(timestamp => now - timestamp < WINDOW_MS)) requestBuckets.delete(key);
    }
  }
  return false;
}

function userEmail(copy, name) {
  const safeName = escapeHtml(name);
  return {
    html: `<div style="font-family:Arial,sans-serif;color:#173126;line-height:1.6;max-width:620px"><p>${copy.hello(safeName)}</p><p>${copy.thanks}</p><p>${copy.received}</p><p>${copy.status}</p><p>${copy.followup}</p><p>${copy.regards},<br>Yevhen Filippov<br>EverRoot</p></div>`,
    text: `${copy.hello(name)}\n\n${copy.thanks}\n\n${copy.received}\n\n${copy.status}\n\n${copy.followup}\n\n${copy.regards},\nYevhen Filippov\nEverRoot`
  };
}

function ownerEmail({ name, email, company, message, language, requestedAt }) {
  const lines = [
    'New EverRoot project materials request',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Company / fund: ${company || '—'}`,
    `Site language: ${language.toUpperCase()}`,
    `Requested at: ${requestedAt}`,
    '',
    'Message:',
    message || '—'
  ];
  const html = lines.map(line => line ? `<div>${escapeHtml(line)}</div>` : '<br>').join('');
  return { html, text: lines.join('\n') };
}

export default {
  async fetch(request) {
    const origin = getOrigin(request);
    if (request.method === 'OPTIONS') {
      if (!allowedOrigins().has(origin)) return json(origin, 403, { ok: false });
      return new Response(null, {
        status: 204,
        headers: { ...corsHeaders(origin), 'Access-Control-Max-Age': '86400' }
      });
    }
    if (request.method !== 'POST') return json(origin, 405, { ok: false }, { Allow: 'POST, OPTIONS' });
    if (!allowedOrigins().has(origin)) return json(origin, 403, { ok: false });

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) return json(origin, 415, { ok: false });
    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return json(origin, 413, { ok: false });

    let input;
    try {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) return json(origin, 413, { ok: false });
      input = JSON.parse(rawBody);
    } catch {
      return json(origin, 400, { ok: false });
    }

    if (!input || typeof input !== 'object' || Array.isArray(input)) return json(origin, 400, { ok: false });
    if (clean(input.website, 200)) return json(origin, 200, { ok: true });

    const name = clean(input.name, 120);
    const email = clean(input.email, 254).toLowerCase();
    const company = clean(input.company, 160);
    const message = clean(input.message, 2000, true);
    const language = supportedLanguages.has(input.language) ? input.language : 'en';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (name.length < 2 || !emailPattern.test(email)) return json(origin, 400, { ok: false });
    if (rateLimited(request)) return json(origin, 429, { ok: false }, { 'Retry-After': String(Math.ceil(WINDOW_MS / 1000)) });

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const owner = process.env.EVERROOT_OWNER_EMAIL;
    if (!apiKey || !from || !owner) return json(origin, 503, { ok: false });

    const copy = mailCopy[language];
    const requestedAt = new Date().toISOString();
    const recipientMessage = userEmail(copy, name);
    const ownerMessage = ownerEmail({ name, email, company, message, language, requestedAt });

    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID()
        },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify([
          { from, to: [email], reply_to: 'invest@everroot.eu', subject: copy.subject, ...recipientMessage },
          { from, to: [owner], reply_to: email, subject: `New EverRoot project materials request — ${name}`, ...ownerMessage }
        ])
      });
      if (!response.ok) return json(origin, 502, { ok: false });
      return json(origin, 200, { ok: true });
    } catch {
      return json(origin, 502, { ok: false });
    }
  }
};

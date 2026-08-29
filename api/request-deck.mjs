const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 3;
const requestBuckets = new Map();

const deckFiles = {
  en: 'EverRoot-Investment-Deck-EN.pdf',
  pl: 'EverRoot-Investment-Deck-PL.pdf',
  ua: 'EverRoot-Investment-Deck-UA.pdf',
  ru: 'EverRoot-Investment-Deck-RU.pdf'
};

const mailCopy = {
  en: {
    subject: 'EverRoot Investment Presentation',
    hello: name => `Hello ${name},`,
    thanks: 'Thank you for your interest in EverRoot.',
    access: 'You can access the EverRoot investment presentation using the link below:',
    button: 'View / Download Investment Presentation',
    overview: 'The presentation contains an overview of the project, business model, development strategy, financial assumptions and proposed investment structure.',
    disclaimer: 'Please note that the figures presented are indicative and subject to further due diligence.',
    regards: 'Best regards',
  },
  pl: {
    subject: 'Prezentacja inwestycyjna EverRoot',
    hello: name => `Dzień dobry ${name},`,
    thanks: 'Dziękujemy za zainteresowanie projektem EverRoot.',
    access: 'Prezentacja inwestycyjna EverRoot jest dostępna pod poniższym linkiem:',
    button: 'Wyświetl / pobierz prezentację inwestycyjną',
    overview: 'Prezentacja zawiera przegląd projektu, modelu biznesowego, strategii rozwoju, założeń finansowych i proponowanej struktury inwestycji.',
    disclaimer: 'Przedstawione dane mają charakter orientacyjny i podlegają dalszej analizie due diligence.',
    regards: 'Z poważaniem',
  },
  ua: {
    subject: 'Інвестиційна презентація EverRoot',
    hello: name => `Вітаємо, ${name}!`,
    thanks: 'Дякуємо за інтерес до EverRoot.',
    access: 'Інвестиційна презентація EverRoot доступна за посиланням нижче:',
    button: 'Переглянути / завантажити інвестиційну презентацію',
    overview: 'Презентація містить огляд проєкту, бізнес-моделі, стратегії розвитку, фінансових припущень і запропонованої інвестиційної структури.',
    disclaimer: 'Зверніть увагу: наведені показники є орієнтовними та підлягають подальшій комплексній перевірці.',
    regards: 'З повагою',
  },
  ru: {
    subject: 'Инвестиционная презентация EverRoot',
    hello: name => `Здравствуйте, ${name}!`,
    thanks: 'Спасибо за интерес к EverRoot.',
    access: 'Инвестиционная презентация EverRoot доступна по ссылке ниже:',
    button: 'Открыть / скачать инвестиционную презентацию',
    overview: 'Презентация содержит обзор проекта, бизнес-модели, стратегии развития, финансовых предпосылок и предлагаемой инвестиционной структуры.',
    disclaimer: 'Обратите внимание: представленные показатели являются ориентировочными и подлежат дальнейшей комплексной проверке.',
    regards: 'С уважением',
  }
};

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

function getOrigin(request) {
  return request.headers.get('origin') || '';
}

function allowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || 'https://filippovyevhen-lab.github.io')
    .split(',')
    .map(value => value.trim())
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

function json(origin, status, body) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
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

function userEmail(copy, name, deckUrl) {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(deckUrl);
  return {
    html: `<div style="font-family:Arial,sans-serif;color:#173126;line-height:1.6;max-width:620px"><p>${copy.hello(safeName)}</p><p>${copy.thanks}</p><p>${copy.access}</p><p><a href="${safeUrl}" style="display:inline-block;background:#123b2b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:24px">${copy.button}</a></p><p>${copy.overview}</p><p style="font-size:12px;color:#68766f">${copy.disclaimer}</p><p>${copy.regards},<br>Yevhen Filippov<br>EverRoot</p></div>`,
    text: `${copy.hello(name)}\n\n${copy.thanks}\n\n${copy.access}\n${deckUrl}\n\n${copy.overview}\n\n${copy.disclaimer}\n\n${copy.regards},\nYevhen Filippov\nEverRoot`
  };
}

function ownerEmail({ name, email, company, message, language, requestedAt }) {
  const lines = [
    'New EverRoot investment deck request',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Company / fund: ${company || '-'}`,
    `Site language: ${language.toUpperCase()}`,
    `Requested at: ${requestedAt}`,
    '',
    'Message:',
    message || '-'
  ];
  const html = lines.map(line => line ? `<div>${escapeHtml(line)}</div>` : '<br>').join('');
  return { html, text: lines.join('\n') };
}

export default {
  async fetch(request) {
    const origin = getOrigin(request);
    if (request.method === 'OPTIONS') {
      if (!allowedOrigins().has(origin)) return json(origin, 403, { ok: false });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') return json(origin, 405, { ok: false });
    if (!allowedOrigins().has(origin)) return json(origin, 403, { ok: false });
    if (rateLimited(request)) return json(origin, 429, { ok: false });

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const owner = process.env.EVERROOT_OWNER_EMAIL;
    if (!apiKey || !from || !owner) return json(origin, 503, { ok: false });

    let input;
    try {
      input = await request.json();
    } catch {
      return json(origin, 400, { ok: false });
    }

    if (clean(input.website, 200)) return json(origin, 200, { ok: true });

    const name = clean(input.name, 120);
    const email = clean(input.email, 254).toLowerCase();
    const company = clean(input.company, 160);
    const message = clean(input.message, 2000);
    const language = deckFiles[input.language] ? input.language : 'en';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (name.length < 2 || !emailPattern.test(email)) return json(origin, 400, { ok: false });

    const siteUrl = (process.env.EVERROOT_SITE_URL || 'https://filippovyevhen-lab.github.io/EverRoot').replace(/\/$/, '');
    const deckUrl = `${siteUrl}/assets/decks/${deckFiles[language]}`;
    const copy = mailCopy[language];
    const requestedAt = new Date().toISOString();
    const recipientMessage = userEmail(copy, name, deckUrl);
    const ownerMessage = ownerEmail({ name, email, company, message, language, requestedAt });

    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify([
          { from, to: [email], reply_to: owner, subject: copy.subject, ...recipientMessage },
          { from, to: [owner], reply_to: email, subject: `[EverRoot] New investment deck request (${language.toUpperCase()})`, ...ownerMessage }
        ])
      });
      if (!response.ok) return json(origin, 502, { ok: false });
      return json(origin, 200, { ok: true });
    } catch {
      return json(origin, 502, { ok: false });
    }
  }
};


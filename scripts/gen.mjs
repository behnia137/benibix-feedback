#!/usr/bin/env node
/* Draws this repo's README pictures in BENIBIX's own look, light and dark, from the site's data,
   and writes README.md.
     node scripts/gen.mjs <benibix repo>
   Plain SVG with CSS motion (GitHub shows it as an image: no scripts, no web fonts); it stops
   moving under prefers-reduced-motion. It also writes the one issue form (.github/ISSUE_TEMPLATE/
   feedback.yml, a "Which tool?" option per live tool) and .github/tool-labels.json, which the
   label workflow uses to put the tool's label on each new issue. */
import fs from 'node:fs';
import path from 'node:path';
import { liveTools } from './tools.mjs';

const repo = path.resolve(process.argv[2] || '../benibix');
const here = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(here, 'assets');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const FORM = 'https://github.com/behnia137/benibix-feedback/issues/new?template=feedback.yml';
const SITE_OPTION = 'The site itself', NEW_OPTION = 'A new tool';
const formFor = (tool, type) => FORM + '&tool=' + encodeURIComponent(tool) + (type ? '&type=' + encodeURIComponent(type) : '');

/* ---------- the look ---------- */
const T = {
  dark: { bg: '#07070a', card: '#0f0f15', card2: '#15151d', ink: '#f5f5f7', ink2: '#a8a8b5', ink3: '#8a8a98', rule: 'rgba(255,255,255,.09)',
    rainbow: ['#ff6b3d', '#ffc72c', '#8fd14f', '#2f7cf6', '#a855f7'], ok: '#4ade80' },
  light: { bg: '#f7f6f3', card: '#ffffff', card2: '#f6f5f1', ink: '#0b0b10', ink2: '#474753', ink3: '#666671', rule: 'rgba(16,18,27,.10)',
    rainbow: ['#d9431c', '#b86e00', '#3b8a17', '#1f5fd6', '#8a3fe0'], ok: '#166534' },
};
const SANS = "Inter, 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";
const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif";
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const deepen = (hex, k = 0.42) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k)).toString(16).padStart(2, '0')).join('');
const acc = (hex, th) => (th === 'light' ? deepen(hex) : hex);
const rainbow = (c, id) => `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="0%">${[...c, c[0]].map((v, i, a) => `<stop offset="${(i / (a.length - 1) * 100).toFixed(1)}%" stop-color="${v}"/>`).join('')}</linearGradient>`;
const svg = (w, h, body, style = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
<style>text{font-family:${SANS}} .serif{font-family:${SERIF};font-style:italic} ${style} @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }</style>
${body}
</svg>
`;
const write = (name, th, s) => fs.writeFileSync(path.join(out, `${name}-${th}.svg`), s);
const kitIcon = name => fs.readFileSync(path.join(repo, 'packages/kit/icons', `${name}.svg`), 'utf8').replace(/^<svg[^>]*>|<\/svg>\s*$/g, '');
const icon = (inner, x, y, s, color) => `<g transform="translate(${x} ${y}) scale(${s / 24})" stroke="${color}" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;

/* ---------- the tools, from the site (scripts/tools.mjs) ---------- */
const live = liveTools(repo);
const COLORS = { ...Object.fromEntries(live.tools.map(t => [t.cat, t.color])), BENIBIX: '#2a2a33' };
const ROWS = live.rows.map(r => ({ ...r, tools: r.tools.map(t => ({ ...t, url: formFor(t.name) })) }));
const SITE_ROW = { id: 'site', head: [['BENIBIX', 'The site itself', 1]], tools: [
  { id: 'site', name: 'The site', note: 'A page, a lesson, a post, the menus', url: formFor(SITE_OPTION), icon: kitIcon('feedback'), cat: 'BENIBIX' },
  { id: 'new', name: 'A tool you want', note: 'An idea for a tool that does not exist yet', url: formFor(NEW_OPTION, '💡 Idea (a feature or improvement)'), icon: kitIcon('bulb'), cat: 'BENIBIX' },
] };
const LIVE = ROWS.reduce((n, r) => n + r.tools.length, 0);
const KINDS = [['chat', 'Feedback', 'What you think: what works, what is confusing.', '#2f7cf6'], ['bug', 'Bug', 'Something is broken or looks wrong.', '#ff6b3d'], ['bulb', 'Idea', 'A feature, an improvement, a whole new tool.', '#ffc72c']];

/* ---------- the mark ---------- */
const mark = (x, y, h, th) => {
  const w = h / 4, gap = h / 8, hs = [1, 0.66, 0.85];
  return `<defs><linearGradient id="mk" x1="0" y1="0" x2="0" y2="${h * 3}" gradientUnits="userSpaceOnUse" spreadMethod="repeat">${[...T[th].rainbow, T[th].rainbow[0]].map((c, i, a) => `<stop offset="${(i / (a.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join('')}
    <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="0 ${-h * 3}" dur="8s" repeatCount="indefinite"/></linearGradient></defs>
  ${hs.map((k, i) => `<rect class="bar b${i}" x="${x + i * (w + gap)}" y="${y + h * (1 - k)}" width="${w}" height="${h * k}" rx="${w / 3.5}" fill="url(#mk)" style="transform-origin:${x + i * (w + gap) + w / 2}px ${y + h}px"/>`).join('')}`;
};

/* ---------- hero: three kinds of message, arriving one after another ---------- */
function hero(th) {
  const c = T[th], W = 1200, H = 380, per = 2.2, round = (per * KINDS.length + 2.4).toFixed(1);
  const bubbles = KINDS.map(([ic, kind, line, col], i) => {
    const x = 690, y = 58 + i * 98, a = acc(col, th), d = (i * per).toFixed(1);
    return `<g class="msg" style="animation-delay:${d}s">
      <rect x="${x}" y="${y}" width="454" height="80" rx="18" fill="${c.card}" stroke="${c.rule}" stroke-width="1.5"/>
      <rect x="${x}" y="${y}" width="454" height="80" rx="18" fill="${col}" fill-opacity="${th === 'dark' ? '.08' : '.06'}"/>
      <rect x="${x + 18}" y="${y + 16}" width="48" height="48" rx="14" fill="${col}" fill-opacity=".16" stroke="${col}" stroke-opacity=".5"/>
      ${icon(kitIcon(ic), x + 30, y + 28, 24, a)}
      <text x="${x + 82}" y="${y + 36}" font-size="19" font-weight="800" fill="${c.ink}">${kind}</text>
      <text x="${x + 82}" y="${y + 60}" font-size="15.5" fill="${c.ink2}">${esc(line)}</text>
    </g>`;
  }).join('\n');
  const body = `<defs>${rainbow(c.rainbow, 'rb')}
    <radialGradient id="g1"><stop offset="0" stop-color="${c.rainbow[3]}" stop-opacity="${th === 'dark' ? '.28' : '.12'}"/><stop offset="1" stop-color="${c.rainbow[3]}" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2"><stop offset="0" stop-color="${c.rainbow[0]}" stop-opacity="${th === 'dark' ? '.22' : '.10'}"/><stop offset="1" stop-color="${c.rainbow[0]}" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${c.ink}" fill-opacity="${th === 'dark' ? '.07' : '.09'}"/></pattern>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="24"/></clipPath></defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${c.bg}"/><rect width="${W}" height="${H}" fill="url(#dots)"/>
    <ellipse class="drift" cx="930" cy="160" rx="380" ry="260" fill="url(#g1)"/>
    <ellipse class="drift d2" cx="160" cy="400" rx="380" ry="200" fill="url(#g2)"/>
    ${bubbles}
    <rect x="0" y="${H - 3}" width="${W}" height="3" fill="url(#rb)"/>
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="23.5" stroke="${c.rule}"/>
  ${mark(64, 58, 30, th)}
  <text x="112" y="84" font-size="20" font-weight="800" letter-spacing="-.4" fill="${c.ink}">BENIBIX</text>
  <text x="208" y="83" font-size="15" fill="${c.ink3}">feedback</text>
  <text x="62" y="176" font-size="64" font-weight="800" letter-spacing="-2.2" fill="${c.ink}">Tell me</text>
  <text x="64" y="236" font-size="52" class="serif" fill="url(#rb)">what to build next.</text>
  <text x="64" y="290" font-size="19" fill="${c.ink2}">Feedback, bugs and ideas for ${LIVE} free tools.</text>
  <text x="64" y="318" font-size="19" fill="${c.ink2}">Public issues, read by the person who builds them.</text>`;
  const style = `.bar{animation:bars 3.6s cubic-bezier(.4,0,.2,1) infinite} .b1{animation-delay:.25s} .b2{animation-delay:.5s} @keyframes bars{50%{transform:scaleY(.6)}}
    .msg{animation:msg ${round}s ease-in-out infinite both} @keyframes msg{0%{opacity:.25;transform:translateX(0)} 6%{opacity:1;transform:translateX(-10px)} 16%{opacity:1;transform:translateX(-10px)} 24%,100%{opacity:.55;transform:translateX(0)}}
    .drift{animation:drift 18s ease-in-out infinite alternate} .d2{animation-duration:24s} @keyframes drift{to{transform:translate(-60px,30px)}}`;
  return svg(W, H, body, style);
}

/* ---------- how it works ---------- */
function steps(th) {
  const c = T[th], W = 1200, H = 210, cw = (W - 32) / 3;
  const s = [
    ['Pick the tool', 'Press Send feedback in any tool\'s', 'top bar, or choose its tile below.', '#2f7cf6'],
    ['Say what it is', 'Feedback, a bug or an idea.', 'Only the details are required.', '#8fd14f'],
    ['Post it here', 'From your own GitHub account.', 'I read every one and answer here.', '#ff6b3d'],
  ];
  const body = `<defs>${rainbow(c.rainbow, 'rb')}</defs>
  <path d="M ${cw / 2} 46 H ${W - cw / 2}" stroke="url(#rb)" stroke-width="2.5" stroke-dasharray="6 14" class="move"/>
  ${s.map(([t, a, b, col], i) => {
    const x = i * (cw + 16);
    return `<rect x="${x + .75}" y=".75" width="${cw - 1.5}" height="${H - 1.5}" rx="18" fill="${c.card}" stroke="${c.rule}" stroke-width="1.5"/>
      <text x="${x + 26}" y="62" font-size="38" class="serif" fill="${acc(col, th)}">0${i + 1}</text>
      <text x="${x + 26}" y="112" font-size="24" font-weight="800" letter-spacing="-.5" fill="${c.ink}">${esc(t)}</text>
      <text font-size="17" fill="${c.ink2}"><tspan x="${x + 26}" y="148">${esc(a)}</tspan><tspan x="${x + 26}" y="174">${esc(b)}</tspan></text>`;
  }).join('\n')}`;
  return svg(W, H, body, '.move{animation:move 1.6s linear infinite} @keyframes move{to{stroke-dashoffset:-40}}');
}

/* ---------- a row header and a tool's tile ---------- */
const PAD = 8;
function rowHead(row, th) {
  const c = T[th], W = 1200, H = 62;
  let x0 = 0;
  return svg(W, H, row.head.map(([cat, group, share]) => {
    const w = W * share, col = cat === 'BENIBIX' ? c.rainbow[3] : COLORS[cat], a = acc(col, th), x = x0 + PAD; x0 += w;
    const n = row.tools.filter(t => t.cat === cat).length;
    return `<rect x="${x}" y="${H - 10}" width="${w - 2 * PAD}" height="3" rx="1.5" fill="${col}"/>
      <rect x="${x + 2}" y="${H - 38}" width="12" height="12" rx="3.5" fill="${col}"/>
      <text x="${x + 24}" y="${H - 24}">${group ? `<tspan font-size="24" font-weight="800" letter-spacing="-.5" fill="${c.ink}">${esc(group)}</tspan><tspan dx="10" font-size="13" font-weight="800" letter-spacing="1.6" fill="${a}">${esc(cat.toUpperCase())}</tspan>` : `<tspan font-size="24" font-weight="800" letter-spacing="-.5" fill="${c.ink}">${esc(cat)}</tspan>`}</text>
      ${cat === 'BENIBIX' ? '' : `<text x="${x + w - 2 * PAD - 2}" y="${H - 24}" text-anchor="end" font-size="15" font-weight="700" fill="${c.ink3}">${n} ${n === 1 ? 'tool' : 'tools'}</text>`}`;
  }).join('\n'));
}
function tile(t, th, i, wide) {
  const c = T[th], W = wide ? 600 : 400, iw = W - 2 * PAD, ih = 132, H = ih + 2 * PAD, x = PAD, y = PAD;
  const col = t.cat === 'BENIBIX' ? c.rainbow[3 + (i % 2)] : COLORS[t.cat], a = acc(col, th);
  const round = 9.6, delay = (i * 0.6).toFixed(1);
  const body = `<defs><radialGradient id="gl" cx="1" cy="0" r="1.1"><stop offset="0" stop-color="${col}" stop-opacity="${th === 'dark' ? '.22' : '.11'}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>
  <g class="tile" style="transform-origin:${W / 2}px ${H / 2}px">
    <rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="16" fill="${c.card}"/>
    <rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="16" fill="url(#gl)"/>
    <rect x="${x + .75}" y="${y + .75}" width="${iw - 1.5}" height="${ih - 1.5}" rx="15.5" stroke="${c.rule}" stroke-width="1.5"/>
    <rect x="${x + 1}" y="${y + 1}" width="${iw - 2}" height="${ih - 2}" rx="15" stroke="${col}" stroke-width="2.5" class="ring"/>
    <rect x="${x + 20}" y="${y + 22}" width="52" height="52" rx="15" fill="${col}" fill-opacity=".15" stroke="${col}" stroke-opacity=".5"/>
    ${icon(t.icon, x + 32, y + 34, 28, a)}
    <text x="${x + 88}" y="${y + 46}" font-size="${t.name.length > 26 && !wide ? 17 : 20}" font-weight="800" letter-spacing="-.4" fill="${c.ink}">${esc(t.name)}</text>
    <text x="${x + 88}" y="${y + 70}" font-size="14.5" fill="${c.ink3}">${esc(t.note || 'Feedback, a bug or an idea')}</text>
    <rect x="${x + 20}" y="${y + ih - 38}" width="${iw - 40}" height="1" fill="${c.rule}"/>
    <text x="${x + 20}" y="${y + ih - 13}" font-size="13" font-weight="700" letter-spacing="1.2" fill="${a}">${esc(t.cat.toUpperCase())}</text>
    <text x="${x + iw - 20}" y="${y + ih - 13}" text-anchor="end" font-size="15" font-weight="800" fill="${a}">${t.id === 'new' ? 'Suggest it' : 'Send feedback'} <tspan class="chev">›</tspan></text>
  </g>`;
  const style = `.ring{opacity:0;animation:ring ${round}s ${delay}s ease-in-out infinite} @keyframes ring{0%,100%{opacity:0} 4%{opacity:1} 10%{opacity:1} 15%{opacity:0}}
    .tile{animation:lift ${round}s ${delay}s ease-in-out infinite} @keyframes lift{0%,100%{transform:none} 4%{transform:translateY(-3px)} 10%{transform:translateY(-3px)} 15%{transform:none}}`;
  return svg(W, H, body, style);
}

/* ---------- a section title ---------- */
function heading(kicker, title, th) {
  const c = T[th];
  return svg(1200, 96, `<defs>${rainbow(c.rainbow, 'rb')}</defs>
  <rect x="0" y="22" width="34" height="3" rx="1.5" fill="url(#rb)"/>
  <text x="46" y="28" font-size="14" font-weight="700" letter-spacing="2" fill="${c.ink3}">${esc(kicker.toUpperCase())}</text>
  <text x="0" y="76" font-size="38" font-weight="800" letter-spacing="-1.2" fill="${c.ink}">${esc(title[0])}<tspan class="serif" font-weight="400" fill="url(#rb)"> ${esc(title[1])}</tspan></text>`);
}

/* ---------- write ---------- */
const ALL = [...ROWS, SITE_ROW];
for (const th of ['dark', 'light']) {
  write('hero', th, hero(th));
  write('h-how', th, heading('How it works', ['Three steps,', 'one minute.'], th));
  write('how', th, steps(th));
  write('h-tools', th, heading('Pick a tool', ['One form,', 'your tool already picked.'], th));
  let k = 0;
  for (const row of ALL) {
    write(`row-${row.id}`, th, rowHead(row, th));
    for (const t of row.tools) write(`tile-${t.id}`, th, tile(t, th, k++, row.tools.length < 3));
  }
}
const pic = (name, alt, href, width) => {
  const p = `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${name}-dark.svg"><img alt="${esc(alt)}" src="assets/${name}-light.svg"${width ? ` width="${width}"` : ''}></picture>`;
  return href ? `<a href="${href}">${p}</a>` : p;
};
const readme = `<div align="center">

${pic('hero', `BENIBIX feedback. Tell me what to build next. Feedback, bugs and ideas for ${LIVE} free tools, as public issues.`, FORM)}
<br><br>
${pic('h-how', 'How it works: three steps, one minute.')}
${pic('how', 'Pick the tool. Say whether it is feedback, a bug or an idea. Post it here from your GitHub account.')}
<br><br>
${pic('h-tools', 'Pick a tool: one form, with your tool already picked.')}
${ALL.map(row => `${pic(`row-${row.id}`, row.head.map(([cat, group]) => group ? `${cat}: ${group}` : cat).join(' and '))}<br>
${row.tools.map(t => pic(`tile-${t.id}`, `${t.name}: ${t.id === 'new' ? 'suggest a new tool' : 'send feedback, a bug or an idea'}`, t.url, row.tools.length < 3 ? '50%' : '33.3%')).join('')}`).join('\n<br><br>\n')}
<br><br>

<sub>Issues here are public: anyone can read your message, your GitHub username and the page you sent it from, so leave out anything private.<br>
How this works with your data: <a href="https://tools.benibix.com/privacy/">privacy page</a>, section 2.6. The tools themselves: <a href="https://tools.benibix.com">tools.benibix.com</a>.<br>
These pictures are drawn by <code>scripts/gen.mjs</code> from the site's own data.</sub>

</div>
`;
fs.writeFileSync(path.join(here, 'README.md'), readme);

/* ---------- the one form, and the labels ---------- */
const TOOLS = ROWS.flatMap(r => r.tools);
// A to Z, so a tool is easy to find; the site and a new tool come last.
const options = [...TOOLS.map(t => t.name).sort((a, b) => a.localeCompare(b, 'en')), SITE_OPTION, NEW_OPTION];
const q = s => JSON.stringify(s);
const form = `# Written by scripts/gen.mjs from the site's live tools: edit there, not here.
name: Feedback
description: Send feedback, report a bug or suggest an idea for a BENIBIX tool or the site.
body:
  - type: markdown
    attributes:
      value: |
        Thanks for helping improve **BENIBIX**. Pick the tool, then tell me what happened or what you would like. Only the details are required besides the tool.

  - type: dropdown
    id: tool
    attributes:
      label: Which tool is it about?
      options:
${options.map(o => `        - ${q(o)}`).join('\n')}
    validations:
      required: true

  - type: dropdown
    id: type
    attributes:
      label: What kind of message is this?
      options:
        - "💬 Feedback (what you think)"
        - "🐞 Bug (something is broken or looks wrong)"
        - "💡 Idea (a feature or improvement)"
    validations:
      required: true

  - type: textarea
    id: details
    attributes:
      label: Details
      description: >-
        For a bug, what you did, what you expected and what happened instead.
        For an idea, what you are trying to do.
      placeholder: Tell me what happened, or what you would like to see.
    validations:
      required: true

  - type: input
    id: page
    attributes:
      label: Page
      description: The page you were on (filled in for you).
    validations:
      required: false

  - type: input
    id: contact
    attributes:
      label: How can I reach you? (optional)
      description: Email or handle, only if you want a reply outside this issue.
    validations:
      required: false
`;
const tdir = path.join(here, '.github/ISSUE_TEMPLATE');
for (const f of fs.readdirSync(tdir)) if (f !== 'config.yml') fs.rmSync(path.join(tdir, f));
fs.writeFileSync(path.join(tdir, 'feedback.yml'), form);
// Each tool's label is its name, as the app and the website show it (the label workflow adds it).
const labels = Object.fromEntries([...TOOLS.map(t => [t.name, t.name]), [SITE_OPTION, SITE_OPTION], [NEW_OPTION, NEW_OPTION],
  ['💬 Feedback (what you think)', 'feedback'], ['🐞 Bug (something is broken or looks wrong)', 'bug'], ['💡 Idea (a feature or improvement)', 'idea']]);
fs.writeFileSync(path.join(here, '.github/tool-labels.json'), JSON.stringify(labels, null, 2) + '\n');
console.log(`wrote ${fs.readdirSync(out).length} pictures and README.md`);

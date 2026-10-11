/* The live tools of the BENIBIX repo, read from its own files, so a tool that goes live shows up
   here by running the generator again: every tool.json under tools/ with "status": "live", in the
   order and colours of data/groups.ts. Shared, word for word, by the profile repo
   (Behnia137/Behnia137) and the feedback repo (behnia137/benibix-feedback). */
import fs from 'node:fs';
import path from 'node:path';

export function liveTools(repo) {
  const src = fs.readFileSync(path.join(repo, 'data/groups.ts'), 'utf8');
  const groups = [...src.matchAll(/path: '([^']+)', name: '([^']+)', accent: '(#[0-9a-fA-F]{6})'/g)].map(([, p, name, accent]) => ({ path: p, name, accent }));
  const group = p => groups.find(g => g.path === p);
  const sprite = fs.readFileSync(path.join(repo, 'public/tool-icons.svg'), 'utf8');
  const icon = id => (sprite.match(new RegExp(`<symbol id="${id}"[^>]*>([\\s\\S]*?)</symbol>`)) || [])[1] || '';
  const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === 'app') continue; const f = path.join(d, e.name); if (e.isDirectory()) walk(f, o); else if (e.name === 'tool.json') o.push(f); } return o; };
  const tools = walk(path.join(repo, 'tools')).map(f => ({ f, t: JSON.parse(fs.readFileSync(f, 'utf8')) })).filter(x => x.t.status === 'live').map(({ f, t }) => {
    const p = path.relative(path.join(repo, 'tools'), path.dirname(f)), parts = p.split('/');
    const sub = parts.length > 2 ? group(parts.slice(0, 2).join('/')) : null, top = group(parts[0]);
    if (!top) throw new Error(`${p}: no category "${parts[0]}" in data/groups.ts`);
    const s = (t.stats || [])[0] || { n: '', label: '' };
    // A long name on two lines: before "for", or at the space nearest the middle.
    const at = t.name.includes(' for ') ? t.name.indexOf(' for ') : t.name.length > 18 ? t.name.lastIndexOf(' ', Math.ceil(t.name.length / 2) + 2) : -1;
    return {
      path: p, slug: p.replace(/\//g, '-'), id: t.id, name: t.name, pitch: t.pitch, stats: t.stats || [],
      lines: at > 0 ? [t.name.slice(0, at), t.name.slice(at + 1)] : [t.name],
      n: s.n, label: String(s.label).split(',')[0],
      cat: top.name, sub: sub ? sub.name : '', group: sub ? sub.path : top.path, color: top.accent,
      order: groups.indexOf(sub || top), url: `https://tools.benibix.com/${p}/`, icon: icon(t.id),
    };
  }).sort((a, b) => a.order - b.order || a.path.localeCompare(b.path));
  /* Rows of at most three: a group with a sub-group (an agent) has rows of its own; small
     categories share a row, each with its part of the header. */
  const rows = [];
  for (const g of [...new Set(tools.map(t => t.group))]) {
    const ts = tools.filter(t => t.group === g), first = ts[0];
    const last = rows[rows.length - 1];
    if (!first.sub && last && !last.sub && last.tools.length + ts.length <= 3) { last.tools.push(...ts); last.head.push([first.cat, '', ts.length]); continue; }
    for (let i = 0; i < ts.length; i += 3) rows.push({ id: g.replace(/\//g, '-') + (i ? `-${i / 3 + 1}` : ''), sub: first.sub, head: [[first.cat, first.sub, Math.min(3, ts.length - i)]], tools: ts.slice(i, i + 3) });
  }
  for (const r of rows) { const n = r.tools.length; r.head = r.head.map(([c, s, k]) => [c, s, k / n]); r.id = r.head.length > 1 ? r.tools.map(t => t.group).filter((v, i, a) => a.indexOf(v) === i).join('-') : r.id; }
  return { tools, rows };
}

/* Counts the site states elsewhere too: courses and lessons in content/tutorials. */
export function courseCounts(repo) {
  const dir = path.join(repo, 'content/tutorials');
  const courses = fs.readdirSync(dir).filter(d => fs.statSync(path.join(dir, d)).isDirectory());
  const lessons = courses.reduce((n, d) => n + fs.readdirSync(path.join(dir, d)).filter(f => /^\d\d-.*\.md$/.test(f)).length, 0);
  return { courses: courses.length, lessons };
}

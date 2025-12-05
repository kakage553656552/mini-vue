function parseAttrs(str) {
  const attrs = {};
  const attrRE = /([^\s=]+)(?:="([^"]*)")?/g;
  let m;
  while ((m = attrRE.exec(str || ''))) {
    attrs[m[1]] = m[2] || true;
  }
  return attrs;
}

function hashId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function preprocessStyle(content, lang) {
  if (!lang || lang === 'css') return content;
  const isScss = lang === 'scss';
  if (!isScss) return content;
  const vars = {};
  content = content.replace(/^\s*\$([\w-]+)\s*:\s*([^;]+);?/gm, (m, key, val) => {
    vars[key] = val.trim();
    return '';
  });
  content = content.replace(/\$([\w-]+)/g, (m, key) => (vars[key] !== undefined ? vars[key] : m));
  const flattened = [];
  const blockRE = /([^{]+)\{([^{}]+)\}/g;
  let match;
  while ((match = blockRE.exec(content))) {
    const selector = match[1].trim();
    const body = match[2].trim();
    const nested = [];
    const innerBody = body.replace(/([^{]+)\{([^{}]+)\}/g, (m2, sel2, body2) => {
      nested.push({ selector: sel2.trim(), body: body2.trim() });
      return '';
    }).trim();
    if (innerBody) {
      flattened.push(`${selector}{${innerBody}}`);
    }
    nested.forEach(n => {
      flattened.push(`${selector} ${n.selector}{${n.body}}`);
    });
  }
  return flattened.length ? flattened.join('\n') : content;
}

function scopeCss(css, scopeId) {
  if (!scopeId) return css;
  return css.replace(/([^\r\n,{}]+)(\s*\{[^}]*\})/g, (m, selector, body) => {
    const clean = selector.trim();
    if (!clean || clean.startsWith('@')) return m;
    const scoped = clean
      .split(',')
      .map(s => `${s.trim()}[data-v-${scopeId}]`)
      .join(', ');
    return `${scoped}${body}`;
  });
}

export function parseSFC(source) {
  const templateMatch = source.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
  const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  const styles = [];
  const styleRE = /<style([\s\S]*?)>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = styleRE.exec(source))) {
    const attrs = parseAttrs(m[1]);
    styles.push({
      content: (m[2] || '').trim(),
      scoped: !!attrs.scoped,
      lang: attrs.lang || 'css'
    });
  }
  const template = templateMatch ? templateMatch[1].trim() : '';
  const script = scriptMatch ? scriptMatch[1].trim() : '';
  const scopeId = styles.some(s => s.scoped) ? `sfc-${hashId(template + script)}` : '';
  return { template, script, styles, scopeId };
}

export function compileSFCStyles(styles, scopeId) {
  styles.forEach((style, idx) => {
    let css = preprocessStyle(style.content, style.lang);
    if (style.scoped && scopeId) {
      css = scopeCss(css, scopeId);
    }
    const id = `sfc-style-${scopeId || 'global'}-${idx}`;
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  });
}


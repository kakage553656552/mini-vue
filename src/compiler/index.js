const ncname = '[a-zA-Z_][\\w\\-\\.]*';
const qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";
const startTagOpen = new RegExp("^<" + qnameCapture);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp("^<\\/" + qnameCapture + "[^>]*>");
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;

function parse(template) {
  let root;
  let currentParent;
  let stack = [];

  while (template) {
    let textEnd = template.indexOf('<');
    if (textEnd === 0) {
      const startTagMatch = parseStartTag();
      if (startTagMatch) {
        start(startTagMatch.tagName, startTagMatch.attrs);
        continue;
      }
      const endTagMatch = template.match(endTag);
      if (endTagMatch) {
        advance(endTagMatch[0].length);
        end(endTagMatch[1]);
        continue;
      }
    }

    let text;
    if (textEnd >= 0) {
      text = template.substring(0, textEnd);
    }
    if (textEnd < 0) {
      text = template;
    }

    if (text) {
      advance(text.length);
      chars(text);
    }
  }

  function advance(n) {
    template = template.substring(n);
  }

  function parseStartTag() {
    const start = template.match(startTagOpen);
    if (start) {
      const match = {
        tagName: start[1],
        attrs: []
      };
      advance(start[0].length);
      let end, attr;
      while (!(end = template.match(startTagClose)) && (attr = template.match(/^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/))) {
        advance(attr[0].length);
        match.attrs.push({
          name: attr[1],
          value: attr[3] || attr[4] || attr[5]
        });
      }
      if (end) {
        advance(end[0].length);
        return match;
      }
    }
  }

  function start(tagName, attrs) {
    const element = {
      type: 1,
      tag: tagName,
      attrsList: attrs,
      attrsMap: makeAttrsMap(attrs),
      parent: currentParent,
      children: []
    };

    if (!root) {
      root = element;
    }

    if (currentParent) {
      currentParent.children.push(element);
    }

    stack.push(element);
    currentParent = element;
  }

  function end(tagName) {
    stack.length -= 1;
    currentParent = stack[stack.length - 1];
  }

  function chars(text) {
    text = text.trim();
    if (text.length > 0) {
        if (currentParent) { // Only add text if we have a parent
            currentParent.children.push({
                type: 3,
                text
            });
        }
    }
  }

  return root;
}

function makeAttrsMap(attrs) {
  const map = {};
  for (let i = 0, l = attrs.length; i < l; i++) {
    map[attrs[i].name] = attrs[i].value;
  }
  return map;
}

function generate(el) {
  const children = genChildren(el);
  const code = `_c('${el.tag}', ${
    el.attrsList.length ? JSON.stringify(makeAttrsMap(el.attrsList)) : 'undefined'
  }${
    children ? `,${children}` : ''
  })`;
  return code;
}

function genChildren(el) {
  const children = el.children;
  if (children.length) {
    return `[${children.map(c => gen(c)).join(',')}]`;
  }
}

function gen(node) {
  if (node.type === 1) {
    return generate(node);
  } else {
    const text = node.text;
    if (defaultTagRE.test(text)) {
      const tokens = [];
      let lastIndex = (defaultTagRE.lastIndex = 0);
      let match, index;
      while ((match = defaultTagRE.exec(text))) {
        index = match.index;
        if (index > lastIndex) {
          tokens.push(JSON.stringify(text.slice(lastIndex, index)));
        }
        tokens.push(`_s(${match[1].trim()})`);
        lastIndex = index + match[0].length;
      }
      if (lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)));
      }
      return `_v(${tokens.join('+')})`;
    } else {
      return `_v(${JSON.stringify(text)})`;
    }
  }
}

export function compileToFunctions(template) {
  const ast = parse(template);
  const code = `with(this){return ${generate(ast)}}`;
  // eslint-disable-next-line no-new-func
  const render = new Function(code);
  return render;
}


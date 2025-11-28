const ncname = '[a-zA-Z_][\\w\\-\\.]*';
const qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";
const startTagOpen = new RegExp("^<" + qnameCapture);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp("^<\\/" + qnameCapture + "[^>]*>");
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
const comment = /^<!\--/;

// Elements that are self-closing (void elements)
function isUnaryTag(tag) {
  const unaryTags = 'area,base,br,col,embed,hr,img,input,keygen,link,meta,param,source,track,wbr';
  return unaryTags.split(',').indexOf(tag) > -1;
}

function parse(template) {
  let root;
  let currentParent;
  let stack = [];

  while (template) {
    let textEnd = template.indexOf('<');
    if (textEnd === 0) {
      // Comment:
      if (comment.test(template)) {
        const commentEnd = template.indexOf('-->');

        if (commentEnd >= 0) {
          advance(commentEnd + 3);
          continue;
        }
      }
      
      const startTagMatch = parseStartTag();
      if (startTagMatch) {
        start(startTagMatch.tagName, startTagMatch.attrs, startTagMatch.unary);
        continue;
      }
      const endTagMatch = template.match(endTag);
      if (endTagMatch) {
        advance(endTagMatch[0].length);
        end(endTagMatch[1]);
        continue;
      }
    }

    let text, rest, next;
    if (textEnd >= 0) {
      rest = template.slice(textEnd);
      while (
        !endTag.test(rest) &&
        !startTagOpen.test(rest) &&
        !comment.test(rest)
      ) {
        next = rest.indexOf('<', 1);
        if (next < 0) break;
        textEnd += next;
        rest = template.slice(textEnd);
      }
      text = template.substring(0, textEnd);
    }
    if (textEnd < 0) {
      text = template;
    }

    if (text) {
      advance(text.length);
    }

    if (textEnd === 0 && !text) {
        text = template.substring(0, 1);
        advance(1);
    }

    if (text) {
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
        match.unary = isUnaryTag(match.tagName) || !!end[1];
        advance(end[0].length);
        return match;
      }
    }
  }

  function start(tagName, attrs, unary) {
    const element = {
      type: 1,
      tag: tagName,
      attrsList: attrs,
      attrsMap: makeAttrsMap(attrs),
      parent: currentParent,
      children: []
    };

    processFor(element);
    processIf(element);

    if (!root) {
      root = element;
    }

    if (currentParent) {
      currentParent.children.push(element);
    }

    if (!unary) {
        stack.push(element);
        currentParent = element;
    }
  }

  function end(tagName) {
    // Simple validation: check if tagName matches current stack top
    // If not, we might have unclosed tags or mismatch
    // For simplicity in this mini-vue, we just try to find the match in stack and pop until there.
    let pos = 0;
    for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].tag.toLowerCase() === tagName.toLowerCase()) {
            break;
        }
    }
    
    if (pos >= 0) {
        stack.length = pos;
        currentParent = stack[stack.length - 1];
    }
  }

  function chars(text) {
    text = text.trim();
    if (text.length > 0) {
        if (currentParent) { 
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

function processFor(el) {
  let exp;
  if ((exp = getAndRemoveAttr(el, 'v-for'))) {
    const inMatch = exp.match(/([a-zA-Z_][\w]*)\s+(?:in|of)\s+(.*)/);
    if (inMatch) {
      el.for = inMatch[2].trim();
      el.alias = inMatch[1].trim();
    }
  }
}

function processIf(el) {
  let exp;
  if ((exp = getAndRemoveAttr(el, 'v-if'))) {
    el.if = exp;
  }
}

function getAndRemoveAttr(el, name) {
  let val;
  if ((val = el.attrsMap[name]) != null) {
    const list = el.attrsList;
    for (let i = 0; i < list.length; i++) {
      if (list[i].name === name) {
        list.splice(i, 1);
        break;
      }
    }
  }
  return val;
}

function generate(el) {
  if (el.for && !el.forProcessed) {
    return genFor(el);
  }
  if (el.if && !el.ifProcessed) {
    return genIf(el);
  }

  const children = genChildren(el);
  const code = `_c('${el.tag}', ${
    el.attrsList.length ? JSON.stringify(makeAttrsMap(el.attrsList)) : 'undefined'
  }${
    children ? `,${children}` : ''
  })`;
  return code;
}

function genFor(el) {
  el.forProcessed = true;
  return `_l((${el.for}), function(${el.alias}) { return ${generate(el)} })`;
}

function genIf(el) {
  el.ifProcessed = true;
  return `(${el.if}) ? ${generate(el)} : _e()`;
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

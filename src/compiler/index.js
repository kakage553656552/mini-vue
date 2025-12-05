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
      if (element.elseif || element.else) {
        processIfConditions(element, currentParent);
      } else {
        currentParent.children.push(element);
      }
    }

    if (!unary) {
        stack.push(element);
        currentParent = element;
    }
  }
  
  function processIfConditions(el, parent) {
    const prev = findPrevElement(parent.children);
    if (prev && prev.if) {
      prev.ifConditions.push({
        exp: el.elseif,
        block: el
      });
    } else {
      parent.children.push(el);
    }
  }
  
  function findPrevElement(children) {
    let i = children.length;
    while (i--) {
      if (children[i].type === 1) {
        return children[i];
      }
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
    el.ifConditions = [{ exp, block: el }];
  } else if ((exp = getAndRemoveAttr(el, 'v-else-if'))) {
    el.elseif = exp;
  } else if (getAndRemoveAttr(el, 'v-else') !== undefined) {
    el.else = true;
  }
  
  if ((exp = getAndRemoveAttr(el, 'v-show'))) {
    el.show = exp;
  }
  
  if ((exp = getAndRemoveAttr(el, 'ref'))) {
    el.ref = exp;
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
  if (el.tag === 'slot') {
    const name = (el.attrsMap && el.attrsMap.name) || 'default';
    const children = genChildren(el);
    return `_t("${name}"${children ? `,${children}` : ''})`;
  }

  const data = genData(el);
  const children = genChildren(el);
  const code = `_c('${el.tag}'${
    data ? `,${data}` : ',undefined'
  }${
    children ? `,${children}` : ''
  })`;
  return code;
}

function genData(el) {
  let data = '{';
  const attrs = el.attrsList;
  const dirs = [];
  
  if (el.ref) {
    data += `"ref":"${el.ref}",`;
  }
  
  if (el.show) {
    data += `"v-show":(${el.show}),`;
  }
  
  if (attrs && attrs.length) {
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      const name = attr.name;
      let value = attr.value;
      if (name.startsWith('v-') && name !== 'v-model' && name !== 'v-show' && !name.startsWith('v-on') && !name.startsWith('v-bind') && name !== 'v-if' && name !== 'v-else' && name !== 'v-else-if' && name !== 'v-for') {
        dirs.push({ name: name.slice(2), value });
        continue;
      }
      
      if (name.startsWith('@') || name.startsWith('v-on:')) {
        let event = name.startsWith('@') ? name.slice(1) : name.slice(5);
        const modifiers = {};
        const modifierMatch = event.match(/^([^.]+)(.*)$/);
        if (modifierMatch) {
          event = modifierMatch[1];
          const modifierStr = modifierMatch[2];
          if (modifierStr) {
            modifierStr.split('.').forEach(m => {
              if (m) modifiers[m] = true;
            });
          }
        }
        
        let handler = '';
        
        const keyModifiers = ['enter', 'tab', 'delete', 'esc', 'space', 'up', 'down', 'left', 'right'];
        const hasKeyModifier = keyModifiers.some(k => modifiers[k]);
        
        if (hasKeyModifier) {
          const keyCode = {
            enter: 13, tab: 9, delete: 46, esc: 27, space: 32,
            up: 38, down: 40, left: 37, right: 39
          };
          const keyName = keyModifiers.find(k => modifiers[k]);
          handler += `if($event.keyCode !== ${keyCode[keyName]}) return;`;
        }
        
        if (modifiers.stop) handler += `$event.stopPropagation();`;
        if (modifiers.prevent) handler += `$event.preventDefault();`;
        
        const simplePathRE = /^[A-Za-z_$][\w$]*$/;
        if (value.includes('(')) {
          handler += `return (${value});`;
        } else if (simplePathRE.test(value)) {
          handler += `return this.${value}($event);`;
        } else {
          handler += `return (${value});`;
        }
        data += `"@${event}":function($event){${handler}},`;
      } else if (name.startsWith(':') || name.startsWith('v-bind:')) {
        const attrName = name.startsWith(':') ? name.slice(1) : name.slice(7);
        data += `"${attrName}":${value},`;
      } else if (name === 'v-model') {
        data += `"v-model":"${value}",`;
      } else if (name.startsWith('style')) {
        data += `"${name}":"${value}",`;
      } else {
        data += `"${name}":"${value}",`;
      }
    }
  }
  
  if (dirs.length) {
    data += `"directives":${JSON.stringify(dirs)},`;
  }
  data = data.replace(/,$/, '') + '}';
  return data === '{}' ? null : data;
}

function genFor(el) {
  el.forProcessed = true;
  return `_l((${el.for}), function(${el.alias}) { return ${generate(el)} })`;
}

function genIf(el) {
  el.ifProcessed = true;
  return genIfConditions(el.ifConditions.slice());
}

function genIfConditions(conditions) {
  if (!conditions.length) {
    return '_e()';
  }
  
  const condition = conditions.shift();
  if (condition.exp) {
    return `(${condition.exp}) ? ${generate(condition.block)} : ${genIfConditions(conditions)}`;
  } else {
    return generate(condition.block);
  }
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

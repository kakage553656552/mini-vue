export default class VNode {
  constructor(tag, data, children, text, elm, context) {
    this.tag = tag;
    this.data = data;
    this.children = children;
    this.text = text;
    this.elm = elm;
    this.context = context;
    this.key = data && data.key;
  }
}

export function createTextVNode(text) {
  return new VNode(undefined, undefined, undefined, String(text));
}

export function createElementVNode(tag, data, children, context) {
  if (Array.isArray(children)) {
    children = normalizeChildren(children);
  }
  return new VNode(tag, data, children, undefined, undefined, context);
}

function normalizeChildren(children) {
  // Simple flatten for now (one level deep, sufficient for compiler generated code)
  // Using reduce/concat can be slow, manual loop is better for perf in hot paths
  const res = [];
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (Array.isArray(c)) {
        for (let j = 0; j < c.length; j++) {
            if (c[j]) res.push(c[j]);
        }
    } else if (c) {
        res.push(c);
    }
  }
  return res;
}

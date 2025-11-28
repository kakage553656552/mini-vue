export default class VNode {
  constructor(tag, data, children, text, elm, context) {
    this.tag = tag;
    this.data = data;
    this.children = children;
    this.text = text;
    this.elm = elm;
    this.context = context;
  }
}

export function createTextVNode(text) {
  return new VNode(undefined, undefined, undefined, String(text));
}

export function createElementVNode(tag, data, children, context) {
  return new VNode(tag, data, children, undefined, undefined, context);
}

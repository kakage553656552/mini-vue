import { isReservedTag, resolveSlots } from '../util/index.js';

export default class VNode {
  constructor(tag, data, children, text, elm, context, componentOptions) {
    this.tag = tag;
    this.data = data || {};
    this.children = children;
    this.text = text;
    this.elm = elm;
    this.context = context;
    this.key = data && data.key;
    this.componentOptions = componentOptions;
    this.componentInstance = undefined;
    this.parent = undefined;
  }
}

export function createTextVNode(text) {
  return new VNode(undefined, undefined, undefined, String(text));
}

export function createElementVNode(tag, data, children, context) {
  data = data || {};
  const scopeId = context && context.$options && context.$options._scopeId;
  if (scopeId && !data[`data-v-${scopeId}`]) {
    data[`data-v-${scopeId}`] = '';
  }
  if (Array.isArray(children)) {
    children = normalizeChildren(children);
  }
  if (tag === 'component' && data && data.is) {
    return createComponentVNode(data.is, data, children, context);
  }
  if (typeof tag === 'string' && context && !isReservedTag(tag)) {
    return createComponentVNode(tag, data, children, context);
  }
  return new VNode(tag, data, children, undefined, undefined, context);
}

function normalizeChildren(children) {
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

function createComponentVNode(tag, data, children, context) {
  const Ctor = resolveComponent(context, tag);
  if (!Ctor) {
    return new VNode(tag, data, children, undefined, undefined, context);
  }
  const propsData = extractProps(data);
  const listeners = extractListeners(data);
  const slots = resolveSlots(children);
  const componentOptions = { Ctor, tag, propsData, listeners, children, slots };
  const vnode = new VNode(tag, data, undefined, undefined, undefined, context, componentOptions);
  return vnode;
}

function resolveComponent(context, tag) {
  if (!context) return;
  const local = context.$options && context.$options.components && context.$options.components[tag];
  const global = context.constructor && context.constructor.options && context.constructor.options.components && context.constructor.options.components[tag];
  const Ctor = local || global;
  if (!Ctor) return;
  if (typeof Ctor === 'function') return Ctor;
  return context.constructor.extend(Ctor);
}

function extractProps(data) {
  if (!data) return {};
  const props = {};
  Object.keys(data).forEach(key => {
    if (key === 'ref' || key === 'key' || key === 'slot' || key === 'directives' || key === 'transition' || key.startsWith('@')) return;
    props[key] = data[key];
  });
  return props;
}

function extractListeners(data) {
  if (!data) return {};
  const on = {};
  Object.keys(data).forEach(key => {
    if (key.startsWith('@')) {
      on[key.slice(1)] = data[key];
    }
  });
  return on;
}

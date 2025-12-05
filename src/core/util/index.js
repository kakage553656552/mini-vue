import { observe, defineReactive } from '../observer/index.js';

export function set(target, key, val) {
  if (Array.isArray(target) && typeof key === 'number') {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    return val;
  }
  
  if (key in target && !(key in Object.prototype)) {
    target[key] = val;
    return val;
  }
  
  const ob = target.__ob__;
  if (!ob) {
    target[key] = val;
    return val;
  }
  
  defineReactive(ob.value, key, val);
  ob.dep.notify();
  return val;
}

export function del(target, key) {
  if (Array.isArray(target) && typeof key === 'number') {
    target.splice(key, 1);
    return;
  }
  
  const ob = target.__ob__;
  if (!Object.prototype.hasOwnProperty.call(target, key)) {
    return;
  }
  
  delete target[key];
  if (!ob) {
    return;
  }
  ob.dep.notify();
}

export function mergeOptions(parent = {}, child = {}) {
  const options = {};
  const keys = new Set([...Object.keys(parent), ...Object.keys(child)]);
  keys.forEach(key => {
    if (key === 'components' || key === 'directives' || key === 'filters') {
      options[key] = Object.assign(Object.create(null), parent[key] || {}, child[key] || {});
    } else if (typeof parent[key] === 'object' && typeof child[key] === 'object') {
      options[key] = Object.assign({}, parent[key], child[key]);
    } else {
      options[key] = child[key] !== undefined ? child[key] : parent[key];
    }
  });
  return options;
}

const reservedTags = 'div,span,input,button,form,ul,li,p,h1,h2,h3,h4,h5,h6,section,header,footer,main,nav,textarea,select,option,label,img,a,table,thead,tbody,tr,td,th,article,aside,canvas,svg,path,circle';
export function isReservedTag(tag) {
  return reservedTags.split(',').indexOf(tag) > -1;
}

export function resolveSlots(children) {
  const slots = {};
  if (!children) return slots;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!child) continue;
    const name = child.data && child.data.slot ? child.data.slot : 'default';
    (slots[name] || (slots[name] = [])).push(child);
  }
  return slots;
}

export function noop() {}


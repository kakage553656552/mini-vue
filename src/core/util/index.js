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


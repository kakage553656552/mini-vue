import { observe } from '../observer/index.js';
import Watcher from '../observer/watcher.js';

export function stateMixin(Vue) {
  Vue.prototype.$watch = function (expOrFn, cb) {
    const vm = this;
    new Watcher(vm, expOrFn, cb);
  };
}

export function initState(vm) {
  const opts = vm.$options;
  if (opts.data) {
    initData(vm);
  }
  // We can add initProps, initComputed, initMethods here
  if (opts.methods) {
      initMethods(vm, opts.methods);
  }
}

function initData(vm) {
  let data = vm.$options.data;
  data = vm._data = typeof data === 'function' ? data.call(vm) : data || {};

  const keys = Object.keys(data);
  for (let i = 0; i < keys.length; i++) {
    proxy(vm, '_data', keys[i]);
  }

  observe(data);
}

function initMethods(vm, methods) {
    for (const key in methods) {
        vm[key] = typeof methods[key] !== 'function' ? (() => {}) : methods[key].bind(vm);
    }
}

function proxy(target, sourceKey, key) {
  Object.defineProperty(target, key, {
    enumerable: true,
    configurable: true,
    get() {
      return target[sourceKey][key];
    },
    set(val) {
      target[sourceKey][key] = val;
    }
  });
}


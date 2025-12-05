import { initState } from './state.js';
import { callHook } from './lifecycle.js';
import { mergeOptions, resolveSlots } from '../util/index.js';
import { defineReactive } from '../observer/index.js';

let uid = 0;

export function initMixin(Vue) {
  Vue.prototype._init = function (options) {
    const vm = this;
    vm._uid = ++uid;
    vm._isVue = true;
    options = options || {};
    vm.$parent = options.parent;
    vm.$children = [];
    if (vm.$parent) {
      vm.$parent.$children.push(vm);
    }
    vm.$options = mergeOptions(vm.constructor.options || {}, options);
    vm._renderChildren = options._renderChildren;
    vm.$vnode = options._parentVnode || null;
    vm.$slots = options._slots || resolveSlots(vm._renderChildren);
    vm._events = Object.create(null);
    vm._provided = vm.$parent && vm.$parent._provided ? vm.$parent._provided : {};
    if (options._parentListeners) {
      for (const name in options._parentListeners) {
        vm.$on(name, options._parentListeners[name]);
      }
    }

    initInjections(vm);
    callHook(vm, 'beforeCreate');
    initState(vm);
    initProvide(vm);
    callHook(vm, 'created');

    if (vm.$options.el) {
      vm.$mount(vm.$options.el);
    }
  };
}

function initProvide(vm) {
  const provide = vm.$options.provide;
  if (!provide) return;
  vm._provided = typeof provide === 'function' ? provide.call(vm) : provide;
}

function initInjections(vm) {
  const inject = vm.$options.inject;
  if (!inject) return;
  const normalized = normalizeInject(inject);
  const result = resolveInject(vm, normalized);
  if (!result) return;
  Object.keys(result).forEach(key => {
    const info = result[key];
    defineInjectProperty(vm, key, info.source, info.from, info.value);
  });
}

function normalizeInject(inject) {
  if (Array.isArray(inject)) {
    const res = {};
    for (let i = 0; i < inject.length; i++) {
      res[inject[i]] = { from: inject[i] };
    }
    return res;
  }
  return inject;
}

function resolveInject(vm, inject) {
  const result = {};
  for (const key in inject) {
    const from = inject[key].from || inject[key];
    let source = vm;
    while (source) {
      if (source._provided && Object.prototype.hasOwnProperty.call(source._provided, from)) {
        result[key] = { source, from, value: source._provided[from] };
        break;
      }
      source = source.$parent;
    }
    if (!result[key]) {
      if (Object.prototype.hasOwnProperty.call(inject[key], 'default')) {
        const def = inject[key].default;
        const val = typeof def === 'function' ? def.call(vm) : def;
        result[key] = { source: vm, from, value: val };
      }
    }
  }
  return result;
}

function defineInjectProperty(vm, key, source, from, value) {
  Object.defineProperty(vm, key, {
    enumerable: true,
    configurable: true,
    get() {
      if (source && source._provided && Object.prototype.hasOwnProperty.call(source._provided, from)) {
        return source._provided[from];
      }
      return value;
    },
    set() {}
  });
}

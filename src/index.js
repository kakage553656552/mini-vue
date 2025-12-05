import Vue from './core/instance/index.js';
import { compileToFunctions } from './compiler/index.js';
import { patch } from './core/vdom/patch.js';
import Watcher from './core/observer/watcher.js';
import VNode, { createElementVNode, createTextVNode } from './core/vdom/vnode.js';
import { callHook } from './core/instance/lifecycle.js';

Vue.prototype.__patch__ = patch;

// Render Helpers
Vue.prototype._c = function (tag, data, children) {
    return createElementVNode(tag, data, children, this);
};
Vue.prototype._v = function (text) {
    return createTextVNode(text);
};
Vue.prototype._s = function (val) {
    return val == null ? '' : typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
};
Vue.prototype._l = function (val, render) {
    let ret, i, l, keys, key;
    if (Array.isArray(val) || typeof val === 'string') {
        ret = new Array(val.length);
        for (i = 0, l = val.length; i < l; i++) {
            ret[i] = render(val[i], i);
        }
    } else if (typeof val === 'number') {
        ret = new Array(val);
        for (i = 0; i < val; i++) {
            ret[i] = render(i + 1, i);
        }
    } else if (typeof val === 'object') {
        keys = Object.keys(val);
        ret = new Array(keys.length);
        for (i = 0, l = keys.length; i < l; i++) {
            key = keys[i];
            ret[i] = render(val[key], key, i);
        }
    }
    return ret;
};
Vue.prototype._e = function () {
    return createTextVNode('');
};
Vue.prototype._t = function (name, fallback) {
  const slot = this.$slots && this.$slots[name];
  if (slot && slot.length) return slot;
  if (fallback) return Array.isArray(fallback) ? fallback : [fallback];
  return [];
};

Vue.prototype._render = function () {
  const vm = this;
  const { render } = vm.$options;
  let vnode;
  if (render) {
      vnode = render.call(vm);
  }
  return vnode;
};

// Mount
Vue.prototype.$mount = function (el) {
  const vm = this;
  if (typeof el === 'string') {
    el = document.querySelector(el);
  }
  if (!el) {
    el = document.createElement('div');
  }
  vm.$el = el;

  const options = vm.$options;
  if (!options.render) {
    let template = options.template;
    if (!template && el) {
      template = el.outerHTML;
    }
    if (template) {
        const render = compileToFunctions(template);
        options.render = render;
    }
  }

  mountComponent(vm, el);
};

function mountComponent(vm, el) {
  callHook(vm, 'beforeMount');
  
  const updateComponent = () => {
    vm._update(vm._render());
  };

  const watcher = new Watcher(vm, updateComponent, () => {}, {
    before() {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate');
      }
    }
  });
  vm._watcher = watcher;
  
  vm._isMounted = true;
  callHook(vm, 'mounted');
}

export default Vue;

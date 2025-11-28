import Vue from './core/instance/index.js';
import { compileToFunctions } from './compiler/index.js';
import { patch } from './core/vdom/patch.js';
import Watcher from './core/observer/watcher.js';
import VNode, { createElementVNode, createTextVNode } from './core/vdom/vnode.js';

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

// Lifecycle
Vue.prototype._update = function (vnode) {
  const vm = this;
  const prevVnode = vm._vnode;
  vm._vnode = vnode;
  if (!prevVnode) {
    // initial render
    vm.$el = patch(vm.$el, vnode);
  } else {
    // updates
    vm.$el = patch(prevVnode, vnode);
  }
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
  el = document.querySelector(el);
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
  const updateComponent = () => {
    vm._update(vm._render());
  };

  new Watcher(vm, updateComponent, () => {});
}

export default Vue;

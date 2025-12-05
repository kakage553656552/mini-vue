import { callHook } from './lifecycle.js';
import Watcher from '../observer/watcher.js';

export function lifecycleMixin(Vue) {
  Vue.prototype._update = function (vnode) {
    const vm = this;
    const prevVnode = vm._vnode;
    vm._vnode = vnode;
    if (!prevVnode) {
      // initial render
      vm.$el = vm.__patch__(vm.$el, vnode);
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode);
    }
  };

  Vue.prototype.$forceUpdate = function () {
    const vm = this;
    if (vm._watcher) {
      vm._watcher.update();
    }
  };

  Vue.prototype.$destroy = function () {
    const vm = this;
    if (vm._isBeingDestroyed) {
      return;
    }
    callHook(vm, 'beforeDestroy');
    vm._isBeingDestroyed = true;
    const parent = vm.$parent;
    if (parent && !parent._isBeingDestroyed) {
      const index = parent.$children.indexOf(vm);
      if (index > -1) parent.$children.splice(index, 1);
    }
    if (vm._watcher) {
      vm._watcher.teardown();
    }
    const i = vm._computedWatchers && Object.keys(vm._computedWatchers).length;
    vm._isDestroyed = true;
    vm.__patch__(vm._vnode, null);
    callHook(vm, 'destroyed');
  };
}


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
    
    // remove self from parent
    // (Skipped as we don't have full component parent-child relationship yet)
    // const parent = vm.$parent;
    // if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
    //   remove(parent.$children, vm);
    // }
    
    // teardown watchers
    if (vm._watcher) {
      vm._watcher.teardown();
    }
    const i = vm._computedWatchers && Object.keys(vm._computedWatchers).length;
    // (Ideally we should track all user watchers in a list and teardown them too)
    // For now, our simple implementation doesn't track all user watchers in a central list
    
    vm._isDestroyed = true;
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null);
    
    callHook(vm, 'destroyed');
    
    // turn off all instance listeners.
    // (Skipped as we don't have event system yet)
  };
}


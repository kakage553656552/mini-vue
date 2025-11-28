import { nextTick } from '../util/next-tick.js';

export function renderMixin(Vue) {
  Vue.prototype.$nextTick = function (fn) {
    return nextTick(fn, this);
  };
}


import { initMixin } from './init.js';
import { stateMixin } from './state.js';
import { renderMixin } from './render.js';
import { lifecycleMixin } from './lifecycle-mixin.js';

function Vue(options) {
  this._init(options);
}

initMixin(Vue);
stateMixin(Vue);
lifecycleMixin(Vue);
renderMixin(Vue);

export default Vue;

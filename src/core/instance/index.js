import { initMixin } from './init.js';
import { stateMixin } from './state.js';

function Vue(options) {
  this._init(options);
}

initMixin(Vue);
stateMixin(Vue);

export default Vue;


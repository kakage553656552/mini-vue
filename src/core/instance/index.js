import { initMixin } from './init.js';
import { stateMixin } from './state.js';
import { renderMixin } from './render.js';
import { lifecycleMixin } from './lifecycle-mixin.js';
import { eventsMixin } from './events.js';
import { set, del } from '../util/index.js';
import { initGlobalAPI } from '../global-api/index.js';

function Vue(options) {
  this._init(options);
}

initMixin(Vue);
stateMixin(Vue);
lifecycleMixin(Vue);
renderMixin(Vue);
eventsMixin(Vue);

Vue.prototype.$set = set;
Vue.prototype.$delete = del;

Vue.set = set;
Vue.delete = del;

initGlobalAPI(Vue);

export default Vue;

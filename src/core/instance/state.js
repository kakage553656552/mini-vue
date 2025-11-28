import { observe } from '../observer/index.js';
import Watcher from '../observer/watcher.js';
import Dep from '../observer/dep.js';

export function stateMixin(Vue) {
  Vue.prototype.$watch = function (expOrFn, cb, options) {
    const vm = this;
    if (typeof cb === 'object') {
      options = cb;
      cb = cb.handler;
    }
    options = options || {};
    options.user = true;
    const watcher = new Watcher(vm, expOrFn, cb, options);
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value);
      } catch (error) {
        console.error(`Error in immediate watcher "${expOrFn}":`, error);
      }
    }
    return function unwatchFn() {
      if (watcher.active) {
        watcher.teardown();
      }
    };
  };
}

export function initState(vm) {
  const opts = vm.$options;
  if (opts.data) {
    initData(vm);
  } else {
    observe(vm._data = {});
  }
  
  if (opts.computed) initComputed(vm, opts.computed);
  if (opts.watch) initWatch(vm, opts.watch);
  if (opts.methods) initMethods(vm, opts.methods);
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

const computedWatcherOptions = { lazy: true };

function initComputed(vm, computed) {
  const watchers = vm._computedWatchers = Object.create(null);

  for (const key in computed) {
    const userDef = computed[key];
    const getter = typeof userDef === 'function' ? userDef : userDef.get;

    // create internal watcher for the computed property.
    watchers[key] = new Watcher(
      vm,
      getter || (() => {}),
      () => {},
      computedWatcherOptions
    );

    if (!(key in vm)) {
      defineComputed(vm, key, userDef);
    }
  }
}

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: () => {},
  set: () => {}
};

function defineComputed(target, key, userDef) {
  const shouldCache = true; // !isServerRendering()
  if (typeof userDef === 'function') {
      sharedPropertyDefinition.get = shouldCache
        ? createComputedGetter(key)
        : userDef;
      sharedPropertyDefinition.set = () => {};
  } else {
      sharedPropertyDefinition.get = userDef.get
        ? shouldCache && userDef.cache !== false
          ? createComputedGetter(key)
          : userDef.get
        : () => {};
      sharedPropertyDefinition.set = userDef.set || (() => {});
  }
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

function createComputedGetter(key) {
  return function computedGetter() {
    const watcher = this._computedWatchers && this._computedWatchers[key];
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate();
      }
      if (Dep.target) {
        watcher.depend();
      }
      return watcher.value;
    }
  };
}

function initWatch(vm, watch) {
  for (const key in watch) {
    const handler = watch[key];
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher(vm, keyOrFn, handler, options) {
  if (typeof handler === 'object' && handler !== null) {
    options = handler;
    handler = handler.handler;
  }
  if (typeof handler === 'string') {
    handler = vm[handler];
  }
  return vm.$watch(keyOrFn, handler, options);
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

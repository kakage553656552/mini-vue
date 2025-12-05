(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

  let uid$2 = 0;

  class Dep {
    constructor() {
      this.id = uid$2++;
      this.subs = [];
    }

    addSub(sub) {
      if (this.subs.indexOf(sub) === -1) {
        this.subs.push(sub);
      }
    }

    removeSub(sub) {
      remove(this.subs, sub);
    }

    depend() {
      if (Dep.target) {
        Dep.target.addDep(this);
      }
    }

    notify() {
      // Stabilize the subscriber list first
      const subs = this.subs.slice();
      for (let i = 0, l = subs.length; i < l; i++) {
        subs[i].update();
      }
    }
  }

  Dep.target = null;
  const targetStack = [];

  function pushTarget(target) {
    targetStack.push(target);
    Dep.target = target;
  }

  function popTarget() {
    targetStack.pop();
    Dep.target = targetStack[targetStack.length - 1];
  }

  function remove(arr, item) {
    if (arr.length) {
      const index = arr.indexOf(item);
      if (index > -1) {
        return arr.splice(index, 1);
      }
    }
  }

  /*
   * 拦截数组方法
   */

  const arrayProto = Array.prototype;
  const arrayMethods = Object.create(arrayProto);

  const methodsToPatch = [
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse'
  ];

  /**
   * Intercept mutating methods and emit events
   */
  methodsToPatch.forEach(function (method) {
    // cache original method
    const original = arrayProto[method];
    Object.defineProperty(arrayMethods, method, {
        value: function mutator(...args) {
            const result = original.apply(this, args);
            const ob = this.__ob__;
            let inserted;
            switch (method) {
                case 'push':
                case 'unshift':
                    inserted = args;
                    break;
                case 'splice':
                    inserted = args.slice(2);
                    break;
            }
            if (inserted) ob.observeArray(inserted);
            // notify change
            ob.dep.notify();
            return result;
        },
        enumerable: false,
        writable: true,
        configurable: true
    });
  });

  const hasProto = '__proto__' in {};

  function def(obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
      value: val,
      enumerable: !!enumerable,
      writable: true,
      configurable: true
    });
  }

  class Observer {
    constructor(value) {
      this.value = value;
      this.dep = new Dep();
      def(value, '__ob__', this);

      if (Array.isArray(value)) {
        if (hasProto) {
          protoAugment(value, arrayMethods);
        } else {
          copyAugment(value, arrayMethods, Object.keys(arrayMethods));
        }
        this.observeArray(value);
      } else {
        this.walk(value);
      }
    }

    walk(obj) {
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        defineReactive(obj, keys[i]);
      }
    }

    observeArray(items) {
      for (let i = 0, l = items.length; i < l; i++) {
        observe(items[i]);
      }
    }
  }

  function protoAugment (target, src) {
    /* eslint-disable no-proto */
    target.__proto__ = src;
    /* eslint-enable no-proto */
  }

  function copyAugment (target, src, keys) {
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      def(target, key, src[key]);
    }
  }

  function observe(value) {
    if (!value || typeof value !== 'object') {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(value, '__ob__') && value.__ob__ instanceof Observer) {
        return value.__ob__;
    }
    return new Observer(value);
  }

  function defineReactive(obj, key, val) {
    const dep = new Dep();
    
    const property = Object.getOwnPropertyDescriptor(obj, key);
    if (property && property.configurable === false) {
      return;
    }

    const getter = property && property.get;
    const setter = property && property.set;

    if ((!getter || setter) && arguments.length === 2) {
      val = obj[key];
    }

    let childOb = observe(val);

    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get: function reactiveGetter() {
        const value = getter ? getter.call(obj) : val;
        if (Dep.target) {
          dep.depend();
          if (childOb) {
              childOb.dep.depend();
              if (Array.isArray(value)) {
                  dependArray(value);
              }
          }
        }
        return value;
      },
      set: function reactiveSetter(newVal) {
        const value = getter ? getter.call(obj) : val;
        if (newVal === value) {
          return;
        }
        if (setter) {
          setter.call(obj, newVal);
        } else {
          val = newVal;
        }
        childOb = observe(newVal);
        dep.notify();
      }
    });
  }

  function dependArray (value) {
    for (let e, i = 0, l = value.length; i < l; i++) {
      e = value[i];
      e && e.__ob__ && e.__ob__.dep.depend();
      if (Array.isArray(e)) {
        dependArray(e);
      }
    }
  }

  /* eslint-disable no-unused-vars */
  const callbacks = [];
  let pending = false;

  function flushCallbacks() {
    pending = false;
    const copies = callbacks.slice(0);
    callbacks.length = 0;
    for (let i = 0; i < copies.length; i++) {
      copies[i]();
    }
  }

  let timerFunc;

  if (typeof Promise !== 'undefined') {
    const p = Promise.resolve();
    timerFunc = () => {
      p.then(flushCallbacks);
    };
  } else {
    // Fallback
    timerFunc = () => {
      setTimeout(flushCallbacks, 0);
    };
  }

  function nextTick(cb, ctx) {
    let _resolve;
    callbacks.push(() => {
      if (cb) {
        try {
          cb.call(ctx);
        } catch (e) {
          console.error(e);
        }
      } else if (_resolve) {
        _resolve(ctx);
      }
    });
    if (!pending) {
      pending = true;
      timerFunc();
    }
    if (!cb && typeof Promise !== 'undefined') {
      return new Promise(resolve => {
        _resolve = resolve;
      });
    }
  }

  function callHook(vm, hook) {
    const handlers = vm.$options[hook];
    if (handlers) {
      if (Array.isArray(handlers)) {
          for (let i = 0; i < handlers.length; i++) {
              try {
                  handlers[i].call(vm);
              } catch (e) {
                  handleError(e, vm, `${hook} hook`);
              }
          }
      } else if (typeof handlers === 'function') {
          try {
              handlers.call(vm);
          } catch (e) {
              handleError(e, vm, `${hook} hook`);
          }
      }
    }
  }

  function handleError(err, vm, info) {
    let cur = vm;
    while (cur) {
      const errorCapturedHooks = cur.$options && cur.$options.errorCaptured;
      if (errorCapturedHooks) {
        for (let i = 0; i < errorCapturedHooks.length; i++) {
          try {
            const capture = errorCapturedHooks[i].call(cur, err, vm, info);
            if (capture === false) return;
          } catch (e) {
            globalHandleError(e, cur, 'errorCaptured hook');
          }
        }
      }
      cur = cur.$parent;
    }
    globalHandleError(err, vm, info);
  }

  function globalHandleError(err, vm, info) {
    const handler = vm && vm.constructor && vm.constructor.config && vm.constructor.config.errorHandler;
    if (handler) {
      try {
        handler.call(vm, err, vm, info);
        return;
      } catch (e) {
        console.error(e);
      }
    }
    console.error(err);
  }

  const queue = [];
  let has = {};
  let waiting = false;
  let flushing = false;
  let index = 0;

  function flushSchedulerQueue() {
    flushing = true;
    let watcher, id;

    // Sort queue before flush.
    // This ensures that:
    // 1. Components are updated from parent to child.
    // 2. A component's user watchers are run before its render watcher.
    // 3. If a component is destroyed during a parent component's watcher run, its watchers can be skipped.
    queue.sort((a, b) => a.id - b.id);

    for (index = 0; index < queue.length; index++) {
      watcher = queue[index];
      if (watcher.before) {
          watcher.before();
      }
      id = watcher.id;
      has[id] = null;
      watcher.run();
    }

    // keep copies of post queues before resetting state
    const updatedQueue = queue.slice();

    resetSchedulerState();
    
    callUpdatedHooks(updatedQueue);
  }

  function callUpdatedHooks(queue) {
    let i = queue.length;
    while (i--) {
      const watcher = queue[i];
      const vm = watcher.vm;
      if (vm && vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'updated');
      }
    }
  }

  function resetSchedulerState() {
    index = 0;
    queue.length = 0;
    has = {};
    waiting = false;
    flushing = false;
  }

  function queueWatcher(watcher) {
    const id = watcher.id;
    if (has[id] == null) {
      has[id] = true;
      if (!flushing) {
        queue.push(watcher);
      } else {
        // if already flushing, splice the watcher based on its id
        // if already past its id, it will be run next immediately.
        let i = queue.length - 1;
        while (i > index && queue[i].id > watcher.id) {
          i--;
        }
        queue.splice(i + 1, 0, watcher);
      }
      // queue the flush
      if (!waiting) {
        waiting = true;
        nextTick(flushSchedulerQueue);
      }
    }
  }

  let uid$1 = 0;

  class Watcher {
    constructor(vm, expOrFn, cb, options) {
      this.vm = vm;
      if (options) {
          this.lazy = !!options.lazy;
          this.before = options.before;
          this.dirty = this.lazy; 
      } else {
          this.lazy = false;
          this.dirty = false;
      }
      this.id = ++uid$1;
      this.active = true;
      this.cb = cb;
      this.deps = [];
      this.depIds = new Set();
      
      // Parse expOrFn to a getter function
      if (typeof expOrFn === 'function') {
        this.getter = expOrFn;
      } else {
        this.getter = parsePath(expOrFn);
      }
      this.value = this.lazy ? undefined : this.get();
    }

    get() {
      pushTarget(this);
      let value;
      const vm = this.vm;
      try {
        value = this.getter.call(vm, vm);
      } catch (e) {
        handleError(e, vm, 'watcher getter');
      } finally {
        popTarget();
      }
      return value;
    }

    addDep(dep) {
      const id = dep.id;
      if (!this.depIds.has(id)) {
          this.depIds.add(id);
          this.deps.push(dep);
          dep.addSub(this);
      }
    }

    update() {
      if (this.lazy) {
          this.dirty = true;
      } else {
          queueWatcher(this);
      }
    }

    evaluate() {
        this.value = this.get();
        this.dirty = false;
    }

    depend() {
        let i = this.deps.length;
        while (i--) {
            this.deps[i].depend();
        }
    }

    teardown() {
      if (this.active) {
        let i = this.deps.length;
        while (i--) {
          this.deps[i].removeSub(this);
        }
        this.active = false;
      }
    }

    run() {
      if (this.active) {
        const value = this.get();
        const oldValue = this.value;
        if (value !== oldValue || typeof value === 'object') {
          this.value = value;
          if (this.cb) {
              try {
                this.cb.call(this.vm, value, oldValue);
              } catch (e) {
                handleError(e, this.vm, 'watcher callback');
              }
          }
        }
      }
    }
  }

  const bailRE = /[^\w.$]/;
  function parsePath(path) {
    if (bailRE.test(path)) {
      return;
    }
    const segments = path.split('.');
    return function (obj) {
      for (let i = 0; i < segments.length; i++) {
        if (!obj) return;
        obj = obj[segments[i]];
      }
      return obj;
    };
  }

  function stateMixin(Vue) {
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

  function initState(vm) {
    const opts = vm.$options;
    if (opts.props) initProps(vm, opts.props, opts.propsData);
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
    if (typeof userDef === 'function') {
        sharedPropertyDefinition.get = createComputedGetter(key)
          ;
        sharedPropertyDefinition.set = () => {};
    } else {
        sharedPropertyDefinition.get = userDef.get
          ? userDef.cache !== false
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

  function initProps(vm, propsOptions, propsData) {
    const props = vm._props = {};
    propsData = propsData || {};
    const normalized = normalizePropsOptions(propsOptions);
    const keys = Object.keys(normalized);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = propsData[key] !== undefined ? propsData[key] : normalized[key];
      defineReactive(props, key, value);
      if (!(key in vm)) {
        proxy(vm, '_props', key);
      }
    }
  }

  function normalizePropsOptions(options) {
    if (Array.isArray(options)) {
      const res = {};
      for (let i = 0; i < options.length; i++) {
        res[options[i]] = undefined;
      }
      return res;
    }
    return options || {};
  }

  function set(target, key, val) {
    if (Array.isArray(target) && typeof key === 'number') {
      target.length = Math.max(target.length, key);
      target.splice(key, 1, val);
      return val;
    }
    
    if (key in target && !(key in Object.prototype)) {
      target[key] = val;
      return val;
    }
    
    const ob = target.__ob__;
    if (!ob) {
      target[key] = val;
      return val;
    }
    
    defineReactive(ob.value, key, val);
    ob.dep.notify();
    return val;
  }

  function del(target, key) {
    if (Array.isArray(target) && typeof key === 'number') {
      target.splice(key, 1);
      return;
    }
    
    const ob = target.__ob__;
    if (!Object.prototype.hasOwnProperty.call(target, key)) {
      return;
    }
    
    delete target[key];
    if (!ob) {
      return;
    }
    ob.dep.notify();
  }

  function mergeOptions$1(parent = {}, child = {}) {
    const options = {};
    const keys = new Set([...Object.keys(parent), ...Object.keys(child)]);
    keys.forEach(key => {
      if (key === 'components' || key === 'directives' || key === 'filters') {
        options[key] = Object.assign(Object.create(null), parent[key] || {}, child[key] || {});
      } else if (typeof parent[key] === 'object' && typeof child[key] === 'object') {
        options[key] = Object.assign({}, parent[key], child[key]);
      } else {
        options[key] = child[key] !== undefined ? child[key] : parent[key];
      }
    });
    return options;
  }

  const reservedTags = 'div,span,input,button,form,ul,li,p,h1,h2,h3,h4,h5,h6,section,header,footer,main,nav,textarea,select,option,label,img,a,table,thead,tbody,tr,td,th,article,aside,canvas,svg,path,circle';
  function isReservedTag(tag) {
    return reservedTags.split(',').indexOf(tag) > -1;
  }

  function resolveSlots(children) {
    const slots = {};
    if (!children) return slots;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child) continue;
      const name = child.data && child.data.slot ? child.data.slot : 'default';
      (slots[name] || (slots[name] = [])).push(child);
    }
    return slots;
  }

  let uid = 0;

  function initMixin(Vue) {
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
      vm.$options = mergeOptions$1(vm.constructor.options || {}, options);
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

  function renderMixin(Vue) {
    Vue.prototype.$nextTick = function (fn) {
      return nextTick(fn, this);
    };
  }

  function lifecycleMixin(Vue) {
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
      vm._computedWatchers && Object.keys(vm._computedWatchers).length;
      vm._isDestroyed = true;
      vm.__patch__(vm._vnode, null);
      callHook(vm, 'destroyed');
    };
  }

  function eventsMixin(Vue) {
    Vue.prototype.$on = function (event, fn) {
      const vm = this;
      if (Array.isArray(event)) {
        for (let i = 0; i < event.length; i++) {
          vm.$on(event[i], fn);
        }
      } else {
        (vm._events[event] || (vm._events[event] = [])).push(fn);
      }
      return vm;
    };

    Vue.prototype.$once = function (event, fn) {
      const vm = this;
      function on() {
        vm.$off(event, on);
        fn.apply(vm, arguments);
      }
      on.fn = fn;
      vm.$on(event, on);
      return vm;
    };

    Vue.prototype.$off = function (event, fn) {
      const vm = this;
      if (!arguments.length) {
        vm._events = Object.create(null);
        return vm;
      }
      if (Array.isArray(event)) {
        for (let i = 0; i < event.length; i++) {
          vm.$off(event[i], fn);
        }
        return vm;
      }
      const cbs = vm._events[event];
      if (!cbs) {
        return vm;
      }
      if (!fn) {
        vm._events[event] = null;
        return vm;
      }
      let cb;
      let i = cbs.length;
      while (i--) {
        cb = cbs[i];
        if (cb === fn || cb.fn === fn) {
          cbs.splice(i, 1);
          break;
        }
      }
      return vm;
    };

    Vue.prototype.$emit = function (event) {
      const vm = this;
      const cbs = vm._events[event];
      if (cbs) {
        const args = Array.prototype.slice.call(arguments, 1);
        for (let i = 0, l = cbs.length; i < l; i++) {
          try {
            cbs[i].apply(vm, args);
          } catch (e) {
            console.error(`Error in event handler for "${event}":`, e);
          }
        }
      }
      return vm;
    };
  }

  function initGlobalAPI(VueConstructor) {
    VueConstructor.options = Object.create(null);
    VueConstructor.options.components = Object.create(null);
    VueConstructor.options.directives = Object.create(null);
    VueConstructor.options.filters = Object.create(null);
    VueConstructor.config = { errorHandler: null, devtools: true };
    VueConstructor.version = '2.7.0-mini';
    VueConstructor.util = { defineReactive };
    const installedPlugins = [];

    VueConstructor.use = function (plugin, ...args) {
      if (installedPlugins.indexOf(plugin) > -1) {
        return this;
      }
      args.unshift(this);
      if (typeof plugin === 'function') {
        plugin.apply(null, args);
      } else if (plugin && typeof plugin.install === 'function') {
        plugin.install.apply(plugin, args);
      }
      installedPlugins.push(plugin);
      return this;
    };

    VueConstructor.extend = function (extendOptions) {
      extendOptions = extendOptions || {};
      const Super = this;
      const Sub = function VueComponent(options) {
        this._init(options);
      };
      Sub.prototype = Object.create(Super.prototype);
      Sub.prototype.constructor = Sub;
      Sub.options = Object.assign({}, Super.options, extendOptions);
      Sub.super = Super;
      Sub.extend = Super.extend;
      Sub.component = Super.component;
      Sub.directive = Super.directive;
      Sub.filter = Super.filter;
      return Sub;
    };

    VueConstructor.options.components['keep-alive'] = VueConstructor.extend(KeepAlive());
    VueConstructor.options.components['transition'] = VueConstructor.extend(Transition());

    VueConstructor.component = function (id, definition) {
      if (!definition) {
        return this.options.components[id];
      }
      if (typeof definition === 'object') {
        definition.name = definition.name || id;
        definition = VueConstructor.extend(definition);
      }
      this.options.components[id] = definition;
      return definition;
    };

    VueConstructor.directive = function (id, definition) {
      if (!definition) {
        return this.options.directives[id];
      }
      this.options.directives[id] = definition;
      return definition;
    };

    VueConstructor.filter = function (id, definition) {
      if (!definition) {
        return this.options.filters[id];
      }
      this.options.filters[id] = definition;
      return definition;
    };

    VueConstructor.mixin = function (mixin) {
      this.options = mergeOptions(this.options, mixin);
      return this;
    };
  }

  function mergeOptions(parent, child) {
    const options = {};
    for (let key in parent) {
      mergeField(key);
    }
    for (let key in child) {
      if (!Object.prototype.hasOwnProperty.call(parent, key)) {
        mergeField(key);
      }
    }
    function mergeField(key) {
      options[key] = child[key] || parent[key];
    }
    return options;
  }

  function KeepAlive(VueConstructor) {
    return {
      name: 'keep-alive',
      props: { include: null, exclude: null },
      render() {
        const slot = this.$slots && this.$slots.default;
        const vnode = slot && slot[0];
        if (!vnode) return;
        const key = vnode.key || (vnode.componentOptions && vnode.componentOptions.tag) || '*';
        this._cache = this._cache || {};
        if (this._cache[key]) {
          const cached = this._cache[key];
          vnode.componentInstance = cached.componentInstance;
          vnode.elm = cached.elm;
        } else {
          this._cache[key] = vnode;
        }
        vnode.data = vnode.data || {};
        vnode.data.keepAlive = true;
        return vnode;
      }
    };
  }

  function Transition(VueConstructor) {
    return {
      name: 'transition',
      props: { name: 'v', duration: 300 },
      render() {
        const slot = this.$slots && this.$slots.default;
        if (!slot || !slot.length) return;
        const vnode = slot[0];
        vnode.data = vnode.data || {};
        vnode.data.transition = { name: this.name || 'v', duration: this.duration || 300 };
        return vnode;
      }
    };
  }

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

  const ncname = '[a-zA-Z_][\\w\\-\\.]*';
  const qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";
  const startTagOpen = new RegExp("^<" + qnameCapture);
  const startTagClose = /^\s*(\/?)>/;
  const endTag = new RegExp("^<\\/" + qnameCapture + "[^>]*>");
  const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
  const comment = /^<!\--/;

  // Elements that are self-closing (void elements)
  function isUnaryTag(tag) {
    const unaryTags = 'area,base,br,col,embed,hr,img,input,keygen,link,meta,param,source,track,wbr';
    return unaryTags.split(',').indexOf(tag) > -1;
  }

  function parse(template) {
    let root;
    let currentParent;
    let stack = [];

    while (template) {
      let textEnd = template.indexOf('<');
      if (textEnd === 0) {
        // Comment:
        if (comment.test(template)) {
          const commentEnd = template.indexOf('-->');

          if (commentEnd >= 0) {
            advance(commentEnd + 3);
            continue;
          }
        }
        
        const startTagMatch = parseStartTag();
        if (startTagMatch) {
          start(startTagMatch.tagName, startTagMatch.attrs, startTagMatch.unary);
          continue;
        }
        const endTagMatch = template.match(endTag);
        if (endTagMatch) {
          advance(endTagMatch[0].length);
          end(endTagMatch[1]);
          continue;
        }
      }

      let text, rest, next;
      if (textEnd >= 0) {
        rest = template.slice(textEnd);
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest)
        ) {
          next = rest.indexOf('<', 1);
          if (next < 0) break;
          textEnd += next;
          rest = template.slice(textEnd);
        }
        text = template.substring(0, textEnd);
      }
      if (textEnd < 0) {
        text = template;
      }

      if (text) {
        advance(text.length);
      }

      if (textEnd === 0 && !text) {
          text = template.substring(0, 1);
          advance(1);
      }

      if (text) {
          chars(text);
      }
    }

    function advance(n) {
      template = template.substring(n);
    }

    function parseStartTag() {
      const start = template.match(startTagOpen);
      if (start) {
        const match = {
          tagName: start[1],
          attrs: []
        };
        advance(start[0].length);
        let end, attr;
        while (!(end = template.match(startTagClose)) && (attr = template.match(/^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/))) {
          advance(attr[0].length);
          match.attrs.push({
            name: attr[1],
            value: attr[3] || attr[4] || attr[5]
          });
        }
        if (end) {
          match.unary = isUnaryTag(match.tagName) || !!end[1];
          advance(end[0].length);
          return match;
        }
      }
    }

    function start(tagName, attrs, unary) {
      const element = {
        type: 1,
        tag: tagName,
        attrsList: attrs,
        attrsMap: makeAttrsMap(attrs),
        parent: currentParent,
        children: []
      };

      processFor(element);
      processIf(element);

      if (!root) {
        root = element;
      }

      if (currentParent) {
        if (element.elseif || element.else) {
          processIfConditions(element, currentParent);
        } else {
          currentParent.children.push(element);
        }
      }

      if (!unary) {
          stack.push(element);
          currentParent = element;
      }
    }
    
    function processIfConditions(el, parent) {
      const prev = findPrevElement(parent.children);
      if (prev && prev.if) {
        prev.ifConditions.push({
          exp: el.elseif,
          block: el
        });
      } else {
        parent.children.push(el);
      }
    }
    
    function findPrevElement(children) {
      let i = children.length;
      while (i--) {
        if (children[i].type === 1) {
          return children[i];
        }
      }
    }

    function end(tagName) {
      // Simple validation: check if tagName matches current stack top
      // If not, we might have unclosed tags or mismatch
      // For simplicity in this mini-vue, we just try to find the match in stack and pop until there.
      let pos = 0;
      for (pos = stack.length - 1; pos >= 0; pos--) {
          if (stack[pos].tag.toLowerCase() === tagName.toLowerCase()) {
              break;
          }
      }
      
      if (pos >= 0) {
          stack.length = pos;
          currentParent = stack[stack.length - 1];
      }
    }

    function chars(text) {
      text = text.trim();
      if (text.length > 0) {
          if (currentParent) { 
              currentParent.children.push({
                  type: 3,
                  text
              });
          }
      }
    }

    return root;
  }

  function makeAttrsMap(attrs) {
    const map = {};
    for (let i = 0, l = attrs.length; i < l; i++) {
      map[attrs[i].name] = attrs[i].value;
    }
    return map;
  }

  function processFor(el) {
    let exp;
    if ((exp = getAndRemoveAttr(el, 'v-for'))) {
      const inMatch = exp.match(/([a-zA-Z_][\w]*)\s+(?:in|of)\s+(.*)/);
      if (inMatch) {
        el.for = inMatch[2].trim();
        el.alias = inMatch[1].trim();
      }
    }
  }

  function processIf(el) {
    let exp;
    if ((exp = getAndRemoveAttr(el, 'v-if'))) {
      el.if = exp;
      el.ifConditions = [{ exp, block: el }];
    } else if ((exp = getAndRemoveAttr(el, 'v-else-if'))) {
      el.elseif = exp;
    } else if (getAndRemoveAttr(el, 'v-else') !== undefined) {
      el.else = true;
    }
    
    if ((exp = getAndRemoveAttr(el, 'v-show'))) {
      el.show = exp;
    }
    
    if ((exp = getAndRemoveAttr(el, 'ref'))) {
      el.ref = exp;
    }
  }

  function getAndRemoveAttr(el, name) {
    let val;
    if ((val = el.attrsMap[name]) != null) {
      const list = el.attrsList;
      for (let i = 0; i < list.length; i++) {
        if (list[i].name === name) {
          list.splice(i, 1);
          break;
        }
      }
    }
    return val;
  }

  function generate(el, options) {
    if (el.for && !el.forProcessed) {
      return genFor(el, options);
    }
    if (el.if && !el.ifProcessed) {
      return genIf(el, options);
    }
    if (el.tag === 'slot') {
      const name = (el.attrsMap && el.attrsMap.name) || 'default';
      const children = genChildren(el, options);
      return `_t("${name}"${children ? `,${children}` : ''})`;
    }

    const data = genData(el, options);
    const children = genChildren(el, options);
    const code = `_c('${el.tag}'${
    data ? `,${data}` : ',undefined'
  }${
    children ? `,${children}` : ''
  })`;
    return code;
  }

  function genData(el, options) {
    let data = '{';
    const attrs = el.attrsList;
    const dirs = [];
    
    if (options && options.scopeId) {
      data += `"data-v-${options.scopeId}":"",`;
    }

    if (el.ref) {
      data += `"ref":"${el.ref}",`;
    }
    
    if (el.show) {
      data += `"v-show":(${el.show}),`;
    }
    
    if (attrs && attrs.length) {
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        const name = attr.name;
        let value = attr.value;
        if (name.startsWith('v-') && name !== 'v-model' && name !== 'v-show' && !name.startsWith('v-on') && !name.startsWith('v-bind') && name !== 'v-if' && name !== 'v-else' && name !== 'v-else-if' && name !== 'v-for') {
          dirs.push({ name: name.slice(2), value });
          continue;
        }
        
        if (name.startsWith('@') || name.startsWith('v-on:')) {
          let event = name.startsWith('@') ? name.slice(1) : name.slice(5);
          const modifiers = {};
          const modifierMatch = event.match(/^([^.]+)(.*)$/);
          if (modifierMatch) {
            event = modifierMatch[1];
            const modifierStr = modifierMatch[2];
            if (modifierStr) {
              modifierStr.split('.').forEach(m => {
                if (m) modifiers[m] = true;
              });
            }
          }
          
          let handler = '';
          
          const keyModifiers = ['enter', 'tab', 'delete', 'esc', 'space', 'up', 'down', 'left', 'right'];
          const hasKeyModifier = keyModifiers.some(k => modifiers[k]);
          
          if (hasKeyModifier) {
            const keyCode = {
              enter: 13, tab: 9, delete: 46, esc: 27, space: 32,
              up: 38, down: 40, left: 37, right: 39
            };
            const keyName = keyModifiers.find(k => modifiers[k]);
            handler += `if($event.keyCode !== ${keyCode[keyName]}) return;`;
          }
          
          if (modifiers.stop) handler += `$event.stopPropagation();`;
          if (modifiers.prevent) handler += `$event.preventDefault();`;
          
          const simplePathRE = /^[A-Za-z_$][\w$]*$/;
          if (value.includes('(')) {
            handler += `return (${value});`;
          } else if (simplePathRE.test(value)) {
            handler += `return this.${value}($event);`;
          } else {
            handler += `return (${value});`;
          }
          data += `"@${event}":function($event){${handler}},`;
        } else if (name.startsWith(':') || name.startsWith('v-bind:')) {
          const attrName = name.startsWith(':') ? name.slice(1) : name.slice(7);
          data += `"${attrName}":${value},`;
        } else if (name === 'v-model') {
          data += `"v-model":"${value}",`;
        } else if (name.startsWith('style')) {
          data += `"${name}":"${value}",`;
        } else {
          data += `"${name}":"${value}",`;
        }
      }
    }
    
    if (dirs.length) {
      data += `"directives":${JSON.stringify(dirs)},`;
    }
    data = data.replace(/,$/, '') + '}';
    return data === '{}' ? null : data;
  }

  function genFor(el, options) {
    el.forProcessed = true;
    return `_l((${el.for}), function(${el.alias}) { return ${generate(el, options)} })`;
  }

  function genIf(el, options) {
    el.ifProcessed = true;
    return genIfConditions(el.ifConditions.slice(), options);
  }

  function genIfConditions(conditions, options) {
    if (!conditions.length) {
      return '_e()';
    }
    
    const condition = conditions.shift();
    if (condition.exp) {
      return `(${condition.exp}) ? ${generate(condition.block, options)} : ${genIfConditions(conditions, options)}`;
    } else {
      return generate(condition.block, options);
    }
  }

  function genChildren(el, options) {
    const children = el.children;
    if (children.length) {
      return `[${children.map(c => gen(c, options)).join(',')}]`;
    }
  }

  function gen(node, options) {
    if (node.type === 1) {
      return generate(node, options);
    } else {
      const text = node.text;
      if (defaultTagRE.test(text)) {
        const tokens = [];
        let lastIndex = (defaultTagRE.lastIndex = 0);
        let match, index;
        while ((match = defaultTagRE.exec(text))) {
          index = match.index;
          if (index > lastIndex) {
            tokens.push(JSON.stringify(text.slice(lastIndex, index)));
          }
          tokens.push(`_s(${match[1].trim()})`);
          lastIndex = index + match[0].length;
        }
        if (lastIndex < text.length) {
          tokens.push(JSON.stringify(text.slice(lastIndex)));
        }
        return `_v(${tokens.join('+')})`;
      } else {
        return `_v(${JSON.stringify(text)})`;
      }
    }
  }

  function compileToFunctions(template, options = {}) {
    const ast = parse(template);
    const code = `with(this){return ${generate(ast, options)}}`;
    // eslint-disable-next-line no-new-func
    const render = new Function(code);
    return render;
  }

  function parseAttrs(str) {
    const attrs = {};
    const attrRE = /([^\s=]+)(?:="([^"]*)")?/g;
    let m;
    while ((m = attrRE.exec(str || ''))) {
      attrs[m[1]] = m[2] || true;
    }
    return attrs;
  }

  function hashId(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  function preprocessStyle(content, lang) {
    if (!lang || lang === 'css') return content;
    const isScss = lang === 'scss';
    if (!isScss) return content;
    const vars = {};
    content = content.replace(/^\s*\$([\w-]+)\s*:\s*([^;]+);?/gm, (m, key, val) => {
      vars[key] = val.trim();
      return '';
    });
    content = content.replace(/\$([\w-]+)/g, (m, key) => (vars[key] !== undefined ? vars[key] : m));
    const flattened = [];
    const blockRE = /([^{]+)\{([^{}]+)\}/g;
    let match;
    while ((match = blockRE.exec(content))) {
      const selector = match[1].trim();
      const body = match[2].trim();
      const nested = [];
      const innerBody = body.replace(/([^{]+)\{([^{}]+)\}/g, (m2, sel2, body2) => {
        nested.push({ selector: sel2.trim(), body: body2.trim() });
        return '';
      }).trim();
      if (innerBody) {
        flattened.push(`${selector}{${innerBody}}`);
      }
      nested.forEach(n => {
        flattened.push(`${selector} ${n.selector}{${n.body}}`);
      });
    }
    return flattened.length ? flattened.join('\n') : content;
  }

  function scopeCss(css, scopeId) {
    if (!scopeId) return css;
    return css.replace(/([^\r\n,{}]+)(\s*\{[^}]*\})/g, (m, selector, body) => {
      const clean = selector.trim();
      if (!clean || clean.startsWith('@')) return m;
      const scoped = clean
        .split(',')
        .map(s => `${s.trim()}[data-v-${scopeId}]`)
        .join(', ');
      return `${scoped}${body}`;
    });
  }

  function parseSFC(source) {
    const templateMatch = source.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
    const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const styles = [];
    const styleRE = /<style([\s\S]*?)>([\s\S]*?)<\/style>/gi;
    let m;
    while ((m = styleRE.exec(source))) {
      const attrs = parseAttrs(m[1]);
      styles.push({
        content: (m[2] || '').trim(),
        scoped: !!attrs.scoped,
        lang: attrs.lang || 'css'
      });
    }
    const template = templateMatch ? templateMatch[1].trim() : '';
    const script = scriptMatch ? scriptMatch[1].trim() : '';
    const scopeId = styles.some(s => s.scoped) ? `sfc-${hashId(template + script)}` : '';
    return { template, script, styles, scopeId };
  }

  function compileSFCStyles(styles, scopeId) {
    styles.forEach((style, idx) => {
      let css = preprocessStyle(style.content, style.lang);
      if (style.scoped && scopeId) {
        css = scopeCss(css, scopeId);
      }
      const id = `sfc-style-${scopeId || 'global'}-${idx}`;
      if (document.getElementById(id)) return;
      const el = document.createElement('style');
      el.id = id;
      el.textContent = css;
      document.head.appendChild(el);
    });
  }

  function patch(oldVnode, vnode) {
    if (!oldVnode) {
      return createElm(vnode);
    }
    const isRealElement = oldVnode.nodeType;
    if (isRealElement) {
      const parent = oldVnode.parentNode;
      const sibling = oldVnode.nextSibling;
      oldVnode = emptyNodeAt(oldVnode);
      createElm(vnode, parent, sibling);
      if (parent) {
         parent.removeChild(oldVnode.elm);
         oldVnode.elm = null;
      }
      return vnode.elm;
    }
    if (!vnode) {
        destroyVnode(oldVnode);
        return;
    }
    if (sameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode);
    } else {
      const parent = oldVnode.elm && oldVnode.elm.parentNode;
      createElm(vnode, parent, oldVnode.elm);
      if (parent) {
          parent.removeChild(oldVnode.elm);
      }
    }
    return vnode.elm;
  }

  function emptyNodeAt(elm) {
      return {
          tag: elm.tagName && elm.tagName.toLowerCase(),
          elm: elm,
          data: {},
          children: [],
          text: undefined,
          key: undefined
      };
  }

  function sameVnode(a, b) {
    return (
      a.key === b.key &&
      (
        (a.tag === b.tag) &&
        isDef(a.data) === isDef(b.data)
      )
    );
  }

  function isDef(v) {
      return v !== undefined && v !== null;
  }

  function createElm(vnode, parent, refElm) {
    if (!vnode) return;
    if (createComponent(vnode, parent, refElm)) {
      return vnode.elm;
    }
    if (vnode.tag) {
      const el = document.createElement(vnode.tag);
      vnode.elm = el;
      invokeDirectives(null, vnode, 'bind');
      updateAttrs(el, {}, vnode.data, vnode.context);
      if (vnode.children) {
        vnode.children.forEach(child => {
          child.parent = vnode;
          createElm(child, el);
        });
      }
      if (parent) {
          parent.insertBefore(el, refElm);
      }
      invokeDirectives(null, vnode, 'inserted');
      applyEnterTransition(vnode);
      return el;
    } else {
      const el = document.createTextNode(vnode.text);
      vnode.elm = el;
      if (parent) {
          parent.insertBefore(el, refElm);
      }
      return el;
    }
  }

  function createComponent(vnode, parent, refElm) {
    const options = vnode.componentOptions;
    if (!options) return false;
    if (vnode.data && vnode.data.keepAlive && vnode.componentInstance) {
      vnode.elm = vnode.componentInstance.$el;
      applyScopeToChildRoot(vnode);
      if (parent) parent.insertBefore(vnode.elm, refElm);
      return true;
    }
    const child = new options.Ctor({
      parent: vnode.context,
      _parentVnode: vnode,
      _renderChildren: options.children,
      _slots: options.slots,
      propsData: options.propsData,
      _parentListeners: options.listeners,
      _isComponent: true
    });
    vnode.componentInstance = child;
    child.$mount();
    vnode.elm = child.$el;
    applyScopeToChildRoot(vnode);
    if (parent) parent.insertBefore(child.$el, refElm);
    if (vnode.data && vnode.data.ref && vnode.context) {
      registerRef(vnode.context, vnode.data.ref, child);
    }
    applyEnterTransition(vnode);
    return true;
  }

  function patchVnode(oldVnode, vnode) {
      if (oldVnode === vnode) {
          return;
      }
      if (oldVnode.componentOptions || vnode.componentOptions) {
        vnode.componentInstance = oldVnode.componentInstance;
        vnode.elm = oldVnode.elm;
        if (vnode.componentOptions && vnode.componentInstance) {
          updateChildComponent(vnode.componentInstance, vnode.componentOptions);
        }
        return;
      }
      const elm = vnode.elm = oldVnode.elm;
      const oldCh = oldVnode.children;
      const ch = vnode.children;
      if (vnode.data || oldVnode.data) {
          updateAttrs(elm, oldVnode.data, vnode.data, vnode.context);
          invokeDirectives(oldVnode, vnode, 'update');
      }
      if (isDef(vnode.text)) {
          if (vnode.text !== oldVnode.text) {
              elm.textContent = vnode.text;
          }
      } else {
          if (isDef(oldCh) && isDef(ch)) {
              if (oldCh !== ch) updateChildren(elm, oldCh, ch);
          } else if (isDef(ch)) {
               if (isDef(oldVnode.text)) elm.textContent = '';
               addVnodes(elm, null, ch, 0, ch.length - 1);
          } else if (isDef(oldCh)) {
               removeVnodes(elm, oldCh, 0, oldCh.length - 1);
          } else if (isDef(oldVnode.text)) {
               elm.textContent = '';
          }
      }
  }

  function addVnodes(parentElm, refElm, vnodes, startIdx, endIdx) {
      for (; startIdx <= endIdx; ++startIdx) {
          createElm(vnodes[startIdx], parentElm, refElm);
      }
  }

  function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
      for (; startIdx <= endIdx; ++startIdx) {
          const ch = vnodes[startIdx];
          if (!ch) continue;
          if (ch.componentInstance && ch.data && ch.data.keepAlive) {
            if (parentElm && ch.elm && ch.elm.parentNode === parentElm) {
              parentElm.removeChild(ch.elm);
            }
            continue;
          }
          applyLeaveTransition(ch, () => {
            if (ch.componentInstance) {
              ch.componentInstance.$destroy();
            }
            if (parentElm && ch.elm && ch.elm.parentNode === parentElm) {
              parentElm.removeChild(ch.elm);
            }
            invokeDirectives(ch, null, 'unbind');
          });
      }
  }

  function updateChildren(parentElm, oldCh, newCh) {
      let oldStartIdx = 0;
      let newStartIdx = 0;
      let oldEndIdx = oldCh.length - 1;
      let oldStartVnode = oldCh[0];
      let oldEndVnode = oldCh[oldEndIdx];
      let newEndIdx = newCh.length - 1;
      let newStartVnode = newCh[0];
      let newEndVnode = newCh[newEndIdx];
      let oldKeyToIdx, idxInOld, vnodeToMove, refElm;

      while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
        if (!oldStartVnode) {
          oldStartVnode = oldCh[++oldStartIdx];
        } else if (!oldEndVnode) {
          oldEndVnode = oldCh[--oldEndIdx];
        } else if (sameVnode(oldStartVnode, newStartVnode)) {
          patchVnode(oldStartVnode, newStartVnode);
          oldStartVnode = oldCh[++oldStartIdx];
          newStartVnode = newCh[++newStartIdx];
        } else if (sameVnode(oldEndVnode, newEndVnode)) {
          patchVnode(oldEndVnode, newEndVnode);
          oldEndVnode = oldCh[--oldEndIdx];
          newEndVnode = newCh[--newEndIdx];
        } else if (sameVnode(oldStartVnode, newEndVnode)) { 
          patchVnode(oldStartVnode, newEndVnode);
          parentElm.insertBefore(oldStartVnode.elm, oldEndVnode.elm.nextSibling);
          oldStartVnode = oldCh[++oldStartIdx];
          newEndVnode = newCh[--newEndIdx];
        } else if (sameVnode(oldEndVnode, newStartVnode)) { 
          patchVnode(oldEndVnode, newStartVnode);
          parentElm.insertBefore(oldEndVnode.elm, oldStartVnode.elm);
          oldEndVnode = oldCh[--oldEndIdx];
          newStartVnode = newCh[++newStartIdx];
        } else {
          if (!oldKeyToIdx) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
          idxInOld = isDef(newStartVnode.key)
            ? oldKeyToIdx[newStartVnode.key]
            : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
          if (!idxInOld) { 
            createElm(newStartVnode, parentElm, oldStartVnode.elm);
          } else {
            vnodeToMove = oldCh[idxInOld];
            if (sameVnode(vnodeToMove, newStartVnode)) {
              patchVnode(vnodeToMove, newStartVnode);
              oldCh[idxInOld] = undefined;
              parentElm.insertBefore(vnodeToMove.elm, oldStartVnode.elm);
            } else {
              createElm(newStartVnode, parentElm, oldStartVnode.elm);
            }
          }
          newStartVnode = newCh[++newStartIdx];
        }
      }
      if (oldStartIdx > oldEndIdx) {
        refElm = newCh[newEndIdx + 1] ? newCh[newEndIdx + 1].elm : null;
        addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx);
      } else if (newStartIdx > newEndIdx) {
        removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
      }
  }

  function createKeyToOldIdx (children, beginIdx, endIdx) {
    let i, key;
    const map = {};
    for (i = beginIdx; i <= endIdx; ++i) {
      key = children[i] && children[i].key;
      if (isDef(key)) map[key] = i;
    }
    return map;
  }

  function findIdxInOld (node, oldCh, start, end) {
    for (let i = start; i < end; i++) {
      const c = oldCh[i];
      if (isDef(c) && sameVnode(node, c)) return i;
    }
  }

  function destroyVnode(vnode) {
    if (!vnode) return;
    if (vnode.componentInstance) {
      vnode.componentInstance.$destroy();
    } else if (vnode.children) {
      for (let i = 0; i < vnode.children.length; i++) {
        destroyVnode(vnode.children[i]);
      }
    }
    if (vnode.elm && vnode.elm.parentNode) {
      vnode.elm.parentNode.removeChild(vnode.elm);
    }
  }

  function updateAttrs(el, oldData, newData, context) {
      if (!oldData && !newData) return;
      oldData = oldData || {};
      newData = newData || {};
      for (let key in oldData) {
          if (!(key in newData)) {
               if (key.startsWith('@') && el._listeners) {
                   const eventName = key.slice(1);
                   if (el._listeners[eventName]) {
                       el.removeEventListener(eventName, el._listeners[eventName]);
                       delete el._listeners[eventName];
                   }
               } else {
                   el.removeAttribute(key);
               }
          }
      }
      if (newData.ref && context) {
          registerRef(context, newData.ref, el);
      }
      for (let key in newData) {
          if (key.startsWith('@')) {
              const eventName = key.slice(1);
              const handler = newData[key];
              if (!el._listeners) {
                  el._listeners = {};
              }
              if (oldData[key] !== newData[key]) {
                  if (el._listeners[eventName]) {
                      el.removeEventListener(eventName, el._listeners[eventName]);
                  }
                  if (handler) {
                      let boundHandler;
                      if (typeof handler === 'function') {
                          boundHandler = handler.bind(context);
                      } else if (typeof handler === 'string') {
                          const method = context && context[handler];
                          if (method) {
                              boundHandler = method.bind(context);
                          }
                      }
                      if (boundHandler) {
                          el.addEventListener(eventName, boundHandler);
                          el._listeners[eventName] = boundHandler;
                      }
                  }
              }
              continue;
          }
          if (key === 'v-model') {
              const dataKey = newData[key];
              if (el.value !== context[dataKey]) {
                  el.value = context[dataKey];
              }
               if (!el._vModelListenerAttached) {
                  el.addEventListener('input', (e) => {
                      context[dataKey] = e.target.value;
                  });
                  el._vModelListenerAttached = true;
              }
              continue;
          }
          if (key === 'v-show') {
              const shouldShow = newData[key];
              el.style.display = shouldShow ? '' : 'none';
              continue;
          }
          if (key === 'ref') {
              continue;
          }
          if (key === 'directives' || key === 'transition' || key === 'slot') {
              continue;
          }
          if (key === 'isComponentPlaceholder') {
              continue;
          }
          if (key === 'is' || key === 'component') {
              continue;
          }
          if (oldData[key] !== newData[key]) {
               try {
                 el.setAttribute(key, newData[key]);
               } catch (e) {
                 // ignore non-string attr errors
               }
          }
      }
  }

  function registerRef(vm, refKey, el) {
      if (!vm.$refs) {
          vm.$refs = {};
      }
      vm.$refs[refKey] = el;
  }

  function applyScopeToChildRoot(vnode) {
    if (!vnode || !vnode.componentInstance) return;
    const el = vnode.componentInstance.$el;
    if (!el) return;
    const data = vnode.data || {};
    Object.keys(data).forEach(key => {
      if (key.startsWith('data-v-')) {
        el.setAttribute(key, data[key]);
      }
    });
    const parentScope = vnode.context && vnode.context.$options && vnode.context.$options._scopeId;
    if (parentScope) {
      el.setAttribute(`data-v-${parentScope}`, '');
    }
  }

  function invokeDirectives(oldVnode, vnode, hook) {
    const dirs = vnode && vnode.data && vnode.data.directives;
    if (!dirs || !dirs.length) {
      if (hook === 'unbind' && oldVnode) {
        const oldDirs = oldVnode.data && oldVnode.data.directives;
        if (!oldDirs) return;
        oldDirs.forEach(dir => {
          const def = resolveDirective(oldVnode.context, dir.name);
          if (def && def.unbind) def.unbind(oldVnode.elm, dir, oldVnode);
        });
      }
      return;
    }
    dirs.forEach(dir => {
      const def = resolveDirective(vnode.context, dir.name);
      if (!def) return;
      const binding = Object.assign({}, dir);
      const rawVal = dir.value;
      if (typeof rawVal === 'string' && vnode && vnode.context) {
        binding.value = vnode.context[rawVal];
      }
      const fn = def[hook];
      if (fn) fn(vnode.elm, binding, vnode, oldVnode);
    });
  }

  function resolveDirective(vm, name) {
    if (!vm) return;
    const local = vm.$options && vm.$options.directives && vm.$options.directives[name];
    if (local) return local;
    const global = vm.constructor && vm.constructor.options && vm.constructor.options.directives && vm.constructor.options.directives[name];
    return global;
  }

  function updateChildComponent(vm, componentOptions) {
    vm.$options.propsData = componentOptions.propsData || {};
    if (vm._props) {
      Object.keys(vm.$options.propsData).forEach(key => {
        vm._props[key] = vm.$options.propsData[key];
      });
    }
    vm.$options._renderChildren = componentOptions.children;
    vm.$slots = componentOptions.slots || {};
    vm.$forceUpdate();
  }

  function addClass(el, cls) {
    if (!cls) return;
    const classes = cls.split(/\s+/);
    classes.forEach(c => {
      if (!c) return;
      if (el.classList) {
        el.classList.add(c);
      } else if (!(` ${el.className} `.indexOf(` ${c} `) > -1)) {
        el.className = `${el.className} ${c}`.trim();
      }
    });
  }

  function removeClass(el, cls) {
    if (!cls) return;
    const classes = cls.split(/\s+/);
    classes.forEach(c => {
      if (!c) return;
      if (el.classList) {
        el.classList.remove(c);
      } else {
        el.className = (` ${el.className} `.replace(` ${c} `, ' ')).trim();
      }
    });
  }

  function applyEnterTransition(vnode) {
    const data = vnode && vnode.data && vnode.data.transition;
    if (!data) return;
    const name = data.name || 'v';
    const el = vnode.elm;
    addClass(el, `${name}-enter`);
    addClass(el, `${name}-enter-active`);
    requestAnimationFrame(() => {
      removeClass(el, `${name}-enter`);
      addClass(el, `${name}-enter-to`);
      setTimeout(() => {
        removeClass(el, `${name}-enter-active`);
        removeClass(el, `${name}-enter-to`);
      }, data.duration || 300);
    });
  }

  function applyLeaveTransition(vnode, done) {
    const data = vnode && vnode.data && vnode.data.transition;
    if (!data) {
      done();
      return;
    }
    const name = data.name || 'v';
    const el = vnode.elm;
    addClass(el, `${name}-leave`);
    addClass(el, `${name}-leave-active`);
    requestAnimationFrame(() => {
      removeClass(el, `${name}-leave`);
      addClass(el, `${name}-leave-to`);
      setTimeout(() => {
        removeClass(el, `${name}-leave-active`);
        removeClass(el, `${name}-leave-to`);
        done();
      }, data.duration || 300);
    });
  }

  class VNode {
    constructor(tag, data, children, text, elm, context, componentOptions) {
      this.tag = tag;
      this.data = data || {};
      this.children = children;
      this.text = text;
      this.elm = elm;
      this.context = context;
      this.key = data && data.key;
      this.componentOptions = componentOptions;
      this.componentInstance = undefined;
      this.parent = undefined;
    }
  }

  function createTextVNode(text) {
    return new VNode(undefined, undefined, undefined, String(text));
  }

  function createElementVNode(tag, data, children, context) {
    data = data || {};
    const scopeId = context && context.$options && context.$options._scopeId;
    if (scopeId && !data[`data-v-${scopeId}`]) {
      data[`data-v-${scopeId}`] = '';
    }
    if (Array.isArray(children)) {
      children = normalizeChildren(children);
    }
    if (tag === 'component' && data && data.is) {
      return createComponentVNode(data.is, data, children, context);
    }
    if (typeof tag === 'string' && context && !isReservedTag(tag)) {
      return createComponentVNode(tag, data, children, context);
    }
    return new VNode(tag, data, children, undefined, undefined, context);
  }

  function normalizeChildren(children) {
    const res = [];
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (Array.isArray(c)) {
          for (let j = 0; j < c.length; j++) {
              if (c[j]) res.push(c[j]);
          }
      } else if (c) {
          res.push(c);
      }
    }
    return res;
  }

  function createComponentVNode(tag, data, children, context) {
    const Ctor = resolveComponent(context, tag);
    if (!Ctor) {
      return new VNode(tag, data, children, undefined, undefined, context);
    }
    const propsData = extractProps(data);
    const listeners = extractListeners(data, context);
    const slots = resolveSlots(children);
    const componentOptions = { Ctor, tag, propsData, listeners, children, slots };
    const vnode = new VNode(tag, data, undefined, undefined, undefined, context, componentOptions);
    return vnode;
  }

  function resolveComponent(context, tag) {
    if (!context) return;
    const local = context.$options && context.$options.components && context.$options.components[tag];
    const global = context.constructor && context.constructor.options && context.constructor.options.components && context.constructor.options.components[tag];
    const Ctor = local || global;
    if (!Ctor) return;
    if (typeof Ctor === 'function') return Ctor;
    return context.constructor.extend(Ctor);
  }

  function extractProps(data) {
    if (!data) return {};
    const props = {};
    Object.keys(data).forEach(key => {
      if (key === 'ref' || key === 'key' || key === 'slot' || key === 'directives' || key === 'transition' || key.startsWith('@')) return;
      props[key] = data[key];
    });
    return props;
  }

  function extractListeners(data, context) {
    if (!data) return {};
    const on = {};
    Object.keys(data).forEach(key => {
      if (key.startsWith('@')) {
        const handler = data[key];
        if (typeof handler === 'function' && context) {
          on[key.slice(1)] = handler.bind(context);
        } else {
          on[key.slice(1)] = handler;
        }
      }
    });
    return on;
  }

  function initDevtools(Vue) {
    if (typeof window === 'undefined') return;
    const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook || hook._miniVueInited) return;
    hook._miniVueInited = true;
    hook.emit('init', Vue);
  }

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

    mountComponent(vm);
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

    if (typeof window !== 'undefined') {
      const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
      if (hook && hook.emit) {
        hook.emit('app:init', vm, Vue.version || '2.x', { Vue });
        hook.emit('component:added', vm, vm.$parent ? vm.$parent._uid : -1, vm._uid);
        hook.emit('flush');
      }
    }
  }

  function normalizeScript(code) {
    if (!code) return {};
    const wrapped = code.replace(/export\s+default/, 'return ');
    const fn = new Function('Vue', wrapped);
    const res = fn(Vue);
    if (res && res.default) return res.default;
    return res || {};
  }

  async function loadSFC(url) {
    const res = await fetch(url);
    const source = await res.text();
    const descriptor = parseSFC(source);
    if (descriptor.styles && descriptor.styles.length) {
      compileSFCStyles(descriptor.styles, descriptor.scopeId);
    }
    const options = normalizeScript(descriptor.script);
    if (descriptor.template) {
      options.render = compileToFunctions(descriptor.template, {
        scopeId: descriptor.scopeId
      });
    }
    if (descriptor.scopeId) {
      options._scopeId = descriptor.scopeId;
    }
    return options;
  }

  Vue.loadSFC = loadSFC;
  initDevtools(Vue);

  return Vue;

}));
//# sourceMappingURL=mini-vue.js.map

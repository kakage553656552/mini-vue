import Dep, { pushTarget, popTarget } from './dep.js';
import { queueWatcher } from './scheduler.js';

let uid = 0;

export default class Watcher {
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
    this.id = ++uid;
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
      throw e;
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
            this.cb.call(this.vm, value, oldValue);
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

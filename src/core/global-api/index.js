import Vue from '../instance/index.js';

export function initGlobalAPI(VueConstructor) {
  VueConstructor.options = Object.create(null);
  VueConstructor.options.components = Object.create(null);
  VueConstructor.options.directives = Object.create(null);
  VueConstructor.options.filters = Object.create(null);
  VueConstructor.config = { errorHandler: null, devtools: true };
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

  VueConstructor.options.components['keep-alive'] = VueConstructor.extend(KeepAlive(VueConstructor));
  VueConstructor.options.components['transition'] = VueConstructor.extend(Transition(VueConstructor));

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


import Vue from '../instance/index.js';

export function initGlobalAPI(VueConstructor) {
  VueConstructor.options = Object.create(null);
  VueConstructor.options.components = Object.create(null);
  VueConstructor.options.directives = Object.create(null);
  VueConstructor.options.filters = Object.create(null);

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


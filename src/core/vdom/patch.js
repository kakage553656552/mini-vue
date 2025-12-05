export function patch(oldVnode, vnode) {
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

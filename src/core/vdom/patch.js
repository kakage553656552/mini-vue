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
      if (oldVnode.elm.parentNode) {
          oldVnode.elm.parentNode.removeChild(oldVnode.elm);
      }
      return;
  }

  if (sameVnode(oldVnode, vnode)) {
    patchVnode(oldVnode, vnode);
  } else {
    const parent = oldVnode.elm.parentNode;
    createElm(vnode, parent, oldVnode.elm);
    if (parent) {
        parent.removeChild(oldVnode.elm);
    }
  }
  return vnode.elm;
}

function emptyNodeAt(elm) {
    return {
        tag: elm.tagName.toLowerCase(),
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
  if (vnode.tag) {
    const el = document.createElement(vnode.tag);
    vnode.elm = el;
    updateAttrs(el, {}, vnode.data, vnode.context);

    if (vnode.children) {
      vnode.children.forEach(child => {
        createElm(child, el);
      });
    }
    if (parent) {
        parent.insertBefore(el, refElm);
    }
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

function patchVnode(oldVnode, vnode) {
    if (oldVnode === vnode) {
        return;
    }
    const elm = vnode.elm = oldVnode.elm;
    const oldCh = oldVnode.children;
    const ch = vnode.children;
    
    if (vnode.data || oldVnode.data) {
        updateAttrs(elm, oldVnode.data, vnode.data, vnode.context);
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
        if (ch) {
            parentElm.removeChild(ch.elm);
        }
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
    key = children[i].key;
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
            
            // 初始化存储事件处理器的对象
            if (!el._listeners) {
                el._listeners = {};
            }
            
            // 如果处理器有变化
            if (oldData[key] !== newData[key]) {
                // 1. 移除旧的监听器
                if (el._listeners[eventName]) {
                    el.removeEventListener(eventName, el._listeners[eventName]);
                }
                
                // 2. 创建新的绑定函数并添加
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
                        el._listeners[eventName] = boundHandler; // 保存引用以便移除
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
        
        if (oldData[key] !== newData[key]) {
             el.setAttribute(key, newData[key]);
        }
    }
}

function registerRef(vm, refKey, el) {
    if (!vm.$refs) {
        vm.$refs = {};
    }
    vm.$refs[refKey] = el;
}

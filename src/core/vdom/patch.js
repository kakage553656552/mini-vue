export function patch(oldVnode, vnode) {
  if (oldVnode.nodeType) {
    // Initial render: oldVnode is a real DOM element
    const parent = oldVnode.parentNode;
    const element = createElm(vnode);
    parent.insertBefore(element, oldVnode.nextSibling);
    parent.removeChild(oldVnode);
    return element;
  } else {
    // Update: simplified diff
    if (!vnode) return; // destroy
    if (oldVnode.tag === vnode.tag) {
        vnode.elm = oldVnode.elm;
        updateChildren(vnode.elm, oldVnode.children, vnode.children);
        
        // Update attributes/events
        updateAttrs(vnode.elm, oldVnode.data, vnode.data, vnode.context);
        
        if (vnode.text !== undefined) {
           if (oldVnode.text !== vnode.text) {
               vnode.elm.textContent = vnode.text;
           }
        }
    } else {
        // Replace
        const parent = oldVnode.elm.parentNode;
        const element = createElm(vnode);
        parent.insertBefore(element, oldVnode.elm);
        parent.removeChild(oldVnode.elm);
    }
    return vnode.elm;
  }
}

function createElm(vnode) {
  if (vnode.tag) {
    const el = document.createElement(vnode.tag);
    vnode.elm = el;
    
    updateAttrs(el, {}, vnode.data, vnode.context);

    if (vnode.children) {
      vnode.children.forEach(child => {
        el.appendChild(createElm(child));
      });
    }
    return el;
  } else {
    const el = document.createTextNode(vnode.text);
    vnode.elm = el;
    return el;
  }
}

function updateAttrs(el, oldData, newData, context) {
    if (!oldData && !newData) return;
    oldData = oldData || {};
    newData = newData || {};

    // Remove old attrs
    for (let key in oldData) {
        if (!(key in newData)) {
             el.removeAttribute(key);
        }
    }

    // Add/Update new attrs
    for (let key in newData) {
        // Event handling
        if (key.startsWith('@')) {
            const eventName = key.slice(1);
            const methodName = newData[key];
            const handler = context && context[methodName];
            // Remove old listener if exists (simplified: blindly add for now or use specific logic)
            // Ideally we should keep track of listeners to remove them. 
            // For "mini", we just add. A real implementation needs removeEventListener.
            // To prevent duplicate listeners on update, we should check if it changed.
            if (oldData[key] !== newData[key]) {
                if (handler) {
                    el.addEventListener(eventName, handler.bind(context));
                }
            }
            continue;
        }
        
        // v-model handling
        if (key === 'v-model') {
            const dataKey = newData[key];
            
            // Only update value if it's different to prevent infinite loops/cursor jumps
            if (el.value !== context[dataKey]) {
                el.value = context[dataKey];
            }
            
            // Remove old listener if it exists (simplified check)
            // In a real implementation we would track the listener function to remove it specifically
            // For now, we just add a new one. To avoid memory leaks/duplicates in a long running app,
            // we should properly manage listeners.
            // But strictly for the "freeze" issue: we are likely re-adding the input listener 
            // every time patch happens, and if the patch is synchronous and triggers another input event...
            // Actually, the freeze is likely due to the infinite loop:
            // Input -> Data Change -> Render -> Patch -> set el.value -> Input Event (in some browsers) -> Data Change...
            // Checking if value changed breaks the loop.
            
             if (!el._vModelListenerAttached) {
                el.addEventListener('input', (e) => {
                    context[dataKey] = e.target.value;
                });
                el._vModelListenerAttached = true;
            }
            continue;
        }

        // Normal attributes
        if (oldData[key] !== newData[key]) {
             el.setAttribute(key, newData[key]);
        }
    }
}

function updateChildren(parentElm, oldCh, newCh) {
    if (!oldCh) oldCh = [];
    if (!newCh) newCh = [];

    const oldLen = oldCh.length;
    const newLen = newCh.length;
    const commonLen = Math.min(oldLen, newLen);

    // Patch common children
    for (let i = 0; i < commonLen; i++) {
        patch(oldCh[i], newCh[i]);
    }

    // Add new children
    if (newLen > oldLen) {
        for (let i = oldLen; i < newLen; i++) {
            parentElm.appendChild(createElm(newCh[i]));
        }
    }

    // Remove old children
    if (oldLen > newLen) {
        for (let i = newLen; i < oldLen; i++) {
            parentElm.removeChild(oldCh[i].elm);
        }
    }
}

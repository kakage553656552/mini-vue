export function callHook(vm, hook) {
  const handlers = vm.$options[hook];
  if (handlers) {
    if (Array.isArray(handlers)) {
        for (let i = 0; i < handlers.length; i++) {
            try {
                handlers[i].call(vm);
            } catch (e) {
                console.error(`${hook} hook error:`, e);
            }
        }
    } else if (typeof handlers === 'function') {
        try {
            handlers.call(vm);
        } catch (e) {
            console.error(`${hook} hook error:`, e);
        }
    }
  }
}


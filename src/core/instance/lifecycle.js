export function callHook(vm, hook) {
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

export function handleError(err, vm, info) {
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


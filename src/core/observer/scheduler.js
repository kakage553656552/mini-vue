import { nextTick } from '../util/next-tick.js';
import { callHook } from '../instance/lifecycle.js';

const queue = [];
const activatedChildren = [];
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

export function queueWatcher(watcher) {
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

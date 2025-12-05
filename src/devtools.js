export default function initDevtools(Vue) {
  if (typeof window === 'undefined') return;
  const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook || hook._miniVueInited) return;
  hook._miniVueInited = true;
  hook.emit('init', Vue);
}


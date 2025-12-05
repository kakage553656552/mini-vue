function createComponent(Vue, options) {
  const name = options.componentName || 'plugin-box';
  Vue.component(name, {
    props: ['text'],
    template: `<div style="border:1px solid #42b983;padding:8px;border-radius:4px;margin-top:6px;">插件组件：<span class="highlight">{{ text }}</span></div>`
  });
}

function createDirective(Vue, options) {
  const dirName = options.directiveName || 'plugin-bg';
  Vue.directive(dirName, {
    bind(el, binding) {
      el.style.backgroundColor = binding.value || '#e8f5e9';
    },
    update(el, binding) {
      el.style.backgroundColor = binding.value || '#e8f5e9';
    },
    unbind(el) {
      el.style.backgroundColor = '';
    }
  });
}

function createFilter(Vue, options) {
  const filterName = options.filterName || 'pluginCap';
  Vue.filter(filterName, function (val) {
    if (val == null) return '';
    return String(val).toUpperCase();
  });
}

export default function DemoPlugin(Vue, opts = {}) {
  const options = Object.assign({ message: '插件已生效' }, opts);
  Vue.prototype.$pluginMessage = options.message;
  createComponent(Vue, options);
  createDirective(Vue, options);
  createFilter(Vue, options);
}


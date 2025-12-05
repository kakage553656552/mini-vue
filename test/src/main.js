(async () => {
  const [App, HelloMini] = await Promise.all([
    Vue.loadSFC(new URL('./App.vue', import.meta.url).href),
    Vue.loadSFC(new URL('./components/HelloMini.vue', import.meta.url).href)
  ]);

  Vue.component('hello-mini', HelloMini);

  new Vue({
    el: '#app',
    components: { App },
    template: '<App />'
  });
})();
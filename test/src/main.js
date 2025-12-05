const [App, HelloMini] = await Promise.all([
  Vue.loadSFC('./src/App.vue'),
  Vue.loadSFC('./src/components/HelloMini.vue')
]);

Vue.component('hello-mini', HelloMini);

new Vue({
  el: '#app',
  components: { App },
  template: '<App />'
});

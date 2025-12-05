<template>
  <div class="page">
    this is my mini-vue app
    <h1>{{ title }}</h1>
    <p class="subtitle">{{ message }}</p>
    <div class="card">
      <p>计数：{{ count }}</p>
      <button @click="increment">加一</button>
    </div>
    <hello-mini :msg="message"></hello-mini>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      title: '欢迎使用 Mini Vue CLI',
      message: '快速创建的示例项目',
      count: 0
    };
  },
  methods: {
    increment() {
      this.count++;
    }
  }
};
</script>

<style scoped>
.page { background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
h1 { color: #42b983; margin: 0 0 12px; }
.subtitle { color: #666; margin: 0 0 16px; }
.card { margin: 12px 0; padding: 12px; border: 1px solid #e0e0e0; border-radius: 6px; }
button { padding: 8px 16px; background: #42b983; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
button:hover { background: #3aa876; }
</style>

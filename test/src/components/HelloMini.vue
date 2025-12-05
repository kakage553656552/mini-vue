<template>
  <div class="hello">
    子组件接收的消息：{{ msg }}
    <button @click="handleCallback('子组件触发')">回调</button>
  </div>
</template>

<script>
export default {
  name: 'HelloMini',
  props: ['msg'],
  methods: {
    handleCallback(msg) {
      this.$emit('callback', msg);
    }
  }
};
</script>

<style scoped>
.hello {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #42b983;
  border-radius: 6px;
  background: #f5fffb;
}
</style>

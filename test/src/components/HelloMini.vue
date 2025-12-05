<template>
  <div class="hello">
    子组件接收的消息：{{ msg }}
  </div>
</template>

<script>
export default {
  name: 'HelloMini',
  props: ['msg']
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

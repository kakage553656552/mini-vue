<template>
  <div id="app">
    <h1>{{ msg }}</h1>
    <button @click="reverseMsg">反转文字</button>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      msg: 'Hello Vue 2!'
    }
  },
  methods: {
    reverseMsg() {
      this.msg = this.msg.split('').reverse().join('')
    }
  }
}
</script>

<style scoped>
#app {
  text-align: center;
  margin-top: 60px;
}
button {
  margin-top: 20px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
}
</style>
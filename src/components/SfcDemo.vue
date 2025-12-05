<template>
  <div class="sfc-demo">
    <h2>单文件组件支持111111</h2>
    <ul>
      <li v-for="item in items" :key="item.label">
        <label>
          <input type="checkbox" checked>
          {{ item.label }}
        </label>
      </li>
    </ul>
    <p class="meta">模板预编译于 {{ compiledAt }}</p>
    <p class="scss-chip">SCSS 预处理示例</p>
  </div>
</template>

<script>
export default {
  name: 'SfcDemo',
  data() {
    return {
      compiledAt: new Date().toLocaleTimeString(),
      items: [
        { label: '.vue 文件解析' },
        { label: '模板/脚本/样式分离' },
        { label: '作用域样式 (scoped styles)' },
        { label: '样式预处理器支持' },
        { label: '模板预编译' }
      ]
    };
  }
};
</script>

<style scoped lang="scss">
$primary: #7bc6ff;
$primary-2: #89f7fe;
$deep: #0f2b46;
$muted: #888;

.sfc-demo {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  h2 {
    margin: 0 0 10px 0;
    color: #2c3e50;
    font-size: 18px;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0 0 10px 0;
  }
  li {
    display: flex;
    align-items: center;
    margin: 4px 0;
    font-size: 14px;
    color: #35495e;
    input {
      margin-right: 8px;
    }
  }
  .meta {
    font-size: 12px;
    color: $muted;
  }
  .scss-chip {
    display: inline-block;
    margin-top: 6px;
    padding: 4px 8px;
    background: linear-gradient(90deg, $primary, $primary-2);
    color: $deep;
    border-radius: 999px;
    font-size: 12px;
  }
}
</style>


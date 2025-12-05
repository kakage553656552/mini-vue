#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const targetName = process.argv[2] || 'mini-vue-demo';
  const targetDir = path.resolve(process.cwd(), targetName);

  try {
    await fs.access(targetDir);
    console.error(`目录已存在: ${targetDir}`);
    process.exit(1);
  } catch {}

  await fs.mkdir(targetDir, { recursive: true });
  await fs.mkdir(path.join(targetDir, 'src', 'components'), { recursive: true });
  await fs.mkdir(path.join(targetDir, 'lib'), { recursive: true });

  const pkg = {
    name: path.basename(targetDir),
    version: '1.0.0',
    private: true
  };
  await fs.writeFile(path.join(targetDir, 'package.json'), JSON.stringify(pkg, null, 2));

  const distPath = path.resolve(__dirname, '../dist/mini-vue.js');
  let distContent;
  try {
    distContent = await fs.readFile(distPath);
  } catch (e) {
    console.error('未找到 dist/mini-vue.js，请先在项目根目录运行 yarn build');
    process.exit(1);
  }
  await fs.writeFile(path.join(targetDir, 'lib', 'mini-vue.js'), distContent);

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mini Vue Demo</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; background:#f7f7f7; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="./lib/mini-vue.js"></script>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
`;
  await fs.writeFile(path.join(targetDir, 'index.html'), indexHtml);

  const mainJs = `const [App, HelloMini] = await Promise.all([
  Vue.loadSFC('./src/App.vue'),
  Vue.loadSFC('./src/components/HelloMini.vue')
]);

Vue.component('hello-mini', HelloMini);

new Vue({
  el: '#app',
  components: { App },
  template: '<App />'
});
`;
  await fs.writeFile(path.join(targetDir, 'src', 'main.js'), mainJs);

  const appVue = `<template>
  <div class="page">
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
`;
  await fs.writeFile(path.join(targetDir, 'src', 'App.vue'), appVue);

  const helloVue = `<template>
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
`;
  await fs.writeFile(path.join(targetDir, 'src', 'components', 'HelloMini.vue'), helloVue);

  console.log(`已生成项目: ${targetDir}`);
  console.log('打开 index.html 即可预览，或使用任意静态服务器访问该目录');
}

main();


# mini-vue

简化版 Vue2 实现，支持模板编译、响应式、虚拟 DOM、SFC 解析、插件系统，并提供简易 CLI 生成可运行示例。

## 快速开始

```bash
yarn install
yarn build         # 生成 UMD/ESM 产物 dist/mini-vue.js / dist/mini-vue.esm.js
```

在浏览器直接引入：

```html
<script src="./dist/mini-vue.js"></script>
<script>
  new Vue({ el: '#app', data: { msg: 'hello' } });
</script>
```

## CLI 脚手架

生成示例项目（需先 yarn build 拿到 dist）：

```bash
yarn create:demo my-demo
cd my-demo
yarn install
yarn serve   # http://localhost:8080
```

构建示例：

```bash
yarn build   # 输出 dist/bundle.js，SFC 会被复制到 dist/src
```

## 主要能力

- 响应式：Observer/Dep/Watcher，数组拦截，computed、watch。
- 渲染：VNode/patch，组件、slot、keep-alive、transition。
- 指令/事件：v-if/v-for/v-show/v-model/@event 修饰符。
- SFC：`parseSFC` 解析模板/样式/脚本，`loadSFC` 运行时编译，scoped 样式。
- 插件：`Vue.use`，示例插件在 `src/plugins/demo-plugin.js`。
- Devtools：UMD 版默认暴露全局 Vue，附加 devtools hook 事件。

## 项目结构

- `src/` 核心实现（instance/observer/compiler/vdom 等）
- `dist/` 构建产物（rollup）
- `bin/mini-vue-cli.js` 脚手架生成器
- `index.html` 功能演示页

## 常用命令

- `yarn build`：rollup 打包库产物
- `yarn create:demo <name>`：生成示例项目



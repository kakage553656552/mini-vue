import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/mini-vue.js',
      format: 'umd',
      name: 'Vue',
      sourcemap: true,
      exports: 'default'
    },
    {
      file: 'dist/mini-vue.esm.js',
      format: 'es',
      sourcemap: true
    }
  ],
  plugins: [
    nodeResolve({ extensions: ['.js'] }),
    commonjs()
  ]
};


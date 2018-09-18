import babel from 'rollup-plugin-babel'

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/esm-oz.js',
      format: 'esm'
    },
    {
      file: 'dist/cjs-oz.js',
      format: 'cjs'
    }
  ],
  plugins: [
    babel({
      exclude: 'node_modules/**' // only transpile our source code
    })
  ]
}

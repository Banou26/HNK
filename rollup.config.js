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
  ]
}

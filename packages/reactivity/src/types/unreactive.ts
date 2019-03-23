export default [
  RegExp,
  URL,
  Promise,
  Node,
  Location
].map(type => ({
  type,
  default: object => object
}))
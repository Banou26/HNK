const rliteral = char => `(?:\\${char}(?:\\\\.|[^\\\\${char}\\\\])*\\${char})`
const rstring = `(?:${rliteral(`"`)}|${rliteral(`'`)})`
const rimport = `(?:@import (?:url\\((?:${rstring}|[^)]*)\\)|${rstring})(?: [^;]*);)`
const rcomment = /\/\*.*?\*\//
console.log(new RegExp(rimport))

const firstPlaceholder = String.fromCodePoint(0xfffff)

const parsePlaceholders = str => {

}
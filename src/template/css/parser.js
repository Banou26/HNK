const comment = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//gim
const port = /@import[^;]*;/gim
const custom = /(?:^[^;\-\s}]+)?--([^;{}]*?):([^{};]*?)(?:[;\n]|$)/gim
const mixinProp = /(?:^[^;\-\s}]+)?--([^;{}]*?):[^{};]*?{([^}]*?)}(?:[;\n]|$)?/gim
const mixinApply = /@apply\s*(\(?[^);]*\)?)\s*(?:[;\n]|$)?/gim
const varApply = /([^;:]*?):([^;]*?var\([^;]*\))(?:[;\n]|$)?/gim
const keyframesRules = //gim
const multipleSpaces: /\s+/g
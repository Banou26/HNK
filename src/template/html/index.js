import { tag } from './build.js'
export const html = tag()
export const ref = name => ({ htmlReference: true, name })

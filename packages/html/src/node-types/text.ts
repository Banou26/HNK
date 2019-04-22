import { scan } from 'rxjs/operators'

import { replace } from '../utils.ts'
import { Element } from '../template.ts'
import {
  TextMetadata,
  ArrayFragment,
  Placeholder,
  PlaceholderMetadataType
} from '../types.ts'

// todo: Finish implementing it

export default (metadata: TextMetadata, initialArrayFragment: ArrayFragment) => {
  const id = metadata.ids[0]
  let previousValue
  return scan(([oldArrayFragment], values: any[]) => {
    const value = values[id]
    const type = typeof value
    let newArrayFragment = oldArrayFragment

    if (type === 'object') {

    } else {
      const textNode = oldArrayFragment[0]
      const newValue =
        value === undefined ||
        value === false
          ? ''
          : type === 'symbol'
            ? value.toString()
            : '' + value
      if (textNode?.nodeType === Node.TEXT_NODE) {
        if (textNode.data !== newValue) textNode.data = newValue
      } else {
        newArrayFragment = [new Text(newValue)]
      }
    }

    return [oldArrayFragment, newArrayFragment]
  }, [initialArrayFragment])
}

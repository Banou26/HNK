import { scan } from 'rxjs/operators'

// eslint-disable-next-line no-unused-vars
import { CommentMetadata, Placeholder, PlaceholderMetadataType, ArrayFragment } from '../types.ts'
import { toPlaceholderString } from '../utils.ts'

export default (metadata: CommentMetadata, initialArrayFragment: ArrayFragment) => {
  const toResult = toPlaceholderString(metadata.data)
  return scan(([oldArrayFragment], values) => {
    ((<Comment>oldArrayFragment[0]).data = toResult(values))
    return [oldArrayFragment, oldArrayFragment]
  }, [initialArrayFragment])
}

import { Subject, from, zip, Observable } from 'rxjs'
import { mergeMap, switchMap, map, tap } from 'rxjs/operators'

import { 
  PlaceholderMetadata,
  Placeholder,
  PlaceholderType,
  ArrayFragment,
  TextMetadata,
  CommentMetadata,
  ElementMetadata
} from './types.ts'
import { toPlaceholder } from './utils.ts'
import makeText from './node-types/text.ts'
import makeComment from './node-types/comment.ts'
import makeElement from './node-types/element.ts'

export const replaceNodes =
  initialArrayFragment =>
    tap(([oldArrayFragment, newArrayFragment]: [ArrayFragment[], ArrayFragment[]]) => {
      const oldNodes = oldArrayFragment.flat(Infinity)
      const newNodes = newArrayFragment.flat(Infinity)
      newNodes.forEach((newNode, i) => {
        // `oldNode` can be undefined if the number of
        // new nodes is larger than the number of old nodes
        const oldNode = oldNodes[i]
        if (oldNode !== newNode) {
          if (oldNode) {
            oldNode.parentNode.insertBefore(newNode, oldNode)
            if (newNodes[i + 1] !== oldNode) oldNode.remove()
          } else { // Will place the new node after the previous newly placed new node
            const previousNewNode = newNodes[i - 1]
            const { parentNode } = previousNewNode
            parentNode.insertBefore(newNode, previousNewNode.nextSibling)
            if (oldNode) oldNode.remove()
          }
        }
      })

      for (node of oldNodes.filter(node => !newNodes.includes(node)) node.remove()

    }, initialArrayFragment)

export const makePlaceholders =
  (placeholdersMetadata: PlaceholderMetadata[], fragment: DocumentFragment): [Placeholder[], ArrayFragment] =>
    // todo: find a fix for the return type (remove the ts-ignore)
    // @ts-ignore
    placeholdersMetadata
      .map(placeholderMetadata => {
        const { placeholderType, path, ids } = placeholderMetadata

        if (placeholderType === PlaceholderType.END_TAG) return

        const arrayFragment =
          placeholderType === PlaceholderType.START_TAG ||
          placeholderType === PlaceholderType.ATTRIBUTE
            ? fragment.querySelector(`[${toPlaceholder(ids[0])}]`)
            : path.reduce((node, nodeIndex) => node.childNodes[nodeIndex], fragment)

        return [
          placeholderType === PlaceholderType.COMMENT
            ? makeComment(<CommentMetadata>placeholderMetadata, arrayFragment)
            : placeholderType === PlaceholderType.TEXT
              ? makeText(<TextMetadata>placeholderMetadata, arrayFragment)
              : (placeholderType === PlaceholderType.START_TAG ||
                placeholderType === PlaceholderType.ATTRIBUTE) &&
                makeElement(<ElementMetadata>placeholderMetadata, arrayFragment),
          arrayFragment
        ]
      })
      .reduce(([ placeholders, rootArrayFragment ], [ placeholder, arrayFragment ]) => [
        [...placeholders, placeholder],
        rootArrayFragment.map(node =>
          node === arrayFragment[0]
            ? arrayFragment
            : node)
      ], [[], Array.from(fragment.childNodes)])

export const Element = class HNKHTMLTemplateElement extends HTMLTemplateElement {
  templateId: string
  values: any[]
  placeholdersMetadata: PlaceholderMetadata[]
  originalFragment: DocumentFragment

  arrayContent: ArrayFragment
  arrayContentObservable: Observable<ArrayFragment>
  _init: boolean
  key: any
  subject: Subject<any[]>

  constructor (
    { key, templateId, originalFragment, values, placeholdersMetadata }:
    {
      key: any,
      templateId: string,
      placeholdersMetadata: PlaceholderMetadata[],
      values: any[],
      originalFragment: DocumentFragment
    }
  ) {
    super()
    this.key = key
    this.templateId = templateId
    this.placeholdersMetadata = placeholdersMetadata
    this.values = values
    this.originalFragment = originalFragment
    this.subject = new Subject()
  }

  init () {
    if (this._init) return
    this._init = true

    const fragment = document.importNode(this.originalFragment, true)
    this.content.appendChild(fragment)

    const [ placeholders, arrayFragment ] = makePlaceholders(this.placeholdersMetadata, fragment)
    this.arrayContent = arrayFragment

    // @ts-ignore
    this.arrayContentObservable =
      // @ts-ignore
      from(placeholders)
      // @ts-ignore
      |> mergeMap(placeholder =>
        // @ts-ignore
        this.subject
        // @ts-ignore
        |> placeholder)
      // Update 
      // @ts-ignore
      |> scan(
        (previousArrayFragment, [ oldPlaceholderArrayFragment, newPlaceholderArrayFragment ]) => [
            previousArrayFragment,
            previousArrayFragment
              .reduce(arrayFragment =>
                arrayFragment === oldPlaceholderArrayFragment
                  ? newPlaceholderArrayFragment
                  : arrayFragment)
          ],
        arrayFragment
      )
      // @ts-ignore
      |> replaceNodes(arrayFragment)
      // @ts-ignore
      |> tap(([, newArrayFragment]) =>
        (this.arrayContent = newArrayFragment))

    this.update(...this.values)
  }

  clone ({ key, values = this.values }) {
    return new HNKHTMLTemplateElement({
      key,
      templateId: this.templateId,
      placeholdersMetadata: this.placeholdersMetadata,
      values,
      originalFragment: this.originalFragment
    })
  }

  update (...values) {
    this.subject.next(values)
  }

  get content () {
    this.init()
    return super.content
  }

  connectedCallback () {
    this.init()
    this.parentNode.insertBefore(this.content, this.nextSibling)
  }

  disconnectedCallback () {
    this.content.append(...this.arrayContent.flat(Infinity))
  }
}

window.customElements.get('hnk-html-template') ||
window.customElements.define('hnk-html-template', Element, { extends: 'template' })

export default options => new Element(options)

import { toPlaceholderString, toPlaceholdersNumber } from '../../utils.js'
import { containerQueryRegex, globalContainerQueryRegex, matchSelectorRulesets, containerQuery as toContainerQuery, containerQueryAttribute, globalContainerQueryAttributeRegex } from '../utils.js'

const globalRemovedIds = []
const globalIds = []

const makeUniqueId = (
  n = globalRemovedIds.length
    ? globalRemovedIds.shift()
    : (globalIds[globalIds.length - 1] === undefined ? 0 : globalIds.length)
) => {
  globalIds.splice(n, 0, n)
  return {
    id: n,
    match: undefined,
    strId: undefined,
    strAttrId: undefined,
    originalSelector: undefined,
    selector: undefined,
    nodeSelector: undefined,
    nodes: new Map(),
    unregister: _ => {
      globalRemovedIds.push(n)
      globalIds.splice(globalIds.indexOf(n), 1)
    }
  }
}

const watchedElements = new Map()

let measuringElement = document.createElement('div')
measuringElement.style.display = 'none'

const updateElement = (target, contentRect = target.getClientRects()) => {
  const containerQueries = watchedElements.get(target)
  target.parentNode.insertBefore(measuringElement, target)
  for (const containerQuery of containerQueries) {
    measuringElement.style.height = containerQuery.match[3]
    const containerQueryPxValue = parseInt(window.getComputedStyle(measuringElement).height)
    const property =
      containerQuery.match[2].endsWith('height')
        ? 'height'
        : containerQuery.match[2].endsWith('width')
          ? 'width'
          : undefined
    if (
      (containerQuery.match[2].startsWith('min') && contentRect[property] > containerQueryPxValue) ||
      (containerQuery.match[2].startsWith('max') && contentRect[property] < containerQueryPxValue)
    ) {
      target.setAttribute(containerQuery.strId, '')
    } else {
      target.removeAttribute(containerQuery.strId)
    }
  }
  measuringElement.remove()
  measuringElement.style.height = ''
}

const observed = new Map()
let resizeObserver =
  'ResizeObserver' in window
    ? new ResizeObserver(entries => {
      for (let { target, contentRect } of entries) {
        updateElement(target, contentRect)
      }
    })
    : {
      observe: elem => observed.set(elem, elem.getClientRects()),
      unobserve: elem => observed.delete(elem)
    }

if (!('ResizeObserver' in window)) {
  const test = _ => {
    for (const [entry, { height: _height, width: _width }] of watchedElements) {
      const bounds = entry.getClientRects()
      const { height, width } = bounds
      if (height !== _height || width !== _width) {
        updateElement(entry, bounds)
        observed.set(entry, bounds)
      }
    }
    window.requestAnimationFrame(test)
  }
  window.requestAnimationFrame(test)
}

const watchElement = (elem, containerQuery) => {
  const _containerQueries = watchedElements.get(elem)
  const containerQueries = _containerQueries || []
  containerQueries.push(containerQuery)
  if (!_containerQueries) watchedElements.set(elem, containerQueries)
  resizeObserver.observe(elem)
  return _ => {
    containerQueries.splice(containerQueries.indexOf(containerQuery), 1)
    if (!containerQueries.length) watchedElements.delete(elem)
    resizeObserver.unobserve(elem)
    for (const [node] of containerQuery.nodes) node.removeAttribute(containerQuery.strId)
  }
}

export default ({
  placeholderMetadata,
  placeholderMetadata: {
    values: [_selector],
    rule: _rule
  },
  rules: [ rule ],
  placeholderIds = toPlaceholdersNumber(_selector)
}) => {
  const { ownerDocument } = rule.parentStyleSheet.ownerNode
  const getResult = toPlaceholderString(placeholderMetadata.values[0])
  let _containerQueries
  const matchContainerQueriesNodes = _ => {
    for (const containerQuery of _containerQueries) {
      const matchedNodes = Array.from(ownerDocument.querySelectorAll(containerQuery.nodeSelector))
      const containerQueryNodes = Array.from(containerQuery.nodes.keys())
      containerQueryNodes
        .filter(node =>
          !matchedNodes.includes(node)) // Removed nodes
        .forEach(node => {
          containerQuery.nodes.get(node)() // Unregister watcher
          containerQuery.nodes.delete(node)
        })
      matchedNodes
        .filter(node => !containerQueryNodes.includes(node)) // Added nodes
        .forEach(node => containerQuery.nodes.set(node, watchElement(node, containerQuery) /* Register watcher */))
    }
  }
  const mutationObserver = new MutationObserver(matchContainerQueriesNodes)
  let observingMutations = false
  return [({ values, forceUpdate, scope }) => { // Update
    const result = getResult(values)
    if (containerQueryRegex.test(result)) {
      if (!observingMutations) mutationObserver.observe(ownerDocument, { subtree: true, childList: true, attributes: true })
      if (_containerQueries) {
        for (const containerQuery of _containerQueries) {
          containerQuery.unregister()
        }
        _containerQueries = undefined
      }
      const containerQueries =
        matchSelectorRulesets(result)
          .filter(str => containerQueryRegex.test(str))
          .map((str, i) => {
            let containerQueries = []
            let match
            while ((match = globalContainerQueryRegex.exec(str))) {
              const uniqueId = makeUniqueId()
              uniqueId.match = match
              uniqueId.strId = toContainerQuery(uniqueId.id)
              uniqueId.strAttrId = containerQueryAttribute(uniqueId.id)
              containerQueries.push(uniqueId)
            }
            const selector =
              containerQueries
                .reduce((str, { strAttrId, match }) =>
                  str.replace(match[0], strAttrId)
                  , result)
            for (const containerQuery of containerQueries) {
              containerQuery.originalSelector = str
              containerQuery.selector = selector
              containerQuery.nodeSelector =
                selector
                  .slice(0, selector.indexOf(containerQuery.strAttrId))
                  .replace(globalContainerQueryAttributeRegex, '')
            }
            return containerQueries
          })
          .flat(Infinity)
      const selector =
        containerQueries
          .reduce((str, { originalSelector, selector }) =>
            str.replace(originalSelector, selector)
            , result)
      rule.selectorText = selector.replace(/:scope/g, scope !== '' ? `[data-oz-scope="${scope}"]` : '') || '-oz-no-scope'
      _containerQueries = containerQueries
      matchContainerQueriesNodes()
    } else {
      if (observingMutations) mutationObserver.disconnect()
      if (_containerQueries) {
        for (const containerQuery of _containerQueries) {
          containerQuery.unregister()
        }
        _containerQueries = undefined
      }
      rule.selectorText = result.replace(/:scope/g, scope !== '' ? `[data-oz-scope="${scope}"]` : '') || '-oz-no-scope'
    }
  }, _ => { // Unregister
    if (observingMutations) mutationObserver.disconnect()
  }]
}

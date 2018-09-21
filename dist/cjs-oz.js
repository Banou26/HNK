'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var shadyCssParser = require('shady-css-parser');
var pathToRegexp = require('path-to-regexp');
var pathToRegexp__default = _interopDefault(pathToRegexp);

const placeholderMinRangeChar = '';
const placeholderMinRangeCode = placeholderMinRangeChar.charCodeAt();
const placeholderMaxRangeChar = '';
const placeholderRegex = new RegExp(`[${placeholderMinRangeChar}-${placeholderMaxRangeChar}]`, 'umg'); // /[-]/umg

const singlePlaceholderRegex = new RegExp(placeholderRegex, 'um');
const placeholder = (n = 0) => String.fromCodePoint(placeholderMinRangeCode + n);
const charToN = str => str.codePointAt() - placeholderMinRangeCode;
const toPlaceholdersNumber = str => (str.match(placeholderRegex) || []).map(i => charToN(i));
const toPlaceholderString = (str, placeholders = toPlaceholdersNumber(str)) => values => placeholders.reduce((str, i) => str.replace(placeholder(i), values[i]), str);
const replace = (arrayFragment, ...vals) => arrayFragment.splice(0, arrayFragment.length, ...vals);

var makeComment = (({
  placeholderMetadata,
  arrayFragment,
  getResult = toPlaceholderString(placeholderMetadata.values[0])
}) => ({
  values,
  forceUpdate
}) => arrayFragment[0].data = getResult(values));

const getDependentsPlaceholders = ({
  template,
  placeholdersMetadata,
  ids,
  self
}) => placeholdersMetadata.filter(placeholderMetadata => placeholderMetadata.ids.some(id => ids.includes(id))).map(placeholderMetadata => template.placeholders.find(({
  metadata
}) => metadata === placeholderMetadata)).filter(placeholder$$1 => placeholder$$1 !== self);

const eventRegexes = [/^@/, /^on-/];

const removeEventListeners = (element, event, listeners) => listeners.forEach(listener => element.removeEventListener(event, listener));

const makeElement = ({
  template,
  template: {
    placeholdersMetadata
  },
  placeholderMetadata,
  placeholderMetadata: {
    type,
    ids,
    values: [_tagName],
    tagName = _tagName ? toPlaceholderString(_tagName) : undefined,
    values: [__attributeName, _doubleQuoteValue, _singleQuoteValue, unquotedValue],
    toAttributeName = __attributeName ? toPlaceholderString(__attributeName) : undefined,
    toDoubleQuoteValue = _doubleQuoteValue ? toPlaceholderString(_doubleQuoteValue) : undefined,
    toSingleQuoteValue = _singleQuoteValue ? toPlaceholderString(_singleQuoteValue) : undefined
  },
  arrayFragment,
  dependents,
  _attributeName = toAttributeName(template.values),
  _value,
  _eventName,
  _eventListeners
}) => {
  for (const id of ids) arrayFragment[0].removeAttribute(placeholder(id));

  const self = ({
    values,
    forceUpdate,
    element = arrayFragment[0]
  }) => {
    if (!dependents) dependents = getDependentsPlaceholders({
      template,
      placeholdersMetadata,
      ids,
      self
    });

    if (type === 'startTag') {
      const newElement = document.createElement(tagName(values));

      for (const placeholder$$1 of dependents) placeholder$$1({
        values,
        forceUpdate: true
      });

      replace(arrayFragment, newElement);
    } else if (type === 'attribute') {
      const attributeName = toAttributeName(values);

      if (unquotedValue) {
        const placeholdersNumber = toPlaceholdersNumber(unquotedValue);
        const eventTest = eventRegexes.find(regex => attributeName.match(regex));

        if (eventTest) {
          if (!_eventListeners) _eventListeners = [];
          const listeners = placeholdersNumber.map(n => values[n]).filter(v => typeof v === 'function').filter(listener => !_eventListeners.includes(listener));
          const eventName = attributeName.replace(eventTest, '');
          removeEventListeners(element, _eventName, _eventListeners.filter(listener => !listeners.includes(listener)));

          for (const listener of listeners) element.addEventListener(eventName, listener);

          _eventName = eventName;
          _eventListeners = listeners;
        } else {
          if (_eventListeners) removeEventListeners(element, _attributeName, _eventListeners);
          _eventListeners = undefined;
          element[attributeName] = values[placeholdersNumber[0]];
        }
      } else {
        if (attributeName !== _attributeName && element.hasAttribute(_attributeName)) element.removeAttribute(_attributeName);

        const value = (toDoubleQuoteValue || toSingleQuoteValue || (_ => undefined))(values);

        if (attributeName) element.setAttribute(attributeName, value || '');
        _value = value;
      }

      _attributeName = attributeName;
    }
  };

  return self;
};

const OzHTMLTemplate = Symbol.for('OzHTMLTemplate');

const makeText = ({
  template,
  placeholderMetadata,
  arrayFragment,
  _value,
  _placeholders,
  _fragments,
  _arrayFragment
}) => ({
  values,
  value = values[placeholderMetadata.ids[0]],
  forceUpdate
}) => {
  const type = typeof value;

  if (value && type === 'object') {
    if (value && value[OzHTMLTemplate]) {
      // if (_value.) todo: update the current template if its the same id
      replace(arrayFragment, value.childNodes);
    } else if (Array.isArray(value)) {
      const values = value;
      const [placeholders, fragments] = values.reduce(tuple => void tuple[0].push(makeText({
        template,
        placeholderMetadata,
        arrayFragment: tuple[1][tuple[1].push([]) - 1]
      })) || tuple, [[], []]);
      placeholders.forEach((placeholder$$1, i) => placeholder$$1({
        value: value[i]
      }));
      replace(arrayFragment, fragments);
      _placeholders = placeholders;
      _fragments = fragments;
    } else if (value instanceof Node) {
      replace(arrayFragment, value);
    }
  } else if (type === 'function') {
    if (value.prototype instanceof Node) {
      const Constructor = value;
      replace(arrayFragment, new Constructor());
    } else if (value.$promise) {
      if (value.$resolved) {
        makeText({
          template,
          placeholderMetadata,
          arrayFragment
        })({
          value: value.$resolvedValue
        });
      } else {
        replace(arrayFragment, new Text());
        value.then(resolvedValue => _value === value ? template.update(...template.values.map((_, i) => i === placeholderMetadata.ids[0] ? resolvedValue : _)) : undefined);
      }
    } else {
      makeText({
        template,
        placeholderMetadata,
        arrayFragment
      })({
        value: value(arrayFragment)
      });
    }
  } else {
    replace(arrayFragment, new Text(type === 'symbol' ? value.toString() : value));
  }

  if (!arrayFragment.flat(Infinity).length) replace(arrayFragment, new Comment());
  _value = value;
  _arrayFragment = arrayFragment.flat(Infinity);
};

const replaceNodes = (oldNodes, newNodes) => {
  for (const i in newNodes) {
    // `oldNode` can be undefined if the number of
    // new nodes is larger than the number of old nodes
    const oldNode = oldNodes[i];
    const newNode = newNodes[i];

    if (oldNode !== newNode) {
      if (oldNode) {
        oldNode.parentNode.insertBefore(newNode, oldNode);
        if (newNodes[i + 1] !== oldNode) oldNode.remove();
      } else {
        // Will place the new node after the previous newly placed new node
        const previousNewNode = newNodes[i - 1];
        const {
          parentNode
        } = previousNewNode;
        parentNode.insertBefore(newNode, previousNewNode.nextSibling);
        if (oldNode) oldNode.remove();
      }
    }
  }

  for (const node of oldNodes.filter(node => !newNodes.includes(node))) node.remove();
};
const getNodePath = (node, path = [], {
  parentNode: parent
} = node) => parent ? getNodePath(parent, path.concat(Array.from(parent.childNodes).indexOf(node))) : path.reverse();
const walkPlaceholders = ({
  html,
  element: element$$1,
  text: text$$1,
  comment: comment$$1
}) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  const walker = document.createTreeWalker(template.content, (element$$1 ? NodeFilter.SHOW_ELEMENT : 0) + (comment$$1 ? NodeFilter.SHOW_COMMENT : 0) + (text$$1 ? NodeFilter.SHOW_TEXT : 0), {
    acceptNode: ({
      nodeType,
      outerHTML,
      innerHTML,
      data
    }) => nodeType === Node.ELEMENT_NODE ? outerHTML.replace(innerHTML, '').match(placeholderRegex) ? NodeFilter.FILTER_ACCEPT : innerHTML.match(placeholderRegex) ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_REJECT : (nodeType === Node.TEXT_NODE || nodeType === Node.COMMENT_NODE) && data.match(placeholderRegex) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });

  while (walker.nextNode()) {
    const {
      currentNode,
      currentNode: {
        nodeType
      }
    } = walker;
    if (nodeType === Node.ELEMENT_NODE) element$$1(currentNode);else if (nodeType === Node.TEXT_NODE) text$$1(currentNode);else if (nodeType === Node.COMMENT_NODE) comment$$1(currentNode);
  }

  return template.content;
};
const placeholdersMetadataToPlaceholders = ({
  template,
  placeholdersMetadata,
  fragment
}) => {
  const childNodes = Array.from(fragment.childNodes);
  const placeholders = [];

  for (const i in placeholdersMetadata) {
    const placeholderMetadata = placeholdersMetadata[i];
    const {
      type,
      path,
      ids
    } = placeholderMetadata;
    if (type === 'endTag') continue;
    const node = type === 'startTag' || type === 'attribute' ? fragment.querySelector(`[${placeholder(ids[0])}]`) : path.reduce((node, nodeIndex) => node.childNodes[nodeIndex], fragment);
    const arrayFragment = [node];
    if (childNodes.includes(node)) childNodes.splice(childNodes.indexOf(node), 1, arrayFragment);
    let placeholder$$1 = (type === 'text' ? makeText : type === 'comment' ? makeComment : makeElement
    /* type === 'startTag' || type === 'attribute' */
    )({
      template,
      placeholderMetadata,
      arrayFragment
    });
    placeholder$$1.metadata = placeholderMetadata;
    placeholder$$1.arrayFragment = arrayFragment;
    placeholders.push(placeholder$$1);
  }

  return {
    childNodes,
    placeholders
  };
};

const attribute = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const ncname = '[a-zA-Z_-][-\\w\\-\\.]*';
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/(${qnameCapture}[^>]*)>`);
const textRegex = new RegExp(`([${placeholderMinRangeChar}-${placeholderMaxRangeChar}])|([^${placeholderMinRangeChar}-${placeholderMaxRangeChar}]*)`, 'umg');

const getCharacterDataNodePath = placeholders => node => {
  const match = node.data.match(new RegExp(placeholderRegex, 'um'));

  if (match) {
    const isTextNode = node.nodeType === Node.TEXT_NODE;
    const placeholderNode = isTextNode ? node.splitText(match.index) : node;

    if (isTextNode) {
      placeholderNode.data = placeholderNode.data.substring(match[0].length);
      if (placeholderNode.data.length) placeholderNode.splitText(0);
    }

    placeholders[charToN(match[0])].path = getNodePath(placeholderNode);
  }
};

var parse = (({
  transform,
  strings,
  values
}) => {
  let source = transform(strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2));
  let html = '';
  const placeholders = [];

  const advance = (n, type, ...vals) => {
    let replacement = '';
    let placeholder$$1;

    if (type) {
      placeholder$$1 = {
        type,
        ids: vals.filter(_ => _).map(val => (val.match(placeholderRegex) || []).map(char => charToN(char))).flat(Infinity),
        values: vals,
        path: []
      };
      let {
        ids
      } = placeholder$$1;

      if (ids.length) {
        ids.forEach(_ => placeholders.push(placeholder$$1));

        if (type === 'startTag' || type === 'endTag') {
          replacement = toPlaceholderString(vals[0])(values) + (type === 'startTag' ? ` ${placeholder(ids[0])}` : '');
        } else if (type === 'attribute' || type === 'comment') {
          replacement = `${type === 'attribute' ? ' ' : ''}${placeholder(ids[0])}`;
        }
      }
    }

    html += replacement || source.substr(0, n);
    source = source.substring(n);
    return placeholder$$1;
  };

  while (source) {
    // eslint-disable-line no-unmodified-loop-condition
    const textEnd = source.indexOf('<');

    if (textEnd === 0) {
      if (source.startsWith('<!--')) {
        // Comment
        const commentEnd = source.indexOf('-->');

        if (commentEnd === -1) {
          advance(4);
          advance(source.length - 1, 'comment', source);
          continue;
        }

        advance(4);
        advance(commentEnd - 4, 'comment', source.substr(0, commentEnd - 4));
        advance(3);
        continue;
      }

      const endTagMatch = source.match(endTag);

      if (endTagMatch) {
        // End tag
        advance(endTagMatch[0].length, 'endTag', source.substr(0, endTagMatch[0].length));
        continue;
      }

      const startTagMatch = source.match(startTagOpen);

      if (startTagMatch) {
        // Start tag
        advance(1);
        const placeholder$$1 = advance(startTagMatch[1].length, 'startTag', startTagMatch[1]);
        let attributes = [];
        let end, attr;

        while (!(end = source.match(startTagClose)) && (attr = source.match(attribute))) {
          const attrPlaceholder = advance(attr[0].length, 'attribute', attr[1], attr[3], attr[4], attr[5]);
          attrPlaceholder.dependents = attributes;
          attributes.push(attrPlaceholder);
        }

        attributes = attributes.filter(item => item);
        placeholder$$1.dependents = attributes;

        if (end) {
          advance(end[0].length);
          continue;
        }
      }
    }

    for (const str of source.substring(0, textEnd !== -1 ? textEnd : textEnd.length).match(textRegex)) advance(str.length, 'text', str);
  }

  return {
    fragment: walkPlaceholders({
      html,
      text: getCharacterDataNodePath(placeholders),
      comment: getCharacterDataNodePath(placeholders)
    }),
    placeholdersMetadata: placeholders
  };
});

class OzHTMLTemplate$1 extends HTMLTemplateElement {
  constructor({
    templateId,
    originalFragment,
    values,
    placeholdersMetadata
  }) {
    super();
    this.templateId = templateId;
    this.values = values;
    this.placeholdersMetadata = placeholdersMetadata;
    this.originalFragment = originalFragment;
    this.setAttribute('is', 'oz-html-template');
  }

  get [OzHTMLTemplate]() {
    return true;
  }

  init(isUpdate) {
    if (this.placeholders) return;
    const fragment = this.originalFragment.cloneNode(true);
    const {
      placeholders,
      childNodes
    } = placeholdersMetadataToPlaceholders({
      template: this,
      placeholdersMetadata: this.placeholdersMetadata,
      fragment
    });
    this.placeholders = placeholders;
    this.content.appendChild(fragment);
    this._childNodes = childNodes;
    if (isUpdate) this.forceUpdate = true;else this.update(...this.values);
  }

  clone(values = this.values) {
    return new OzHTMLTemplate$1({
      originalFragment: this.originalFragment,
      values,
      placeholdersMetadata: this.placeholdersMetadata,
      templateId: this.templateId
    });
  }

  update(...values) {
    this.init(true);
    const oldArrayFragments = this.placeholders.map(({
      arrayFragment
    }) => arrayFragment.flat(Infinity));

    for (const placeholder of this.placeholders) placeholder({
      values,
      forceUpdate: this.forceUpdate
    });

    const newArrayFragments = this.placeholders.map(({
      arrayFragment
    }) => arrayFragment.flat(Infinity));

    for (const i in this.placeholders) replaceNodes(oldArrayFragments[i], newArrayFragments[i]);

    this.values = values;
    this.forceUpdate = false;
  }

  get childNodes() {
    this.init();
    return this._childNodes;
  }

  get content() {
    this.init();
    return super.content;
  }

  connectedCallback() {
    this.insertAfter();
  }

  insertNodesAfter() {
    this.init();

    for (const node of this.childNodes.flat(Infinity)) this.parentNode.insertBefore(node, this.nextSibling);
  }

  insertNodesToFragment() {
    this.init();

    for (const node of this.childNodes.flat(Infinity)) this.content.appendChild(node);
  }

  insertAfter() {
    this.init();
    this.parentNode.insertBefore(this.content, this.nextSibling);
  }

  disconnectedCallback() {
    this.insertNodesToFragment();
  }

}

customElements.define('oz-html-template', OzHTMLTemplate$1, {
  extends: 'template'
});
var createTemplate = (options => new OzHTMLTemplate$1(options));

const styles = new Map();
const HTMLTag = (transform = str => str) => (strings, ...values) => {
  const templateId = 'html' + strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2);
  if (styles.has(templateId)) return styles.get(templateId).clone(values);
  const {
    fragment,
    placeholdersMetadata
  } = parse({
    transform,
    strings,
    values
  });
  styles.set(templateId, createTemplate({
    templateId,
    originalFragment: fragment,
    values,
    placeholdersMetadata
  }));
  return styles.get(templateId).clone(values);
};
const html = HTMLTag();

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    var ownKeys = Object.keys(source);

    if (typeof Object.getOwnPropertySymbols === 'function') {
      ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
        return Object.getOwnPropertyDescriptor(source, sym).enumerable;
      }));
    }

    ownKeys.forEach(function (key) {
      _defineProperty(target, key, source[key]);
    });
  }

  return target;
}

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};

  var target = _objectWithoutPropertiesLoose(source, excluded);

  var key, i;

  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }

  return target;
}

const makeMethod = name => (_this, ...args) => _objectSpread({}, shadyCssParser.NodeFactory.prototype[name].apply(_this, args), singlePlaceholderRegex.test(args[0]) ? {
  type: `${name}Placeholder`
} : undefined);

const parser = new shadyCssParser.Parser(new class Factory extends shadyCssParser.NodeFactory {
  constructor() {
    super();

    for (const name of ['ruleset', 'expression']) this[name] = makeMethod(name).bind(undefined, this);
  }

  atRule(...args) {
    return _objectSpread({}, super.atRule(...args), args[0] === 'supports' && singlePlaceholderRegex.test(args[1]) ? {
      type: 'atRulePlaceholder'
    } : undefined);
  }

  declaration(...args) {
    return _objectSpread({}, super.declaration(...args), singlePlaceholderRegex.test(args[0]) || singlePlaceholderRegex.test(args[1].text) ? {
      type: 'declarationPlaceholder'
    } : undefined);
  }

}());
const stringifier = new class extends shadyCssParser.Stringifier {
  atRulePlaceholder(...args) {
    return super.atRule(...args);
  }

  rulesetPlaceholder({
    selector,
    rulelist
  }) {
    return `${selector}${this.visit(rulelist)}`;
  }

  declarationPlaceholder({
    name,
    value
  }) {
    return `--${name}${value ? `:${this.visit(value)}` : ''}`;
  }

  expressionPlaceholder({
    text
  }) {
    return text.replace(placeholderRegex, 'var(--$&)');
  }

}();

const findPlaceholdersAndPaths = (rule, placeholders = [], _path = [], path = [..._path], {
  type,
  selector,
  name,
  value,
  parameters,
  text = type.startsWith('declaration') ? value.text : undefined
} = rule, vals = [selector || name || value, text || parameters]) => // match, create PlaceholderMetadata and push to placeholders
(void (type && type.endsWith('Placeholder') && type !== 'expressionPlaceholder' && placeholders.push({
  type: type.slice(0, -'Placeholder'.length),
  values: vals,
  ids: vals.filter(_ => _).map(val => (val.match(placeholderRegex) || []).map(char => charToN(char))).flat(Infinity),
  path,
  rule
})) || // search for placeholders in childs
Array.isArray(rule) ? rule.forEach((rule, i) => findPlaceholdersAndPaths(rule, placeholders, [...path, i])) : rule.type.startsWith('ruleset') ? rule.rulelist.rules.filter(({
  type
}) => type === 'declarationPlaceholder').forEach(rule => findPlaceholdersAndPaths(rule, placeholders, [...path, 'style', rule.name])) : rule.type.startsWith('atRule') ? undefined : rule.type.startsWith('stylesheet') ? rule.rules.forEach((rule, i) => findPlaceholdersAndPaths(rule, placeholders, [...path, 'cssRules', i])) : undefined) || placeholders;

var parse$1 = (({
  transform,
  strings,
  values
}, ast = parser.parse(transform(strings.reduce((str, str2, i) => `${str}${typeof values[i - 1] === 'object' ? `@supports (${placeholder(i - 1)}) {}` : placeholder(i - 1)}${str2}`)))) => ast.rules.forEach(rule => rule.string = stringifier.stringify(rule)) || {
  ast,
  css: stringifier.stringify(ast),
  placeholdersMetadata: findPlaceholdersAndPaths(ast)
});

var makeStyle = (({
  placeholderMetadata,
  rules: [rule],
  getResult = toPlaceholderString(placeholderMetadata.values[0])
}) => ({
  values,
  forceUpdate
}) => rule.selectorText = getResult(values));

var makeStyleProperty = (({
  placeholderMetadata: {
    values,
    path
  },
  rules: [style],
  getNameResult = toPlaceholderString(values[0]),
  getValueResult = toPlaceholderString(values[1]),
  _name = `--${path[path.length - 1]}`
}) => ({
  values,
  forceUpdate
}) => {
  style.removeProperty(_name);
  _name = getNameResult(values);
  style.setProperty(_name, getValueResult(values));
});

const OzStyle = Symbol.for('OzStyle');

const makeStylesheet = ({
  placeholderMetadata: {
    rule: ast,
    ids
  },
  rules,
  getIndexOf = rule => Array.from(rules[0].parentStyleSheet.cssRules).indexOf(rule),
  getFirstIndex = _ => getIndexOf(rules[0]),
  getLastIndex = _ => getIndexOf(rules[rules.length - 1]),
  _value
}) => ({
  values,
  value = values[ids[0]],
  forceUpdate
}) => {
  if (value && typeof value === 'object' && OzStyle in value) {
    if (_value && typeof _value === 'object' && OzStyle in _value && _value.templateId === value.templateId) {
      _value.update(...value.values);

      replace(rules, ..._value.childRules);
    } else replace(rules, ...value.connectedCallback([ast], rules));
  }

  _value = value;
};

const replaceRules = (oldASTRules, oldRules, newASTRules, newRules = []) => {
  const stylesheet$$1 = oldRules[0].parentStyleSheet;
  const stylesheetCssRules = stylesheet$$1.cssRules;

  for (const i in newASTRules) {
    const oldASTRule = oldASTRules[i];
    const newASTRule = newASTRules[i];

    if (oldASTRule !== newASTRule) {
      const rulesArray = Array.from(stylesheetCssRules);
      const oldRule = oldRules[i];
      const oldRuleIndex = rulesArray.indexOf(oldRule);

      if (oldRule) {
        newRules.push(stylesheet$$1.cssRules[stylesheet$$1.insertRule(newASTRule.string, oldRuleIndex)]);
        if (newASTRules[i + 1] !== oldASTRule) stylesheet$$1.deleteRule(oldRuleIndex + 1);
      } else {
        // Will place the new node after the previous newly placed new node
        const previousNewRule = newRules[i - 1];
        const previousNewRuleIndex = rulesArray.indexOf(previousNewRule);
        newRules.push(stylesheet$$1.cssRules[stylesheet$$1.insertRule(newASTRule.string, previousNewRuleIndex)]);
        if (oldRule) stylesheet$$1.deleteRule(oldRuleIndex);
      }
    }
  }

  for (const node of oldRules.filter(node => !newRules.includes(node))) {
    const rulesArray = Array.from(stylesheetCssRules);
    if (rulesArray.includes(node)) stylesheet$$1.deleteRule(rulesArray.indexOf(node));
  }

  return newRules;
};
const placeholdersMetadataToPlaceholders$1 = ({
  element: {
    sheet
  },
  placeholdersMetadata,
  childRules = Array.from(sheet.cssRules)
}) => {
  const placeholders = [];

  for (const i in placeholdersMetadata) {
    const placeholderMetadata = placeholdersMetadata[i];
    const {
      type,
      path
    } = placeholderMetadata;
    if (path[0] === 'cssRules') path.shift();
    const rule = (type === 'declaration' ? path.slice(0, -1) : path).reduce((rule, attrName) => rule[attrName], childRules);
    const rules = [rule];
    if (childRules.includes(rule)) childRules.splice(childRules.indexOf(rule), 1, rules);
    let placeholder = (type === 'declaration' ? makeStyleProperty : type === 'ruleset' ? makeStyle : type === 'atRule' ? makeStylesheet : undefined)({
      placeholderMetadata,
      rules
    });
    placeholder.metadata = placeholderMetadata;
    placeholder.rules = rules;
    placeholders.push(placeholder);
  }

  return {
    childRules,
    placeholders
  };
};

class OzStyle$1 extends HTMLStyleElement {
  constructor({
    templateId,
    css,
    values,
    ast,
    placeholdersMetadata
  }) {
    super();
    this.ast = ast;
    this.templateId = templateId;
    this.values = values;
    this.placeholdersMetadata = placeholdersMetadata;
    this.css = css;
    this.setAttribute('is', 'oz-style');
  }

  get [OzStyle]() {
    return true;
  }

  clone(values = this.values) {
    return new OzStyle$1({
      ast: this.ast,
      css: this.css,
      values,
      placeholdersMetadata: this.placeholdersMetadata,
      templateId: this.templateId
    });
  }

  update(...values) {
    for (const placeholder$$1 of this.placeholders) placeholder$$1({
      values,
      forceUpdate: this.forceUpdate
    });

    this.values = values;
  }

  connectedCallback(ast, childRules) {
    if (childRules) replace(childRules, ...replaceRules(ast, childRules, this.ast.rules));else if (this.innerHTML !== this.css) this.innerHTML = this.css;
    const {
      placeholders
    } = placeholdersMetadataToPlaceholders$1({
      element: this,
      placeholdersMetadata: this.placeholdersMetadata,
      childRules
    });
    this.childRules = childRules;
    this.placeholders = placeholders;
    this.forceUpdate = true;
    this.update(...this.values);
    this.forceUpdate = false;
    return childRules;
  }

}
customElements.define('oz-style', OzStyle$1, {
  extends: 'style'
});
var createStyle = (options => new OzStyle$1(options));

const elements = new Map();
const CSSTag = (transform = str => str) => (strings, ...values) => {
  const templateId = 'css' + strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2);
  if (elements.has(templateId)) return elements.get(templateId).clone(values);
  const {
    ast,
    css,
    placeholdersMetadata
  } = parse$1({
    transform,
    strings,
    values
  });
  elements.set(templateId, createStyle({
    templateId,
    css,
    values,
    ast,
    placeholdersMetadata
  }));
  return elements.get(templateId).clone(values);
};
const css = CSSTag();

const voidTags = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr'];
const regex = /^(\s*)(?:(\|)|(?:([.#\w-]*)(?:\(([\s\S]*?)\))?))(?: (.*))?/;
const gRegex = new RegExp(regex, 'gm');
const identifierRegex = /(?:(\.)|(#))([a-z0-9-]*)/;
const gIdentifierRegex = new RegExp(identifierRegex, 'g');
const classRegex = /class="(.*)"/;

const makeHTML = ({
  tag,
  attributes,
  childs,
  textContent,
  id,
  classList
}) => {
  const classStr = classList.join(' ');
  let attrStr = attributes ? ' ' + attributes : '';
  if (attrStr.match(classRegex)) attrStr = attrStr.replace(classRegex, (match, classes) => `class="${classes} ${classStr}"`);else if (classStr) attrStr += ` class="${classStr}"`;
  if (tag) return `<${tag}${id ? ` id="${id}"` : ''}${attrStr}>${textContent || ''}${childs.map(line => makeHTML(line)).join('')}${voidTags.includes(tag) ? '' : `</${tag}>`}`;else return '\n' + textContent;
};

const pushLine = ({
  childs: currentChilds
}, line) => {
  if (currentChilds.length && currentChilds[currentChilds.length - 1].indentation < line.indentation) pushLine(currentChilds[currentChilds.length - 1], line);else currentChilds.push(line);
};

const hierarchise = arr => {
  const hierarchisedArr = [];

  for (let line of arr) {
    if (hierarchisedArr.length && hierarchisedArr[hierarchisedArr.length - 1].indentation < line.indentation && hierarchisedArr[hierarchisedArr.length - 1].childs) pushLine(hierarchisedArr[hierarchisedArr.length - 1], line);else hierarchisedArr.push(line);
  }

  return hierarchisedArr;
};

const pozToHTML = str => hierarchise(str.match(gRegex).map(str => str.match(regex)).filter(match => match[0].trim().length).map(match => {
  if (match[3] && !match[3].replace(placeholderRegex, '').trim().length) {
    return {
      indentation: match[1].split('\n').pop().length,
      textContent: match[3],
      classList: []
    };
  }

  const tag = match[3] ? match[3].match(/^([a-z0-9-]*)/)[1] : undefined;
  const identifiers = match[3] ? match[3].slice(tag.length).match(gIdentifierRegex) || [] : [];
  const id = identifiers.find(identifier => identifier.match(identifierRegex)[2]);
  const classList = identifiers.filter(identifier => identifier.match(identifierRegex)[1]).map(str => str.slice(1));
  return {
    indentation: match[1].split('\n').pop().length,
    tag: match[2] ? undefined : tag || 'div',
    attributes: match[4],
    id,
    classList,
    textContent: match[5],
    childs: []
  };
})).map(line => makeHTML(line)).join('');

const poz = HTMLTag(pozToHTML);

const getPropertyDescriptorPair = (prototype, property) => {
  let descriptor = Object.getOwnPropertyDescriptor(prototype, property);

  while (!descriptor) {
    prototype = Object.getPrototypeOf(prototype);
    if (!prototype) return;
    descriptor = Object.getOwnPropertyDescriptor(prototype, property);
  }

  return {
    prototype,
    descriptor
  };
};
const getPropertyDescriptor = (object, property) => (getPropertyDescriptorPair(object, property) || {}).descriptor;

var proxify = (object => {
  const proxy = new Proxy(object, {
    get(target, property, receiver) {
      if (reactivityProperties.includes(property)) return Reflect.get(target, property, receiver);

      const propertyReactivity$$1 = propertyReactivity(target, property);

      const descriptor = getPropertyDescriptor(target, property);
      let value;

      if (descriptor && 'value' in descriptor) {
        // property
        value = Reflect.get(target, property, receiver);
      } else {
        // getter
        if ('cache' in propertyReactivity$$1) {
          value = propertyReactivity$$1.cache;
        } else {
          const watcher = _ => {
            notify({
              target,
              property
            });
          };

          watcher.propertyReactivity = propertyReactivity$$1;
          watcher.cache = true;
          value = registerWatcher(_ => propertyReactivity$$1.cache = Reflect.get(target, property, receiver), watcher, {
            object,
            property
          });
        }
      }

      registerDependency({
        target,
        property
      });
      if (value && (typeof value === 'object' || typeof value === 'function') && value[reactivity]) registerDependency({
        target: value
      });
      return value;
    },

    set(target, property, _value, receiver) {
      registerDependency({
        target: receiver,
        property
      });
      if (_value === target[property]) return true;

      if (reactivityProperties.includes(property)) {
        registerDependency({
          target: _value,
          property
        });
        return Reflect.set(target, property, _value, receiver);
      }

      let value = reactify(_value);
      registerDependency({
        target: value,
        property
      });
      if (typeof value === 'function' && value.$promise && value.$resolved) value = value.$resolvedValue;else if (typeof value === 'function' && value.$promise) {
        value.$promise.then(val => target[property] === value ? receiver[property] = val : undefined);
      }

      if (value && typeof value === 'object' && value[reactivity]) {
        let unwatch = value.$watch(_ => target[property] === value ? notify({
          target,
          property,
          value,
          deep: true
        }) : unwatch(), {
          deep: true
        });
      }

      try {
        return Reflect.set(target, property, value, receiver);
      } finally {
        notify({
          target,
          property,
          value
        });
      }
    },

    deleteProperty(target, property) {
      registerDependency({
        target: target,
        property
      });
      if (reactivityProperties.includes(property)) return Reflect.deleteProperty(target, property);

      try {
        return Reflect.deleteProperty(target, property);
      } finally {
        notify({
          target,
          property
        });
        const {
          properties
        } = target[reactivity];
        if (!properties.get(property).watchers.length) properties.delete(property);
      }
    },

    defineProperty(target, property, _ref
    /* desc */
    ) {
      let {
        value: _value
      } = _ref,
          rest = _objectWithoutProperties(_ref, ["value"]);

      if (reactivityProperties.includes(property)) {
        registerDependency({
          target: _value,
          property
        });
        return Reflect.defineProperty(target, property, _objectSpread({}, _value !== undefined && {
          value: _value
        }, rest)) || true;
      }

      let value = reactify(_value);
      registerDependency({
        target: value,
        property
      });
      if (typeof value === 'function' && value.$promise && value.$resolved) value = value.$resolvedValue;else if (typeof value === 'function' && value.$promise) {
        value.$promise.then(val => target[property] === value ? proxy[property] = val : undefined);
      }

      if (value && typeof value === 'object' && value[reactivity]) {
        let unwatch = value.$watch(_ => target[property] === value ? notify({
          target,
          property,
          value,
          deep: true
        }) : unwatch(), {
          deep: true
        });
      }

      try {
        return Reflect.defineProperty(target, property, _objectSpread({}, value !== undefined && {
          value: value
        }, rest)) || true;
      } finally {
        notify({
          target,
          property,
          value
        });
      }
    }

  });
  return proxy;
});

const type = Object;
var object = (object => {
  const obj = Object.create(Object.getPrototypeOf(object));
  const reactiveObject = proxify(obj);
  setReactivity({
    target: reactiveObject,
    original: object,
    object: obj
  });
  Object.entries(Object.getOwnPropertyDescriptors(object)).forEach(([prop, _ref]) => {
    let {
      value
    } = _ref,
        rest = _objectWithoutProperties(_ref, ["value"]);

    return Object.defineProperty(reactiveObject, prop, _objectSpread({}, value !== undefined && {
      value: value
    }, rest));
  });
  return reactiveObject;
});

var object$1 = /*#__PURE__*/Object.freeze({
  type: type,
  default: object
});

const type$1 = Array;
var array = (array => {
  const arr = [];
  const reactiveArray = proxify(arr);
  setReactivity({
    target: reactiveArray,
    original: array,
    object: arr
  });
  array.forEach((val, i) => reactiveArray[i] = val);
  return reactiveArray;
});

var array$1 = /*#__PURE__*/Object.freeze({
  type: type$1,
  default: array
});

const type$2 = Map;
const getProperty = (reactiveMap, prop) => reactiveMap.get(prop);
const ReactiveType = class ReactiveMap extends Map {
  constructor(iterator) {
    super();
    const proxy = proxify(this);
    setReactivity({
      target: proxy,
      original: iterator,
      object: this
    });
    if (iterator) for (const [key, val] of iterator) proxy.set(key, val);
    return proxy;
  }

  set(key, val) {
    const value = reactify(val);

    try {
      return super.set.apply(this[reactivity].object, [key, value]);
    } finally {
      registerDependency({
        target: this,
        property: key
      });
      notify({
        target: this,
        property: key,
        value
      });
    }
  }

  delete(key, val) {
    const value = reactify(val);

    try {
      return super.delete.apply(this[reactivity].object, [key, value]);
    } finally {
      registerDependency({
        target: this,
        property: key
      });
      notify({
        target: this,
        property: key,
        value
      });
    }
  }

  get(key) {
    try {
      return super.get.apply(this[reactivity].object, [key]);
    } finally {
      registerDependency({
        target: this,
        property: key
      });
    }
  }

  has(key) {
    try {
      return super.has.apply(this[reactivity].object, [key]);
    } finally {
      registerDependency({
        target: this,
        property: key
      });
    }
  }

};
var map = (map => new ReactiveType(map));

var map$1 = /*#__PURE__*/Object.freeze({
  type: type$2,
  getProperty: getProperty,
  ReactiveType: ReactiveType,
  default: map
});

const type$3 = Set;
const getProperty$1 = (reactiveSet, prop) => reactiveSet.has(prop);
const ReactiveType$1 = class ReactiveSet extends Set {
  constructor(iterator) {
    super();
    const proxy = proxify(this);
    setReactivity({
      target: proxy,
      original: iterator,
      object: this
    });
    if (iterator) for (const val of iterator) proxy.add(val);
    return proxy;
  }

  add(val) {
    const value = reactify(val);

    try {
      return super.add.apply(this[reactivity].object, [value]);
    } finally {
      registerDependency({
        target: this
      });
      notify({
        target: this,
        property: val,
        value
      });
    }
  }

  has(val) {
    try {
      return super.has.apply(this[reactivity].object, [val]);
    } finally {
      registerDependency({
        target: this,
        property: val
      });
    }
  }

};
var set$1 = (set => new ReactiveType$1(set));

var set$2 = /*#__PURE__*/Object.freeze({
  type: type$3,
  getProperty: getProperty$1,
  ReactiveType: ReactiveType$1,
  default: set$1
});

const type$4 = RegExp;
var regexp = (regexp => setReactivity({
  target: regexp,
  unreactive: true
}) || regexp);

var regexp$1 = /*#__PURE__*/Object.freeze({
  type: type$4,
  default: regexp
});

const type$5 = Promise;

const promisify = promise => {
  const func = _ => {};

  Object.defineProperty(func, '$promise', {
    value: promise
  });
  Object.defineProperty(func, '$resolved', {
    value: false
  });
  const proxy = new Proxy(func, {
    get(target, prop, receiver) {
      if (prop in func) return func[prop];
      if (prop in Promise.prototype) return typeof promise[prop] === 'function' ? promise[prop].bind(promise) : promise[prop];else {
        return promisify(new Promise(async (resolve, reject) => {
          try {
            resolve((await promise)[prop]);
          } catch (err) {
            reject(err);
          }
        }));
      }
    },

    async apply(target, thisArg, argumentsList) {
      return (await promise).apply(thisArg, argumentsList);
    }

  });
  setReactivity({
    target: proxy,
    object: func,
    original: promise
  });
  promise.then(value => {
    if (value && typeof value === 'object') {
      const reactiveValue = reactify(value);
      const {
        object
      } = reactiveValue[reactivity];
      Object.defineProperty(object, '$promise', {
        value: promise
      });
      Object.defineProperty(object, '$resolved', {
        value: true
      });
      Object.defineProperty(object, '$resolvedValue', {
        value
      });
    }

    notify({
      target: proxy
    });
  });
  return proxy;
};

var promise = /*#__PURE__*/Object.freeze({
  type: type$5,
  default: promisify
});

const type$6 = Node;
var node = (node => setReactivity({
  target: node,
  unreactive: true
}) || node);

var node$1 = /*#__PURE__*/Object.freeze({
  type: type$6,
  default: node
});

const builtIn = [map$1, set$2, regexp$1, promise, node$1];
const isBuiltIn = reactiveObject => (builtIn.find(({
  type: type$$1
}) => reactiveObject instanceof type$$1) || {}).type; // Has to be from most specific(e.g: Map) to less specific(Object)

var types = new Map([...builtIn, array$1, object$1].map(({
  type: type$$1,
  default: reactify
}) => [type$$1, reactify]));
const propertyGetters = new Map([...builtIn, array$1, object$1].map(({
  type: type$$1,
  getProperty: getProperty$$1
}) => [type$$1, getProperty$$1]));
const getProperty$2 = (reactiveObject, property) => (propertyGetters.get(isBuiltIn(reactiveObject)) || (_ => reactiveObject[property]))(reactiveObject, property);

for (const _ref of builtIn) {
  const {
    type: type$$1,
    ReactiveType: ReactiveType$$1
  } = _ref;
  if (!ReactiveType$$1) continue;
  const mapDescriptors = Object.getOwnPropertyDescriptors(type$$1.prototype);

  for (const prop of [...Object.getOwnPropertyNames(mapDescriptors), ...Object.getOwnPropertySymbols(mapDescriptors)]) {
    if (!ReactiveType$$1.prototype.hasOwnProperty(prop)) {
      const desc = mapDescriptors[prop];
      Object.defineProperty(ReactiveType$$1.prototype, prop, _objectSpread({}, desc, 'value' in desc && typeof desc.value === 'function' && {
        value: function (...args) {
          return type$$1.prototype[prop].apply(this[reactivity].object, args);
        }
      }));
    }
  }
}

const reactivity = Symbol.for('OzReactivity');
const reactivityProperties = ['$watch', reactivity];
let rootWatchers = [];
let rootObjects = new WeakMap();
const getReactivityRoot = _ => ({
  rootWatchers,
  rootObjects
});
const setReactivityRoot = ({
  watchers: w,
  objects: o
}) => (rootWatchers = w) && (rootObjects = o);

const callWatcher = (watcher, deep, obj) => deep ? watcher.deep ? watcher(obj) : undefined : watcher(obj);

const notify = ({
  target,
  property,
  value,
  deep
}) => {
  const react = target[reactivity]; // eslint-disable-line no-use-before-define

  if (!react) return;

  const callWatchers = watchers => {
    const currentWatcher = rootWatchers[rootWatchers.length - 1];
    if (watchers.includes(currentWatcher)) watchers.splice(watchers.indexOf(currentWatcher), 1);
    const cacheWatchers = watchers.filter(({
      cache
    }) => cache);
    /* .filter(({_target, _property}) => (target === _target && property === _property)) */

    cacheWatchers.forEach(({
      propertyReactivity
    }) => delete propertyReactivity.cache);
    cacheWatchers.forEach(watcher => callWatcher(watcher, deep, {
      target,
      property,
      value
    }));
    watchers.filter(({
      cache
    }) => !cache).forEach(watcher => callWatcher(watcher, deep, {
      target,
      property,
      value
    }));
  };

  if (property) {
    const watchers = propertyReactivity(target, property).watchers;
    propertyReactivity(target, property).watchers = [];
    callWatchers(watchers);
  }

  const watchers = react.watchers;
  react.watchers = [];
  callWatchers(watchers);
};
const setReactivity = ({
  target,
  unreactive,
  original,
  object
}) => {
  if (unreactive) return target[reactivity] = false;
  if (original) rootObjects.set(original, target);
  Object.defineProperty(target, reactivity, {
    value: {
      watchers: [],
      properties: new Map(),
      object
    },
    configurable: true,
    writable: true
  });
  Object.defineProperty(target, '$watch', {
    value: watch(target),
    configurable: true,
    writable: true
  });
};
const registerWatcher = (getter, watcher, {
  object,
  property
} = {}) => {
  watcher.object = object;
  watcher.property = property;
  rootWatchers.push(watcher);
  const value = getter();
  rootWatchers.pop();
  return value;
};
const propertyReactivity = (target, property) => {
  const {
    properties
  } = target[reactivity];
  if (properties.has(property)) return properties.get(property);
  const propertyReactivity = {
    watchers: [] // cache: undefined

  };
  properties.set(property, propertyReactivity);
  return propertyReactivity;
};
const pushWatcher = (object, watcher) => object && typeof object === 'object' && reactivity in object && !object[reactivity].watchers.includes(watcher) && object[reactivity].watchers.push(watcher);
const includeWatcher = (arr, watcher) => arr.includes(watcher) || arr.some(_watcher => watcher.object && watcher.property && watcher.object === _watcher.object && watcher.property === _watcher.property);

const pushCurrentWatcher = ({
  watchers
}) => {
  const currentWatcher = rootWatchers[rootWatchers.length - 1];
  if (currentWatcher && !includeWatcher(watchers, currentWatcher)) watchers.push(currentWatcher);
};

const registerDependency = ({
  target,
  property
}) => {
  if (!rootWatchers.length || !(reactivity in target)) return;
  if (property) pushCurrentWatcher(propertyReactivity(target, property));else pushCurrentWatcher(target[reactivity]);
};
const watch = target => (getter, handler) => {
  const options = target && typeof handler === 'object' ? handler : undefined;

  if (target) {
    if (!handler || typeof handler !== 'function') {
      handler = getter;
      getter = undefined;
    }

    const type = typeof getter;

    if (type === 'string' || type === 'number' || type === 'symbol') {
      const property = getter;

      getter = _ => isBuiltIn(target) ? getProperty$2(target, property) : target[property];
    }
  }

  let unwatch, oldValue;

  const watcher = _ => {
    if (unwatch) return;

    if (getter) {
      let newValue = registerWatcher(getter, watcher);
      pushWatcher(newValue, watcher);
      if (handler) handler(newValue, oldValue);
      oldValue = newValue;
    } else {
      handler(target, target);
      pushWatcher(target, watcher);
    }
  };

  watcher.deep = options && options.deep;
  if (getter) oldValue = registerWatcher(getter.bind(target, target), watcher);
  pushWatcher(getter ? oldValue : target, watcher);
  return _ => (unwatch = true) && undefined;
};

const reactify = obj => {
  if (!obj || typeof obj !== 'object' || reactivity in obj) return obj;
  if (rootObjects.has(obj)) return rootObjects.get(obj);
  return Array.from(types).find(([type]) => obj instanceof type)[1](obj);
};

const watch$1 = watch();

const OzElement = Symbol.for('OzElement');
const OzElementContext = Symbol.for('OzElementContext');
const mixins = [];
const mixin = obj => mixins.push(obj);
const getMixinProp = (mixins, prop) => mixins.filter(mixin => prop in mixin).map(mixin => mixin[prop]);
const htmlTemplateChangedError = new Error('The HTML template returned in the template method changed');
const noHTMLTemplateError = new Error('No HTML template returned in the template method');
const ozStyleChangedError = new Error('The OzStyle element returned in the style changed');
const noOzStyleError = new Error('No OzStyle element returned in the style method');

const registerElement = element => {
  const {
    name,
    mixins: elementMixins,
    extends: extend,
    shadowDom: elementShadowDom,
    state: _state,
    props: elementProps = [],
    watchers: elementWatchers = [],
    template: buildHTMLTemplate,
    style: buildCSSTemplate,
    created,
    connected,
    disconnected
  } = element,
        rest = _objectWithoutProperties(element, ["name", "mixins", "extends", "shadowDom", "state", "props", "watchers", "template", "style", "created", "connected", "disconnected"]);

  const mixins$$1 = mixins.concat(elementMixins || []);
  const props = elementProps.concat(getMixinProp(mixins$$1, 'props')).flat(1);
  const states = getMixinProp(mixins$$1, 'state').flat(1);
  const watchers = elementWatchers.concat(getMixinProp(mixins$$1, 'watchers').flat(1));
  const shadowDom = 'shadowDom' in element ? elementShadowDom : getMixinProp(mixins$$1, 'shadowDom').pop();
  const createdMixins = getMixinProp(mixins$$1, 'created');
  const connectedMixins = getMixinProp(mixins$$1, 'connected');
  const disconnectedMixins = getMixinProp(mixins$$1, 'disconnected');
  const Class = extend ? Object.getPrototypeOf(document.createElement(extend)).constructor : HTMLElement;

  class OzElement$$1 extends Class {
    constructor() {
      super();
      const shadowDomType = typeof shadowDom;
      const host = shadowDomType === 'string' ? this.attachShadow({
        mode: shadowDom
      }) : shadowDomType === 'boolean' ? this.attachShadow({
        mode: shadowDom ? 'open' : 'closed'
      }) : this;
      const context = this[OzElementContext] = reactify(_objectSpread({}, rest, {
        element: this,
        host,
        props: {},
        template: undefined,
        style: undefined
      }));
      Object.entries(rest) // binding functions with the context
      .filter(([, value]) => typeof value === 'function').forEach(([k, v]) => void (context[k] = v.bind(context, context))); // Props mixins & props

      props.forEach(prop => context.props[prop] = this[prop]);
      Object.defineProperties(this, props.reduce((props, prop) => (props[prop] = {
        enumerable: true,
        configurable: true,
        get: _ => context.props[prop],
        set: val => context.props[prop] = val
      }) && props, {})); // State mixins & state

      const state = context.state = reactify((typeof _state === 'function' ? _state.bind(context)(context) : _state) || {});
      states.reverse().forEach(stateMixin => Object.entries(Object.getOwnPropertyDescriptors(stateMixin(context))).forEach(([prop, desc]) => !(prop in state) ? undefined : Object.defineProperty(state, prop, desc))); // HTML Template

      if (buildHTMLTemplate) {
        const template = context.template = buildHTMLTemplate(context);
        if (!template[OzHTMLTemplate]) throw noHTMLTemplateError;
        watch$1(buildHTMLTemplate.bind(context, context), updatedTemplate => {
          if (template.templateId !== updatedTemplate.templateId) throw htmlTemplateChangedError;
          template.update(...updatedTemplate.values);
        });
      } // CSS Template


      if (buildCSSTemplate) {
        const template = context.style = buildCSSTemplate(context);
        if (!template[OzStyle]) throw noOzStyleError;
        watch$1(buildCSSTemplate.bind(context, context), updatedTemplate => {
          if (template.templateId !== updatedTemplate.templateId) throw ozStyleChangedError;
          template.update(...updatedTemplate.values);
        });
      } // Watchers mixins & watchers


      for (const item of watchers) {
        if (Array.isArray(item)) watch$1(item[0].bind(context, context), item[1].bind(context, context));else watch$1(item.bind(context, context));
      } // Created mixins & created


      createdMixins.forEach(mixin$$1 => mixin$$1(context));
      if (created) created(context);
    }

    get [OzElement]() {
      return true;
    }

    static get name() {
      return name;
    }

    static get observedAttributes() {
      return props;
    }

    attributeChangedCallback(attr, oldValue, newValue) {
      if (props.includes(attr)) this[attr] = newValue;
    }

    connectedCallback() {
      const {
        [OzElementContext]: context,
        [OzElementContext]: {
          host,
          style,
          template
        }
      } = this;
      if (template) host.appendChild(template.content);

      if (style) {
        if (shadowDom) host.appendChild(style);else {
          const root = host.getRootNode();
          if (root === document) host.getRootNode({
            composed: true
          }).head.appendChild(style);else root.appendChild(style);
        }
        style.update();
      } // Connected mixins & connected


      connectedMixins.forEach(mixin$$1 => mixin$$1(context));
      if (connected) connected(context);
    }

    disconnectedCallback() {
      const {
        [OzElementContext]: context,
        [OzElementContext]: {
          style
        }
      } = this;
      if (style && !shadowDom) style.remove(); // Disconnected mixins & disconnected

      disconnectedMixins.forEach(mixin$$1 => mixin$$1(context));
      if (disconnected) disconnected(context);
    }

  }

  window.customElements.define(name, OzElement$$1, _objectSpread({}, extend ? {
    extends: extend
  } : undefined));
  return OzElement$$1;
};

const RouterView = Symbol.for('RouterView');

const getRouterViewPosition = ({
  parentElement
}, n = 0) => parentElement ? getRouterViewPosition(parentElement, n + (RouterView in parentElement ? 1 : 0)) : n;

const RouterViewMixin = {
  props: ['name'],
  state: ctx => ({
    get components() {
      const {
        router: {
          currentRoutesComponents,
          currentRoute: {
            matched
          } = {}
        } = {},
        props: {
          name = 'default'
        }
      } = ctx;

      if (matched) {
        const routeConfig = matched[getRouterViewPosition(ctx.host)]; // todo: manage the stuff with selecting router-view name prop ect

        return [...(currentRoutesComponents.has(routeConfig) && currentRoutesComponents.get(routeConfig).values())];
        /* components */
        // return currentRoutesComponents.has(routeConfig) && currentRoutesComponents.get(routeConfig)/* components */.get(name)/* component */
      }
    }

  }),

  created({
    element
  }) {
    element[RouterView] = true;
  }

};
var registerRouterView = (_ => {
  window.customElements.get('router-view') || registerElement({
    name: 'router-view',
    template: ({
      state: {
        components
      }
    }) => html`${components}`,
    mixins: [RouterViewMixin]
  });
});

let mixinRegistered, customElementsRegistered;
const registerRouterMixins = _ => mixinRegistered ? undefined : (mixinRegistered = true) && mixin({
  created: (ctx, closestOzElementParent = getClosestOzElementParent(ctx.element)) => ctx.router = closestOzElementParent && closestOzElementParent[OzElementContext].router
});
const registerCustomElements = _ => customElementsRegistered ? undefined : (customElementsRegistered = true) && registerRouterView();
const compileRoutes = ({
  routes = []
} = {}) => routes.map(route => _objectSpread({}, route, {
  regex: pathToRegexp__default(route.path, [], {
    end: false
  }),
  resolve: ((toPath, params) => toPath(params)).bind(undefined, pathToRegexp.compile(route.path))
}));
const matchRoutes = routes => url => routes.filter(({
  regex
}) => regex.test(url.pathname));
const getClosestOzElementParent = (node, parentNode = node.parentNode || node.host, isOzElement = parentNode && parentNode[OzElement]) => isOzElement ? parentNode : parentNode && getClosestOzElementParent(parentNode);

const history = window.history;
const Router = ({
  routes: _routes,
  base: _base = '',
  linkActiveClass = 'linkActiveClass',
  linkExactActiveClass = 'linkExactActiveClass',
  base = new URL(_base, window.location.origin),
  _: routes = compileRoutes({
    routes: _routes
  }),
  matchRoutes: matchRoutes$$1 = matchRoutes(routes)
} = {}) => {
  registerRouterMixins();
  registerCustomElements();

  const go = (replace = false) => location => (replace ? history.replaceState : history.pushState).call(history, {}, '', resolve(location));

  const push = go();

  const resolve = (location, url = typeof location === 'string' || location instanceof URL ? new URL(location, window.location) : new URL(`${(location.route || routes.find(({
    name
  }) => name === location.route.name)).resolve(location.params)}${new URLSearchParams(location.query).toString()}#${location.hash}`, window.location)) => url.pathname.startsWith(base.pathname) ? url : new URL(url.pathname, base);

  const state = reactify({
    _url: window.location,

    set url(url) {
      push(this._url = resolve(url));
    },

    get url() {
      return this._url;
    },

    resolve,
    push,
    replace: go(true)
  });

  window.onpopstate = ev => state.url = window.location;

  return state;
};

exports.poz = poz;
exports.OzHTMLTemplate = OzHTMLTemplate;
exports.HTMLTag = HTMLTag;
exports.html = html;
exports.OzStyle = OzStyle;
exports.CSSTag = CSSTag;
exports.css = css;
exports.OzElementContext = OzElementContext;
exports.OzElement = OzElement;
exports.mixin = mixin;
exports.registerElement = registerElement;
exports.getReactivityRoot = getReactivityRoot;
exports.setReactivityRoot = setReactivityRoot;
exports.watch = watch$1;
exports.r = reactify;
exports.react = reactify;
exports.reactivity = reactivity;
exports.registerRouterMixins = registerRouterMixins;
exports.Router = Router;

const templates = new Map()

export default ({templateId, html, values, placeholders}) => {
  const template = templates.get(templateId) || document.createElement('template')
  if (!templates.has(templateId)) {
    template.innerHTML = html
    templates.set(templateId, template)
  }
}

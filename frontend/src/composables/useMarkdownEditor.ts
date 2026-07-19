function insertMarkdown(
  prefix: string,
  suffix: string = '',
  textareaSelector: string,
  getContent: () => string,
  setContent: (text: string) => void,
) {
  const textarea = document.querySelector(textareaSelector) as HTMLTextAreaElement
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = getContent() || ''
  setContent(
    text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end),
  )
  textarea.focus()
  const newPos = start + prefix.length + (end - start) + suffix.length
  setTimeout(() => {
    textarea.setSelectionRange(newPos, newPos)
  }, 0)
}

export function useMarkdownEditor() {
  return { insertMarkdown }
}

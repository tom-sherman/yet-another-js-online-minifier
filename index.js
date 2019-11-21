import * as Comlink from 'https://unpkg.com/comlink@4.0.2/dist/esm/comlink.mjs'

const TerserWorker = Comlink.wrap(new Worker('worker.js', { type: 'module' }))

const domReady = () =>
  new Promise(resolve => {
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', resolve)
      : resolve()
  })

const showError = (input, error) => {
  const elError = document.getElementById('error')
  const elMessage = elError.querySelector('.message')
  const elLocation = elError.querySelector('.location')
  const elCode = elError.querySelector('.code')
  elMessage.textContent = error.message
  elLocation.textContent = `Ln ${error.line}, Col ${error.col}`
  const { start, end } = getLinePosition(input, error.pos)

  const codeBeforeErrorPosition =
    error.pos > 0 && error.pos ? input.slice(start, error.pos) : ''
  const characterAtErrorPosition =
    typeof input[error.pos] === 'undefined' ? ' ' : input[error.pos]
  const codeAfterErrorPosition = input.slice(error.pos + 1, end)

  elCode.innerHTML = `${codeBeforeErrorPosition}<mark>${characterAtErrorPosition}</mark>${codeAfterErrorPosition}`.trim()

  elError.classList.add('show')
}

const getLinePosition = (code, position) => {
  let currentPos = position

  // Look behind to find the start of the line
  while (currentPos > 0) {
    currentPos -= 1
    if (code[currentPos] === '\n') {
      break
    }
  }

  const start = currentPos
  currentPos = position

  // Look ahead to find the end of the line
  while (currentPos < code.length) {
    currentPos += 1
    if (code[currentPos] === '\n') {
      break
    }
  }
  const end = currentPos

  return { start, end }
}

;(async () => {
  await domReady()

  const codeMirrorInput = CodeMirror(document.getElementById('input'), {
    lineNumbers: true,
    mode: 'javascript',
    value: 'const add = (first, second) => {\n\t return first + second;\n }'
  })

  const codeMirrorOutput = CodeMirror(document.getElementById('output'), {
    lineNumbers: true,
    mode: 'javascript',
    readOnly: true,
    lineWrapping: true
  })

  codeMirrorInput.on('change', async editor => {
    const input = editor.getValue()
    const minifiedOutput = await TerserWorker.minify(input)
    if (minifiedOutput.error) {
      console.error(minifiedOutput.error)
      codeMirrorOutput.setValue(JSON.stringify(minifiedOutput.error))
      showError(input, minifiedOutput.error)
      codeMirrorOutput.display.wrapper.style.display = 'none'
    } else {
      codeMirrorOutput.display.wrapper.style.display = ''
      document.getElementById('error').classList.remove('show')
      codeMirrorOutput.setValue(minifiedOutput.code)
    }
  })

  codeMirrorOutput.setValue(
    (await TerserWorker.minify(codeMirrorInput.getValue())).code
  )
})()

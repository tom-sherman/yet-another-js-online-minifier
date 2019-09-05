import * as Comlink from 'https://unpkg.com/comlink@4.0.2/dist/esm/comlink.mjs'

const Minifier = Comlink.wrap(
  new Worker('worker.js', { type: "module" })
)

const domReady = () => new Promise(resolve => {
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', resolve) : resolve()
})

const showError = (input, error) => {
  const elError = document.getElementById('error')
  const elMessage = elError.querySelector('.message')
  const elLocation = elError.querySelector('.location')
  const elCode = elError.querySelector('.code')
  elMessage.textContent = error.message
  elLocation.textContent = `Ln ${error.line}, Col ${error.col}`
  const { start, end } = getLinePosition(input, error.pos)

  elCode.innerHTML = `${error.pos > 0 ? input.slice(start, error.pos) : ''}<mark>${input[error.pos]}</mark>${input.slice(error.pos + 1, end)}`.trim()
  elError.classList.add('show')
}

const getLinePosition = (code, position) => {
  let currentPos = position
  let currentChar = code[currentPos]
  while (currentChar !== '\n' || currentPos === 0) {
    currentPos -= 1
    currentChar = code[currentPos]
  }
  const start = currentPos
  currentPos = position
  currentChar = code[currentPos]
  while (currentChar !== '\n' && currentPos !== code.length) {
    currentPos += 1
    currentChar = code[currentPos]
  }
  const end = currentPos

  return { start, end }
}

;(async () => {
  let minifier
  await Promise.all([
    domReady(),
    (new Minifier()).then(inst => { minifier = inst })
  ])
  const codeMirrorInput = CodeMirror(document.getElementById('input'), {
    lineNumbers: true,
    mode: 'javascript',
    value: 'function add(first, second) {\n\t return first + second;\n }'
  })
  const codeMirrorOutput = CodeMirror(document.getElementById('output'), {
    lineNumbers: true,
    mode: 'javascript',
    readOnly: true,
    lineWrapping: true
  })
  codeMirrorInput.on('change', async editor => {
    const input = editor.getValue()
    const minifiedOutput = await minifier.minify(input)
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
  codeMirrorOutput.setValue((await minifier.minify(codeMirrorInput.getValue())).code)
})()

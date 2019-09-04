import * as Comlink from 'https://unpkg.com/comlink@4.0.2/dist/esm/comlink.mjs'

const Minifier = Comlink.wrap(
  new Worker('worker.js', { type: "module" })
)

const domReady = () => new Promise(resolve => {
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', resolve) : resolve()
})


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
    const minifiedOutput = await minifier.minify(editor.getValue())
    if (minifiedOutput.error) {
      codeMirrorOutput.setValue(JSON.stringify(minifiedOutput.error))
    } else {
      codeMirrorOutput.setValue(minifiedOutput.code)
    }
  })
  codeMirrorOutput.setValue((await minifier.minify(codeMirrorInput.getValue())).code)
})()

import * as VIM from 'vim-webgl-viewer/'

import {
  createVimComponent,
  VimComponentRef,
  getLocalSettings
} from './component'

// Parse URL
const params = new URLSearchParams(window.location.search)
const url = params.has('vim')
  ? params.get('vim')
  : 'https://vim.azureedge.net/samples/residence.vim'

createVimComponent(
  loadVim,
  undefined,
  getLocalSettings() ?? {
    ui: { logPanel: true },
    capacity: { useOrthographicCamera: false }
  }
)

function loadVim (cmp: VimComponentRef) {
  cmp.helpers.viewer

  globalThis.component = cmp
  cmp.viewer.loadVim(url, {
    rotation: { x: 270, y: 0, z: 0 }
  })
}

const settings = {
  ui: { logPanel: true },
  capacity: { useOrthographicCamera: false }
}

globalThis.VIM = VIM

import React, { useEffect } from 'react'
import * as VIM from 'vim-webgl-viewer/'
import * as Icons from '../icons'
import { SideState } from './sideState'

export const SidePanel = React.memo(_SidePanel)
export function _SidePanel (props: {
  side: SideState
  viewer: VIM.Viewer
  content: JSX.Element
}) {
  // Resize canvas when panel opens/closes.
  useEffect(() => {
    props.viewer.viewport.canvas.focus()
    resizeCanvas(props.viewer, props.side.get() !== 'none')
  })

  const onNavBtn = () => {
    props.side.pop()
  }

  const iconOptions = { height: '20', width: '20', fill: 'currentColor' }
  return (
    <div
      className={`vim-side-panel fixed left-0 top-0 bg-gray-lightest p-6 text-gray-darker h-full ${
        props.side.get() !== 'none' ? '' : 'hidden'
      }`}
    >
      <button
        className="vim-side-panel-nav text-gray-medium absolute right-6 top-6"
        onClick={onNavBtn}
      >
        {Icons.close(iconOptions)}
      </button>
      {props.content}
    </div>
  )
}

function resizeCanvas (viewer: VIM.Viewer, open: boolean) {
  const parent = viewer.viewport.canvas.parentElement
  const previous = parent.className
  parent.className = parent.className.replace(' bim-panel-open', '')
  parent.className += open ? ' bim-panel-open' : ''
  if (previous !== parent.className) {
    viewer.viewport.ResizeToParent()
  }
}
/**
 * @module viw-webgl-component
 */

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import ReactTooltip from 'react-tooltip'
import logo from './assets/logo.png'
import Stats from 'stats-js'
import './style.css'
import 'vim-webgl-viewer/dist/style.css'

import * as VIM from 'vim-webgl-viewer/'

import { AxesPanelMemo } from './axesPanel'
import { ControlBar } from './controlBar'
import { LoadingBoxMemo } from './loading'
import { BimPanel } from './bim/bimPanel'
import {
  contextMenuCustomization,
  showContextMenu,
  VimContextMenuMemo
} from './contextMenu'
import { MenuHelpMemo, useHelp } from './help'
import { SidePanelMemo } from './sidePanel/sidePanel'
import { useSideState } from './sidePanel/sideState'
import { MenuSettings } from './settings/menuSettings'
import { MenuToastMemo } from './toast'
import { Overlay } from './overlay'
import { Logs, LogsRef, useLogState } from './logsPanel'

import { ComponentInputs as ComponentInputScheme } from './helpers/inputs'
import { CursorManager } from './helpers/cursor'
import { PartialSettings, Settings, useSettings } from './settings/settings'
import { Isolation } from './helpers/isolation'
import { ViewerWrapper } from './helpers/viewer'
import { TreeActionRef } from './bim/bimTree'

export * as VIM from 'vim-webgl-viewer/'
export * as ContextMenu from './contextMenu'
export { getLocalSettings } from './settings/settings'

/**
 * Root level api of the vim component
 */
export type VimComponentRef = {
  /**
   * Vim webgl viewer around which the webgl component is built.
   */
  viewer: VIM.Viewer

  /**
   * Higher level helper methods built around the vim viewer.
   */
  helpers: ViewerWrapper

  /**
   * Isolation api managing isolation state in the component.
   */
  isolation: Isolation

  /**
   * Sets a message to be displayed in the loading box. Set undefined to hide.
   */
  setMsg: (s: string | undefined) => void

  /**
   * Callback to customize context menu at runtime.
   */
  customizeContextMenu: (c: contextMenuCustomization) => void

  logs: LogsRef

  selectSibbings(object: VIM.Object)
}

/**
 * Basic HTML structure that the webgl component expects
 */
export type VimComponentContainer = {
  /**
   * Root of the viewer, all component ui should have this as an acestor.
   */
  root: HTMLDivElement
  /**
   * Div where to instantiate ui elements.
   */
  ui: HTMLDivElement

  /**
   * Div to hold viewer canvases and ui
   */
  gfx: HTMLDivElement
}

/**
 * Creates a ui container along with a VIM.Viewer and the associated react component
 * @param onMount callback when the component is ready, the returned ref is the main way to interact with the component.
 * @param container optional container object, a container will be created if none is given.
 * @param settings component settings.
 * @returns resulting container, reactRoot and viewer.
 */
export function createVimComponent (
  onMount: (component: VimComponentRef) => void,
  container?: VimComponentContainer,
  settings: PartialSettings = {}
) {
  const viewer = new VIM.Viewer()
  container = container ?? createContainer(viewer)
  const reactRoot = createRoot(container.ui)
  const component = React.createFactory(VimComponent)
  reactRoot.render(component({ viewer, onMount, settings }))
  return { container, reactRoot, viewer }
}

/**
 * Creates a default container for the vim component around a vim viewer
 */
export function createContainer (viewer: VIM.Viewer): VimComponentContainer {
  const root = document.createElement('div')
  root.className =
    'vim-component vc-absolute vc-top-0 vc-left-0 vc-h-full vc-w-full'
  document.body.append(root)

  // container for canvases
  const gfx = document.createElement('div')
  gfx.className = 'vim-gfx vc-absolute vc-top-0 vc-left-0 vc-h-full vc-w-full'

  root.append(gfx)

  gfx.append(viewer.viewport.canvas)
  gfx.append(viewer.viewport.text)
  gfx.append(viewer.axesCanvas)

  // container for ui
  const ui = document.createElement('div')
  ui.className = 'vim-ui vc-top-0 vc-left-0 vc-h-full vc-w-full'

  root.append(ui)

  // Initial viewer settings
  viewer.viewport.canvas.tabIndex = 0
  viewer.sectionBox.clip = true

  return { root, ui, gfx }
}

/**
 * Vim Component JSX Element proving UI for the vim viewer.
 * @param viewer Vim viewer for which to provide ui.
 * @param onMount
 * @param settings
 */
export function VimComponent (props: {
  viewer: VIM.Viewer
  onMount: (component: VimComponentRef) => void
  settings?: PartialSettings
}) {
  const viewer = useRef(new ViewerWrapper(props.viewer)).current
  const cursor = useRef(new CursorManager(props.viewer)).current
  const settings = useSettings(props.viewer, props.settings)

  const [isolation] = useState(() => new Isolation(viewer, settings.value))
  useEffect(() => isolation.applySettings(settings.value), [settings])

  const side = useSideState(settings.value.ui.bimPanel, 480)
  const [contextMenu, setcontextMenu] = useState<contextMenuCustomization>()
  const help = useHelp()
  const viewerState = useViewerState(props.viewer)
  const [msg, setMsg] = useState<string>()
  const logs = useLogState()
  const treeRef = useRef<TreeActionRef>()
  const prefRef = useRef<HTMLDivElement>(null)

  // On first render
  useEffect(() => {
    addPerformanceCounter(prefRef.current)
    props.onMount({
      viewer: props.viewer,
      helpers: viewer,
      isolation,
      setMsg,
      logs,
      // Double lambda is required to avoid react from using reducer pattern
      // https://stackoverflow.com/questions/59040989/usestate-with-a-lambda-invokes-the-lambda-when-set
      customizeContextMenu: (v) => setcontextMenu(() => v),
      selectSibbings: (o) => treeRef.current.selectSibblings(o)
    })
    cursor.register()

    // Frame on vim loaded
    const subLoad = props.viewer.onVimLoaded.subscribe(() => {
      props.viewer.camera.frame('all', 45)
    })

    // Setup custom input scheme
    props.viewer.inputs.scheme = new ComponentInputScheme(viewer, isolation)

    // Register context menu
    const subContext =
      props.viewer.inputs.onContextMenu.subscribe(showContextMenu)

    // Clean up
    return () => {
      subLoad()
      subContext()
      cursor.register()
    }
  }, [])

  const sidePanel = (
    <>
      {settings.value.ui.bimPanel
        ? (
        <BimPanel
          viewer={viewer}
          viewerState={viewerState}
          visible={side.getContent() === 'bim'}
          isolation={isolation}
          treeRef={treeRef}
        />
          )
        : null}
      <MenuSettings
        visible={side.getContent() === 'settings'}
        viewer={props.viewer}
        settings={settings}
      />
      {settings.value.ui.logPanel
        ? (
        <Logs
          visible={side.getContent() === 'logs'}
          text={logs.getLog()}
          settings={settings.value}
        />
          )
        : null}
    </>
  )
  return (
    <>
      <div className="vim-performance-div" ref={prefRef}></div>
      <Overlay viewer={viewer.viewer} side={side}></Overlay>
      <MenuHelpMemo help={help} settings={settings.value} side={side} />
      {settings.value.ui.logo ? <LogoMemo /> : null}
      {settings.value.ui.loadingBox
        ? (
        <LoadingBoxMemo viewer={props.viewer} msg={msg} />
          )
        : null}
      {settings.value.ui.controlBar
        ? (
        <ControlBar
          viewer={viewer}
          help={help}
          side={side}
          isolation={isolation}
          cursor={cursor}
          settings={settings.value}
        />
          )
        : null}
      {settings.value.ui.axesPanel
        ? (
        <AxesPanelMemo viewer={viewer} settings={settings.value} />
          )
        : null}
      <SidePanelMemo viewer={props.viewer} side={side} content={sidePanel} />
      <ReactTooltip
        arrowColor="transparent"
        type="light"
        className="!vc-border !vc-border-solid !vc-border-gray-medium !vc-bg-white !vc-text-xs !vc-text-gray-darkest !vc-opacity-100 !vc-shadow-[2px_6px_15px_rgba(0,0,0,0.3)] !vc-transition-opacity"
        delayShow={200}
      />

      <VimContextMenuMemo
        viewer={viewer}
        help={help}
        isolation={isolation}
        selection={viewerState.selection}
        customization={contextMenu}
        treeRef={treeRef}
      />
      <MenuToastMemo viewer={props.viewer} side={side}></MenuToastMemo>
    </>
  )
}

const LogoMemo = React.memo(() => (
  <div className={'vim-logo vc-fixed vc-top-4 vc-left-4'}>
    <a href="https://vimaec.com">
      <img className="vim-logo-img vc-h-12 vc-w-32" src={logo}></img>
    </a>
  </div>
))

function useViewerState (viewer: VIM.Viewer) {
  const getVim = () => viewer.selection.vim ?? viewer.vims[0]

  const [vim, setVim] = useState<VIM.Vim>(getVim())
  const [selection, setSelection] = useState<VIM.Object[]>([
    ...viewer.selection.objects
  ])
  const [elements, setElements] = useState<VIM.ElementInfo[]>()

  useEffect(() => {
    // register to viewer state changes
    const subLoad = viewer.onVimLoaded.subscribe(() => setVim(getVim()))
    const subSelect = viewer.selection.onValueChanged.subscribe(() => {
      setVim(getVim())
      setSelection([...viewer.selection.objects])
    })

    // Clean up
    return () => {
      subLoad()
      subSelect()
    }
  }, [])

  useEffect(() => {
    if (vim) {
      vim.document.getElementsSummary().then((elements) => {
        setElements(elements)
      })
    } else {
      setElements(undefined)
    }
  }, [vim])

  return useMemo(() => {
    const result = { vim, selection, elements } as ViewerState
    return result
  }, [vim, selection, elements])
}

/**
 * Adds popular performance gizmo from package stat-js
 */
function addPerformanceCounter (parent: HTMLDivElement) {
  const stats = new Stats()
  const div = stats.dom as HTMLDivElement
  div.className =
    'vim-performance !vc-absolute !vc-right-6 !vc-left-auto !vc-top-52 !vc-z-1'
  parent.appendChild(div)

  function animate () {
    requestAnimationFrame(() => animate())
    stats.update()
  }
  animate()
}

export type ViewerState = {
  vim: VIM.Vim
  selection: VIM.Object[]
  elements: VIM.ElementInfo[]
}

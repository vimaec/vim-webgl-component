import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ControlledTreeEnvironment,
  InteractionMode,
  Tree
} from 'react-complex-tree'
import 'react-complex-tree/lib/style.css'
import ReactTooltip from 'react-tooltip'
import * as VIM from 'vim-webgl-viewer/'
import { showContextMenu } from '../contextMenu'
import { ViewerWrapper } from '../helpers/viewer'
import { ArrayEquals } from '../helpers/data'
import * as Icons from '../icons'
import { Isolation } from '../helpers/isolation'
import { BimTreeData, toTreeData, VimTreeNode } from './bimTreeData'

export function BimTree (props: {
  viewer: ViewerWrapper
  elements: VIM.ElementInfo[]
  objects: VIM.Object[]
  isolation: Isolation
}) {
  const viewer = props.viewer.base
  const helper = props.viewer
  // Data state
  const [objects, setObjects] = useState<VIM.Object[]>([])
  const [elements, setElements] = useState<VIM.ElementInfo[]>()
  const treeRef = useRef<BimTreeData>()

  // Tree state
  const [expandedItems, setExpandedItems] = useState<number[]>([])
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [focusedItem, setFocusedItem] = useState<number>()
  const [doubleClick] = useState(new DoubleClickManager())
  const [, setVersion] = useState(0)
  const focus = useRef<number>(0)
  const div = useRef<HTMLDivElement>()

  useMemo(() => {
    return (treeRef.current = toTreeData(props.viewer.base, elements))
  }, [elements])

  useEffect(() => {
    ReactTooltip.rebuild()
  }, [expandedItems, elements])

  // Scroll view so that element is visible, if needed.
  useEffect(() => {
    if (elements && objects.length === 1) {
      scrollToSelection(div.current)
      const [first] = viewer.selection.objects
      focus.current = treeRef.current.getNodeFromElement(first.element)
    }
  }, [elements, objects])

  useEffect(() => {
    viewer.renderer.onVisibilityChanged.subscribe(() => {
      treeRef.current.updateVisibility(viewer)
      setVersion((v) => v + 1)
    })
  }, [])

  // Generate or regenerate tree as needed.
  if (props.elements && props.elements !== elements) {
    setElements(props.elements)
  }

  // Display loading if no elements
  if (!elements) {
    return (
      <div className="vim-bim-tree" ref={div}>
        Loading . . .
      </div>
    )
  }

  // Update tree state
  if (!ArrayEquals(props.objects, objects)) {
    setObjects(props.objects)
    const nodes = props.objects.map((o) =>
      treeRef.current.getNodeFromElement(o.element)
    )

    // updated expanded items
    const parents = nodes.flatMap((n) => treeRef.current.getAncestors(n))
    const selection = treeRef.current.getSelection(
      props.objects.map((o) => o.element)
    )
    setExpandedItems([...new Set(expandedItems.concat(parents))])
    setSelectedItems(selection)
  }

  return (
    <div
      className="vim-bim-tree mb-5"
      ref={div}
      tabIndex={0}
      onFocus={() => viewer.inputs.keyboard.unregister()}
      onBlur={() => viewer.inputs.keyboard.register()}
    >
      <ControlledTreeEnvironment
        items={treeRef.current.nodes}
        getItemTitle={(item) => (item as VimTreeNode).title}
        viewState={{
          'tree-bim': {
            focusedItem,
            expandedItems,
            selectedItems
          }
        }}
        renderItemTitle={({ title, item, context }) => (
          <div
            className={`rct-tree-item ${context.isSelected ? 'selected' : ''}`}
          >
            <span className="rct-tree-item-title" data-tip={title}>
              {title}
            </span>
            {
              <div
                className={`rct-tree-item-icons ${
                  treeRef.current.nodes[item.index as number].visible
                }`}
                onClick={(e) => {
                  toggleVisibility(
                    viewer,
                    props.isolation,
                    treeRef.current,
                    item.index as number
                  )
                  e.stopPropagation()
                }}
              >
                {Icons.hidden({
                  width: 16,
                  height: 16,
                  fill: 'currentColor',
                  className: 'rct-tree-item-icon-hidden'
                })}
                {Icons.visible({
                  width: 16,
                  height: 16,
                  fill: 'currentColor',
                  className: 'rct-tree-item-icon-visible'
                })}
              </div>
            }
          </div>
        )}
        canRename={false}
        canSearchByStartingTyping={false}
        canSearch={false}
        defaultInteractionMode={{
          mode: 'custom',
          extends: InteractionMode.ClickArrowToExpand,
          createInteractiveElementProps: (
            item,
            treeId,
            actions,
            renderFlags
          ) => ({
            onKeyUp: (e) => {
              if (e.key === 'f') {
                helper.frameContext()
              }
              if (e.key === 'Escape') {
                viewer.selection.clear()
              }
            },
            onContextMenu: (e) => {
              showContextMenu({ x: e.clientX, y: e.clientY })
              e.preventDefault()
              e.stopPropagation()
            },
            onPointerEnter: (e) => {
              actions.focusItem()
            },
            onClick: (e) => {
              if (e.shiftKey) {
                const range = treeRef.current.getRange(
                  focus.current,
                  item.index as number
                )
                updateViewerSelection(treeRef.current, viewer, range, 'set')
              } else if (isControlKey(e)) {
                if (renderFlags.isSelected) {
                  const leafs = treeRef.current.getLeafs(item.index as number)
                  updateViewerSelection(
                    treeRef.current,
                    viewer,
                    leafs,
                    'remove'
                  )
                  focus.current = item.index as number
                } else {
                  const leafs = treeRef.current.getLeafs(item.index as number)
                  updateViewerSelection(treeRef.current, viewer, leafs, 'add')
                  focus.current = item.index as number
                }
              } else {
                const leafs = treeRef.current.getLeafs(item.index as number)
                updateViewerSelection(treeRef.current, viewer, leafs, 'set')
                focus.current = item.index as number
              }
              actions.primaryAction()
              actions.focusItem()
            }
          })
        }}
        // Impement double click
        onPrimaryAction={(item, _) => {
          if (doubleClick.isDoubleClick(item.index as number)) {
            helper.frameSelection()
          }
        }}
        // Default behavior
        onFocusItem={(item) => {
          const index = item.index as number
          setFocusedItem(index)
          updateViewerFocus(viewer, treeRef.current, index)
        }}
        // Default behavior
        onExpandItem={(item) => {
          setExpandedItems([...expandedItems, item.index as number])
        }}
        // Default behavior
        onCollapseItem={(item) => {
          setExpandedItems(
            expandedItems.filter(
              (expandedItemIndex) => expandedItemIndex !== item.index
            )
          )
        }}
      >
        <Tree treeId="tree-bim" rootItem="0" treeLabel="Tree Example" />
      </ControlledTreeEnvironment>
    </div>
  )
}

function toggleVisibility (
  viewer: VIM.Viewer,
  isolation: Isolation,
  tree: BimTreeData,
  index: number
) {
  const objs = tree
    .getLeafs(index)
    .map((n) =>
      viewer.vims[0].getObjectFromElement(tree.nodes[n]?.data.element)
    )

  const visibility = tree.nodes[index].visible
  if (visibility !== 'vim-visible') {
    isolation.show(objs, 'tree')
  } else {
    isolation.hide(objs, 'tree')
  }
}

function updateViewerFocus (
  viewer: VIM.Viewer,
  tree: BimTreeData,
  index: number
) {
  const node = tree.nodes[index]
  const obj = viewer.vims[0].getObjectFromElement(node.data?.element)
  viewer.selection.focus(obj)
}

function updateViewerSelection (
  tree: BimTreeData,
  viewer: VIM.Viewer,
  nodes: number[],
  operation: 'add' | 'remove' | 'set'
) {
  const objects: VIM.Object[] = []
  nodes.forEach((n) => {
    const item = tree.nodes[n]
    const element = item.data.element

    const obj = viewer.vims[0].getObjectFromElement(element)
    objects.push(obj)
  })
  switch (operation) {
    case 'add':
      viewer.selection.add(...objects)
      break
    case 'remove':
      viewer.selection.remove(...objects)
      break
    case 'set':
      viewer.selection.select(objects)
      break
  }
}

function scrollToSelection (div: HTMLDivElement) {
  // A bit of hack relying on the property of selected element
  const selectedItems = div?.querySelectorAll('[aria-selected="true"]')
  const selection = selectedItems?.[selectedItems?.length - 1]
  if (!selection) return

  const rectElem = selection.getBoundingClientRect()
  const rectContainer = div.getBoundingClientRect()

  // Scroll to bottom
  if (
    rectElem.bottom > rectContainer.bottom ||
    rectElem.bottom > window.innerHeight
  ) {
    selection.scrollIntoView(false)
    return
  }

  // Scroll to Top
  if (rectElem.top < rectContainer.top || rectElem.top < 0) {
    selection.scrollIntoView()
  }
}

// Taken from https://github.com/lukasbach/react-complex-tree/blob/main/packages/core/src/isControlKey.ts
export const isControlKey = (e: React.MouseEvent<any, any>) => {
  return (
    e.ctrlKey ||
    (navigator.platform.toUpperCase().indexOf('MAC') >= 0 && e.metaKey)
  )
}

class DoubleClickManager {
  private _lastTime: number
  private _lastTarget: number

  isDoubleClick = (target: number) => {
    const time = new Date().getTime()
    if (this._lastTarget === target && time - this._lastTime < 200) {
      this._lastTarget = -1
      this._lastTime = 0
      return true
    } else {
      this._lastTarget = target
      this._lastTime = new Date().getTime()
      return false
    }
  }
}
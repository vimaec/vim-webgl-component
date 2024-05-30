/**
 * @module viw-webgl-component
 */

import React, { useEffect, useState, useMemo } from 'react'
import * as VIM from 'vim-webgl-viewer/'

import { BimTree, TreeActionRef } from './bimTree'
import { BimSearch } from './bimSearch'
import { Isolation } from '../helpers/isolation'
import { ComponentCamera } from '../helpers/camera'
import { Grouping, toTreeData } from './bimTreeData'
import { ViewerState } from '../viewerState'
import { AugmentedElement } from '../helpers/element'
import { ComponentSettings, isFalse } from '../settings/settings'
import { whenAllTrue, whenTrue } from '../helpers/utils'
import { BimInfoPanel } from './bimInfoPanel'
import { BimInfoPanelRef } from './bimInfoData'

/**
 * Returns a jsx component representing most data of a vim object or vim document.
 * @param viewer viewer helper
 * @param vim Vim from which to get the data.
 * @param selection Current viewer selection.
 * @param isolation Isolation object.
 * @param visible will only render if this is true.
 * @returns
 */
export function BimPanel (props: {
  viewer: VIM.Viewer
  camera: ComponentCamera
  viewerState: ViewerState
  isolation: Isolation
  visible: boolean
  settings: ComponentSettings
  treeRef: React.MutableRefObject<TreeActionRef>
  bimInfoRef: BimInfoPanelRef
}) {
  const [filter, setFilter] = useState('')
  const [grouping] = useState<Grouping>('Family')

  // Filter elements with meshes using search term.
  const filteredElements = useMemo(() => {
    if (!props.viewerState.elements) return
    const meshElements = props.viewerState.elements.filter(
      (e) => props.viewerState.vim.getObjectFromElement(e.index)?.hasMesh
    )
    const result = filterElements(props.viewerState.vim, meshElements, filter)

    return result
  }, [filter, props.viewerState.elements])

  // Update tree based on filtered elements
  const tree = useMemo(() => {
    return toTreeData(props.viewerState.vim, filteredElements, grouping)
  }, [props.viewerState.vim, filteredElements, grouping])

  // Update Isolation on filter change.
  useEffect(() => {
    if (isFalse(props.settings.ui.bimInfoPanel)) return
    if (filter !== '') {
      const objects = filteredElements.map((e) =>
        props.viewerState.vim.getObjectFromElement(e.index)
      )
      props.isolation.isolate(objects, 'search')
    } else {
      props.isolation.isolate(undefined, 'search')
    }
  }, [filter])

  // Clear filter on isolation change
  useEffect(() => {
    const unsubscribe = props.isolation.onChanged.subscribe(
      (source: string) => {
        if (source !== 'tree' && source !== 'search') {
          setFilter('')
        }
      }
    )

    // Clean up
    return () => {
      unsubscribe()
    }
  }, [])

  const last =
    props.viewerState.selection[props.viewerState.selection.length - 1]
  const fullTree = isFalse(props.settings.ui.bimInfoPanel)
  const fullInfo = isFalse(props.settings.ui.bimTreePanel)
  return (
    <div className={`vim-bim-panel vc-inset-0 vc-absolute vc-h-full vc-w-full ${fullTree ? 'full-tree' : ''} ${props.visible ? '' : 'vc-hidden'}`}>
      {whenTrue(props.settings.ui.bimTreePanel,
        <div className={`vim-bim-upper vc-flex vc-flex-col vc-absolute vc-w-full ${fullTree ? 'vc-h-full' : 'vc-h-[49%]'} ${props.viewerState.elements.length > 0 ? '' : 'vc-hidden'}`}>
          <h2
            className="vim-bim-upper-title vc-title vc-text-xs vc-font-bold vc-uppercase">
            Project Inspector
          </h2>
          <BimSearch
            viewer={props.viewer}
            filter={filter}
            setFilter={setFilter}
            count={filteredElements?.length}
          />
          <BimTree
            actionRef={props.treeRef}
            viewer={props.viewer}
            camera={props.camera}
            objects={props.viewerState.selection}
            isolation={props.isolation}
            treeData={tree}
          />
        </div>
      )}
      {
        // Divider if needed.
        whenAllTrue([
          props.settings.ui.bimTreePanel,
          props.settings.ui.bimInfoPanel,
          props.viewerState.elements.length > 0
        ],
        divider())
      }

      {whenTrue(props.settings.ui.bimInfoPanel,
        <div className={`vim-bim-lower-container vc-absolute ${fullInfo ? 'vc-top-0' : 'vc-top-[50%]'} vc-bottom-0 vc-bottom vc-left-0 vc-right-0`}>
          <BimInfoPanel
            object={last}
            vim={props.viewerState.vim}
            elements={filteredElements}
            full={isFalse(props.settings.ui.bimTreePanel)}
            bimInfoRef={props.bimInfoRef}
          />
        </div>)}
    </div>
  )
}

function divider () {
  return <hr style={{ top: '50%' }} className="divider vc-absolute vc-w-full vc-border-gray-divider" />
}

function filterElements (
  vim: VIM.Vim,
  elements: AugmentedElement[],
  filter: string
) {
  const filterLower = filter.toLocaleLowerCase()
  const filtered = elements.filter(
    (e) =>
      (e.id?.toString() ?? '').toLocaleLowerCase().includes(filterLower) ||
      (e.name ?? '').toLocaleLowerCase().includes(filterLower) ||
      (e.category?.name ?? '').toLocaleLowerCase().includes(filterLower) ||
      (e.familyName ?? '').toLocaleLowerCase().includes(filterLower) ||
      (e.type ?? '').toLocaleLowerCase().includes(filterLower)
  )
  return filtered
}

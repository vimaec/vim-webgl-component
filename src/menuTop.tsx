import React, { useEffect, useRef } from 'react'
import { useState } from 'react'
import * as VIM from 'vim-webgl-viewer/'
import * as Icons from './icons'
import {resetCamera}  from './component'

export function MenuTop(props: {
  viewer: VIM.Viewer,
}){
  const [ortho, setOrtho] = useState<boolean>(props.viewer.camera.orthographic)
  
  const ui = useRef<HTMLDivElement>()
  
  useEffect(() => {
    props.viewer.camera.onChanged.subscribe(() => setOrtho(props.viewer.camera.orthographic))
    const axes = document.getElementsByClassName("gizmo-axis-canvas")[0]
    ui.current.appendChild(axes)
  },[])

  const onHomeBtn = () => {
    resetCamera(props.viewer)
  }

  const btnHome = <button data-tip="Reset Camera" onClick={onHomeBtn } className={"rounded-full text-gray-medium h-8 w-8 flex items-center justify-center transition-all hover:text-primary-royal"} type="button"><Icons.home height="20" width="20" fill="currentColor" /> </button>
  const btnOrtho = <button data-tip={ortho ? "Orthographic" : "Perspective"}  onClick={() => props.viewer.camera.orthographic = !ortho} className={"rounded-full text-gray-medium h-8 w-8 flex items-center justify-center transition-all hover:text-primary-royal"} type="button">{ortho ? <Icons.orthographic height="20" width="20" fill="currentColor" /> : <Icons.perspective height="20" width="20" fill="currentColor" />}</button>
  
  return <div ref={ui} className='vim-top border border-white-t50 flex flex-col fixed right-6 top-6 w-32 rounded-xl shadow-lg'>
    {/* <div className='vim-top-background border border-white-t50 h-28 w-full rounded-t-xl pointer-events-none z-0' > </div> */}
    <div className="vim-top-buttons order-2 flex p-1 rounded-b-xl pointer-events-auto justify-center bg-white-t50">
      <div className='mx-1'>{btnOrtho}</div>
      <div className='mx-1'>{btnHome}</div>
    </div>
  </div>
}

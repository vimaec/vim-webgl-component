import React, { useEffect, useState } from "react"
import ReactTooltip from "react-tooltip"
import * as VIM from 'vim-webgl-viewer/'
import {groupBy} from './data'
import * as Icons from './icons'

export type TableEntry = {name: string, value: string, group: string}

export function BimObjectDetails(props: { object: VIM.Object, getOpen: (s: string)=> boolean, setOpen: (s:string, b: boolean) => void, initOpen: (s:string[]) => void}){
  return BimDetails(props.object, getObjectParameterDetails, props.getOpen, props.setOpen, props.initOpen)
}

export function BimDocumentDetails(props: { vim: VIM.Vim, getOpen: (s: string)=> boolean, setOpen: (s:string, b: boolean) => void, initOpen: (s:string[]) => void}){
  return BimDetails(props.vim, getVimDocumentDetails, props.getOpen, props.setOpen, props.initOpen)
}

export function BimDetails<T>(input: T, toData: (v:T) => Promise<BimDetails>, getOpen: (s: string)=> boolean, setOpen: (s:string, b: boolean) => void, initOpen: (s:string[]) => void){
  //console.log("Render BimParameters Init")
  const [object, setObject] = useState<T>()
  const [details, setDetails] = useState<BimDetails>()

  useEffect(() => {
    ReactTooltip.rebuild()
  })

  if(input !== object){
    setObject(input)
    toData(input).then(data => {
      setDetails(data)
      initOpen(data.flatMap(d => [...d.content.keys()]))
    })
  }

  if(!details){
    //console.log("Render BimParameters Loading")
    return <div className="vim-inspector-properties"> Loading . . .</div>
  }

  //console.log("Render BimParameters Done")
  return <div className="vim-inspector-properties">
  {
    details.map(d => {
      return <>
        {createTables(d.section, d.content, getOpen, setOpen)}
        <br/>
      </>
    })
  }
  </div>
}

function createTables(title: string, entries: Map<string, TableEntry[]>, getOpen: (key:string) => boolean, setOpen: (key:string, value: boolean) => void){
  const createTitle = (value: string) => {
    return <h2 key={`title-${value}`} className="text-xs font-bold uppercase text-gray-medium p-2 rounded-t border-t border-l border-r border-gray-light w-auto inline-flex">{value}</h2>
  }
  return <>
    {title ? createTitle(title) : null}
    {Array.from(entries, (v,k) => createTable(v[0] , v[1], getOpen(v[0]), b => setOpen(v[0],b)))}
  </>
}

function createTable(key: string,  entries: TableEntry[], open: boolean, setOpen: (b:boolean) => void){
  return <div key={"parameters-" + key} className={"parameters"}>
    <ul className="">
      <li key={"title-"+key}>
        <h3 className="text-xs font-bold uppercase bg-gray-light px-2 py-2 flex justify-between">
          <span className="w-1/2">{key}</span>
          <button onClick={() => setOpen(!open)}> {open ?<Icons.collapse className="transition-all rotate-180" height="15" width="15" fill="currentColor" /> : <Icons.collapse className="transition-all rotate-0" height="15" width="15" fill="currentColor" />}</button>
        </h3>
      </li>
      {open ? entries.map((p,i) => {
        const id =key + p.name +i
        return <li className="odd:bg-white flex" key={'parameters-tr-' + id }>
          <span data-tip={p.value} className="w-1/2 border-r border-gray-light p-2 truncate" title={p.name} key={'parameters-th-' + id}>{p.name}</span>
          <span data-tip={p.value} className="w-1/2 text-gray-medium p-2 truncate"  title={p.value} key={'parameters-td-' + id}>{p.value}</span>
        </li>
      }) : null}
    </ul>
  </div>
}


type BimDetails = {section: string, content: Map<string, TableEntry[]>}[]
  

async function getVimDocumentDetails(vim: VIM.Vim): Promise<BimDetails>{
  
  let documents = await vim?.document.getBimDocumentSummary()
  documents = documents.sort((a, b) => compare(a.title, b.title))
  const data = new Map<string, TableEntry[]>(documents.map(d => 
    [d.title, 
    [
      {name: 'Revit Version', value: d.version, group:d.title},
      {name: 'Revit Author(s)', value: d.author, group:d.title},
      {name: 'Last Modified', value: d.date, group:d.title}
    ]])
  )
  return [{section: 'Source Files', content:data}]
}

async function getObjectParameterDetails(object: VIM.Object): Promise<BimDetails>{
  let parameters = await object?.getBimParameters()
  parameters = parameters.filter(acceptParameter)
  parameters = parameters.sort((a, b) => compare(a.group, b.group))
  const instance = groupBy(parameters.filter(p => p.isInstance), p => p.group)
  const type = groupBy(parameters.filter(p => !p.isInstance), p => p.group)
  return [
    {section: 'Instance Properties', content:instance},
    {section: 'Type Properties', content:type}
  ]
}

// Custom rejected parameters provided by Sam
const rejectedParameters = [
  "Coarse Scale Fill Pattern",
  "Coarse Scale Fill Color",
  "Image",
  "Type Image",
  'Moves with nearby Element',
  'Location Line',
  'Show family pre-cut in plan views'
]

// Revit custom ordering provided by Sam
const ordering = [
  'Analysis Results',
  'Analytical Alignment',
  'Analytical Model',
  'Constraints',
  'Construction',
  'Data',
  'Dimension',
  'Dimensions',
  'Division Geometry',
  'Electrical',
  'Electrical – Circuiting',
  'Electrical – Lighting',
  'Electrical – Loads',
  'Electrical Analysis',
  'Electrical Engineering',
  'Energy Analysis',
  'Fire Protection',
  'Forces',
  'General',
  'Graphics',
  'Green Building Properties',
  'Identity Data',
  'IFC Parameters',
  'Layers',
  'Materials and Finishes',
  'Mechanical',
  'Mechanical – Flow',
  'Mechanical – Loads',
  'Model Properties',
  'Moments',
  'Other',
  'Overall Legend',
  'Phasing',
  'Photometrics',
  'Plumbing',
  'Primary End',
  'Rebar Set',
  'Releases / Member Forces',
  'Secondary End',
  'Segments and Fittings',
  'Set',
  'Slab Shape Edit',
  'Structural',
  'Structural Analysis',
  'Text',
  'Title Text',
  'Visibility'
  ]
const orderMap = new Map(ordering.map((s,i) => [s,i]))

function compare(s1: string, s2: string){
  const has1 = orderMap.has(s1)
  const has2 = orderMap.has(s2)
  if(has1 && !has2) return -1
  if(!has1 && has2) return 1
  if(!has1 && !has2) return s1.localeCompare(s2)
  const eq = orderMap.get(s2) - orderMap.get(s2)
  if(eq === 0) return s1.localeCompare(s2)
  return eq
}

function acceptParameter(parameter: TableEntry){
  let result = true
  rejectedParameters.forEach(p => {
    if(p === parameter.name){
      result = false
      return
    }
  })
  return result
}
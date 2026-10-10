import cytoscape, { type Core, type StylesheetStyle, type ElementDefinition } from 'cytoscape'
import fcose from 'cytoscape-fcose'
import type { GraphNode, GraphEdge } from './relationshipAdapter'
cytoscape.use(fcose)
export const relationshipStyles: StylesheetStyle[] = [
  { selector: 'node', style: { width: 180, height: 68, shape: 'round-rectangle', 'background-color': '#edf3f4', 'border-color': '#9fbac4', 'border-width': 2, label: 'data(label)', color: '#355d6e', 'font-size': 18, 'font-family': 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif', 'text-valign': 'center', 'text-halign': 'center', 'text-wrap': 'ellipsis', 'text-max-width': '158px', 'min-zoomed-font-size': 8, 'overlay-opacity': 0 } },
  { selector: 'node[kind = "self"]', style: { shape: 'ellipse', width: 92, height: 92, 'background-color': '#3f6679', 'border-color': '#3f6679', 'font-size': 27, 'font-weight': 'bold', color: '#fff' } },
  { selector: 'node[kind = "person"]', style: { shape: 'ellipse', width: 76, height: 76, 'background-color': '#e4f5eb', 'border-color': '#a5d8bc', color: '#25634b', 'font-size': 17, 'text-max-width': '62px' } },
  { selector: 'edge', style: { width: 2, 'line-color': '#9cb7c0', 'curve-style': 'bezier', 'target-arrow-shape': 'none', 'line-style': 'solid', 'overlay-opacity': 0 } },
  { selector: 'edge[relation = "marked"], edge[relation = "followed"]', style: { 'line-style': 'dashed', 'line-color': '#a2b7bf', 'line-dash-pattern': [6, 5] } },
  { selector: 'edge[relation = "booked"], edge[relation = "confirmed"]', style: { 'line-color': '#638b9a', width: 3 } },
  { selector: 'edge[relation = "shared"]', style: { 'line-style': 'dashed', 'line-color': '#8abdaa', 'line-dash-pattern': [5, 5] } },
  { selector: 'edge[?history]', style: { 'line-style': 'dotted', 'line-color': '#afb7c6', opacity: .7 } },
  { selector: '.muted', style: { opacity: .18 } },
  { selector: 'node.highlight', style: { 'border-width': 4, 'border-color': '#638b9a' } },
  { selector: 'edge.highlight', style: { width: 4 } },
]
export function graphElements(graph: { nodes: GraphNode[]; edges: GraphEdge[] }): ElementDefinition[] {
  return [...graph.nodes.map(node => ({ data: { ...node } })), ...graph.edges.map(edge => ({ data: { ...edge } }))]
}
export function layoutRelationships(cy: Core) {
  cy.layout({ name: 'concentric', animate: false, fit: false, avoidOverlap: true, nodeDimensionsIncludeLabels: true, minNodeSpacing: 32, spacingFactor: 1.05, concentric: node => node.data('kind') === 'self' ? 3 : node.data('kind') === 'person' ? 1 : 2, levelWidth: () => 1, boundingBox: { x1: 0, y1: 0, w: 900, h: 650 } }).run()
  if (cy.nodes().length < 2) return
  const center = { ...cy.getElementById('self').position() }
  cy.nodes().positions(node => ({ x: node.position('x') - center.x, y: node.position('y') - center.y }))
  const options = { name: 'fcose', quality: 'proof', randomize: false, animate: false, fit: false, nodeDimensionsIncludeLabels: false, nodeRepulsion: 12000, idealEdgeLength: 70, edgeElasticity: .45, numIter: 900, gravity: .3, fixedNodeConstraint: [{ nodeId: 'self', position: { x: 0, y: 0 } }] }
  cy.layout(options).run()
  const nodes = cy.nodes().toArray()
  const overlaps = nodes.some((node, i) => nodes.slice(i + 1).some(other => {
    const a = node.boundingBox(), b = other.boundingBox()
    return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2
  }))
  if (overlaps) cy.layout({ name: 'concentric', animate: false, fit: false, avoidOverlap: true, minNodeSpacing: 38, nodeDimensionsIncludeLabels: true, concentric: node => node.data('kind') === 'self' ? 2 : 1, levelWidth: () => 1, boundingBox: { x1: 0, y1: 0, w: 900, h: 650 } }).run()
}
export function createRelationshipEngine(container: HTMLElement): Core {
  return cytoscape({ container, elements: [], style: relationshipStyles, layout: { name: 'preset' }, minZoom: .12, maxZoom: 2.5, pixelRatio: Math.min(window.devicePixelRatio || 1, 2), boxSelectionEnabled: false, selectionType: 'single', autounselectify: true, wheelSensitivity: .2 })
}

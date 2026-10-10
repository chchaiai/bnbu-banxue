import { ArrowRight, CalendarDays, Maximize, Minus, Network, Plus, RotateCcw, Search, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Core } from 'cytoscape'
import type { V2State } from './model'
import { useV2 } from './useV2'
import { adaptRelationships, buildRelationshipGraph, entityLabels, relationLabels, type EntityKind } from './relationshipAdapter'
import { relationshipDemo } from './relationshipMock'
import './relationshipGraph.css'

type Engine = typeof import('./relationshipEngine')
const dateLabel = (date: string | null) => date ? new Date(date).toLocaleString('zh-CN') : '未提供（不推测历史时间）'

export function V2RelationshipGraph({ state }: { state: V2State }) {
  const { persistenceError } = useV2()
  const [demo, setDemo] = useState(false), [kind, setKind] = useState('all'), [relation, setRelation] = useState('all'), [query, setQuery] = useState(''), [history, setHistory] = useState(false), [page, setPage] = useState(0)
  const real = useMemo(() => adaptRelationships(state), [state])
  const entities = useMemo(() => demo ? relationshipDemo() : real, [demo, real])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(real.filter(e => e.members.length).slice(0, 2).map(e => e.id)))
  const [selectedId, setSelectedId] = useState('self'), [ready, setReady] = useState(false), [loadError, setLoadError] = useState(false), [retry, setRetry] = useState(0), [zoom, setZoom] = useState(100), [announcement, setAnnouncement] = useState('')
  const container = useRef<HTMLDivElement>(null), cy = useRef<Core | null>(null), engine = useRef<Engine | null>(null)
  const filtered = entities.filter(e => (history || e.active) && (kind === 'all' || e.kind === kind) && (relation === 'all' || e.relation === relation) && e.title.toLowerCase().includes(query.trim().toLowerCase()))
  const pages = Math.max(1, Math.ceil(filtered.length / 6)), currentPage = Math.min(page, pages - 1), slice = filtered.slice(currentPage * 6, currentPage * 6 + 6)
  const graph = buildRelationshipGraph(slice, expanded)
  const graphPayload = JSON.stringify(graph)
  const selectedNode = graph.nodes.find(n => n.id === selectedId)
  const selected = entities.find(e => e.id === selectedNode?.entityId)
  const effectiveId = selectedNode ? selectedId : 'self'
  const selectedChanges = !demo && selected ? state.relationshipHistory?.[selected.id]?.changes ?? [] : []

  useEffect(() => {
    let disposed = false
    let cleanup: (() => void) | undefined
    setReady(false); setLoadError(false)
    import('./relationshipEngine').then(module => {
      if (disposed || !container.current) return
      engine.current = module
      const instance = module.createRelationshipEngine(container.current)
      cy.current = instance
      instance.on('tap', 'node', event => { setSelectedId(event.target.id()); setAnnouncement(`已选中 ${event.target.data('label')}`) })
      instance.on('tap', event => { if (event.target === instance) setSelectedId('self') })
      instance.on('zoom', () => setZoom(Math.round(instance.zoom() * 100)))
      instance.on('dragfree', 'node', event => setAnnouncement(`已移动 ${event.target.data('label')}，重置视图可恢复自动布局。`))
      const observer = new ResizeObserver(() => { instance.resize(); if (instance.nodes().length) { instance.fit(undefined, 32); if (instance.zoom() > 1.15) { instance.zoom(1.15); instance.center() } } })
      observer.observe(container.current)
      cleanup = () => { observer.disconnect(); instance.destroy(); cy.current = null }
      setReady(true)
    }).catch(() => { if (!disposed) setLoadError(true) })
    return () => { disposed = true; cleanup?.() }
  }, [retry])
  useEffect(() => {
    if (!ready || !cy.current || !engine.current) return
    const instance = cy.current
    const data = JSON.parse(graphPayload) as ReturnType<typeof buildRelationshipGraph>
    instance.batch(() => { instance.elements().remove(); instance.add(engine.current!.graphElements(data)) })
    engine.current.layoutRelationships(instance)
    instance.fit(undefined, 32)
    if (instance.zoom() > 1.15) { instance.zoom(1.15); instance.center() }
  }, [ready, graphPayload])
  useEffect(() => {
    const instance = cy.current
    if (!ready || !instance) return
    instance.elements().removeClass('muted highlight')
    const node = instance.getElementById(effectiveId)
    if (effectiveId !== 'self' && node.length) {
      const connected = node.closedNeighborhood()
      instance.elements().not(connected).addClass('muted')
      connected.addClass('highlight')
    }
  }, [effectiveId, ready, graphPayload])

  function fit() { cy.current?.fit(undefined, 32) }
  function reset() { if (cy.current && engine.current) { engine.current.layoutRelationships(cy.current); fit(); setSelectedId('self'); setAnnouncement('已恢复自动布局。') } }
  function changeZoom(factor: number) { const c = cy.current; if (c && container.current) c.zoom({ level: Math.max(c.minZoom(), Math.min(c.maxZoom(), c.zoom() * factor)), renderedPosition: { x: container.current.clientWidth / 2, y: container.current.clientHeight / 2 } }) }
  function focus() { const c = cy.current; if (c) c.fit(c.getElementById(effectiveId).closedNeighborhood(), 55) }
  function toggle(id: string) { setExpanded(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function switchDemo(value: boolean) { setDemo(value); setPage(0); setKind('all'); setRelation('all'); setQuery(''); setHistory(false); setSelectedId('self'); setExpanded(new Set((value ? relationshipDemo() : real).filter(e => e.members.length).slice(0, 2).map(e => e.id))) }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    const c = cy.current
    if (!c || event.target !== event.currentTarget) return
    const movement: Record<string, { x: number; y: number }> = { ArrowLeft: { x: 40, y: 0 }, ArrowRight: { x: -40, y: 0 }, ArrowUp: { x: 0, y: 40 }, ArrowDown: { x: 0, y: -40 } }
    if (movement[event.key]) { event.preventDefault(); c.panBy(movement[event.key]) }
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); changeZoom(1.2) }
    else if (event.key === '-') { event.preventDefault(); changeZoom(1 / 1.2) }
    else if (event.key === 'Escape') setSelectedId('self')
    else if (event.key.toLowerCase() === 'r') reset()
  }
  return <section className="v2-panel v2-network-panel" aria-labelledby="v2-relationship-title">
    <header className="v2-network-heading"><div><span className="v2-eyebrow">MY CONNECTIONS</span><h3 id="v2-relationship-title">我的校园关系网</h3><p>从校园里的连接，发现共同的经历。</p></div><Network size={23}/></header>
    <div className="v2-network-filters"><div className="v2-network-search"><label htmlFor="v2-network-query">查找连接{query && <small>{filtered.length} 个结果</small>}</label><span className="v2-network-search-field"><Search size={16} aria-hidden="true"/><input id="v2-network-query" aria-label="查找关系节点" placeholder="搜索活动、队伍或组织" value={query} onChange={e => { setQuery(e.target.value); setPage(0) }}/>{query && <button type="button" aria-label="清除关系搜索" onClick={() => { setQuery(''); setPage(0) }}><X size={15}/></button>}</span></div><label>节点类型<select aria-label="关系图节点类型" value={kind} onChange={e => { setKind(e.target.value); setPage(0) }}><option value="all">全部类型</option>{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>关系<select aria-label="关系类型" value={relation} onChange={e => { setRelation(e.target.value); setPage(0) }}><option value="all">全部关系</option>{Object.entries(relationLabels).filter(([key]) => demo || entities.some(e => e.relation === key)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="v2-network-check"><input type="checkbox" checked={history} onChange={e => { setHistory(e.target.checked); setPage(0) }}/>显示历史关系</label><label className="v2-network-check"><input type="checkbox" checked={demo} onChange={e => switchDemo(e.target.checked)}/>示例关系图</label></div>
    {demo && <p className="v2-network-demo" role="status">示例模式 · 人物、报名和组织成员均为虚构数据，不会写入我的记录。</p>}
    {persistenceError && !demo && <p role="alert">浏览器存储失败，当前关系变更仅保留在本页，刷新后可能丢失。</p>}
    <div className="v2-network-body"><div className="v2-network-visual"><div className="v2-network-toolbar" role="toolbar" aria-label="关系图视图控制"><button disabled={!ready} onClick={() => changeZoom(1.2)} aria-label="放大关系图" title="放大"><Plus size={17}/></button><span aria-label="缩放比例">{zoom}%</span><button disabled={!ready} onClick={() => changeZoom(1 / 1.2)} aria-label="缩小关系图" title="缩小"><Minus size={17}/></button><button disabled={!ready} onClick={fit} aria-label="显示全部节点" title="适应画布"><Maximize size={17}/></button><button disabled={!ready} onClick={reset} aria-label="重置关系图" title="重置布局"><RotateCcw size={17}/></button></div>
      <div ref={container} className="v2-network-canvas" tabIndex={0} role="region" aria-label="校园关系图画布" aria-describedby="v2-network-help" onKeyDown={keyboard}/>
      {!ready && <div className="v2-network-loading">{loadError ? <><p>关系图加载失败，连接列表仍可使用。</p><button className="v2-button v2-button-secondary" onClick={() => setRetry(n => n + 1)}>重新加载</button></> : '正在整理校园关系…'}</div>}
      {ready && !slice.length && <p className="v2-network-empty">{entities.length ? '没有符合筛选条件的连接' : '还没有连接，标记活动或加入队伍后会自动出现。'}</p>}
      <p id="v2-network-help" className="v2-network-help">拖动节点或空白处 · 滚轮/双指缩放 · 点击查看详情</p></div>
    <aside className="v2-network-detail" aria-label="当前连接"><span className="v2-eyebrow">当前连接</span><h4>{selectedNode?.kind === 'person' ? selectedNode.label : selected?.title ?? (state.profile?.nickname ?? '我')}</h4><dl><dt>类型</dt><dd>{selectedNode?.kind === 'person' ? '其他同学' : selected ? entityLabels[selected.kind] : '学生本人'}</dd><dt>关系</dt><dd>{selectedNode?.kind === 'person' ? selectedNode.detail : selected ? relationLabels[selected.relation] : '校园关系的中心节点'}</dd><dt>当前状态</dt><dd>{selected?.status ?? '当前账号'}</dd><dt>建立时间</dt><dd>{selectedNode?.kind === 'person' ? '成员关系时间未提供' : selected ? dateLabel(selected.establishedAt) : '—'}</dd></dl>
      {selected && <><p className="v2-network-privacy">{selected.memberAccess}</p>{selectedNode?.kind !== 'person' && <button className="v2-button v2-button-secondary" disabled={!selected.active || !selected.members.some(m => m.canView)} onClick={() => toggle(selected.id)}>{expanded.has(selected.id) ? '收起关联成员' : '展开关联成员'}{selected.members.some(m => m.canView) ? ` (${selected.members.filter(m => m.canView).length})` : ''}</button>}{expanded.has(selected.id) && selected.members.filter(m => m.canView).length > 6 && <small>每个连接最多展开 6 位可见成员；完整列表请查看来源。</small>}<button disabled={!ready} className="v2-button v2-button-secondary" onClick={focus}>聚焦当前连接</button>{selected.path ? <Link to={selected.path}>查看来源 <ArrowRight size={15}/></Link> : <small>虚构示例，无真实来源入口</small>}</>}
      {selectedChanges.length > 0 && <details><summary>状态历史（{selectedChanges.length}）</summary><ol>{selectedChanges.slice(-10).reverse().map((item, i) => <li key={`${item.at}-${i}`}>{item.status}<small>{dateLabel(item.at)}</small></li>)}</ol>{selectedChanges.length > 10 && <small>显示最近 10 次变化，完整本地历史仍保留。</small>}</details>}
      <div className="v2-network-stats">{(['activity', 'team', 'organization'] as EntityKind[]).map(type => <span key={type}>{type === 'activity' ? <CalendarDays size={16}/> : <UsersRound size={16}/>}<strong>{entities.filter(e => e.kind === type && e.active).length}</strong>{entityLabels[type]}</span>)}</div>
    </aside></div>
    <div className="v2-network-legend" aria-label="关系图图例"><span><i className="self"/>本人</span><span><i className="person"/>其他同学</span><span><i className="entity"/>活动 / 队伍 / 组织</span><span><b className="joined"/>加入 / 主办 / 报名</span><span><b className="confirmed"/>确认参与 / 预约</span><span><b className="marked"/>标记 / 关注</span><span><b className="shared"/>共同成员，非好友</span><span><b className="history"/>历史关系</span></div>
    <div className="v2-network-pagination"><span>本页 {graph.nodes.length} 个节点 · {graph.edges.length} 条关系 · 共 {filtered.length} 个连接</span><div><button disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setSelectedId('self') }}>上一页</button><span>{currentPage + 1} / {pages}</span><button disabled={currentPage + 1 >= pages} onClick={() => { setPage(currentPage + 1); setSelectedId('self') }}>下一页</button></div></div>
    <details className="v2-network-list"><summary>连接列表与键盘操作</summary><p>选择下方节点查看详情。画布聚焦后，方向键平移，+ / − 缩放，R 重置。</p><div>{graph.nodes.map(node => <button key={node.id} aria-pressed={effectiveId === node.id} onClick={() => setSelectedId(node.id)}>{node.kind === 'self' ? '我' : node.label}{node.kind === 'person' ? ' · 同学' : ''}</button>)}</div></details>
    <details className="v2-network-source"><summary>数据来源与关系说明</summary><p>当前接入伴学浏览器业务数据，尚无真实关系图或成员授权 API。标记活动不等于报名、预约确认不等于到场；共同成员不等于好友。组织开关目前仅代表关注，正式入会未核验。成员只读取本人当前开放队伍中已可见的姓名，活动及组织成员需未来的授权接口。历史仅记录升级后的本地成功状态变化；旧记录不补造日期。示例模式独立且不持久化。</p></details>
    <span className="v2-network-sr" role="status" aria-live="polite">{announcement}</span>
  </section>
}

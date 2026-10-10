import { ArrowRight, CalendarDays, MessageCircle, Search, UsersRound, X } from 'lucide-react'
import { gsap } from 'gsap'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { events, hosts } from '../data/mockData'
import { recommendationPhoto } from '../data/recommendationPhoto'
import { useV2 } from './useV2'

type SearchResult = { id: string; title: string; meta: string; path: string; keywords?: string; image?: string; kind: 'event' | 'post' | 'room' }

const resultIcons = { event: CalendarDays, post: MessageCircle, room: UsersRound }

export function StudentSearch() {
  const { state } = useV2()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousPath = useRef(location.pathname)
  const previousOpen = useRef(false)

  const allResults = useMemo<SearchResult[]>(() => [
    ...state.localEvents.filter((event) => event.status === 'published').map((event) => ({ id: event.id, title: event.title, meta: `活动 · ${event.location}`, keywords: event.description, path: `/v2/activities/${event.id}`, kind: 'event' as const })),
    ...events.map((event) => ({ id: event.id, title: event.title, meta: `${event.category} · ${event.location} · ${hosts.find((host) => host.id === event.hostId)?.name ?? 'BNBU'}`, keywords: `${event.subtitle} ${event.description} ${event.tags.join(' ')}`, path: `/v2/activities/${event.id}`, image: recommendationPhoto(event), kind: 'event' as const })),
    ...state.posts.filter((item) => item.status === 'visible' || item.status === 'pending' && item.author === '陈雨晴').map((item) => ({ id: item.id, title: item.title, meta: `社区 · ${item.board} · ${item.author}`, keywords: item.body, path: `/v2/community?item=${encodeURIComponent(item.id)}`, kind: 'post' as const })),
    ...state.rooms.filter((item) => item.status === 'open').map((item) => ({ id: item.id, title: item.title, meta: `找搭子 · ${item.place} · ${item.owner}`, keywords: item.body, path: `/v2/partners?item=${encodeURIComponent(item.id)}`, kind: 'room' as const })),
  ], [state.localEvents, state.posts, state.rooms])

  const normalized = query.trim().toLocaleLowerCase()
  const matched = normalized ? allResults.filter((item) => `${item.title} ${item.meta} ${item.keywords ?? ''}`.toLocaleLowerCase().includes(normalized)) : []
  const firstByKind = (['event', 'post', 'room'] as const).flatMap((kind) => matched.filter((item) => item.kind === kind).slice(0, 2))
  const results = normalized
    ? [...firstByKind, ...matched.filter((item) => !firstByKind.includes(item))].slice(0, 7)
    : allResults.filter((item) => item.kind === 'event').slice(0, 3)

  const close = useCallback(() => { inputRef.current?.blur(); setOpen(false); setQuery('') }, [])
  const closeToTrigger = useCallback(() => { close(); triggerRef.current?.focus() }, [close])

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      previousPath.current = location.pathname
      close()
    }
  }, [location.pathname, close])

  useEffect(() => {
    const onPointer = (event: PointerEvent) => { if (open && !rootRef.current?.contains(event.target as Node)) close() }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) { closeToTrigger(); return }
      const target = event.target as HTMLElement
      if ((event.key === '/' || (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) && !target.closest('input, textarea, [contenteditable="true"]')) {
        event.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open, close, closeToTrigger])

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 720px)').matches
    const opening = open && !previousOpen.current
    previousOpen.current = open
    gsap.to(panel, { height: open ? 'auto' : 0, opacity: open ? 1 : 0, duration: reduced || mobile && !open ? 0 : mobile ? .22 : .32, ease: 'power3.out', overwrite: true })
    if (opening && !reduced && !mobile) gsap.fromTo(panel.querySelectorAll('.v2-student-search-result'), { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .26, stagger: .035, ease: 'power3.out', overwrite: true })
    else gsap.set(panel.querySelectorAll('.v2-student-search-result'), { clearProps: 'opacity,transform' })
    return () => { gsap.killTweensOf(panel); gsap.killTweensOf(panel.querySelectorAll('.v2-student-search-result')) }
  }, [open, results.length])

  const choose = (path: string) => { close(); navigate(path) }

  return <div ref={rootRef} className={`v2-student-search${open ? ' is-open' : ''}`} role="search">
    <button ref={triggerRef} type="button" className="v2-icon-button v2-student-search-trigger" aria-label="搜索校园" aria-expanded={open} aria-keyshortcuts="/ Meta+K Control+K" onClick={() => setOpen(true)}><Search size={19}/></button>
    <div className="v2-student-search-field" aria-hidden={!open}>
      <Search size={18} aria-hidden="true"/>
      <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) choose(results[0].path) }} placeholder="搜索活动、社区与搭子" aria-label="搜索校园内容" tabIndex={open ? 0 : -1}/>
      {query && <button type="button" className="v2-student-search-clear" aria-label="清除搜索词" onClick={() => { setQuery(''); inputRef.current?.focus() }}><X size={15}/></button>}
      <button type="button" className="v2-student-search-close" aria-label="关闭搜索" onClick={closeToTrigger}><X size={18}/></button>
    </div>
    <div ref={panelRef} className="v2-student-search-panel" aria-hidden={!open} inert={!open}>
      <div className="v2-student-search-panel-inner">
        <div className="v2-student-search-heading"><strong>{normalized ? '搜索结果' : '推荐看看'}</strong><small>{normalized ? `${results.length} 条匹配` : '校园里正在发生'}</small></div>
        {results.length ? results.map((item) => {
          const Icon = resultIcons[item.kind]
          return <Link to={item.path} className="v2-student-search-result" key={`${item.kind}-${item.id}`} onClick={close}>
            <span className="v2-student-search-art">{item.image ? <img src={item.image} alt=""/> : <Icon size={20}/>}</span>
            <span className="v2-student-search-result-copy"><strong>{item.title}</strong><small>{item.meta}</small></span>
            <ArrowRight size={16} aria-hidden="true"/>
          </Link>
        }) : <div className="v2-student-search-empty">没有找到相关内容。试试更短的关键词。</div>}
        <div className="v2-student-search-footer"><span>按 Enter 打开首条结果 · Esc 关闭</span><button type="button" onClick={() => choose('/v2/activities')}>浏览全部活动 <ArrowRight size={14}/></button></div>
      </div>
    </div>
  </div>
}

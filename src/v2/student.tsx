import { ArrowRight, Bell, BookOpen, Bookmark, CalendarDays, CarFront, ChevronRight, Clapperboard, Clock3, MapPin, Megaphone, MessageCircle, Plus, Search, Send, SlidersHorizontal, UsersRound, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import FlexCarousel from '../components/reactbits/FlexCarousel/FlexCarousel'
import { events, hosts } from '../data/mockData'
import { recommendationPhoto } from '../data/recommendationPhoto'
import campusPhoto from '../assets/campus/home-background.jpg'
import { CampusMap } from './CampusMap'
import { CampusBuildingPicker } from './V2CampusExplorer'
import type { CampusBuilding } from './campusLocations'
import { makeId, roomTypeName, studentName, timeLabel, type Room, type RoomType } from './model'
import { useV2 } from './useV2'
import { Drawer, Empty, Modal, PageHeading, SectionHeading } from './ui'
import { AnimatedSearchField } from './AnimatedSearchField'
import { filterActivityItems, type ActivityItem, type ActivityPeriod, type ActivitySort, type ActivityStatus } from './activityFilters'
import { studentSchedule, setActivityParticipation } from './studentSchedule'
import { activityActor, canPublishActivity, changeActivityVisibility, createActivity, ownsActivity } from './activityPolicy'

const formatWhen = (value: string) => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

export function V2Home() {
  const { state } = useV2()
  const schedule = studentSchedule(state)
  const next = schedule[0]
  const roomRequests = state.rooms.reduce((count, room) => count + (room.owner === studentName ? room.requests.length : 0), 0)
  const unreadMessages = state.conversations.reduce((count, conversation) => count + conversation.unread, 0)
  const unreadNotices = state.notifications.filter((notice) => !notice.read).length
  const now = new Date()
  const today = `${new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(now)}，${new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(now)}`
  return <div className="v2-page v2-home">
    <header className="v2-a-home-heading"><span className="v2-eyebrow">CAMPUS / TODAY</span><h1>今天，先做好下一件事</h1><p>你好，{state.profile?.nickname ?? studentName}。你的校园安排和需要处理的事项都在这里。</p><div className="v2-a-home-date"><strong>{today}</strong><span>·</span><span>{schedule.length} 项近期安排</span></div></header>
    <div className="v2-a-home-primary">
      <section className="v2-panel v2-a-next-card"><span className="v2-eyebrow">下一步 · {next ? next.label : '从这里开始'}</span>{next ? <><strong className="v2-a-next-time">{next.startAt ? formatWhen(next.startAt) : next.time}</strong><h2>{next.title}</h2><p><MapPin size={15}/>{next.location}</p><div className="v2-a-next-actions"><Link className="v2-button v2-button-primary" to={next.path}>查看详情 <ArrowRight size={16}/></Link><Link className="v2-button v2-button-secondary" to="/v2/activities">发现活动</Link></div></> : <><h2>发现你的下一件校园事</h2><p>标记感兴趣的活动，或加入搭子队伍，安排会自动显示在这里。</p><div className="v2-a-next-actions"><Link className="v2-button v2-button-primary" to="/v2/activities">发现活动 <ArrowRight size={16}/></Link><Link className="v2-button v2-button-secondary" to="/v2/partners">找搭子</Link></div></>}</section>
      <section className="v2-panel v2-a-task-card"><SectionHeading title="待处理" detail="与你有关的新进展" action={<Link to="/v2/messages">全部消息 <ArrowRight size={14}/></Link>}/><div className="v2-a-task-list"><Link to="/v2/partners/teams"><span className="v2-a-task-count">{roomRequests}</span><span><strong>{roomRequests ? '组队申请等待答复' : '组队申请'}</strong><small>{roomRequests ? '前往我的队伍处理' : '目前无需答复'}</small></span><ArrowRight size={15}/></Link><Link to="/v2/messages"><span className="v2-a-task-count">{unreadMessages + unreadNotices}</span><span><strong>未读消息与通知</strong><small>聊天 {unreadMessages} 条 · 通知 {unreadNotices} 条</small></span><ArrowRight size={15}/></Link></div></section>
    </div>
    <div className="v2-a-home-secondary"><section className="v2-panel v2-a-schedule-card"><SectionHeading title="近期安排" detail="已标记的活动、已加入的搭子与 Coffee Chat" action={<Link to="/v2/me?tab=events">查看全部 <ArrowRight size={14}/></Link>}/><div className="v2-a-schedule-list">{schedule.slice(0, 4).map((item, index) => <Link to={item.path} key={item.id} style={{ animationDelay: `${index * 45}ms` }}><time>{item.startAt ? formatWhen(item.startAt) : item.time}</time><span><strong>{item.title}</strong><small>{item.location}</small></span><em>{item.label}</em></Link>)}{schedule.length === 0 && <div className="v2-a-schedule-empty">暂无近期安排。<Link to="/v2/activities">去看看校园活动 <ArrowRight size={14}/></Link></div>}</div></section>
      <section className="v2-panel v2-a-campus-card"><SectionHeading title="校园里正在发生" detail="从校园探索新的活动" action={<Link to="/v2/campus/explore">探索校园 <ArrowRight size={14}/></Link>}/><Link to="/v2/campus/explore" className="v2-a-campus-photo"><img src={campusPhoto} alt="校园建筑与树木"/></Link><h3>从地图上查看楼栋与活动</h3><p>找到地点，再决定今天要去哪里。</p><Link to="/v2/sports" className="v2-a-sport-mini"><span>运动进度 · 本地演示数据</span><strong>16 / 20 小时</strong><span className="v2-a-sport-track"><i/></span></Link></section></div>
  </div>
}

const seededActivities: ActivityItem[] = events.map((event) => ({ id: event.id, title: event.title, subtitle: event.subtitle, description: event.description, category: event.category, startAt: event.startAt, endAt: event.endAt, location: event.location, capacity: event.capacity, host: hosts.find((host) => host.id === event.hostId)?.name ?? 'BNBU', image: recommendationPhoto(event) }))

export function V2Activities() {
  const { state, setState } = useV2()
  const activityBase = state.role === 'teacher' ? '/v2/teacher/activities' : '/v2/activities'
  const { id } = useParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [period, setPeriod] = useState<ActivityPeriod>('全部时间')
  const [hostFilter, setHostFilter] = useState('全部主办方')
  const [statusFilter, setStatusFilter] = useState<ActivityStatus>('全部状态')
  const [sort, setSort] = useState<ActivitySort>('推荐顺序')
  const [filterOpen, setFilterOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [activityBuilding, setActivityBuilding] = useState<CampusBuilding | null>(null)
  const [activityPickerOpen, setActivityPickerOpen] = useState(false)
  const permitted = canPublishActivity(state)
  const [featured, setFeatured] = useState(0)
  const all = useMemo(() => [...state.localEvents.map((event): ActivityItem => ({ id: event.id, title: event.title, subtitle: event.mailSourceId ? '来自学校邮件' : '校园成员发起的活动', description: event.description, category: event.mailSourceId ? '学校邮件活动' : '校园成员活动', image: event.image, endAt: event.endAt, startAt: event.startAt, location: event.location, capacity: event.capacity, host: event.host ?? studentName, local: event })), ...seededActivities], [state.localEvents])
  const categories = ['全部', ...new Set(all.map((event) => event.category))]
  const hostsList = ['全部主办方', ...new Set(all.filter((event) => event.local?.status !== 'draft').map((event) => event.host))]
  const filtered = filterActivityItems(all, { query, category, period, host: hostFilter, status: statusFilter, sort }, activityActor(state).id)
  const activeFilters = [
    ...(query.trim() ? [{ label: `搜索：${query.trim()}`, clear: () => setQuery('') }] : []),
    ...(category !== '全部' ? [{ label: `分类：${category}`, clear: () => setCategory('全部') }] : []),
    ...(period !== '全部时间' ? [{ label: `时间：${period}`, clear: () => setPeriod('全部时间') }] : []),
    ...(hostFilter !== '全部主办方' ? [{ label: `主办：${hostFilter}`, clear: () => setHostFilter('全部主办方') }] : []),
    ...(statusFilter !== '全部状态' ? [{ label: `状态：${statusFilter}`, clear: () => setStatusFilter('全部状态') }] : []),
    ...(sort !== '推荐顺序' ? [{ label: `排序：${sort}`, clear: () => setSort('推荐顺序') }] : []),
  ]
  const resetFilters = () => { setQuery(''); setCategory('全部'); setPeriod('全部时间'); setHostFilter('全部主办方'); setStatusFilter('全部状态'); setSort('推荐顺序') }
  const active = all.find((item) => item.id === id && (!item.local || item.local.status === 'published' || ownsActivity(state, item.local)))
  const featuredItems = seededActivities.filter((event) => new Date(event.startAt).getTime() > Date.now()).slice(0, 7)
  const selectedFeatured = featuredItems[featured] ?? featuredItems[0]
  const create = (form: FormEvent<HTMLFormElement>) => {
    form.preventDefault()
    const data = new FormData(form.currentTarget)
    const location = activityBuilding ? [activityBuilding.name, String(data.get('locationDetail') ?? '').trim()].filter(Boolean).join(' · ') : ''
    if (!location) { setPublishError('请先从地图选择活动楼栋'); return }
    try {
      const next = createActivity(state, { title: String(data.get('title') ?? ''), description: String(data.get('description') ?? ''), startAt: String(data.get('date') ?? ''), location, capacity: Number(data.get('capacity')) })
      setState(next); setCreateOpen(false); setActivityBuilding(null); setPublishError(''); navigate(activityBase + '/' + next.localEvents[0].id)
    } catch (error) { setPublishError(error instanceof Error ? error.message : '活动发布失败') }
  }
  const changeVisibility = (eventId: string) => {
    try { setState(changeActivityVisibility(state, eventId)); setPublishError('') }
    catch (error) { setPublishError(error instanceof Error ? error.message : '操作失败') }
  }
  return <div className="v2-page v2-activities"><PageHeading eyebrow="DISCOVER / EVENTS" title="发现活动" description="重点活动先看清，其他活动按分类浏览。" action={permitted && <button className="v2-button v2-button-primary" type="button" onClick={() => { setPublishError(''); setCreateOpen(true) }}><Plus size={17}/> 发起活动</button>}/>
    {featuredItems.length > 0 && <section className="v2-featured-events"><div className="v2-featured-carousel"><FlexCarousel items={featuredItems.map((event) => ({ src: event.image!, alt: event.title, title: event.title, subtitle: `${event.category} · ${formatWhen(event.startAt)}` }))} preset="liquid" intro="rise" fit="natural" cardHeight={0.6} gap={12} radius={16} squeeze={0.2} focusOnClick={false} focusOnHover focusScale={1} captions onChange={setFeatured} onSelect={(index) => navigate(`${activityBase}/${featuredItems[index].id}`)}/></div>{selectedFeatured && <div className="v2-featured-copy"><span className="v2-eyebrow">本周精选 · {selectedFeatured.category}</span><h2>{selectedFeatured.title}</h2><p>{selectedFeatured.subtitle}</p><div><span><CalendarDays size={15}/>{formatWhen(selectedFeatured.startAt)}</span><span><MapPin size={15}/>{selectedFeatured.location}</span></div><Link className="v2-button v2-button-light" to={`${activityBase}/${selectedFeatured.id}`}>查看活动 <ArrowRight size={16}/></Link></div>}</section>}
    <section className="v2-panel v2-list-panel">
      <SectionHeading title="所有活动" detail={`${filtered.length} 个结果`} />
      <div className="v2-toolbar v2-activity-toolbar">
        <AnimatedSearchField value={query} onChange={setQuery} placeholder="搜索活动、地点或主办方"/>
        <button type="button" className={`v2-activity-filter-toggle${filterOpen ? ' is-open' : ''}`} aria-expanded={filterOpen} aria-controls="v2-activity-filter-panel" onClick={() => setFilterOpen((value) => !value)}><SlidersHorizontal size={17}/> 筛选{activeFilters.length > 0 && <b>{activeFilters.length}</b>}</button>
      </div>
      <div id="v2-activity-filter-panel" className={`v2-activity-filter-panel${filterOpen ? ' is-open' : ''}`} aria-hidden={!filterOpen} inert={!filterOpen}>
        <div className="v2-activity-filter-inner">
          <div className="v2-activity-filter-grid">
            <fieldset><legend>活动时间</legend><div className="v2-activity-filter-options">{(['全部时间', '今天', '本周', '下周'] as ActivityPeriod[]).map((item) => <button type="button" key={item} className={period === item ? 'is-active' : ''} onClick={() => setPeriod(item)}>{item}</button>)}</div></fieldset>
            <fieldset><legend>活动状态</legend><div className="v2-activity-filter-options">{(['全部状态', '未结束', '我主办'] as ActivityStatus[]).map((item) => <button type="button" key={item} className={statusFilter === item ? 'is-active' : ''} onClick={() => setStatusFilter(item)}>{item}</button>)}</div></fieldset>
            <label>主办方<select value={hostFilter} onChange={(event) => setHostFilter(event.target.value)}>{hostsList.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>排序<select value={sort} onChange={(event) => setSort(event.target.value as ActivitySort)}>{(['推荐顺序', '时间最近'] as ActivitySort[]).map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="v2-activity-filter-footer"><span>可组合多个条件，结果会立即更新</span><button type="button" onClick={resetFilters}>重置全部</button></div>
        </div>
      </div>
      <div className="v2-filter-pills">{categories.map((item) => <button type="button" key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
      {activeFilters.length > 0 && <div className="v2-active-filters" aria-label="已应用的筛选条件">{activeFilters.map((item) => <button type="button" key={item.label} aria-label={`清除${item.label}`} onClick={item.clear}>{item.label}<X size={13}/></button>)}<button type="button" className="v2-active-filters-reset" onClick={resetFilters}>清除全部</button></div>}
      {filtered.length ? <div key={`${query}|${category}|${period}|${hostFilter}|${statusFilter}|${sort}`} className="v2-activity-grid v2-filtered-list">{filtered.map((event, index) => <Link className="v2-activity-card" to={`${activityBase}/${event.id}`} key={event.id} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}><div className="v2-activity-art" style={event.image ? { backgroundImage: `url(${event.image})` } : undefined}><span>{event.category}</span></div><div className="v2-activity-info"><small>{formatWhen(event.startAt)}</small><h3>{event.title}</h3><p>{event.subtitle}</p><span><MapPin size={14}/>{event.location}</span></div></Link>)}</div> : <div className="v2-filter-empty"><Empty icon={Search} title="没有匹配的活动" description="试试其他分类或清除搜索条件。"/><button type="button" className="v2-button v2-button-secondary" onClick={resetFilters}>清除筛选</button></div>}</section>
    {active && <Drawer title={active.title} eyebrow={`${active.category} · ${active.host}`} onClose={() => navigate(activityBase)} wide>
      <div className="v2-detail-art" style={active.image ? { backgroundImage: `url(${active.image})` } : undefined}/>
      <p className="v2-detail-lead">{active.subtitle}</p>
      <section className="v2-event-detail-section"><h3>活动介绍</h3><p>{active.description}</p>{active.local?.conditions && <p>参与条件：{active.local.conditions}</p>}{active.local?.mailSourceId && <p>来源：学校邮件{active.image ? ' · 封面来自邮件附件' : ''}</p>}</section>
      <section className="v2-event-detail-section"><h3>活动信息</h3><div className="v2-event-facts">
        <div><CalendarDays size={20}/><span><small>时间</small><strong>{formatWhen(active.startAt)}{active.local?.endAt && <> 至 {formatWhen(active.local.endAt)}</>}</strong></span></div>
        <div><MapPin size={20}/><span><small>地点</small><strong>{active.location}</strong></span></div>
        <div><UsersRound size={20}/><span><small>人数上限</small><strong>{active.capacity ? `${active.capacity} 人` : active.local?.mailSourceId ? '未提供' : '未限定'}</strong></span></div>
        <div><Megaphone size={20}/><span><small>主办方</small><strong>{active.host}</strong></span></div>
      </div></section>
      {state.role === 'student' && <div className="v2-detail-actions"><button type="button" className={`v2-button ${state.participatingActivities.includes(active.id) ? 'v2-button-secondary' : 'v2-button-primary'}`} aria-pressed={state.participatingActivities.includes(active.id)} disabled={!state.participatingActivities.includes(active.id) && (active.local?.status === 'draft' || Date.parse(active.endAt ?? active.startAt) <= Date.now())} onClick={() => setState(value => setActivityParticipation(value, active.id, !value.participatingActivities.includes(active.id)))}>{state.participatingActivities.includes(active.id) ? '取消参与标记' : '标记参与'}</button><span className="v2-form-note">{state.participatingActivities.includes(active.id) ? '已标记参与，将显示在首页近期校园安排中。' : '标记后加入个人安排，不占用活动名额。'}</span></div>}
      <section className="v2-event-detail-section"><h3>校园位置</h3><CampusMap key={active.id} location={active.location}/></section>
      {active.local && ownsActivity(state, active.local) && <div className="v2-detail-actions"><span className="v2-status-chip">我主办的活动</span><button type="button" className="v2-button v2-button-secondary" disabled={active.local.status === 'draft' && !permitted} onClick={() => changeVisibility(active.id)}>{active.local.status === 'published' ? '结束展示' : '重新展示'}</button></div>}
      {publishError && <p role="alert">{publishError}</p>}
    </Drawer>}
    {createOpen && <Modal title="发起校园活动" onClose={() => setCreateOpen(false)}><form className="v2-form" onSubmit={create}><label>活动名称<input name="title" required maxLength={80} placeholder="例如：周末摄影漫步"/></label><label>活动介绍<textarea name="description" required rows={3} placeholder="告诉大家会发生什么"/></label><div className="v2-form-two"><label>开始时间<input name="date" type="datetime-local" required/></label><label>人数上限<input name="capacity" type="number" min={1} defaultValue={20}/></label></div><div className="v2-activity-location"><strong>活动地点</strong><button type="button" className={activityBuilding ? 'is-selected' : ''} onClick={() => setActivityPickerOpen(true)}><MapPin size={18}/><span>{activityBuilding ? activityBuilding.name : '打开 3D 地图选择楼栋'}</span><ChevronRight size={17}/></button>{activityBuilding && <label>详细集合点（可选）<input name="locationDetail" maxLength={80} placeholder="例如：二层 202 室或大门口"/></label>}</div><p className="v2-form-note">仅已认证的学生社团成员可以发起活动。</p>{publishError && <p role="alert">{publishError}</p>}<div className="v2-form-actions"><button type="button" className="v2-button v2-button-secondary" onClick={() => setCreateOpen(false)}>取消</button><button type="submit" disabled={!permitted || !activityBuilding} className="v2-button v2-button-primary">发布活动</button></div></form></Modal>}
    {activityPickerOpen && <CampusBuildingPicker onClose={() => setActivityPickerOpen(false)} onPick={(building) => { setActivityBuilding(building); setActivityPickerOpen(false) }}/>}
  </div>
}

export { V2Community } from './V2Community'

export function V2Partners() {
  const { state, setState } = useV2()
  const location = useLocation()
  const navigate = useNavigate()
  const [type, setType] = useState<'all' | RoomType>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createType, setCreateType] = useState<RoomType>('study')
  const [locationScope, setLocationScope] = useState<'unset' | 'campus' | 'outside'>('unset')
  const [campusBuilding, setCampusBuilding] = useState<CampusBuilding | null>(null)
  const [outsideAddress, setOutsideAddress] = useState('')
  const [buildingPickerOpen, setBuildingPickerOpen] = useState(false)
  const rooms = state.rooms.filter((room) => room.status === 'open' && (type === 'all' || room.type === type) && `${room.title} ${room.body} ${room.place}`.toLowerCase().includes(query.toLowerCase()))
  const current = state.rooms.find((room) => room.id === (selected ?? new URLSearchParams(location.search).get('item')))
  const application = current && state.applications.find((item) => item.roomId === current.id)
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const get = (key: string) => String(data.get(key) ?? '').trim()
    const capacity = Math.max(2, Number(get('capacity')) || 4)
    let title = get('title')
    let body = get('body')
    let time = get('time')
    let place = get('place')
    if (createType === 'carpool') {
      const from = get('from'), destination = get('destination')
      if (!from || !destination || !time) return
      title = `${from} → ${destination} 拼车`
      place = from
      body = [`目的地：${destination}`, get('vehicle') && `车型：${get('vehicle')}`, get('cost') && `人均费用：¥${get('cost')}`, get('preference') && `同行偏好：${get('preference')}`, body].filter(Boolean).join(' · ')
    } else if (createType === 'entertainment') {
      if (!title || !time) return
      time = formatWhen(time)
      if (locationScope === 'campus') { if (!campusBuilding) return; place = campusBuilding.name }
      else if (locationScope === 'outside') { place = outsideAddress.trim(); if (!place) return }
      else return
      body = [get('eventType') && `类型：${get('eventType')}`, get('tag') && `标签：${get('tag')}`, body].filter(Boolean).join(' · ')
    } else {
      const courseCode = get('courseCode'), courseName = get('courseName')
      if (!courseCode || !courseName || !get('goal')) return
      title = `${courseCode.toUpperCase()} · ${courseName} 组队`
      time = get('time') || '时间待商定'
      place = '校园 / 线上协商'
      body = [get('goal'), get('gpa') && `绩点：${get('gpa')}`, get('grade') && `年级：${get('grade')}`, get('major') && `专业偏好：${get('major')}`, get('role') && `需要：${get('role')}`, body].filter(Boolean).join(' · ')
    }
    const room: Room = { id: makeId(), type: createType, title, body, time, place, buildingId: createType === 'entertainment' && locationScope === 'campus' ? campusBuilding?.id : undefined, capacity, members: [studentName], owner: studentName, status: 'open', requests: [] }
    setState((value) => ({ ...value, rooms: [room, ...value.rooms] }))
    setCreateOpen(false)
    setLocationScope('unset'); setCampusBuilding(null); setOutsideAddress('')
    setSelected(room.id)
  }
  const apply = (room: Room) => setState((value) => ({ ...value, applications: value.applications.some((item) => item.roomId === room.id) ? value.applications : [{ roomId: room.id, status: 'pending' }, ...value.applications], rooms: value.rooms.map((item) => item.id === room.id && !item.requests.includes(studentName) ? { ...item, requests: [...item.requests, studentName] } : item) }))
  const toggleSaved = (id: string) => setState((value) => ({ ...value, savedRooms: value.savedRooms.includes(id) ? value.savedRooms.filter((item) => item !== id) : [...value.savedRooms, id] }))
  return <div className="v2-page"><PageHeading eyebrow="FIND YOUR PEOPLE" title="找搭子" description="从一次拼车、一场球赛或一段共同学习开始。" action={<div className="v2-partner-heading-actions"><Link to="/v2/partners/teams" className="v2-button v2-button-secondary"><UsersRound size={17}/> 管理组队</Link><button type="button" className="v2-button v2-button-primary" onClick={() => setCreateOpen(true)}><Plus size={17}/> 发起组队</button></div>}/>
    <div className="v2-partner-overview"><div><span className="v2-eyebrow">TOGETHER ON CAMPUS</span><h2>一起做，校园会更有趣。</h2><p>查看正在招募的队伍，或发起一个自己的计划。</p><Link to="/v2/partners/teams" className="v2-button v2-button-light">我的组队 <ArrowRight size={16}/></Link></div><div className="v2-partner-graphic" aria-hidden="true"><span>拼车</span><span>娱乐</span><span>学习</span></div></div>
    <section className="v2-panel v2-list-panel"><SectionHeading title="搭子大厅" detail={`${rooms.length} 个正在招募的队伍`} action={<Link to="/v2/partners/teams">我的申请与队伍 <ArrowRight size={15}/></Link>}/><div className="v2-toolbar"><AnimatedSearchField value={query} onChange={setQuery} placeholder="搜索队伍、地点或关键词"/></div><div className="v2-filter-pills">{([['all', '全部'], ['carpool', '拼车'], ['entertainment', '娱乐'], ['study', '学习']] as const).map(([key, label]) => <button type="button" key={key} className={type === key ? 'is-active' : ''} onClick={() => setType(key)}>{label}</button>)}</div>{rooms.length ? <div key={`${query}|${type}`} className="v2-room-grid v2-filtered-list">{rooms.map((room, index) => <article className="v2-room-card" key={room.id} style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}><div className="v2-room-card-top"><span className={`v2-room-type v2-room-${room.type}`}>{roomTypeName[room.type]}</span><button type="button" aria-label={state.savedRooms.includes(room.id) ? '取消收藏' : '收藏队伍'} onClick={() => toggleSaved(room.id)}><Bookmark size={17} fill={state.savedRooms.includes(room.id) ? 'currentColor' : 'none'}/></button></div><button type="button" className="v2-room-open" onClick={() => setSelected(room.id)}><h3>{room.title}</h3><p>{room.body}</p></button><div className="v2-room-facts"><span><Clock3 size={14}/>{room.time}</span><span><MapPin size={14}/>{room.place}</span><span><UsersRound size={14}/>{room.members.length}/{room.capacity} 人</span></div><button type="button" className="v2-room-footer" onClick={() => setSelected(room.id)}><span>{room.owner === studentName ? '我发起的队伍' : `${room.owner} 发起`}</span><strong>查看详情 <ArrowRight size={15}/></strong></button></article>)}</div> : <div className="v2-filter-empty"><Empty icon={UsersRound} title="暂时没有匹配的队伍" description="调整筛选条件，或发起自己的组队。"/><button type="button" className="v2-button v2-button-secondary" onClick={() => { setQuery(''); setType('all') }}>清除筛选</button></div>}</section>
    {current && <Drawer title={current.title} eyebrow={`${roomTypeName[current.type]} · ${current.owner} 发起`} onClose={() => { setSelected(null); if (location.search) navigate('/v2/partners', { replace: true }) }}><p className="v2-detail-lead">{current.body}</p><div className="v2-fact-list"><span><Clock3 size={17}/>{current.time}</span><span><MapPin size={17}/>{current.place}</span><span><UsersRound size={17}/>{current.members.length} / {current.capacity} 人</span></div><SectionHeading title="已加入成员"/><div className="v2-member-list">{current.members.map((name) => <span key={name} className="v2-member-chip">{name.slice(0, 1)} · {name}</span>)}</div><div className="v2-detail-actions">{current.owner === studentName ? <Link to="/v2/partners/teams" className="v2-button v2-button-primary">管理申请 <ArrowRight size={16}/></Link> : current.members.includes(studentName) ? <Link to="/v2/messages" className="v2-button v2-button-primary">进入队伍消息 <ArrowRight size={16}/></Link> : application ? <span className="v2-status-chip is-pending">{application.status === 'pending' ? '申请待处理' : application.status === 'approved' ? '申请已通过' : '申请未通过'}</span> : current.members.length >= current.capacity ? <span className="v2-status-chip">队伍已满</span> : <button type="button" className="v2-button v2-button-primary" onClick={() => apply(current)}>申请加入 <ArrowRight size={16}/></button>}</div></Drawer>}
    {createOpen && <Modal title="发起组队" onClose={() => setCreateOpen(false)}><form className={`v2-form v2-partner-form type-${createType}`} onSubmit={create}>
      <div className="v2-partner-type-picker">
        <button type="button" className={createType === 'carpool' ? 'is-active' : ''} onClick={() => setCreateType('carpool')}><CarFront size={19}/><strong>拼车</strong><small>同路出发</small></button>
        <button type="button" className={createType === 'entertainment' ? 'is-active' : ''} onClick={() => setCreateType('entertainment')}><Clapperboard size={19}/><strong>娱乐</strong><small>一起体验</small></button>
        <button type="button" className={createType === 'study' ? 'is-active' : ''} onClick={() => setCreateType('study')}><BookOpen size={19}/><strong>课程组队</strong><small>一起完成</small></button>
      </div>
      <div className="v2-partner-form-intro"><strong>{createType === 'carpool' ? '发布一段同行路线' : createType === 'entertainment' ? '发起一次共同体验' : '寻找课程项目队友'}</strong><span>{createType === 'carpool' ? '让同路的同学看清路线、时间和费用。' : createType === 'entertainment' ? '说清活动类型、时间和想一起做的事。' : '按课程编号和项目目标找到合适的伙伴。'}</span></div>
      <div key={createType} className="v2-partner-specific-fields">
        {createType === 'carpool' && <><div className="v2-form-two"><label>出发地<input name="from" required placeholder="例如：学校南门"/></label><label>目的地<input name="destination" required placeholder="例如：珠海站"/></label></div><label>出发时间<input name="time" required placeholder="例如：周五 17:30"/></label><div className="v2-form-two"><label>车型<select name="vehicle"><option>不限</option><option>网约车</option><option>出租车</option><option>自驾</option></select></label><label>总人数<input name="capacity" type="number" min={2} max={8} defaultValue={4}/></label></div><div className="v2-form-two"><label>预计人均费用<input name="cost" type="number" min={0} placeholder="元，可留空"/></label><label>同行偏好<select name="preference"><option>不限</option><option>安静出行</option><option>可交流</option></select></label></div><label>补充说明<textarea name="body" rows={3} maxLength={500} placeholder="行李、途经点或集合方式"/></label></>}
        {createType === 'entertainment' && <><label>活动类型<select name="eventType"><option>电影</option><option>演唱会</option><option>桌游</option><option>运动</option><option>其他</option></select></label><label>一句话描述<input name="title" required maxLength={80} placeholder="例如：周末一起看场电影"/></label><div className="v2-form-two"><label className="v2-time-field"><span>活动时间</span><input name="time" type="datetime-local" required/><small><Clock3 size={13}/> 选择日期与具体时间</small></label><label>人数<input name="capacity" type="number" min={2} max={30} defaultValue={4}/></label></div><div className="v2-location-choice"><strong>活动地点</strong><div><button type="button" className={locationScope === 'campus' ? 'is-active' : ''} onClick={() => { setLocationScope('campus'); setBuildingPickerOpen(true) }}><MapPin size={16}/> 校内 · 地图选楼栋</button><button type="button" className={locationScope === 'outside' ? 'is-active' : ''} onClick={() => setLocationScope('outside')}><MapPin size={16}/> 校外 · 填写地址</button></div>{locationScope === 'campus' && (campusBuilding ? <div className="v2-location-building"><span><MapPin size={16}/>{campusBuilding.name}</span><button type="button" onClick={() => setBuildingPickerOpen(true)}>重新选择</button></div> : <p>请在 3D 地图中点击楼栋，再确认地点。</p>)}{locationScope === 'outside' && <label>详细地址<input value={outsideAddress} onChange={(event) => setOutsideAddress(event.target.value)} required maxLength={120} placeholder="例如：香洲区某影院，写明集合点"/></label>}</div><label>标签<input name="tag" placeholder="例如：轻松、第一次也欢迎"/></label><label>补充说明<textarea name="body" rows={3} maxLength={500} placeholder="门票、费用或需要准备什么"/></label></>}
        {createType === 'study' && <><div className="v2-form-two"><label>课程编号<input name="courseCode" required maxLength={20} placeholder="例如：COMP1021"/></label><label>课程名称<input name="courseName" required maxLength={70} placeholder="例如：计算机科学导论"/></label></div><label>项目目标<input name="goal" required maxLength={120} placeholder="例如：完成课程期末 Web 项目"/></label><div className="v2-form-two"><label>队伍总人数<input name="capacity" type="number" min={2} max={20} defaultValue={4}/></label><label>预计讨论时间<input name="time" placeholder="例如：每周三晚"/></label></div><div className="v2-form-two"><label>绩点要求<input name="gpa" placeholder="不限 / 3.4 以上"/></label><label>年级要求<select name="grade"><option>不限</option><option>大一</option><option>大二</option><option>大三</option><option>大四</option></select></label></div><label>专业或学院偏好<input name="major" placeholder="例如：计算机相关优先"/></label><label>能力或角色要求<input name="role" placeholder="例如：前端、设计、研究"/></label><label>补充说明<textarea name="body" rows={3} maxLength={500} placeholder="协作方式和每周节奏"/></label></>}
      </div>
      <p className="v2-form-note">发布后，其他人可以申请加入；申请会出现在“管理组队”。</p><div className="v2-form-actions"><button type="button" className="v2-button v2-button-secondary" onClick={() => setCreateOpen(false)}>取消</button><button type="submit" className="v2-button v2-button-primary" disabled={createType === 'entertainment' && (locationScope === 'unset' || locationScope === 'campus' && !campusBuilding || locationScope === 'outside' && !outsideAddress.trim())}>发布{roomTypeName[createType]}队伍</button></div>
    </form></Modal>}
    {buildingPickerOpen && <CampusBuildingPicker onClose={() => setBuildingPickerOpen(false)} onPick={(building) => { setCampusBuilding(building); setLocationScope('campus'); setBuildingPickerOpen(false) }}/ >}
  </div>
}

export { V2Teams } from './V2Teams'

export function V2Messages() {
  const { state, setState } = useV2()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'notifications' ? 'notifications' : 'conversations'
  const [selected, setSelected] = useState(state.conversations[0]?.id ?? '')
  const [text, setText] = useState('')
  const active = state.conversations.find((item) => item.id === selected)
  const unreadNotices = state.notifications.filter((item) => !item.read).length
  const open = (id: string) => { setSelected(id); setState((value) => ({ ...value, conversations: value.conversations.map((item) => item.id === id ? { ...item, unread: 0 } : item) })) }
  const send = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!active || !text.trim()) return; const body = text.trim(); setState((value) => ({ ...value, conversations: value.conversations.map((item) => item.id === active.id ? { ...item, messages: [...item.messages, { id: makeId(), from: studentName, body, time: timeLabel() }] } : item) })); setText('') }
  return <div className="v2-page v2-messages-page"><PageHeading eyebrow="MESSAGES" title="消息" description="私聊、组队会话与校园通知集中在这里。"/>
    <div className="v2-tabs v2-message-tabs"><button type="button" className={view === 'conversations' ? 'is-active' : ''} onClick={() => setParams({})}><MessageCircle size={16}/> 会话 {state.conversations.reduce((sum, item) => sum + item.unread, 0) > 0 && <b>{state.conversations.reduce((sum, item) => sum + item.unread, 0)}</b>}</button><button type="button" className={view === 'notifications' ? 'is-active' : ''} onClick={() => setParams({ view: 'notifications' })}><Bell size={16}/> 通知 {unreadNotices > 0 && <b>{unreadNotices}</b>}</button></div>
    {view === 'notifications' ? <section className="v2-panel v2-list-panel v2-notification-panel"><SectionHeading title="校园通知" detail={`${state.notifications.length} 条通知`} action={<button type="button" className="v2-text-button" onClick={() => setState((value) => ({ ...value, notifications: value.notifications.map((item) => ({ ...item, read: true })) }))}>全部标为已读</button>}/>{state.notifications.map((item) => <Link className={`v2-saved-row${item.read ? '' : ' is-unread'}`} to={item.path} key={item.id} onClick={() => setState((value) => ({ ...value, notifications: value.notifications.map((notice) => notice.id === item.id ? { ...notice, read: true } : notice) }))}><Bell size={20}/><span><strong>{item.title}</strong><small>{item.body} · {item.date}</small></span>{!item.read && <i className="v2-notification-unread"/>}<ChevronRight size={16}/></Link>)}{!state.notifications.length && <Empty icon={Bell} title="暂无通知"/>}</section> : <div className="v2-chat-shell"><aside className="v2-chat-list"><div className="v2-chat-list-heading"><strong>会话</strong><small>{state.conversations.length} 条</small></div>{state.conversations.map((conversation) => <button type="button" className={selected === conversation.id ? 'is-active' : ''} key={conversation.id} onClick={() => open(conversation.id)}><span className="v2-chat-avatar"><MessageCircle size={20}/></span><span><strong>{conversation.title}</strong><small>{conversation.messages.at(-1)?.body ?? '开始一段新对话'}</small></span>{conversation.unread > 0 && <b>{conversation.unread}</b>}</button>)}</aside><section className="v2-chat-main">{active ? <><header><span className="v2-chat-avatar"><UsersRound size={20}/></span><div><strong>{active.title}</strong><small>演示对话 · 仅保存在当前浏览器</small></div></header><div className="v2-chat-messages">{active.messages.map((message) => <div className={`v2-bubble${message.from === studentName ? ' is-mine' : ''}`} key={message.id}><small>{message.from} · {message.time}</small><p>{message.body}</p></div>)}</div><form className="v2-chat-composer" onSubmit={send}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="输入消息…" aria-label="消息内容" maxLength={500}/><button type="submit" className="v2-button v2-button-primary" disabled={!text.trim()}><Send size={17}/></button></form></> : <Empty icon={MessageCircle} title="选择一个会话" description="加入队伍后可在这里继续交流。"/>}</section></div>}
  </div>
}

import { ArrowRight, Bookmark, Camera, ChevronLeft, ChevronRight, Heart, ImagePlus, MessageCircle, Plus, Send, X } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import campusPhoto from '../assets/campus/home-background.jpg'
import campusEvening from '../assets/campus/evening-campus.jpg'
import campusNight from '../assets/campus/night-walkway.jpg'
import { AnimatedSearchField } from './AnimatedSearchField'
import { prepareCommunityImage } from './communityImages'
import { makeId, studentName, todayLabel, type Post } from './model'
import { Drawer, Empty, Modal, PageHeading, SectionHeading } from './ui'
import { useV2 } from './useV2'
import { alumniData } from './alumniPolicy'

const seedPhotos: Record<string, string[]> = {
  'post-study': [campusPhoto],
  'post-english': [campusEvening],
  'post-run': [campusNight],
}
const boards = ['全部', '校园', '学习', '生活', '活动', '互助', '校友升学', '校友就业']
const photosFor = (post: Post) => post.images?.length ? post.images : seedPhotos[post.id] ?? []

function Media({ post, onOpen }: { post: Post; onOpen?: () => void }) {
  const [index, setIndex] = useState(0)
  const photos = photosFor(post)
  if (!photos.length) return null
  const activeIndex = Math.min(index, photos.length - 1)
  return <div className="v2-social-media">
    <img src={photos[activeIndex]} alt={`${post.title}，第 ${activeIndex + 1} 张图片`}/>
    {onOpen && <button type="button" className="v2-social-media-open" aria-label={`查看帖子：${post.title}`} onClick={onOpen}/>}
    {photos.length > 1 && <><button type="button" className="v2-social-media-arrow is-prev" aria-label="上一张图片" onClick={() => setIndex((activeIndex - 1 + photos.length) % photos.length)}><ChevronLeft size={19}/></button><button type="button" className="v2-social-media-arrow is-next" aria-label="下一张图片" onClick={() => setIndex((activeIndex + 1) % photos.length)}><ChevronRight size={19}/></button><span className="v2-social-media-count">{activeIndex + 1} / {photos.length}</span></>}
  </div>
}

function PulseHeart({ liked, count, onClick }: { liked: boolean; count: number; onClick: () => void }) {
  const [pulse, setPulse] = useState(0)
  return <button type="button" className={`v2-pulse-heart${liked ? ' is-active' : ''}`} aria-label={`${liked ? '取消点赞' : '点赞'}，当前 ${count} 个赞`} aria-pressed={liked} onClick={() => { setPulse((value) => value + 1); onClick() }}><span className="v2-pulse-heart-icon" key={pulse}><Heart size={22} strokeWidth={2.1} fill={liked ? 'currentColor' : 'none'}/></span><span className="v2-pulse-heart-count" key={`${pulse}-${count}`}>{count} 次赞</span></button>
}

export function V2Community() {
  const { state, setState } = useV2()
  const location = useLocation()
  const navigate = useNavigate()
  const [board, setBoard] = useState('全部')
  const [query, setQuery] = useState('')
  const [compose, setCompose] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [draftImages, setDraftImages] = useState<string[]>([])
  const [imageError, setImageError] = useState('')
  const [processingImages, setProcessingImages] = useState(false)
  useEffect(() => { if (new URLSearchParams(location.search).get('compose') === '1') setCompose(true) }, [location.search])
  const closeCompose = () => { setCompose(false); setDraftImages([]); setImageError(''); if (new URLSearchParams(location.search).has('compose')) navigate('/v2/community', { replace: true }) }
  const alumni = alumniData(state)
  const canSee = (post: Post) => post.status === 'visible' || post.status === 'pending' && (post.author === studentName || alumni.profiles.some((profile) => profile.owner === studentName && profile.id === post.alumniId))
  const visible = state.posts.filter(canSee).filter((post) => (board === '全部' || post.board === board) && `${post.title} ${post.body} ${post.author}`.toLowerCase().includes(query.toLowerCase()))
  const current = state.posts.find((post) => post.id === (selected ?? new URLSearchParams(location.search).get('item')) && canSee(post))
  const addImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    if (draftImages.length + files.length > 9) { setImageError('最多添加 9 张图片'); return }
    setProcessingImages(true); setImageError('')
    try {
      const images = await Promise.all(files.map(prepareCommunityImage))
      setDraftImages((previous) => [...previous, ...images].slice(0, 9))
    } catch (error) { setImageError(error instanceof Error ? error.message : '图片处理失败，请重试') }
    finally { setProcessingImages(false) }
  }
  const publish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    const body = String(data.get('body') ?? '').trim()
    if (!title || !body || processingImages) return
    const id = makeId()
    setState((value) => ({ ...value, posts: [{ id, title, body, images: draftImages, board: String(data.get('board') ?? '校园'), author: studentName, date: todayLabel(), likes: 0, status: 'pending', comments: [] }, ...value.posts] }))
    closeCompose(); setSelected(id)
  }
  const comment = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!current || !commentText.trim()) return; const body = commentText.trim(); setState((value) => ({ ...value, posts: value.posts.map((post) => post.id === current.id ? { ...post, comments: [...post.comments, { id: makeId(), author: studentName, body, date: todayLabel(), status: 'pending' }] } : post) })); setCommentText('') }
  const toggleSave = (id: string) => setState((value) => ({ ...value, savedPosts: value.savedPosts.includes(id) ? value.savedPosts.filter((item) => item !== id) : [...value.savedPosts, id] }))
  const toggleLike = (id: string) => setState((value) => { const liked = value.likedPosts.includes(id); return { ...value, likedPosts: liked ? value.likedPosts.filter((item) => item !== id) : [...value.likedPosts, id], posts: value.posts.map((post) => post.id === id ? { ...post, likes: Math.max(0, post.likes + (liked ? -1 : 1)) } : post) } })
  return <div className="v2-page v2-community-page">
    <PageHeading eyebrow="CAMPUS / COMMUNITY" title="校园社区" description="先看内容，再决定要不要参与讨论。" action={<button type="button" className="v2-button v2-button-primary v2-community-compose-desktop" onClick={() => setCompose(true)}><Plus size={17}/> 发布帖子</button>}/>
    <div className="v2-social-layout">
      <section className="v2-social-main"><div className="v2-social-filter v2-panel"><AnimatedSearchField value={query} onChange={setQuery} placeholder="搜索话题或关键词"/><div className="v2-filter-pills">{boards.map((item) => <button type="button" className={board === item ? 'is-active' : ''} onClick={() => setBoard(item)} key={item}>{item}</button>)}</div></div>
        <div key={`${query}|${board}`} className="v2-social-feed v2-filtered-list">{visible.map((post) => <article className="v2-social-card" key={post.id}>
          <header className="v2-social-card-head"><span className="v2-social-avatar">{post.author.slice(0, 1)}</span><div><strong>{post.author}</strong><small>{post.date} · {post.board}{post.alumniId && alumni.profiles.some((profile) => profile.id === post.alumniId && profile.status === 'approved') ? ' · 认证校友' : ''}</small></div>{post.status === 'pending' && <span className="v2-status-chip is-pending">待审核</span>}</header>
          <div className="v2-social-card-content"><button type="button" className="v2-social-caption" onClick={() => setSelected(post.id)}><strong>{post.title}</strong><span>{post.body}</span></button><Media post={post} onOpen={() => setSelected(post.id)}/><div className="v2-social-actions"><PulseHeart liked={state.likedPosts.includes(post.id)} count={post.likes} onClick={() => toggleLike(post.id)}/><button type="button" onClick={() => setSelected(post.id)} aria-label={`查看 ${post.comments.length} 条评论`}><MessageCircle size={22}/><span>{post.comments.filter((item) => item.status === 'visible').length}</span></button><button type="button" className={`v2-social-save${state.savedPosts.includes(post.id) ? ' is-active' : ''}`} aria-label={state.savedPosts.includes(post.id) ? '取消收藏' : '收藏帖子'} onClick={() => toggleSave(post.id)}><Bookmark size={22} fill={state.savedPosts.includes(post.id) ? 'currentColor' : 'none'}/></button></div><button type="button" className="v2-social-comment-link" onClick={() => setSelected(post.id)}>查看评论与详情 <ArrowRight size={14}/></button></div>
        </article>)}{!visible.length && <div className="v2-panel v2-filter-empty"><Empty icon={MessageCircle} title="暂无帖子" description="换个分类，或者发布第一个话题。"/><button type="button" className="v2-button v2-button-secondary" onClick={() => { setQuery(''); setBoard('全部') }}>清除筛选</button></div>}</div>
      </section>
      <aside className="v2-social-aside"><div className="v2-panel v2-social-profile"><span className="v2-social-avatar is-self">晴</span><div><strong>{studentName}</strong><small>分享你眼中的校园</small></div><button type="button" onClick={() => setCompose(true)}>发布 <ArrowRight size={14}/></button></div><div className="v2-panel"><span className="v2-eyebrow">CAMPUS VOICES</span><h3>让校园故事被看见</h3><p>照片、经历或问题，都可以成为下一段交流的开始。</p><span className="v2-social-aside-note"><Camera size={16}/> 最多 9 张图片 · 发布后进入演示审核</span></div><div className="v2-panel"><h3>热门话题</h3>{state.posts.filter((post) => post.status === 'visible').sort((a, b) => b.likes - a.likes).slice(0, 3).map((post, index) => <button type="button" className="v2-trend-row" key={post.id} onClick={() => setSelected(post.id)}><span>0{index + 1}</span><strong>{post.title}</strong></button>)}</div></aside>
    </div>
    {createPortal(<button type="button" className="v2-community-compose v2-a-community-compose" aria-label="发布帖子" onClick={() => setCompose(true)}><span className="v2-community-compose-circle"><Plus size={26}/></span></button>, document.body)}
    {compose && <Modal title="发布社区帖子" onClose={closeCompose}><form className="v2-form v2-social-compose" onSubmit={publish}><label>话题标题<input name="title" required maxLength={80} placeholder="想和同学聊什么？"/></label><label>选择分区<select name="board">{boards.slice(1).filter((item) => !item.startsWith('校友')).map((item) => <option key={item}>{item}</option>)}</select></label><label>正文<textarea name="body" required rows={4} maxLength={1000} placeholder="分享一点具体的经历或问题"/></label><div className="v2-image-uploader"><div className="v2-image-uploader-head"><strong>添加图片</strong><span>{draftImages.length} / 9 张</span></div><div className="v2-upload-grid">{draftImages.map((src, index) => <div className="v2-upload-thumb" key={`${index}-${src.slice(-24)}`}><img src={src} alt={`待发布图片 ${index + 1}`}/><button type="button" aria-label={`移除第 ${index + 1} 张图片`} onClick={() => setDraftImages((items) => items.filter((_, number) => number !== index))}><X size={13}/></button></div>)}{draftImages.length < 9 && <label className="v2-upload-add"><ImagePlus size={22}/><span>{processingImages ? '处理中…' : '添加照片'}</span><input type="file" accept="image/*" multiple onChange={addImages} disabled={processingImages}/></label>}</div>{imageError && <p className="v2-upload-error" role="alert">{imageError}</p>}<small>最多 9 张，图片会压缩后保存在本机演示数据中。</small></div><p className="v2-form-note">发布后进入本地演示审核队列。</p><div className="v2-form-actions"><button type="button" className="v2-button v2-button-secondary" onClick={closeCompose}>取消</button><button type="submit" className="v2-button v2-button-primary" disabled={processingImages}>提交帖子</button></div></form></Modal>}
    {current && <Drawer title={current.title} eyebrow={`${current.board} · ${current.author}`} onClose={() => { setSelected(null); if (location.search) navigate('/v2/community', { replace: true }) }}><div className="v2-social-detail-media"><Media post={current}/></div><p className="v2-detail-date">{current.date}{current.status === 'pending' ? ' · 待审核' : ''}</p><p className="v2-detail-lead">{current.body}</p><div className="v2-detail-actions"><PulseHeart liked={state.likedPosts.includes(current.id)} count={current.likes} onClick={() => toggleLike(current.id)}/><button type="button" className="v2-button v2-button-secondary" onClick={() => toggleSave(current.id)}><Bookmark size={16}/>{state.savedPosts.includes(current.id) ? '已收藏' : '收藏'}</button></div><div className="v2-comments"><SectionHeading title="评论" detail={`${current.comments.filter((item) => item.status === 'visible').length} 条已展示`}/>{current.comments.filter((item) => item.status === 'visible' || item.status === 'pending' && item.author === studentName).map((item) => <div className="v2-comment" key={item.id}><span className="v2-avatar">{item.author.slice(0, 1)}</span><div><strong>{item.author} {item.status === 'pending' && <small>待审核</small>}</strong><p>{item.body}</p><small>{item.date}</small></div></div>)}<form onSubmit={comment} className="v2-comment-form"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="写下你的评论" maxLength={300} aria-label="评论内容"/><button type="submit" className="v2-button v2-button-primary" disabled={!commentText.trim()}><Send size={16}/></button></form></div></Drawer>}
  </div>
}

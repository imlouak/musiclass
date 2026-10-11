import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  ExternalLink,
  FilePlus2,
  FileMusic,
  GripVertical,
  Library as LibraryIcon,
  MapPin,
  Maximize2,
  Minus,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Settings2,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { starterLibrary } from './data'
import { LanguageSwitcher, useLanguage } from './i18n'
import type { Attachment, Binder, Library, Score } from './types'

const STORAGE_KEY = 'musiclass-library-v1'
const colors = [
  '#4C9BFF', '#87D7E8', '#4FD1A1', '#8BCB6B', '#F4D35E', '#F4B860',
  '#F28C52', '#FF7D7D', '#E982B5', '#B794F6', '#6674D9', '#7B8798',
]

type SearchResult = Score & { binderId: string; binderName: string; binderColor: string }
type DialogState = { kind: 'binder' } | { kind: 'score'; score?: SearchResult } | null
type ContextMenuPayload =
  | { kind: 'score'; score: SearchResult }
  | { kind: 'binder'; binder: Binder }
type ContextMenuState = (ContextMenuPayload & { x: number; y: number }) | null
type ConfirmState = { title: string; message: string; confirmLabel: string; onConfirm: () => void } | null
type ImportNotice = { kind: 'success' | 'error'; message: string } | null
type UpdateStatus = { status: 'checking' | 'downloading' | 'current' | 'ready' | 'error'; version?: string; percent?: number }

const uid = () => crypto.randomUUID()
const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr')

const isFileDrag = (event: React.DragEvent) => event.dataTransfer.types.includes('Files')

function loadLibrary(): Library {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : starterLibrary
  } catch {
    return starterLibrary
  }
}

export default function App() {
  const { language, t } = useLanguage()
  const [library, setLibrary] = useState<Library>(loadLibrary)
  const [view, setView] = useState<'home' | 'manage'>('home')
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeResult, setActiveResult] = useState(0)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [selectedBinderId, setSelectedBinderId] = useState(library.binders[0]?.id ?? '')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [draggedBinderId, setDraggedBinderId] = useState<string | null>(null)
  const [draggedScore, setDraggedScore] = useState<{ binderId: string; scoreId: string } | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [dropBinderId, setDropBinderId] = useState<string | null>(null)
  const [fileDropBinderId, setFileDropBinderId] = useState<string | null>(null)
  const [importNotice, setImportNotice] = useState<ImportNotice>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'current' })
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(library)), [library])

  useEffect(() => window.desktop?.onUpdateStatus(setUpdateStatus), [])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setView('home')
        requestAnimationFrame(() => searchRef.current?.focus())
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    window.addEventListener('click', closeMenu)
    window.addEventListener('blur', closeMenu)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('blur', closeMenu)
    }
  }, [])

  const allScores = useMemo<SearchResult[]>(
    () => library.binders.flatMap((binder) => binder.scores.map((score) => ({
      ...score,
      binderId: binder.id,
      binderName: binder.name,
      binderColor: binder.color,
    }))),
    [library],
  )

  const results = useMemo(() => {
    const term = normalize(query.trim())
    if (!term) return []
    return allScores
      .map((score) => {
        const haystack = normalize(`${score.title} ${score.composer} ${score.instrument} ${score.notes} ${score.binderName}`)
        const title = normalize(score.title)
        const rank = title === term ? 0 : title.startsWith(term) ? 1 : haystack.includes(term) ? 2 : 9
        return { score, rank }
      })
      .filter(({ rank }) => rank < 9)
      .sort((a, b) => a.rank - b.rank || a.score.title.localeCompare(b.score.title, 'fr'))
      .slice(0, 6)
      .map(({ score }) => score)
  }, [allScores, query])

  const selectedBinder = library.binders.find((binder) => binder.id === selectedBinderId) ?? library.binders[0]

  const updateLibrary = (updater: (current: Library) => Library) => setLibrary((current) => updater(current))

  const removeStoredAttachment = (attachment?: Attachment) => {
    if (attachment) void window.desktop?.removeAttachment(attachment)
  }

  const importFilesIntoBinder = async (binderId: string, files: FileList | File[]) => {
    const binder = library.binders.find((item) => item.id === binderId)
    if (!binder || !window.desktop) return
    setSelectedBinderId(binderId)
    setFileDropBinderId(binderId)
    setImportNotice(null)
    const existing = new Set(binder.scores.map((score) => normalize(score.title)))
    const imported: Array<{ title: string; composer: string; page?: number }> = []
    let skipped = 0
    let failed = false

    for (const file of Array.from(files)) {
      const result = await window.desktop.importScoreFile(file)
      if (!result.ok || !result.scores) { failed = true; continue }
      for (const score of result.scores) {
        const key = normalize(score.title)
        if (!key || existing.has(key)) { skipped += 1; continue }
        existing.add(key)
        imported.push({ ...score, title: score.title.trim(), composer: score.composer.trim() })
      }
    }

    if (imported.length) {
      let nextPage = Math.max(0, ...binder.scores.map((score) => score.page)) + 1
      const importedScores: Score[] = imported.map((score) => {
        const page = score.page ?? nextPage
        nextPage = Math.max(nextPage, page + 1)
        return { id: uid(), title: score.title, composer: score.composer, instrument: '', page, notes: '' }
      })
      updateLibrary((current) => ({ binders: current.binders.map((item) => item.id === binderId ? { ...item, scores: [...item.scores, ...importedScores] } : item) }))
    }

    const summary = imported.length
      ? t('importSuccess', { count: imported.length, scores: t(imported.length > 1 ? 'scores' : 'score'), skipped })
      : failed ? t('importFailed') : t('importNoNewScores')
    setImportNotice({ kind: imported.length ? 'success' : 'error', message: summary })
    setFileDropBinderId(null)
  }

  const openManage = (binderId?: string) => {
    if (binderId) setSelectedBinderId(binderId)
    setView('manage')
    setSelectedResult(null)
  }

  const chooseResult = (result: SearchResult) => {
    setSelectedResult(result)
    setQuery(result.title)
    setFocused(false)
  }

  const handleSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveResult((value) => (value + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveResult((value) => (value - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      chooseResult(results[activeResult] ?? results[0])
    } else if (event.key === 'Escape') {
      setFocused(false)
      searchRef.current?.blur()
    }
  }

  const reorderBinders = (targetId: string) => {
    if (!draggedBinderId || draggedBinderId === targetId) return
    updateLibrary((current) => {
      const binders = [...current.binders]
      const from = binders.findIndex((binder) => binder.id === draggedBinderId)
      const to = binders.findIndex((binder) => binder.id === targetId)
      const [moved] = binders.splice(from, 1)
      binders.splice(to, 0, moved)
      return { binders }
    })
    setDraggedBinderId(null)
    setDropBinderId(null)
  }

  const moveScore = (targetBinderId: string, targetScoreId?: string) => {
    if (!draggedScore) return
    updateLibrary((current) => {
      const sourceBinder = current.binders.find((binder) => binder.id === draggedScore.binderId)
      const moved = sourceBinder?.scores.find((score) => score.id === draggedScore.scoreId)
      if (!moved) return current
      const binders = current.binders.map((binder) => ({
        ...binder,
        scores: binder.scores.filter((score) => score.id !== draggedScore.scoreId),
      }))
      const destination = binders.find((binder) => binder.id === targetBinderId)
      if (!destination) return current
      const targetIndex = targetScoreId ? destination.scores.findIndex((score) => score.id === targetScoreId) : -1
      if (targetIndex >= 0) destination.scores.splice(targetIndex, 0, moved)
      else destination.scores.push(moved)
      return { binders }
    })
    setSelectedBinderId(targetBinderId)
    setDraggedScore(null)
    setDropTarget(null)
    setDropBinderId(null)
  }

  const moveScoreToBinder = (score: SearchResult, targetBinderId: string) => {
    if (score.binderId === targetBinderId) return
    updateLibrary((current) => {
      const binders = current.binders.map((binder) => ({
        ...binder,
        scores: binder.scores.filter((item) => item.id !== score.id),
      }))
      const destination = binders.find((binder) => binder.id === targetBinderId)
      if (destination) destination.scores.push({
        id: score.id,
        title: score.title,
        composer: score.composer,
        instrument: score.instrument,
        page: score.page,
        notes: score.notes,
        attachment: score.attachment,
      })
      return { binders }
    })
    setSelectedBinderId(targetBinderId)
    setContextMenu(null)
  }

  const requestDeleteScore = (score: SearchResult) => {
    setContextMenu(null)
    setConfirm({
      title: t('deleteScoreTitle'),
      message: t('deleteScoreMessage', { title: score.title, binder: score.binderName }),
      confirmLabel: t('deleteScore'),
      onConfirm: () => {
        removeStoredAttachment(score.attachment)
        updateLibrary((current) => ({ binders: current.binders.map((binder) => ({ ...binder, scores: binder.scores.filter((item) => item.id !== score.id) })) }))
      },
    })
  }

  const requestDeleteBinder = (binder: Binder) => {
    setContextMenu(null)
    setConfirm({
      title: t('deleteBinderTitle', { binder: binder.name }),
      message: t('deleteBinderMessage', { count: binder.scores.length, scores: t(binder.scores.length > 1 ? 'scores' : 'score') }),
      confirmLabel: t('deleteBinder'),
      onConfirm: () => {
        binder.scores.forEach((score) => removeStoredAttachment(score.attachment))
        updateLibrary((current) => ({ binders: current.binders.filter((item) => item.id !== binder.id) }))
        setSelectedBinderId(library.binders.find((item) => item.id !== binder.id)?.id ?? '')
      },
    })
  }

  const openContextMenu = (event: React.MouseEvent | React.KeyboardEvent, menu: ContextMenuPayload) => {
    event.preventDefault()
    const fromMouse = 'clientX' in event && event.clientX > 0
    const rect = event.currentTarget.getBoundingClientRect()
    const x = fromMouse ? event.clientX : rect.left + 28
    const y = fromMouse ? event.clientY : rect.top + rect.height / 2
    setContextMenu({ ...menu, x: Math.min(x, window.innerWidth - 470), y: Math.min(y, window.innerHeight - 260) })
  }

  return (
    <div className="app-shell">
      <WindowBar />
      <header className="topbar">
        <div className="topbar-left"><LanguageSwitcher /><UpdateIndicator state={updateStatus} /></div>
        {view === 'home' ? (
          <button className="button button-secondary" onClick={() => openManage()}>
            <Settings2 size={17} /> {allScores.length ? t('manageScores') : t('addScore')}
          </button>
        ) : (
          <button className="button button-secondary" onClick={() => setView('home')}>
            <Search size={17} /> {t('search')}
          </button>
        )}
      </header>

      {view === 'home' ? (
        <main className="home-view">
          <section className="search-hero">
            <h1>{t('question')}</h1>
            <p className="hero-copy">{t('searchBy')}</p>

            <div className={`search-wrap ${focused ? 'is-focused' : ''}`}>
              <Search className="search-icon" size={23} />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActiveResult(0); setSelectedResult(null) }}
                onFocus={() => setFocused(true)}
                onKeyDown={handleSearchKey}
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchPlaceholder')}
                autoFocus
              />
              {query && <button className="clear-button" onClick={() => { setQuery(''); searchRef.current?.focus() }} aria-label={t('clear')}><X size={18} /></button>}
              <span className="key-hint">Ctrl K</span>

              {focused && query && (
                <div className="suggestions" role="listbox">
                  {results.length ? results.map((result, index) => (
                    <button
                      key={result.id}
                      className={`suggestion ${index === activeResult ? 'active' : ''}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseResult(result)}
                      onMouseEnter={() => setActiveResult(index)}
                      role="option"
                      aria-selected={index === activeResult}
                    >
                      <span className="score-icon"><FileMusic size={19} /></span>
                      <span className="suggestion-copy">
                        <strong>{result.title}</strong>
                        <small>{result.composer}{result.instrument ? ` · ${result.instrument}` : ''}</small>
                      </span>
                      <Location binder={result} />
                      <ChevronRight size={18} className="chevron" />
                    </button>
                  )) : (
                    <div className="no-result">
                      <FileMusic size={22} />
                      <div><strong>{t('noScore')}</strong><span>{t('noScoreHelp')}</span></div>
                      <button className="text-button" onClick={() => openManage()}>{t('add')}</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!query && allScores.length > 0 && (
              <div className="quick-searches">
                <span>{t('try')}</span>
                {['Debussy', 'Piano', 'Bach'].map((term) => <button key={term} onClick={() => { setQuery(term); setFocused(true); searchRef.current?.focus() }}>{term}</button>)}
              </div>
            )}
            {!allScores.length && (
              <div className="empty-library">
                <BookOpen size={25} />
                <span>{t('emptyLibrary')}</span>
                <button className="text-button" onClick={() => openManage()}>{t('addFirstScore')}</button>
              </div>
            )}
          </section>
          <footer className="home-footer">{library.binders.length} {language === 'fr' ? `classeur${library.binders.length > 1 ? 's' : ''}` : `binder${library.binders.length === 1 ? '' : 's'}`} · {allScores.length} {t(allScores.length > 1 ? 'scores' : 'score')} · {t('savedLocally')}</footer>
        </main>
      ) : (
        <main className="manager-view">
          <div className="manager-heading">
            <div>
              <button className="back-link" onClick={() => setView('home')}><ArrowLeft size={17} /> {t('home')}</button>
              <h1>{t('myScores')}</h1>
              <p>{t('reorderHelp')}</p>
            </div>
            <button className="button button-primary" onClick={() => setDialog({ kind: 'score' })} disabled={!selectedBinder}>
              <Plus size={18} /> {t('addScore')}
            </button>
          </div>

          <div className="manager-layout">
            <aside className="binder-panel">
              <div className="panel-title"><span>{t('binders')}</span><button onClick={() => setDialog({ kind: 'binder' })} aria-label={t('addBinder')}><Plus size={18} /></button></div>
              <div className="binder-list">
                {library.binders.map((binder) => (
                  <button
                    key={binder.id}
                    draggable
                    onDragStart={() => setDraggedBinderId(binder.id)}
                    onDragEnd={() => { setDraggedBinderId(null); setDropTarget(null); setDropBinderId(null) }}
                    onDragEnter={(event) => isFileDrag(event) ? setFileDropBinderId(binder.id) : setDropBinderId(binder.id)}
                    onDragOver={(event) => { event.preventDefault(); if (isFileDrag(event)) setFileDropBinderId(binder.id) }}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (isFileDrag(event)) { void importFilesIntoBinder(binder.id, event.dataTransfer.files); return }
                      draggedScore ? moveScore(binder.id) : reorderBinders(binder.id)
                    }}
                    onClick={() => setSelectedBinderId(binder.id)}
                    onContextMenu={(event) => openContextMenu(event, { kind: 'binder', binder })}
                    onKeyDown={(event) => {
                      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) openContextMenu(event, { kind: 'binder', binder })
                    }}
                    className={`binder-item ${selectedBinder?.id === binder.id ? 'selected' : ''} ${draggedBinderId === binder.id ? 'is-dragging' : ''} ${dropBinderId === binder.id && draggedBinderId !== binder.id ? 'drop-target' : ''} ${fileDropBinderId === binder.id ? 'file-drop-target' : ''} ${draggedScore && draggedScore.binderId !== binder.id ? 'accepts-score' : ''}`}
                  >
                    <GripVertical size={16} className="grip" />
                    <span className="binder-spine" style={{ background: binder.color }} />
                    <span className="binder-info"><strong>{binder.name}</strong><small>{binder.scores.length} {t(binder.scores.length > 1 ? 'scores' : 'score')}</small></span>
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
              <button className="add-binder" onClick={() => setDialog({ kind: 'binder' })}><Plus size={17} /> {t('newBinder')}</button>
            </aside>

            <section
              className={`scores-panel ${draggedScore ? 'is-receiving' : ''} ${selectedBinder && fileDropBinderId === selectedBinder.id ? 'is-file-receiving' : ''}`}
              onDragOver={(event) => { event.preventDefault(); if (selectedBinder && isFileDrag(event)) setFileDropBinderId(selectedBinder.id) }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setFileDropBinderId(null) }}
              onDrop={(event) => {
                event.preventDefault()
                if (!selectedBinder) return
                if (isFileDrag(event)) { void importFilesIntoBinder(selectedBinder.id, event.dataTransfer.files); return }
                moveScore(selectedBinder.id)
              }}
            >
              {selectedBinder ? (
                <>
                  <div className="scores-header">
                    <div className="binder-title"><span style={{ background: selectedBinder.color }} /><div><h2>{selectedBinder.name}</h2><p>{selectedBinder.scores.length} {t(selectedBinder.scores.length > 1 ? 'scores' : 'score')}</p></div></div>
                    <button className="icon-button danger" onClick={() => requestDeleteBinder(selectedBinder)} title={t('deleteBinder')}><Trash2 size={18} /></button>
                  </div>
                  <label className="import-zone">
                    <Upload size={17} />
                    <span><strong>{t('dropList')}</strong><small>{t('dropListHelp')}</small></span>
                    <input type="file" accept=".pdf,.doc,.docx" multiple onChange={(event) => { if (event.target.files?.length) void importFilesIntoBinder(selectedBinder.id, event.target.files); event.currentTarget.value = '' }} />
                  </label>
                  {importNotice && <div className={`import-notice ${importNotice.kind}`}><FilePlus2 size={15} />{importNotice.message}<button onClick={() => setImportNotice(null)} aria-label={t('close')}><X size={14} /></button></div>}
                  <div className="score-list">
                    {selectedBinder.scores.map((score, index) => {
                      const complete = { ...score, binderId: selectedBinder.id, binderName: selectedBinder.name, binderColor: selectedBinder.color }
                      return (
                        <article
                          key={score.id}
                          className={`score-row ${dropTarget === score.id ? 'drop-before' : ''} ${draggedScore?.scoreId === score.id ? 'is-dragging' : ''}`}
                          draggable
                          onDragStart={() => setDraggedScore({ binderId: selectedBinder.id, scoreId: score.id })}
                          onDragEnd={() => { setDraggedScore(null); setDropTarget(null); setDropBinderId(null) }}
                          onDragEnter={(event) => { if (!isFileDrag(event) && draggedScore) setDropTarget(score.id) }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.stopPropagation()
                            event.preventDefault()
                            if (isFileDrag(event)) { void importFilesIntoBinder(selectedBinder.id, event.dataTransfer.files); return }
                            moveScore(selectedBinder.id, score.id)
                          }}
                          onContextMenu={(event) => openContextMenu(event, { kind: 'score', score: complete })}
                          onKeyDown={(event) => {
                            if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) openContextMenu(event, { kind: 'score', score: complete })
                          }}
                          tabIndex={0}
                        >
                          <GripVertical size={18} className="grip" />
                          <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
                          <span className="score-icon"><FileMusic size={19} /></span>
                          <span className="score-main"><strong>{score.title}</strong><small>{score.composer || t('unknownComposer')}{score.instrument ? ` · ${score.instrument}` : ''}</small></span>
                          <span className="page-badge">{t('page')} <strong>{score.page}</strong></span>
                          {score.attachment && <button className="icon-button attachment-button" onClick={() => void window.desktop?.openAttachment(score.attachment!)} title={t('openAttachment')}><Paperclip size={16} /></button>}
                          <button className="icon-button" onClick={() => setDialog({ kind: 'score', score: complete })} title={t('edit')}><Pencil size={17} /></button>
                          <button className="icon-button danger" onClick={() => requestDeleteScore(complete)} title={t('delete')}><Trash2 size={17} /></button>
                        </article>
                      )
                    })}
                    {!selectedBinder.scores.length && (
                      <div className="panel-empty"><FileMusic size={32} /><h3>{t('emptyBinder')}</h3><p>{t('emptyBinderHelp')}</p><button className="button button-primary" onClick={() => setDialog({ kind: 'score' })}><Plus size={18} /> {t('addScore')}</button></div>
                    )}
                  </div>
                </>
              ) : (
                <div className="panel-empty"><LibraryIcon size={34} /><h3>{t('createFirstBinder')}</h3><p>{t('createFirstBinderHelp')}</p><button className="button button-primary" onClick={() => setDialog({ kind: 'binder' })}><Plus size={18} /> {t('createBinder')}</button></div>
              )}
            </section>
          </div>
        </main>
      )}

      {selectedResult && <ResultCard result={selectedResult} onClose={() => setSelectedResult(null)} onEdit={() => openManage(selectedResult.binderId)} />}
      {dialog?.kind === 'binder' && <BinderDialog onClose={() => setDialog(null)} onSave={(binder) => { updateLibrary((current) => ({ binders: [...current.binders, binder] })); setSelectedBinderId(binder.id); setDialog(null) }} />}
      {dialog?.kind === 'score' && selectedBinder && <ScoreDialog binder={selectedBinder} score={dialog.score} onClose={() => setDialog(null)} onSave={(score) => {
        if (dialog.score?.attachment && dialog.score.attachment.id !== score.attachment?.id) removeStoredAttachment(dialog.score.attachment)
        updateLibrary((current) => ({ binders: current.binders.map((binder) => {
          const without = binder.scores.filter((item) => item.id !== score.id)
          return binder.id === selectedBinder.id ? { ...binder, scores: [...without, score] } : { ...binder, scores: without }
        }) }))
        setDialog(null)
      }} />}
      {contextMenu && <ContextMenu menu={contextMenu} binders={library.binders} onEdit={(score) => { setDialog({ kind: 'score', score }); setSelectedBinderId(score.binderId); setContextMenu(null) }} onMove={moveScoreToBinder} onDeleteScore={requestDeleteScore} onDeleteBinder={requestDeleteBinder} onClose={() => setContextMenu(null)} />}
      {confirm && <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />}
    </div>
  )
}

function WindowBar() {
  const { t } = useLanguage()
  const [maximized, setMaximized] = useState(false)
  useEffect(() => window.desktop?.onMaximized(setMaximized), [])
  return (
    <div className="window-bar" onDoubleClick={() => window.desktop?.toggleMaximize()}>
      <span className="window-title">MusiClass</span>
      <div className="window-controls">
        <button onClick={() => window.desktop?.minimize()} aria-label={t('minimizeWindow')} title={t('minimize')}><Minus size={14} /></button>
        <button onClick={() => window.desktop?.toggleMaximize()} aria-label={t(maximized ? 'restoreWindow' : 'maximizeWindow')} title={t(maximized ? 'restore' : 'maximize')}>{maximized ? <Maximize2 size={13} /> : <Square size={12} />}</button>
        <button className="window-close" onClick={() => window.desktop?.close()} aria-label={t('closeWindow')} title={t('close')}><X size={14} /></button>
      </div>
    </div>
  )
}

function UpdateIndicator({ state }: { state: UpdateStatus }) {
  const { t } = useLanguage()
  if (!['downloading', 'ready'].includes(state.status)) return null
  if (state.status === 'ready') return <button className="update-indicator ready" onClick={() => window.desktop?.installUpdate()}>{t('updateReady')} <span>{t('restart')}</span></button>
  return <span className="update-indicator"><i />{t('updateDownloading')}{typeof state.percent === 'number' ? ` ${state.percent}%` : ''}</span>
}

function Location({ binder }: { binder: Pick<SearchResult, 'binderName' | 'binderColor' | 'page'> }) {
  const { t } = useLanguage()
  return <span className="location"><i style={{ background: binder.binderColor }} />{binder.binderName}<b>·</b> {t('page')} {binder.page}</span>
}

function ResultCard({ result, onClose, onEdit }: { result: SearchResult; onClose: () => void; onEdit: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section className="result-card" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
        <button className="dialog-close" onClick={onClose} aria-label={t('close')}><X size={20} /></button>
        <div className="found-check"><Check size={25} /></div>
        <span className="result-kicker">{t('scoreFound')}</span>
        <h2>{result.title}</h2>
        <p>{result.composer}{result.instrument ? ` · ${result.instrument}` : ''}</p>
        <div className="physical-location">
          <MapPin size={25} />
          <div><span>{t('locatedIn')}</span><strong><i style={{ background: result.binderColor }} />{result.binderName}</strong></div>
          <div className="big-page"><span>{t('page').toUpperCase()}</span><b>{result.page}</b></div>
        </div>
        {result.notes && <div className="result-notes"><MoreHorizontal size={18} /> {result.notes}</div>}
        <div className="dialog-actions">
          {result.attachment && <button className="button button-secondary" onClick={() => void window.desktop?.openAttachment(result.attachment!)}><ExternalLink size={17} /> {t('openAttachment')}</button>}
          <button className="button button-secondary" onClick={onEdit}><Pencil size={17} /> {t('edit')}</button><button className="button button-primary" onClick={onClose}>{t('foundIt')}</button>
        </div>
      </section>
    </div>
  )
}

function BinderDialog({ onClose, onSave }: { onClose: () => void; onSave: (binder: Binder) => void }) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [color, setColor] = useState(colors[0])
  const [hexValue, setHexValue] = useState(colors[0])
  const [customColorOpen, setCustomColorOpen] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const choosePresetColor = (nextColor: string) => {
    setColor(nextColor)
    setHexValue(nextColor)
    setCustomColorOpen(false)
  }
  const chooseCustomColor = (nextColor: string) => {
    const typed = nextColor.trim().toUpperCase()
    const normalized = typed.startsWith('#') ? typed : `#${typed}`
    setHexValue(typed)
    if (/^#[0-9A-F]{6}$/.test(normalized)) setColor(normalized)
  }
  const handleColorTyping = (event: React.KeyboardEvent<HTMLFormElement>) => {
    const isColorButton = (event.target as HTMLElement).closest('.color-options button')
    if (!isColorButton || event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return
    event.preventDefault()
    setName((current) => current + event.key)
    nameRef.current?.focus()
  }
  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <form className="form-dialog" onMouseDown={(event) => event.stopPropagation()} onKeyDown={handleColorTyping} onSubmit={(event) => { event.preventDefault(); if (name.trim()) onSave({ id: uid(), name: name.trim(), color, scores: [] }) }}>
        <button type="button" className="dialog-close" onClick={onClose}><X size={20} /></button>
        <span className="dialog-icon"><LibraryIcon size={20} /></span><h2>{t('newBinder')}</h2><p>{t('binderNameHelp')}</p>
        <label>{t('binderName')}<input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} placeholder={t('binderExample')} autoFocus required /></label>
        <fieldset>
          <legend>{t('binderColor')}</legend>
          <div className={`color-options ${customColorOpen ? 'custom-open' : ''}`}>
            {colors.map((item) => (
              <button type="button" key={item} className={color === item && !customColorOpen ? 'chosen' : ''} style={{ background: item }} onClick={() => choosePresetColor(item)} aria-label={t('chooseColor', { color: item })}>
                {color === item && !customColorOpen && <Check size={14} />}
              </button>
            ))}
            <button
              type="button"
              className={`color-wheel-button ${customColorOpen || !colors.includes(color) ? 'chosen' : ''}`}
              onClick={() => setCustomColorOpen((open) => !open)}
              aria-label={t('customColor')}
              aria-expanded={customColorOpen}
              aria-controls="custom-color-picker"
            />
            <div id="custom-color-picker" className="custom-color-popover" hidden={!customColorOpen}>
              <input className="custom-color-input" type="color" value={color} onChange={(event) => chooseCustomColor(event.target.value)} aria-label={t('colorWheel')} />
              <span className="custom-color-preview" style={{ background: color }} aria-hidden="true" />
              <label className="hex-color-label">
                <span>{t('hexCode')}</span>
                <input className="hex-color-input" value={hexValue} maxLength={7} spellCheck={false} onChange={(event) => chooseCustomColor(event.target.value)} onBlur={() => setHexValue(color)} />
              </label>
            </div>
          </div>
        </fieldset>
        <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onClose}>{t('cancel')}</button><button className="button button-primary">{t('createBinder')}</button></div>
      </form>
    </div>
  )
}

function ScoreDialog({ binder, score, onClose, onSave }: { binder: Binder; score?: SearchResult; onClose: () => void; onSave: (score: Score) => void }) {
  const { t } = useLanguage()
  const [title, setTitle] = useState(score?.title ?? '')
  const [composer, setComposer] = useState(score?.composer ?? '')
  const [attachment, setAttachment] = useState<Attachment | undefined>(score?.attachment)
  const [attachmentError, setAttachmentError] = useState('')
  const nextPage = Math.max(0, ...binder.scores.map((item) => item.page)) + 1

  const discardTemporaryAttachment = (item?: Attachment) => {
    if (item && item.id !== score?.attachment?.id) void window.desktop?.removeAttachment(item)
  }
  const setNewAttachment = (item: Attachment) => {
    discardTemporaryAttachment(attachment)
    setAttachment(item)
    setAttachmentError('')
  }
  const chooseAttachment = async () => {
    const result = await window.desktop?.pickAttachment()
    if (!result || !result.ok) { setAttachmentError(t('attachmentFailed')); return }
    if (result.attachment) setNewAttachment(result.attachment)
  }
  const dropAttachment = async (file: File) => {
    const result = await window.desktop?.storeAttachment(file)
    if (!result?.ok || !result.attachment) { setAttachmentError(t('attachmentFailed')); return }
    setNewAttachment(result.attachment)
  }
  const closeDialog = () => {
    discardTemporaryAttachment(attachment)
    onClose()
  }
  return (
    <div className="dialog-backdrop" onMouseDown={closeDialog}>
      <form className="form-dialog compact-form" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onSave({ id: score?.id ?? uid(), title: title.trim(), composer: composer.trim(), instrument: score?.instrument ?? '', page: score?.page ?? nextPage, notes: score?.notes ?? '', attachment }) }}>
        <button type="button" className="dialog-close" onClick={closeDialog}><X size={20} /></button>
        <span className="dialog-icon"><FileMusic size={20} /></span><h2>{t(score ? 'editScore' : 'addScore')}</h2><p>{t('inBinder', { binder: binder.name })}</p>
        <label>{t('title')} <span className="required">{t('required')}</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('titleExample')} autoFocus required /></label>
        <label>{t('author')} <span className="optional">{t('optional')}</span><input value={composer} onChange={(event) => setComposer(event.target.value)} placeholder={t('authorExample')} /></label>
        <div
          className={`attachment-field ${attachment ? 'has-file' : ''}`}
          onDragOver={(event) => { if (isFileDrag(event)) event.preventDefault() }}
          onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void dropAttachment(file) }}
        >
          <div className="attachment-heading"><span>{t('attachment')} <small>{t('optional')}</small></span>{attachment && <button type="button" onClick={() => void window.desktop?.openAttachment(attachment)}><ExternalLink size={14} />{t('open')}</button>}</div>
          {attachment ? (
            <div className="attachment-file"><Paperclip size={17} /><span title={attachment.name}>{attachment.name}</span><button type="button" onClick={() => { discardTemporaryAttachment(attachment); setAttachment(undefined) }} aria-label={t('removeAttachment')}><X size={15} /></button></div>
          ) : (
            <button type="button" className="attachment-picker" onClick={() => void chooseAttachment()}><Upload size={17} /><span><strong>{t('chooseAttachment')}</strong><small>{t('attachmentHelp')}</small></span></button>
          )}
          {attachmentError && <p className="field-error">{attachmentError}</p>}
        </div>
        <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={closeDialog}>{t('cancel')}</button><button className="button button-primary">{t(score ? 'save' : 'addScore')}</button></div>
      </form>
    </div>
  )
}

function ContextMenu({ menu, binders, onEdit, onMove, onDeleteScore, onDeleteBinder, onClose }: {
  menu: NonNullable<ContextMenuState>
  binders: Binder[]
  onEdit: (score: SearchResult) => void
  onMove: (score: SearchResult, binderId: string) => void
  onDeleteScore: (score: SearchResult) => void
  onDeleteBinder: (binder: Binder) => void
  onClose: () => void
}) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [])

  const handleKeys = (event: React.KeyboardEvent) => {
    const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])]
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const offset = event.key === 'ArrowDown' ? 1 : -1
      buttons[(current + offset + buttons.length) % buttons.length]?.focus()
    }
  }

  return (
    <div ref={menuRef} className="context-menu" style={{ left: menu.x, top: menu.y }} role="menu" onClick={(event) => event.stopPropagation()} onKeyDown={handleKeys}>
      {menu.kind === 'score' ? (
        <>
          <button role="menuitem" onClick={() => onEdit(menu.score)}><Pencil size={16} /> {t('edit')}</button>
          <div className="submenu-wrap">
            <button role="menuitem" aria-haspopup="menu"><LibraryIcon size={16} /> {t('changeBinder')} <ChevronRight size={15} /></button>
            <div className="context-submenu" role="menu">
              {binders.map((binder) => (
                <button key={binder.id} role="menuitem" disabled={binder.id === menu.score.binderId} onClick={() => onMove(menu.score, binder.id)}>
                  <i style={{ background: binder.color }} />{binder.name}{binder.id === menu.score.binderId && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>
          <span className="menu-separator" />
          <button className="menu-danger" role="menuitem" onClick={() => onDeleteScore(menu.score)}><Trash2 size={16} /> {t('delete')}</button>
        </>
      ) : (
        <button className="menu-danger" role="menuitem" onClick={() => onDeleteBinder(menu.binder)}><Trash2 size={16} /> {t('deleteBinder')}</button>
      )}
    </div>
  )
}

function ConfirmDialog({ state, onClose }: { state: NonNullable<ConfirmState>; onClose: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section className="confirm-dialog" onMouseDown={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <span className="confirm-icon"><Trash2 size={20} /></span>
        <h2 id="confirm-title">{state.title}</h2>
        <p id="confirm-message">{state.message}</p>
        <div className="dialog-actions">
          <button className="button button-secondary" onClick={onClose} autoFocus>{t('cancel')}</button>
          <button className="button button-danger" onClick={() => { state.onConfirm(); onClose() }}>{state.confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}

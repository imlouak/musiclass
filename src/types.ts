export type Score = {
  id: string
  title: string
  composer: string
  instrument: string
  page: number
  notes: string
}

export type Binder = {
  id: string
  name: string
  color: string
  scores: Score[]
}

export type Library = {
  binders: Binder[]
}

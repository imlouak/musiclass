const fs = require('fs/promises')
const path = require('path')

const MAX_IMPORT_BYTES = 25 * 1024 * 1024
const IMPORT_EXTENSIONS = new Set(['.pdf', '.doc', '.docx'])

function normalizeTitle(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('fr')
}

function isIgnoredLine(value) {
  const normalized = normalizeTitle(value).replace(/[.:]+$/, '')
  return /^(classeur|binder|dossier|folder)(?:\s|$)/.test(normalized)
    || /^(liste(?: de| des)? partitions?|sheet music list|partitions?|sommaire|index|repertoire|catalogue)$/.test(normalized)
    || /^(titre|title|auteur|author|compositeur|composer|page|pages)\s*:/.test(normalized)
}

function parseScoreLine(rawLine) {
  let value = rawLine.replace(/\s+/g, ' ').trim()
  if (!value || isIgnoredLine(value)) return null

  value = value.replace(/^[-*\u2022]\s+/, '')
  const numbered = value.match(/^(\d{1,4})(?:\s*[.):-])?\s+(.+)$/)
  const page = numbered ? Number(numbered[1]) : undefined
  if (numbered) value = numbered[2].trim()
  if (!value || isIgnoredLine(value)) return null

  const parts = value.split(/\s+[-\u2013\u2014]\s+/)
  const title = parts.shift()?.trim() ?? ''
  const composer = parts.join(' - ').trim()
  if (!title || isIgnoredLine(title)) return null
  return { title, composer, ...(page ? { page } : {}) }
}

function scoresFromText(text) {
  const seen = new Set()
  const scores = []
  for (const rawLine of text.split(/\r?\n/)) {
    const score = parseScoreLine(rawLine)
    if (!score) continue
    const key = normalizeTitle(score.title)
    if (seen.has(key)) continue
    seen.add(key)
    scores.push(score)
  }
  return scores
}

function titlesFromText(text) {
  return scoresFromText(text).map((score) => score.title)
}

async function extractPdfText(filePath) {
  const { PDFParse } = require('pdf-parse')
  const parser = new PDFParse({ data: await fs.readFile(filePath) })
  try {
    const result = await parser.getText({ pageJoiner: '\n' })
    return result.text
  } finally {
    await parser.destroy()
  }
}

async function extractWordText(filePath) {
  const WordExtractor = require('word-extractor')
  const document = await new WordExtractor().extract(filePath)
  return document.getBody()
}

async function extractTitlesFromFile(filePath) {
  const extension = path.extname(filePath).toLowerCase()
  if (!IMPORT_EXTENSIONS.has(extension)) throw new Error('UNSUPPORTED_FILE_TYPE')
  const stats = await fs.stat(filePath)
  if (!stats.isFile()) throw new Error('NOT_A_FILE')
  if (stats.size > MAX_IMPORT_BYTES) throw new Error('FILE_TOO_LARGE')
  const text = extension === '.pdf' ? await extractPdfText(filePath) : await extractWordText(filePath)
  return { fileName: path.basename(filePath), scores: scoresFromText(text) }
}

module.exports = { IMPORT_EXTENSIONS, MAX_IMPORT_BYTES, extractTitlesFromFile, normalizeTitle, parseScoreLine, scoresFromText, titlesFromText }

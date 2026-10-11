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

function titlesFromText(text) {
  const seen = new Set()
  const titles = []
  for (const rawLine of text.split(/\r?\n/)) {
    const title = rawLine.replace(/\s+/g, ' ').trim()
    const key = normalizeTitle(title)
    if (!title || seen.has(key)) continue
    seen.add(key)
    titles.push(title)
  }
  return titles
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
  return { fileName: path.basename(filePath), titles: titlesFromText(text) }
}

module.exports = { IMPORT_EXTENSIONS, MAX_IMPORT_BYTES, extractTitlesFromFile, normalizeTitle, titlesFromText }

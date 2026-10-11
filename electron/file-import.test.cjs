const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeTitle, scoresFromText, titlesFromText } = require('./file-import.cjs')

test('creates one title per non-empty line', () => {
  assert.deepEqual(titlesFromText('Clair de lune\n\nArabesque\r\nRêverie'), ['Clair de lune', 'Arabesque', 'Rêverie'])
})

test('removes duplicate lines regardless of case, accents, and spacing', () => {
  assert.deepEqual(titlesFromText('Été\nete\n  Sonate   au clair de lune  \nSONATE AU CLAIR DE LUNE'), ['Été', 'Sonate au clair de lune'])
  assert.equal(normalizeTitle('  Prélude   N°1 '), normalizeTitle('PRELUDE N°1'))
})

test('reads an optional page number and author', () => {
  assert.deepEqual(scoresFromText('26 Clair de lune - Claude Debussy\n27. Arabesque'), [
    { title: 'Clair de lune', composer: 'Claude Debussy', page: 26 },
    { title: 'Arabesque', composer: '', page: 27 },
  ])
})

test('ignores binder labels and common document headings', () => {
  assert.deepEqual(scoresFromText('Classeur violet\nListe de partitions\nSommaire\nR\u00eaverie - Claude Debussy'), [
    { title: 'R\u00eaverie', composer: 'Claude Debussy' },
  ])
})

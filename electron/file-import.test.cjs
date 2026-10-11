const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeTitle, titlesFromText } = require('./file-import.cjs')

test('creates one title per non-empty line', () => {
  assert.deepEqual(titlesFromText('Clair de lune\n\nArabesque\r\nRêverie'), ['Clair de lune', 'Arabesque', 'Rêverie'])
})

test('removes duplicate lines regardless of case, accents, and spacing', () => {
  assert.deepEqual(titlesFromText('Été\nete\n  Sonate   au clair de lune  \nSONATE AU CLAIR DE LUNE'), ['Été', 'Sonate au clair de lune'])
  assert.equal(normalizeTitle('  Prélude   N°1 '), normalizeTitle('PRELUDE N°1'))
})

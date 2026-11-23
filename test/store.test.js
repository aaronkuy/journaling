'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { parseEntries, withSavedEntry, withoutEntry, createId } = require('../store.js')

const a = { id: 'a', title: 'First', content: 'one' }
const b = { id: 'b', title: 'Second', content: 'two' }

test('parseEntries: nothing stored is an empty, readable journal', () => {
    assert.deepEqual(parseEntries(null), { entries: [], readable: true })
})

test('parseEntries: returns stored entries', () => {
    assert.deepEqual(parseEntries(JSON.stringify([a, b])), { entries: [a, b], readable: true })
})

test('parseEntries: broken JSON does not throw and is reported', () => {
    assert.deepEqual(parseEntries('{not json'), { entries: [], readable: false })
})

test('parseEntries: values that are not a list are reported', () => {
    for (const raw of ['null', '{"id":"a"}', '"text"', '42']) {
        assert.deepEqual(parseEntries(raw), { entries: [], readable: false }, raw)
    }
})

test('parseEntries: drops items that are not entries and reports it', () => {
    const raw = JSON.stringify([a, null, { id: 1, title: 'x', content: 'y' }, { id: 'c', title: 'no content' }])
    assert.deepEqual(parseEntries(raw), { entries: [a], readable: false })
})

test('withSavedEntry: a new entry goes to the front and the input stays unchanged', () => {
    const before = [a]
    const after = withSavedEntry(before, b)
    assert.deepEqual(after, [b, a])
    assert.deepEqual(before, [a])
})

test('withSavedEntry: saving the same new entry twice does not duplicate it', () => {
    // This is the retry after a failed write: the dialog stays open and the
    // user presses Save again.
    const once = withSavedEntry([a], b)
    assert.deepEqual(withSavedEntry(once, b), [b, a])
})

test('withSavedEntry: an edit keeps position and unknown fields', () => {
    const stored = [a, { ...b, createdAt: '2026-01-18' }]
    const after = withSavedEntry(stored, { id: 'b', title: 'Changed', content: 'text' })
    assert.deepEqual(after, [a, { id: 'b', title: 'Changed', content: 'text', createdAt: '2026-01-18' }])
})

test('withoutEntry: removes only the matching entry', () => {
    assert.deepEqual(withoutEntry([a, b], 'a'), [b])
    assert.deepEqual(withoutEntry([a, b], 'missing'), [a, b])
})

test('createId: ids created in the same millisecond differ', () => {
    const ids = new Set(Array.from({ length: 1000 }, createId))
    assert.equal(ids.size, 1000)
})

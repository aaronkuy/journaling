'use strict'

// Entry logic without DOM or localStorage access, so that `node --test` can
// run it. In the browser this file is a classic script and its functions are
// plain globals: the README promises that opening index.html from disk works,
// and ES modules do not load from file:// URLs.

function isEntry(value) {
    return value !== null
        && typeof value === 'object'
        && typeof value.id === 'string'
        && typeof value.title === 'string'
        && typeof value.content === 'string'
}

/**
 * Turns the raw localStorage value into a list of entries.
 * `readable` is false if something was stored but could not be used as a
 * whole, so the caller can tell the user instead of showing an empty journal
 * without explanation.
 */
function parseEntries(raw) {
    if (raw === null) return { entries: [], readable: true }

    let parsed
    try {
        parsed = JSON.parse(raw)
    } catch {
        return { entries: [], readable: false }
    }
    if (!Array.isArray(parsed)) return { entries: [], readable: false }

    const entries = parsed.filter(isEntry)
    return { entries, readable: entries.length === parsed.length }
}

/**
 * Returns a new list with `entry` saved: replaced in place if its id exists,
 * otherwise added at the front (newest first). The given list is not changed,
 * so the caller can write the result to storage first and keep the old list
 * if that write fails.
 */
function withSavedEntry(entries, entry) {
    const index = entries.findIndex(existing => existing.id === entry.id)
    if (index === -1) return [entry, ...entries]

    const next = [...entries]
    // Keep fields of the stored entry that the form does not know about.
    next[index] = { ...entries[index], ...entry }
    return next
}

function withoutEntry(entries, entryId) {
    return entries.filter(entry => entry.id !== entryId)
}

// Date.now() alone repeats for two entries created in the same millisecond,
// and deleting one of them would then delete both.
function createId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

if (typeof module === 'object') {
    module.exports = { parseEntries, withSavedEntry, withoutEntry, createId }
}

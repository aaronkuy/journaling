'use strict'

const STORAGE_KEY = 'journalEntries'
const THEME_KEY = 'theme'
const ICON_TO_DARK = '☾'
const ICON_TO_LIGHT = '☀️'

// In-memory copy of the stored entries, newest first.
let entries = []
// Id of the entry the dialog is editing; null while it creates a new one.
let editingEntryId = null

const entriesContainer = document.getElementById('entriesContainer')
const entryCardTemplate = document.getElementById('entryCardTemplate')
const emptyStateTemplate = document.getElementById('emptyStateTemplate')
const entryDialog = document.getElementById('entryDialog')
const entryForm = document.getElementById('entryForm')
const dialogTitle = document.getElementById('dialogTitle')
const titleInput = document.getElementById('entryTitle')
const contentInput = document.getElementById('entryContent')
const themeToggleBtn = document.getElementById('themeToggleBtn')
const addEntryBtn = document.getElementById('addEntryBtn')
const pageNotice = document.getElementById('pageNotice')
const dialogError = document.getElementById('dialogError')

// localStorage can throw on every access: when site data is blocked, in some
// private modes, and on write when the quota is used up. Nothing outside
// these two functions touches it.
function readStorage(key) {
    try {
        return localStorage.getItem(key)
    } catch {
        return null
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, value)
        return true
    } catch {
        return false
    }
}

/**
 * Writes the new list first and adopts it only if that worked, so memory
 * and storage never disagree about what was saved.
 */
function persistEntries(nextEntries) {
    if (!writeStorage(STORAGE_KEY, JSON.stringify(nextEntries))) return false
    entries = nextEntries
    return true
}

function showMessage(element, text) {
    element.textContent = text
    element.hidden = text === ''
}

/** Form submit handler: creates a new entry or updates the one being edited. */
function saveEntry(event) {
    // Stop the browser from submitting the form and reloading the page.
    event.preventDefault()

    const title = titleInput.value.trim()
    const content = contentInput.value.trim()

    // `required` accepts a field that holds only spaces; after trim() that
    // would be saved as an empty card.
    const blankField = !title ? titleInput : !content ? contentInput : null
    if (blankField) {
        blankField.setCustomValidity('Please write something other than spaces.')
        blankField.reportValidity()
        return
    }

    // A new entry gets its id once per dialog session, not once per attempt:
    // if the write fails and the user presses Save again, the retry updates
    // the same entry instead of adding a second one.
    editingEntryId ??= createId()
    const entryId = editingEntryId

    if (!persistEntries(withSavedEntry(entries, { id: entryId, title, content }))) {
        // Leave the dialog open so the text is still there to copy or retry.
        showMessage(dialogError, 'The entry could not be saved. The browser storage is full or blocked for this page.')
        return
    }

    renderEntries()
    closeEntryDialog()
    // Rendering replaced the button the dialog would hand focus back to.
    focusEntryAction(entryId, '.edit-btn')
}

function deleteEntry(entryId) {
    const index = entries.findIndex(entry => entry.id === entryId)

    if (!persistEntries(withoutEntry(entries, entryId))) {
        showMessage(pageNotice, 'The entry could not be deleted. The browser storage is blocked for this page.')
        return
    }

    renderEntries()
    // Move focus to the entry that took the deleted one's place.
    const neighbour = entries[Math.min(index, entries.length - 1)]
    focusEntryAction(neighbour?.id, '.delete-btn')
}

/** Focuses a button of the given entry's card, or "New Entry" if the card is gone. */
function focusEntryAction(entryId, selector) {
    const card = [...entriesContainer.children].find(element => element.dataset.id === entryId)
    const target = card?.querySelector(selector) ?? addEntryBtn
    target.focus()
}

/**
 * Builds one card from the <template> in index.html. Title and content are
 * user input, so they go in through textContent and are never parsed as HTML.
 */
function createEntryCard(entry) {
    const card = entryCardTemplate.content.firstElementChild.cloneNode(true)
    // The click handler reads the id back from here instead of from an
    // inline onclick attribute, which a crafted id could break out of.
    card.dataset.id = entry.id
    card.querySelector('.entry-title').textContent = entry.title
    card.querySelector('.entry-content').textContent = entry.content
    // Name the entry in the button labels so a screen reader user can tell
    // the buttons of different cards apart.
    card.querySelector('.edit-btn').setAttribute('aria-label', `Edit entry: ${entry.title}`)
    card.querySelector('.delete-btn').setAttribute('aria-label', `Delete entry: ${entry.title}`)
    return card
}

function renderEntries() {
    if (entries.length === 0) {
        entriesContainer.replaceChildren(emptyStateTemplate.content.cloneNode(true))
        return
    }
    entriesContainer.replaceChildren(...entries.map(createEntryCard))
}

/** Opens the dialog in edit mode if an entry id is given, otherwise in create mode. */
function openEntryDialog(entryId = null) {
    const entryToEdit = entryId ? entries.find(entry => entry.id === entryId) : null

    if (entryToEdit) {
        editingEntryId = entryToEdit.id
        dialogTitle.textContent = 'Edit Entry'
        titleInput.value = entryToEdit.title
        contentInput.value = entryToEdit.content
    } else {
        editingEntryId = null
        dialogTitle.textContent = 'Add New Entry'
        entryForm.reset()
    }
    showMessage(dialogError, '')
    // An "only spaces" message from an earlier attempt survives reset() and
    // values set from script, and would block saving until the user types.
    titleInput.setCustomValidity('')
    contentInput.setCustomValidity('')

    // showModal() makes the rest of the page inert and keeps focus inside the dialog.
    entryDialog.showModal()
    titleInput.focus()
}

function closeEntryDialog() {
    entryDialog.close()
}

function setTheme(isDark) {
    document.body.classList.toggle('dark-theme', isDark)
    // The icon shows the theme the button switches to.
    themeToggleBtn.textContent = isDark ? ICON_TO_LIGHT : ICON_TO_DARK
    themeToggleBtn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme')
}

function toggleTheme() {
    const isDark = !document.body.classList.contains('dark-theme')
    setTheme(isDark)
    // If this write fails, the theme still switches for the current visit.
    writeStorage(THEME_KEY, isDark ? 'dark' : 'light')
}

/**
 * One click listener for every button on the page. Cards are re-created on
 * each render, so listeners on the buttons themselves would have to be
 * attached again every time.
 */
function handleClick(event) {
    const button = event.target.closest('button[data-action]')
    if (!button) return

    const entryId = button.closest('.entry-card')?.dataset.id

    switch (button.dataset.action) {
        case 'new-entry':
            openEntryDialog()
            break
        case 'edit-entry':
            openEntryDialog(entryId)
            break
        case 'delete-entry':
            deleteEntry(entryId)
            break
        case 'close-dialog':
            closeEntryDialog()
            break
        case 'toggle-theme':
            toggleTheme()
            break
    }
}

// The script is loaded with `defer`, so the document is parsed at this point.
setTheme(readStorage(THEME_KEY) === 'dark')

const stored = parseEntries(readStorage(STORAGE_KEY))
entries = stored.entries
if (!stored.readable) {
    showMessage(pageNotice, 'Some saved entries could not be read and are not shown. They are replaced the next time an entry is saved or deleted.')
}
renderEntries()

document.addEventListener('click', handleClick)
entryForm.addEventListener('submit', saveEntry)
entryForm.addEventListener('input', event => {
    // A custom validity message blocks submitting until it is cleared.
    event.target.setCustomValidity('')
})
entryDialog.addEventListener('click', event => {
    // The dialog has no padding, so a click whose target is the <dialog>
    // element itself, not its content, landed on the backdrop.
    if (event.target === entryDialog) closeEntryDialog()
})

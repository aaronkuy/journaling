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

function loadEntries() {
    const savedEntries = localStorage.getItem(STORAGE_KEY)
    return savedEntries ? JSON.parse(savedEntries) : []
}

function saveEntriesToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

// Millisecond timestamp as id: enough for manual input, not collision-safe.
function generateId() {
    return Date.now().toString()
}

/** Form submit handler: creates a new entry or updates the one being edited. */
function saveEntry(event) {
    // Stop the browser from submitting the form and reloading the page.
    event.preventDefault()

    const title = titleInput.value.trim()
    const content = contentInput.value.trim()

    if (editingEntryId) {
        const entryIndex = entries.findIndex(entry => entry.id === editingEntryId)
        // Keep the id and any other existing fields.
        entries[entryIndex] = { ...entries[entryIndex], title, content }
    } else {
        // Newest entry first.
        entries.unshift({ id: generateId(), title, content })
    }

    closeEntryDialog()
    saveEntriesToStorage()
    renderEntries()
}

function deleteEntry(entryId) {
    entries = entries.filter(entry => entry.id !== entryId)
    saveEntriesToStorage()
    renderEntries()
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
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
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
setTheme(localStorage.getItem(THEME_KEY) === 'dark')
entries = loadEntries()
renderEntries()

document.addEventListener('click', handleClick)
entryForm.addEventListener('submit', saveEntry)
entryDialog.addEventListener('click', event => {
    // The dialog has no padding, so a click whose target is the <dialog>
    // element itself, not its content, landed on the backdrop.
    if (event.target === entryDialog) closeEntryDialog()
})

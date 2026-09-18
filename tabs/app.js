// App script extracted from index.html
const tocDiv = document.getElementById("toc")
const tocBody = document.getElementById("toc-body")
const sortArtist = document.getElementById("sort-artist")
const sortTitle = document.getElementById("sort-title")
const arrowArtist = document.getElementById("arrow-artist")
const arrowTitle = document.getElementById("arrow-title")
const songDiv = document.getElementById("song")
const tabsDiv = document.getElementById("tabs")
const tabsTextDiv = document.getElementById("tabs-text")
const transposeDownBtn = document.getElementById("transpose-down")
const transposeUpBtn = document.getElementById("transpose-up")
const transposeResetBtn = document.getElementById("transpose-reset")
const lyricsDiv = document.getElementById("lyrics")
const centerBarH1 = document.querySelector("#center-bar h1")
const prevBtn = document.getElementById("prev-btn")
const nextBtn = document.getElementById("next-btn")
const searchInput = document.getElementById("search")
const themeToggle = document.getElementById("theme-toggle")
const randomBtn = document.getElementById("random-btn")
const backBtn = document.getElementById("back-btn")
const topBar = document.getElementById("top-bar")
let currentSong = null
let transposeSemitones = 0

// Theme toggle
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-theme")
    themeToggle.textContent = document.body.classList.contains("light-theme") ? "☀️" : "🌙"
})

// Adjust view to fit content on screen
function adjustTallView() {
    if (songDiv.style.display === "none") return

    const lyricsEl = lyricsDiv
    const tabsHeight = tabsDiv.getBoundingClientRect().height
    // Use actual top-bar height instead of hard-coded 45px so mobile layouts don't get cropped
    const topBarHeight = topBar.getBoundingClientRect().height || 45
    const availableHeight = window.innerHeight - topBarHeight - tabsHeight - 30 // 30px for padding

    // Get text lines
    const h1 = lyricsEl.querySelector("h1")
    const h1Text = h1 ? h1.textContent : ""
    const textContent = lyricsEl.textContent.replace(h1Text, "").trim()
    const lines = textContent.split("\n").filter((line) => line.trim().length > 0)

    // Reset to default
    lyricsEl.style.fontSize = ""
    lyricsEl.style.columnCount = ""

    // Get actual content width (excluding padding)
    const style = getComputedStyle(lyricsEl)
    const paddingLeft = parseFloat(style.paddingLeft)
    const paddingRight = parseFloat(style.paddingRight)
    const contentWidth = lyricsEl.clientWidth - paddingLeft - paddingRight

    // Try different column counts (1 to 4)
    let bestFontSize = 0
    let bestColumns = 1

    for (let cols = 1; cols <= 4; cols++) {
        lyricsEl.style.columnCount = cols

        // Calculate available width per column (with safety margin)
        const columnRule = 1 // 1px column rule
        const totalGap = (cols - 1) * 30 // 30px gap between columns
        const totalRuleWidth = (cols - 1) * columnRule
        const columnWidth = (contentWidth - totalGap - totalRuleWidth) / cols - 5 // 5px safety margin

        // Binary search for optimal font size
        let minSize = 8
        let maxSize = 200
        let fontSize = minSize

        // Create a temporary span to measure text width
        const measureSpan = document.createElement("span")
        measureSpan.style.visibility = "hidden"
        measureSpan.style.position = "absolute"
        measureSpan.style.whiteSpace = "nowrap"
        measureSpan.style.fontFamily = getComputedStyle(lyricsEl).fontFamily
        document.body.appendChild(measureSpan)

        while (maxSize - minSize > 1) {
            fontSize = Math.floor((minSize + maxSize) / 2)
            lyricsEl.style.fontSize = fontSize + "px"
            if (h1) h1.style.fontSize = fontSize * 1.2 + "px"

            // Measure if ALL lines fit in column width
            measureSpan.style.fontSize = fontSize + "px"
            let maxLineWidth = 0
            for (const line of lines) {
                measureSpan.textContent = line
                maxLineWidth = Math.max(maxLineWidth, measureSpan.offsetWidth)
            }

            // Check if content fits: no wrapping and within height
            const fitsWidth = maxLineWidth <= columnWidth
            const fitsHeight = lyricsEl.scrollHeight <= availableHeight
            const fits = fitsWidth && fitsHeight

            if (fits) {
                minSize = fontSize
            } else {
                maxSize = fontSize
            }
        }

        document.body.removeChild(measureSpan)

        if (minSize > bestFontSize) {
            bestFontSize = minSize
            bestColumns = cols
        }
    }

    lyricsEl.style.columnCount = bestColumns
    lyricsEl.style.fontSize = bestFontSize + "px"
    if (h1) h1.style.fontSize = bestFontSize * 1.2 + "px"
}

window.addEventListener("resize", adjustTallView)

// Ensure content is pushed below the top-bar and tabs stick below it
function syncTopBarSpacing() {
    try {
        const topH = Math.ceil(topBar.getBoundingClientRect().height)
        // Set CSS variable so layout (content padding and sticky tab top) updates via CSS
        document.documentElement.style.setProperty("--top-bar-height", topH + "px")
    } catch (e) {
        // ignore
    }
}

window.addEventListener("resize", syncTopBarSpacing)
// call once now to initialize
syncTopBarSpacing()

// Back button
backBtn.addEventListener("click", showToc)

// Prev / Next button handlers
prevBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    if (!currentSong || sortedData.length === 0) return
    const idx = sortedData.findIndex((s) => s.artist === currentSong.artist && s.title === currentSong.title)
    // Wrap to last if at beginning or if currentSong not found
    const newIdx = idx <= 0 ? sortedData.length - 1 : idx - 1
    showSong(sortedData[newIdx])
})
nextBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    if (!currentSong || sortedData.length === 0) return
    const idx = sortedData.findIndex((s) => s.artist === currentSong.artist && s.title === currentSong.title)
    // Wrap to first if at end or if currentSong not found
    const newIdx = idx === -1 || idx >= sortedData.length - 1 ? 0 : idx + 1
    showSong(sortedData[newIdx])
})

// Random button: jump to a random song from current filtered selection
if (randomBtn) {
    randomBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        if (sortedData.length === 0) return
        if (sortedData.length === 1) {
            showSong(sortedData[0])
            return
        }
        const currentIdx = currentSong ? sortedData.findIndex((s) => s.artist === currentSong.artist && s.title === currentSong.title) : -1
        let rand
        do {
            rand = Math.floor(Math.random() * sortedData.length)
        } while (rand === currentIdx && sortedData.length > 1)
        showSong(sortedData[rand])
    })
}

let currentSort = "artist"
let sortOrder = 1 // 1 asc, -1 desc
let sortedData = [...window.DATA]
let activeTags = []
let searchQuery = ""

function getTagColor(tag) {
    let hash = 0
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 70%, 50%)`
}

function updateFiltersDisplay() {
    const filtersDiv = document.getElementById("active-filters")
    let html = ""
    activeTags.forEach((tag) => {
        html += `<span onclick="removeFilter('tag', '${tag}')" style="background-color: ${getTagColor(tag)}">${tag} ×</span>`
    })
    if (searchQuery) {
        html += `<span onclick="removeFilter('search')" style="background-color: #888">Search: ${searchQuery} ×</span>`
    }
    filtersDiv.innerHTML = html
}

// Sync current filters/search to the URL (uses `filter` and `search` params)
function updateUrlFilters(replace = true) {
    try {
        const params = new URLSearchParams(window.location.search)

        if (activeTags.length > 0) {
            params.set("filter", activeTags.join(","))
        } else {
            params.delete("filter")
        }

        if (searchQuery) {
            params.set("search", searchQuery)
        } else {
            params.delete("search")
        }

        const qs = params.toString()
        const newUrl = window.location.pathname + (qs ? "?" + qs : "")
        if (replace) history.replaceState({}, "", newUrl)
        else history.pushState({}, "", newUrl)
    } catch (e) {
        // ignore
    }
}

function removeFilter(type, value) {
    if (type === "tag") {
        activeTags = activeTags.filter((t) => t !== value)
    } else if (type === "search") {
        searchQuery = ""
        searchInput.value = ""
    }
    updateFiltersDisplay()
    applyFilters()
    updateUrlFilters()
}

function toggleTagFilter(tag) {
    if (activeTags.includes(tag)) {
        activeTags = activeTags.filter((t) => t !== tag)
    } else {
        activeTags.push(tag)
    }
    updateFiltersDisplay()
    applyFilters()
    updateUrlFilters()
}

function applyFilters() {
    let data = [...window.DATA]
    if (activeTags.length > 0) {
        data = data.filter((song) => song.tags && activeTags.some((tag) => song.tags.includes(tag)))
    }
    if (searchQuery) {
        const query = searchQuery.toLowerCase()
        data = data.filter(
            (song) =>
                song.artist.toLowerCase().includes(query) ||
                song.title.toLowerCase().includes(query) ||
                song.lyrics.toLowerCase().includes(query) ||
                (song.tags && song.tags.some((tag) => tag.toLowerCase().includes(query))),
        )
    }
    sortedData = data
    sortBy(currentSort)
    // After filters change, update prev/next availability when viewing a song
    updateNavButtons()
}

function populateTable() {
    tocBody.innerHTML = ""
    sortedData.forEach((song, idx) => {
        const number = idx + 1
        const tagsHTML = song.tags
            ? song.tags
                  .map(
                      (tag) =>
                          `<span onclick="event.stopPropagation(); toggleTagFilter('${tag}')" style="background-color: ${getTagColor(
                              tag,
                          )}; color: white; padding: 2px 4px; margin: 1px; border-radius: 3px; display: inline-block; font-size: 12px; cursor: pointer;">${tag}</span>`,
                  )
                  .join("")
            : ""
        const row = document.createElement("tr")
        row.innerHTML = `<td class="toc-number">${number}</td><td><strong>${song.artist}</strong></td><td>${song.title}</td><td>${tagsHTML}</td>`
        row.onclick = () => showSong(song)
        tocBody.appendChild(row)
    })
    // Update nav buttons in case the current selection is still visible
    updateNavButtons()
}

function sortBy(field) {
    if (currentSort === field) {
        sortOrder = -sortOrder
    } else {
        currentSort = field
        sortOrder = 1
    }
    sortedData.sort((a, b) => sortOrder * a[field].localeCompare(b[field]))
    populateTable()
    arrowArtist.textContent = currentSort === "artist" ? (sortOrder === 1 ? "▲" : "▼") : ""
    arrowTitle.textContent = currentSort === "title" ? (sortOrder === 1 ? "▲" : "▼") : ""
}

sortArtist.addEventListener("click", () => sortBy("artist"))
sortTitle.addEventListener("click", () => sortBy("title"))

// Initialize table
sortBy("artist")

// Search functionality
searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim()
    updateFiltersDisplay()
    applyFilters()
    updateUrlFilters()
})

/* ------------------------------------------------------------------ *
 * Chord parsing, transposition and rendering
 * ------------------------------------------------------------------ */

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
const NATURAL_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
// Major keys conventionally written with flats: Db, Eb, F, Ab, Bb. F#/Gb is left on
// the sharp side, which is what guitar tabs (and this library) already use.
const FLAT_KEYS = new Set([1, 3, 5, 8, 10])

// A chord is a root (A-G plus optional #/b), a suffix (m, 7, m7, maj7, sus2, sus4,
// 5, ...) and an optional /bass. The leading group and the trailing lookahead keep
// us off the middle of a word, so "Chorus" is not read as C and "BRIDGE" not as B.
const CHORD_SUFFIX = /(?:m|maj|min|dim|aug|M)?(?:sus|add)?\d*(?:(?:sus|add|maj)\d+)?/.source
const CHORD_REGEX = new RegExp(
    "(^|[^A-Za-z0-9_#])" + // 1: prefix
        "([A-G][#b]?)" + // 2: root
        "(" + CHORD_SUFFIX + ")" + // 3: suffix
        "(?:[/]([A-G][#b]?)(" + CHORD_SUFFIX + "))?" + // 4, 5: slash bass
        "(?=[^A-Za-z0-9_]|$)",
    "g",
)

function pitchOf(root) {
    let p = NATURAL_PITCH[root[0].toUpperCase()]
    if (root[1] === "#") p += 1
    else if (root[1] === "b") p -= 1
    return ((p % 12) + 12) % 12
}

function isMinorSuffix(suffix) {
    return /^m(?!aj)/.test(suffix)
}

// Raw tablature grids (and the "--- Key Change ---" divider) are left untouched:
// their digits are fret numbers, not chords.
function isRawTabLine(line) {
    return line.includes("---")
}

// Everything up to and including the first ":" is a section label, never a chord.
// That is what keeps labels like "Verse 2:" or the bass-tab "A:" out of the way.
function splitLabel(line) {
    const i = line.indexOf(":")
    return i === -1 ? ["", line] : [line.slice(0, i + 1), line.slice(i + 1)]
}

// Choose sharps or flats from the key we are transposing *into*, so a song in F
// moved up a tone reads G, and one in G moved down a tone reads F rather than E#.
function spellingForTabs(text, semitones) {
    let tonic = 0
    let minor = false
    for (const line of text.split(/\r?\n/)) {
        if (isRawTabLine(line)) continue
        CHORD_REGEX.lastIndex = 0
        const m = CHORD_REGEX.exec(splitLabel(line)[1])
        if (m) {
            tonic = pitchOf(m[2])
            minor = isMinorSuffix(m[3])
            break
        }
    }
    // Judge by the relative major, so Dm -> F -> flats and Am -> C -> naturals.
    const major = minor ? (tonic + 3) % 12 : tonic
    const target = (((major + semitones) % 12) + 12) % 12
    return FLAT_KEYS.has(target) ? FLAT_NAMES : SHARP_NAMES
}

function transposeRoot(root, semitones, names) {
    if (semitones === 0) return root // keep the original spelling untouched
    return names[(pitchOf(root) + semitones + 120) % 12]
}

function getChordColor(root) {
    const colors = {
        A: "hsl(120, 70%, 60%)", // medium green
        B: "hsl(240, 70%, 60%)", // medium blue
        C: "hsl(300, 70%, 60%)", // medium magenta
        D: "hsl(0, 70%, 60%)", // medium red
        E: "hsl(30, 70%, 60%)", // medium orange
        F: "hsl(60, 70%, 60%)", // medium yellow
        G: "hsl(180, 70%, 60%)", // medium cyan
    }
    return colors[root] || "inherit"
}

const CHORD_DATA = {
    A: {
        guitar: { n_frets: 4, position: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
        ukulele: { n_frets: 4, position: [2, 1, 0, 0], fingers: [2, 1, 0, 0] },
    },
    Am: {
        guitar: { n_frets: 4, position: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
        ukulele: { n_frets: 4, position: [2, 0, 0, 0], fingers: [2, 0, 0, 0] },
    },
    B: {
        guitar: { n_frets: 4, position: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1] },
        ukulele: { n_frets: 4, position: [4, 3, 2, 2], fingers: [3, 2, 1, 1] },
    },
    Bm: {
        guitar: { n_frets: 4, position: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1] },
        ukulele: { n_frets: 4, position: [4, 2, 2, 2], fingers: [3, 1, 1, 1] },
    },
    C: {
        guitar: { n_frets: 4, position: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
        ukulele: { n_frets: 4, position: [0, 0, 0, 3], fingers: [0, 0, 0, 3] },
    },
    Cm: {
        guitar: { n_frets: 5, position: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1] },
        ukulele: { n_frets: 4, position: [0, 3, 3, 3], fingers: [0, 1, 1, 1] },
    },
    D: {
        guitar: { n_frets: 4, position: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
        ukulele: { n_frets: 4, position: [2, 2, 2, 0], fingers: [1, 2, 3, 0] },
    },
    Dm: {
        guitar: { n_frets: 4, position: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
        ukulele: { n_frets: 4, position: [2, 2, 1, 0], fingers: [2, 3, 1, 0] },
    },
    E: {
        guitar: { n_frets: 4, position: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
        ukulele: { n_frets: 4, position: [4, 4, 4, 2], fingers: [2, 3, 4, 1] },
    },
    Em: {
        guitar: { n_frets: 4, position: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
        ukulele: { n_frets: 4, position: [0, 4, 3, 2], fingers: [0, 3, 2, 1] },
    },
    F: {
        guitar: { n_frets: 4, position: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1] },
        ukulele: { n_frets: 4, position: [2, 0, 1, 0], fingers: [2, 0, 1, 0] },
    },
    Fm: {
        guitar: { n_frets: 4, position: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1] },
        ukulele: { n_frets: 4, position: [1, 0, 1, 3], fingers: [1, 0, 2, 4] },
    },
    G: {
        guitar: { n_frets: 4, position: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
        ukulele: { n_frets: 4, position: [0, 2, 3, 2], fingers: [0, 1, 3, 2] },
    },
    Gm: {
        guitar: { n_frets: 5, position: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1] },
        ukulele: { n_frets: 4, position: [0, 2, 3, 1], fingers: [0, 2, 3, 1] },
    },
    // Accidentals, keyed by their sharp name; lookupChordShapes() resolves the
    // flat spellings (Bb, Eb, ...) onto these. Shapes high up the neck are drawn
    // relative to their lowest fret by make_chords.
    "A#": {
        guitar: { n_frets: 4, position: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1] },
        ukulele: { n_frets: 4, position: [3, 2, 1, 1], fingers: [3, 2, 1, 1] },
    },
    "A#m": {
        guitar: { n_frets: 4, position: [-1, 1, 3, 3, 2, 1], fingers: [0, 1, 3, 4, 2, 1] },
        ukulele: { n_frets: 4, position: [3, 1, 1, 1], fingers: [3, 1, 1, 1] },
    },
    "C#": {
        guitar: { n_frets: 4, position: [-1, 4, 6, 6, 6, 4], fingers: [0, 1, 2, 3, 4, 1] },
        ukulele: { n_frets: 4, position: [1, 1, 1, 4], fingers: [1, 1, 1, 4] },
    },
    "C#m": {
        guitar: { n_frets: 4, position: [-1, 4, 6, 6, 5, 4], fingers: [0, 1, 3, 4, 2, 1] },
        ukulele: { n_frets: 4, position: [1, 1, 0, 4], fingers: [1, 2, 0, 4] },
    },
    "D#": {
        guitar: { n_frets: 4, position: [-1, 6, 8, 8, 8, 6], fingers: [0, 1, 2, 3, 4, 1] },
        ukulele: { n_frets: 4, position: [0, 3, 3, 1], fingers: [0, 3, 4, 1] },
    },
    "D#m": {
        guitar: { n_frets: 4, position: [-1, 6, 8, 8, 7, 6], fingers: [0, 1, 3, 4, 2, 1] },
        ukulele: { n_frets: 4, position: [3, 3, 2, 1], fingers: [3, 4, 2, 1] },
    },
    "F#": {
        guitar: { n_frets: 4, position: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1] },
        ukulele: { n_frets: 4, position: [3, 1, 2, 1], fingers: [4, 1, 3, 1] },
    },
    "F#m": {
        guitar: { n_frets: 4, position: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1] },
        ukulele: { n_frets: 4, position: [2, 1, 2, 0], fingers: [2, 1, 3, 0] },
    },
    "G#": {
        guitar: { n_frets: 4, position: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1] },
        ukulele: { n_frets: 4, position: [1, 3, 4, 3], fingers: [1, 2, 4, 3] },
    },
    "G#m": {
        guitar: { n_frets: 4, position: [4, 6, 6, 4, 4, 4], fingers: [1, 3, 4, 1, 1, 1] },
        ukulele: { n_frets: 4, position: [1, 3, 4, 2], fingers: [1, 3, 4, 2] },
    },
}

// Resolve a chord name onto a diagram, treating Bb and A# as the same thing.
// Only plain triads get a diagram: showing the bare triad for a 7th, sus or add
// chord would be misleading, so those keep the previous behaviour of no tooltip.
function lookupChordShapes(name) {
    if (!name) return null
    if (CHORD_DATA[name]) return CHORD_DATA[name]
    const m = /^([A-G][#b]?)(.*)$/.exec(name)
    if (!m) return null
    const suffix = m[2]
    if (suffix !== "" && suffix !== "m") return null
    return CHORD_DATA[SHARP_NAMES[pitchOf(m[1])] + suffix] || null
}

function make_chords({ n_frets = 4, position, fingers, title }) {
    const numStrings = position.length
    // Shapes that sit high on the neck are drawn from their lowest fret with a
    // "6fr" marker, rather than as a tall diagram counting up from the nut.
    const fretted = position.filter((f) => f > 0)
    const lowest = fretted.length ? Math.min(...fretted) : 0
    const baseFret = lowest > 3 ? lowest : 1
    if (baseFret > 1) {
        position = position.map((f) => (f > 0 ? f - baseFret + 1 : f))
        n_frets = Math.max(n_frets, ...position.filter((f) => f > 0))
    }
    const labelWidth = baseFret > 1 ? 22 : 0
    const width = numStrings * 20 + 20 + labelWidth
    const height = n_frets * 25 + 30
    const paddingX = 15
    const paddingY = 20
    const fretSpacing = 25
    const stringSpacing = 20

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`

    // Draw frets (horizontal lines)
    // Top nut (thicker, unless the diagram starts part-way up the neck)
    svg += `<line x1="${paddingX}" y1="${paddingY}" x2="${
        paddingX + (numStrings - 1) * stringSpacing
    }" y2="${paddingY}" stroke="currentColor" stroke-width="${baseFret > 1 ? 1 : 3}" />`

    if (baseFret > 1) {
        svg += `<text x="${paddingX + (numStrings - 1) * stringSpacing + 6}" y="${
            paddingY + fretSpacing * 0.5
        }" dy="4" font-size="11" fill="currentColor">${baseFret}fr</text>`
    }

    for (let i = 1; i <= n_frets; i++) {
        const y = paddingY + i * fretSpacing
        svg += `<line x1="${paddingX}" y1="${y}" x2="${
            paddingX + (numStrings - 1) * stringSpacing
        }" y2="${y}" stroke="currentColor" stroke-width="1" />`
    }

    // Draw strings (vertical lines)
    for (let i = 0; i < numStrings; i++) {
        const x = paddingX + i * stringSpacing
        svg += `<line x1="${x}" y1="${paddingY}" x2="${x}" y2="${
            paddingY + n_frets * fretSpacing
        }" stroke="currentColor" stroke-width="1" />`
    }

    // Draw positions
    position.forEach((fret, stringIndex) => {
        const x = paddingX + stringIndex * stringSpacing
        if (fret === 0) {
            // Open string
            svg += `<circle cx="${x}" cy="${paddingY - 8}" r="4" stroke="currentColor" fill="none" stroke-width="1"/>`
        } else if (fret === -1 || fret === null) {
            // Muted string (X)
            svg += `<text x="${x}" y="${paddingY - 5}" text-anchor="middle" font-size="12" fill="currentColor">×</text>`
        } else if (fret > 0) {
            const y = paddingY + (fret - 0.5) * fretSpacing
            svg += `<circle cx="${x}" cy="${y}" r="8" fill="currentColor" />`

            // Finger number
            if (fingers && fingers[stringIndex]) {
                svg += `<text x="${x}" y="${y}" dy="4" text-anchor="middle" font-size="10" font-weight="bold" fill="var(--bg)">${fingers[stringIndex]}</text>`
            }
        }
    })

    svg += `</svg>`
    return svg
}

// Colorize, and optionally transpose, a tabs block. Both happen in a single pass
// on purpose: a second pass would match the letters inside the data-chord
// attributes the first one just wrote.
function renderTabs(text, semitones) {
    const names = spellingForTabs(text, semitones)
    return text
        .split(/\r?\n/)
        .map((line) => {
            if (isRawTabLine(line)) return line
            const [label, body] = splitLabel(line)
            return (
                label +
                body.replace(CHORD_REGEX, (match, prefix, root, suffix, bassRoot, bassSuffix) => {
                    const chord = transposeRoot(root, semitones, names) + suffix
                    const bass = bassRoot ? "/" + transposeRoot(bassRoot, semitones, names) + bassSuffix : ""
                    const color = getChordColor(chord[0])
                    return `${prefix}<span class="chord-span" style="color: ${color}" data-chord="${chord}">${chord}${bass}</span>`
                })
            )
        })
        .join("\n")
}

// Re-render the chords bar for the current song at the current transposition.
function renderCurrentTabs() {
    if (!currentSong) return
    tabsTextDiv.innerHTML = renderTabs(currentSong.tabs.trim(), transposeSemitones)
    transposeResetBtn.textContent =
        transposeSemitones === 0 ? "0" : (transposeSemitones > 0 ? "+" : "−") + Math.abs(transposeSemitones)
    transposeResetBtn.classList.toggle("at-zero", transposeSemitones === 0)
    transposeDownBtn.disabled = transposeSemitones <= -11
    transposeUpBtn.disabled = transposeSemitones >= 11
}

function setTranspose(semitones) {
    transposeSemitones = Math.max(-11, Math.min(11, semitones))
    renderCurrentTabs()
    // Chord names can gain a character, so the chords bar may reflow.
    syncTopBarSpacing()
    adjustTallView()
}

transposeDownBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    setTranspose(transposeSemitones - 1)
})
transposeUpBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    setTranspose(transposeSemitones + 1)
})
transposeResetBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    setTranspose(0)
})

function buildIdForSong(song) {
    return `${song.artist} + ${song.title}`
}

function updateNavButtons() {
    // Hide by default
    if (songDiv.style.display === "none" || !currentSong) {
        prevBtn.style.display = "none"
        nextBtn.style.display = "none"
        return
    }

    const idx = sortedData.findIndex((s) => s.artist === currentSong.artist && s.title === currentSong.title)
    if (idx === -1) {
        prevBtn.style.display = "none"
        nextBtn.style.display = "none"
        return
    }

    // Show buttons and enable/disable appropriately (wrap behavior)
    prevBtn.style.display = "inline-block"
    nextBtn.style.display = "inline-block"
    if (randomBtn) randomBtn.style.display = "inline-block"
    // If there's only one item, disable navs and random; otherwise enable (wrapping will handle edges)
    const single = sortedData.length <= 1
    prevBtn.disabled = single
    nextBtn.disabled = single
    if (randomBtn) randomBtn.disabled = single
}

function findSongFromId(rawId) {
    if (!rawId) return null
    const id = rawId.trim()

    // Try splitting by explicit separator ' + '
    if (id.includes(" + ")) {
        const parts = id.split(" + ")
        if (parts.length >= 2) {
            const artist = parts[0].trim().toLowerCase()
            const title = parts.slice(1).join(" + ").trim().toLowerCase()
            return window.DATA.find((s) => s.artist.toLowerCase() === artist && s.title.toLowerCase() === title) || null
        }
    }

    // Try splitting by ' - '
    if (id.includes(" - ")) {
        const parts = id.split(" - ")
        if (parts.length >= 2) {
            const artist = parts[0].trim().toLowerCase()
            const title = parts.slice(1).join(" - ").trim().toLowerCase()
            return window.DATA.find((s) => s.artist.toLowerCase() === artist && s.title.toLowerCase() === title) || null
        }
    }

    // Fallback: try to match by normalizing whitespace and comparing concatenated artist+title
    const normalize = (str) => str.replace(/\s+/g, " ").trim().toLowerCase()
    const target = normalize(id)
    for (const s of window.DATA) {
        if (normalize(`${s.artist} ${s.title}`) === target) return s
        if (normalize(`${s.artist} - ${s.title}`) === target) return s
        if (normalize(`${s.artist} + ${s.title}`) === target) return s
    }
    return null
}

function showSong(song, pushHistory = true) {
    tocDiv.style.display = "none"
    songDiv.style.display = "block"
    backBtn.style.display = "inline"
    currentSong = song
    // Every song opens in its written key
    transposeSemitones = 0
    renderCurrentTabs()
    // Move the page title into the top menu bar instead of the lyrics area
    centerBarH1.textContent = `${song.artist} - ${song.title}`
    lyricsDiv.innerHTML = song.lyrics.trim()

    // Update the URL so song pages are directly accessible via ?id=artist+song
    try {
        const idVal = buildIdForSong(song)
        const params = new URLSearchParams(window.location.search)
        // preserve current filters/search in params
        params.set("id", idVal)
        const qs = params.toString()
        const newUrl = window.location.pathname + (qs ? "?" + qs : "")
        if (pushHistory) {
            history.pushState({ id: idVal }, "", newUrl)
        } else {
            history.replaceState({ id: idVal }, "", newUrl)
        }
    } catch (e) {
        // ignore history errors on some environments
    }

    // Adjust layout
    setTimeout(() => {
        syncTopBarSpacing()
        adjustTallView()
    }, 50)
    // Update navigation buttons availability
    updateNavButtons()
}

function showToc() {
    songDiv.style.display = "none"
    tocDiv.style.display = "block"
    backBtn.style.display = "none"
    searchInput.value = ""
    activeTags = []
    searchQuery = ""
    updateFiltersDisplay()
    sortedData = [...window.DATA]
    // Reset to default: alphabetical by artist (ascending)
    currentSort = "artist"
    sortOrder = 1
    sortedData.sort((a, b) => sortOrder * a[currentSort].localeCompare(b[currentSort]))
    populateTable()
    arrowArtist.textContent = "▲"
    arrowTitle.textContent = ""
    // Restore default top-bar title on the main landing page
    centerBarH1.textContent = "Dom's tabs"
    try {
        // Remove id from URL but preserve filter/search params
        const params = new URLSearchParams(window.location.search)
        params.delete("id")
        const qs = params.toString()
        const newUrl = window.location.pathname + (qs ? "?" + qs : "")
        history.pushState({}, "", newUrl)
    } catch (e) {
        // ignore
    }
    currentSong = null
    updateNavButtons()
    // sync spacing in case top bar height changed (title reset)
    setTimeout(syncTopBarSpacing, 20)
}

// Handle browser navigation (back/forward)
window.addEventListener("popstate", (ev) => {
    const params = new URLSearchParams(window.location.search)
    // Update active filters/search from URL when navigating
    const filterParam = params.get("filter")
    const searchParam = params.get("search")
    activeTags = filterParam ? filterParam.split(",").filter(Boolean) : []
    searchQuery = searchParam || ""
    searchInput.value = searchQuery
    updateFiltersDisplay()
    applyFilters()

    const id = params.get("id")
    if (id) {
        const song = findSongFromId(id)
        if (song) {
            // showSong but don't push state again
            showSong(song, false)
            return
        }
    }
    showToc()
})

// On load, initialize filters/search from URL and open id if present
;(function initFromUrl() {
    const params = new URLSearchParams(window.location.search)
    const filterParam = params.get("filter")
    const searchParam = params.get("search")
    activeTags = filterParam ? filterParam.split(",").filter(Boolean) : []
    searchQuery = searchParam || ""
    searchInput.value = searchQuery
    updateFiltersDisplay()
    applyFilters()

    const id = params.get("id")
    if (id) {
        const song = findSongFromId(id)
        if (song) {
            // show but replace history (so initial load is not added twice)
            showSong(song, false)
        }
    }
})()

tabsDiv.addEventListener("mouseover", (e) => {
    const target = e.target.closest(".chord-span")
    if (!target) return

    const chordName = target.dataset.chord
    const chordData = lookupChordShapes(chordName)

    if (!chordData) return

    // Create tooltip if not exists
    let tooltip = target.querySelector(".chord-tooltip")
    if (!tooltip) {
        tooltip = document.createElement("div")
        tooltip.className = "chord-tooltip"

        // Guitar
        const guitarDiv = document.createElement("div")
        guitarDiv.className = "chord-diagram"
        guitarDiv.innerHTML = "<h4>Guitar</h4>" + make_chords(chordData.guitar)
        tooltip.appendChild(guitarDiv)

        // Ukulele
        const ukeDiv = document.createElement("div")
        ukeDiv.className = "chord-diagram"
        ukeDiv.innerHTML = "<h4>Ukulele</h4>" + make_chords(chordData.ukulele)
        tooltip.appendChild(ukeDiv)

        target.appendChild(tooltip)
    }
})

tabsDiv.addEventListener("mouseout", (e) => {
    const target = e.target.closest(".chord-span")
    if (!target) return

    const tooltip = target.querySelector(".chord-tooltip")
    if (tooltip) {
        tooltip.remove()
    }
})

// App script extracted from index.html
const tocDiv = document.getElementById("toc")
const tocBody = document.getElementById("toc-body")
const sortArtist = document.getElementById("sort-artist")
const sortTitle = document.getElementById("sort-title")
const arrowArtist = document.getElementById("arrow-artist")
const arrowTitle = document.getElementById("arrow-title")
const songDiv = document.getElementById("song")
const tabsDiv = document.getElementById("tabs")
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
    const availableHeight = window.innerHeight - 45 - tabsHeight - 30 // 30px for padding

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
                song.lyrics.toLowerCase().includes(query)
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
                              tag
                          )}; color: white; padding: 2px 4px; margin: 1px; border-radius: 3px; display: inline-block; font-size: 12px; cursor: pointer;">${tag}</span>`
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

function colorizeChords(text) {
    const chordRegex = /\b([A-G][#b]?\d*[m]?)\b/g
    return text.replace(chordRegex, (match, chord) => {
        const root = chord[0].toUpperCase()
        const color = getChordColor(root)
        return `<span style="color: ${color}">${chord}</span>`
    })
}

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
    tabsDiv.innerHTML = colorizeChords(song.tabs.trim())
    // Move the page title into the top menu bar instead of the lyrics area
    centerBarH1.textContent = `${song.artist} - ${song.title}`
    lyricsDiv.innerHTML = song.lyrics.trim()
    currentSong = song

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
    setTimeout(adjustTallView, 50)
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
    sortBy(currentSort)
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

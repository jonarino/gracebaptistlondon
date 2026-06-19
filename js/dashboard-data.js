/**
 * Dashboard Data Module
 * Handles CSV parsing, data aggregation, chart rendering, and tab management
 */

// Data storage
let allSongs = []; // All songs from CSV
let occurrences = []; // Date-based occurrences
let directory = []; // Full song directory with metadata
let currentChart = null; // Current Chart.js instance
const twoYearsAgo = new Date();
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initializeChartDefaults();
  initializeTabListeners();
  loadData();
});

/**
 * Chart.js configuration defaults
 */
function initializeChartDefaults() {
  Chart.defaults.font.family = "'Spectral', serif";
  Chart.defaults.color = "#8b949e";
  Chart.defaults.borderColor = "#21262d";
}

/**
 * Tab switching logic
 */
function initializeTabListeners() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const targetTab = e.target.dataset.tab;
      switchTab(targetTab);
    });
  });
}

function switchTab(tabName) {
  // Remove active from all buttons and contents
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));

  // Activate selected tab
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`${tabName}-tab`).classList.add("active");

  // Render tab content
  switch (tabName) {
    case "overview":
      renderOverviewTab();
      break;
    case "frequency":
      renderFrequencyTab();
      break;
    case "spacing":
      renderSpacingTab();
      break;
    case "hymnal":
      renderHymanalTab();
      break;
    case "directory":
      renderDirectoryTab();
      break;
    case "services":
      renderServicesTab();
      break;
  }
}

/**
 * CSV Data Loading and Parsing
 */
async function loadData() {
  try {
    // Load both CSV files
    const [occurrencesData, uniqueSongsData] = await Promise.all([
      fetch("./data/song_occurrences.csv").then((r) => r.text()),
      fetch("./data/unique_songs.csv").then((r) => r.text()),
    ]);

    occurrences = parseCSV(occurrencesData);
    allSongs = parseCSV(uniqueSongsData);

    // Build directory with metadata
    buildDirectory();

    // Set eyebrow range
    setEyebrowRange();

    // Show first tab by default
    switchTab("overview");
  } catch (error) {
    console.error("Error loading data:", error);
    document.querySelector(".content").innerHTML =
      '<p style="color: #f85149;">Error loading data</p>';
  }
}

/**
 * Parse CSV text to array of objects (handles quoted fields)
 */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  // Parse header row with proper CSV handling
  const headers = parseCSVLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] || "";
    });
    data.push(obj);
  }

  return data;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Build comprehensive directory from both CSV sources
 */
function buildDirectory() {
  // Count occurrences per song
  const counts = {};
  occurrences.forEach((occ) => {
    const title = occ["Song Title"] || "";
    counts[title] = (counts[title] || 0) + 1;
  });

  // Merge with metadata
  directory = allSongs.map((song) => ({
    title: song["Song Title"] || "",
    count: counts[song["Song Title"]] || 0,
    hymnal_num: song["Hymnal Number"] || "",
    majesty: song["Majesty Hymns"] === "Yes",
    key: song["Key"] || "",
    type: song["Hymnal Number"] ? "hymnal" : "contemporary",
  }));

  // Collect all dates for each song
  directory.forEach((song) => {
    song.dates = occurrences
      .filter((occ) => occ["Song Title"] === song.title)
      .map((occ) => occ["Date"] || "")
      .sort((a, b) => new Date(a) - new Date(b))
      .reverse();
  });
}

/**
 * Set eyebrow date range based on occurrences
 */
function setEyebrowRange() {
  const dates = occurrences.map((occ) => occ["Date"]).filter((d) => !!d);
  if (dates.length === 0) return;

  const minDate = new Date(Math.min(...dates.map((d) => new Date(d))));
  const maxDate = new Date(Math.max(...dates.map((d) => new Date(d))));
  const eyebrow = document.querySelector(".eyebrow-range");
  if (eyebrow) {
    eyebrow.innerHTML = `${minDate.getFullYear()}—${maxDate.getFullYear()}`;
  }
}

/**
 * OVERVIEW TAB
 */
function renderOverviewTab() {
  const tab = document.getElementById("overview-tab");

  // Calculate stats
  const stats = {
    totalSongs: directory.length,
    totalUsages: occurrences.length,
    hymnalCount: directory.filter((s) => s.type === "hymnal").length,
    hymnalPct: Math.round(
      (directory.filter((s) => s.type === "hymnal").length / directory.length) *
        100,
    ),
    majestyCount: directory.filter((s) => s.majesty).length,
  };

  // Render stat cards
  const statsHTML = `
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">${stats.totalSongs}</div>
        <div class="stat-label">Unique Songs</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalUsages}</div>
        <div class="stat-label">Total Usages</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.hymnalPct}%</div>
        <div class="stat-label">Hymnal Portion</div>
      </div>
    </div>
  `;

  // Top 10 songs
  const top10 = directory.sort((a, b) => b.count - a.count).slice(0, 10);

  const top10HTML = `
    <div class="top-songs-list">
      ${top10
        .map(
          (song, idx) => `
        <div class="song-row" onclick="openSongModal('${song.title.replace(/'/g, "\\'")}')">
          <div class="song-rank">${idx + 1}</div>
          <div class="song-title">${song.title}</div>
          ${song.hymnal_num ? `<div class="tag">#${song.hymnal_num}</div>` : ""}
          ${song.majesty ? `<div class="tag" style="color: #58a6ff; border-color: rgba(88, 166, 255, 0.18); background: rgba(88, 166, 255, 0.09);">MAJESTY</div>` : ""}
          <div class="song-count">${song.count}</div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  // Pie chart data
  const hymnalPie = directory.filter((s) => s.type === "hymnal").length;
  const contemporaryPie = directory.filter(
    (s) => s.type === "contemporary",
  ).length;

  const pieSvg = `
    <div class="grid-2">
      <div class="card-column">
        <div class="card-label">Top 10 Songs</div>
        ${top10HTML}
      </div>
      <div class="card-column">
        <div class="card-label">Hymnal vs Non-Hymnal</div>
        <div class="card" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
          <div class="chart-container" style="height: 300px;">
            <canvas id="overview-pie"></canvas>
          </div>
          <div class="pie-labels">
            <div class="pie-label">
              <div class="pie-pct">${stats.hymnalPct}%</div>
              <div class="pie-desc">Hymnal</div>
            </div>
            <div class="pie-label">
              <div class="pie-pct pie-pct--blue">${100 - stats.hymnalPct}%</div>
              <div class="pie-desc">Non-Hymnal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  tab.innerHTML = statsHTML + pieSvg;

  // Render pie chart
  setTimeout(
    () => renderPieChart("overview-pie", hymnalPie, contemporaryPie),
    100,
  );
}

function renderPieChart(canvasId, hymnal, contemporary) {
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;

  if (currentChart) currentChart.destroy();

  currentChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Hymnal", "Non-Hymnal"],
      datasets: [
        {
          data: [hymnal, contemporary],
          backgroundColor: ["#e3b341", "#58a6ff"],
          borderColor: "#161b22",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
    },
  });
}

/**
 * FREQUENCY TAB
 */
function renderFrequencyTab() {
  const tab = document.getElementById("frequency-tab");

  let topN = 10;
  const top = directory.sort((a, b) => b.count - a.count).slice(0, topN);

  const html = `
    <div class="freq-controls">
      <div class="freq-label">Show Top <span class="freq-n">${topN}</span> Songs</div>
      <div class="freq-buttons">
        <button class="freq-btn active" data-n="10" onclick="updateFrequencyChart(10)">10</button>
        <button class="freq-btn" data-n="20" onclick="updateFrequencyChart(20)">20</button>
        <button class="freq-btn" data-n="30" onclick="updateFrequencyChart(30)">30</button>
      </div>
    </div>
    <div class="card">
      <div class="card-label blue">Song Frequency (Descending)</div>
      <div id="frequency-chart-container" class="chart-container large">
        <canvas id="frequency-chart"></canvas>
      </div>
    </div>
  `;

  tab.innerHTML = html;

  setTimeout(() => renderFrequencyChart(topN), 100);
}

function updateFrequencyChart(n) {
  // Update active button
  document.querySelectorAll(".freq-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.n == n);
  });

  // Update label
  document.querySelector(".freq-n").textContent = n;

  // Update container height
  const container = document.getElementById("frequency-chart-container");
  if (container) {
    container.style.height = `${Math.max(250, n * 32)}px`;
  }

  renderFrequencyChart(n);
}

function renderFrequencyChart(topN) {
  const ctx = document.getElementById("frequency-chart")?.getContext("2d");
  if (!ctx) return;

  const top = directory.sort((a, b) => b.count - a.count).slice(0, topN);

  if (currentChart) currentChart.destroy();

  currentChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top.map((s) => s.title),
      datasets: [
        {
          label: "Usage Count",
          data: top.map((s) => s.count),
          backgroundColor: top.map((s) =>
            s.type === "hymnal" ? "#e3b341" : "#58a6ff",
          ),
          borderColor: "#21262d",
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { beginAtZero: true, ticks: { color: "#8b949e" } },
      },
    },
  });
}

/**
 * SPACING TAB
 */
function renderSpacingTab() {
  const tab = document.getElementById("spacing-tab");

  // Calculate spacing for each song
  const spacingData = [];
  directory.forEach((song) => {
    if (song.dates.length < 4) return; // Need at least 4 occurrences

    const gaps = [];
    for (let i = 0; i < song.dates.length - 1; i++) {
      const d1 = new Date(song.dates[i]);
      const d2 = new Date(song.dates[i + 1]);
      const weeksBetween = Math.round((d1 - d2) / (7 * 24 * 60 * 60 * 1000));
      gaps.push(weeksBetween);
    }

    if (gaps.length > 0) {
      spacingData.push({
        title: song.title,
        avgGap: Math.round(gaps.reduce((a, b) => a + b) / gaps.length),
        minGap: Math.min(...gaps),
        maxGap: Math.max(...gaps),
        gaps: gaps,
      });
    }
  });

  // Find closest and longest gaps
  const closest = spacingData.sort((a, b) => a.avgGap - b.avgGap).slice(0, 25);

  const longest = spacingData.sort((a, b) => b.avgGap - a.avgGap).slice(0, 25);

  const html = `
    <div class="spacing-legend">
      <div class="legend-item">
        <div class="legend-dot rose"></div>
        <span style="font-size: 12px; color: #e6edf3;">Closest Rotation (≤20 weeks)</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot blue"></div>
        <span style="font-size: 12px; color: #e6edf3;">Longest Gap Between Uses</span>
      </div>
    </div>
    <div class="grid-2">
      <div class="card-column">
        <div class="card-label rose">Closest Rotation</div>
        <div class="card">
          <div class="gap-list">
            ${closest
              .map(
                (s) => `
              <div class="gap-row">
                <div class="gap-title">${s.title}</div>
                <div class="gap-value" style="color: #f85149; font-weight: 700;">${s.avgGap}w</div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
      <div class="card-column">
        <div class="card-label blue">Longest Avg Gaps</div>
        <div class="card">
          <div class="gap-list">
            ${longest
              .map(
                (s) => `
              <div class="gap-row">
                <div class="gap-title">${s.title}</div>
                <div class="gap-value" style="color: #58a6ff; font-weight: 700;">${s.avgGap}w</div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
    </div>
  `;

  tab.innerHTML = html;
}

/**
 * HYMNAL TAB
 */
function renderHymanalTab() {
  const tab = document.getElementById("hymnal-tab");

  // Calculate overall stats
  const hymnalSongs = directory.filter((s) => s.type === "hymnal");
  const hymnalUsages = occurrences.filter((occ) => {
    const song = directory.find((s) => s.title === occ["Song Title"]);
    return song && song.type === "hymnal";
  });

  const stats = {
    overall: Math.round((hymnalUsages.length / occurrences.length) * 100),
    early: 0, // 2012-2017
    recent: 0, // 2022-2024
  };

  // Calculate by period
  const early = occurrences.filter((occ) => {
    const year = new Date(occ["Date"]).getFullYear();
    return year >= 2012 && year <= 2017;
  });
  const earlyHymnal = early.filter((occ) => {
    const song = directory.find((s) => s.title === occ["Song Title"]);
    return song && song.type === "hymnal";
  });
  stats.early =
    early.length > 0
      ? Math.round((earlyHymnal.length / early.length) * 100)
      : 0;

  const recent = occurrences.filter((occ) => {
    const year = new Date(occ["Date"]).getFullYear();
    return year >= 2022 && year <= 2024;
  });
  const recentHymnal = recent.filter((occ) => {
    const song = directory.find((s) => s.title === occ["Song Title"]);
    return song && song.type === "hymnal";
  });
  stats.recent =
    recent.length > 0
      ? Math.round((recentHymnal.length / recent.length) * 100)
      : 0;

  // Build year-by-year table
  const yearData = {};
  occurrences.forEach((occ) => {
    const year = new Date(occ["Date"]).getFullYear();
    if (!yearData[year]) yearData[year] = { total: 0, hymnal: 0 };
    yearData[year].total++;

    const song = directory.find((s) => s.title === occ["Song Title"]);
    if (song && song.type === "hymnal") yearData[year].hymnal++;
  });

  const years = Object.keys(yearData).sort().reverse();
  const hymnalByYear = years.map((y) =>
    Math.round((yearData[y].hymnal / yearData[y].total) * 100),
  );

  const html = `
    <div class="hymnal-stats">
      <div class="hymnal-stat">
        <div class="hymnal-value">${stats.overall}%</div>
        <div class="hymnal-label">Overall Hymnal %</div>
      </div>
      <div class="hymnal-stat">
        <div class="hymnal-value blue">${stats.early}%</div>
        <div class="hymnal-label">Early Years (2012-17)</div>
      </div>
      <div class="hymnal-stat">
        <div class="hymnal-value green">${stats.recent}%</div>
        <div class="hymnal-label">Recent (2022-24)</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-label blue">Hymnal Usage Trend</div>
      <div class="chart-container large">
        <canvas id="hymnal-chart"></canvas>
      </div>
    </div>
    
    <div class="card">
      <div class="card-label green">Year-by-Year Breakdown</div>
      <div class="hymnal-table-wrap">
        <table class="hymnal-table">
          <thead>
            <tr>
              <th>Year</th>
              <th class="right">Total</th>
              <th class="right">Hymnal</th>
              <th class="right">%</th>
            </tr>
          </thead>
          <tbody>
            ${years
              .map((y) => {
                const pct = Math.round(
                  (yearData[y].hymnal / yearData[y].total) * 100,
                );
                return `
                <tr>
                  <td class="year">${y}</td>
                  <td class="right">${yearData[y].total}</td>
                  <td class="right">${yearData[y].hymnal}</td>
                  <td class="right">${pct}%</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="card">
      <div class="card-label green">Interpretation</div>
      <div class="hymnal-text">
        <p>Our hymnal usage has ${stats.recent > stats.early ? "increased" : "decreased"} over time, from ${stats.early}% in the early years (2012-2017) to ${stats.recent}% in recent services (2022-2024). This reflects our ongoing commitment to blending timeless hymnal treasures with contemporary worship expressions.</p>
      </div>
    </div>
  `;

  tab.innerHTML = html;

  setTimeout(() => renderHymnalChart(years, hymnalByYear), 100);
}

function renderHymnalChart(years, data) {
  const ctx = document.getElementById("hymnal-chart")?.getContext("2d");
  if (!ctx) return;

  if (currentChart) currentChart.destroy();

  currentChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: years.reverse(),
      datasets: [
        {
          label: "Hymnal Usage",
          data: data.reverse(),
          borderColor: "#e3b341",
          backgroundColor: "rgba(227, 179, 65, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#e3b341",
          pointBorderColor: "#161b22",
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          max: 100,
          ticks: {
            color: "#8b949e",
            callback: function (value) {
              return value + "%"; // Append percentage sign
            },
          },
          grace: "5%",
        },
        x: { ticks: { color: "#8b949e" } },
      },
    },
  });
}

/**
 * DIRECTORY TAB
 */
function renderDirectoryTab() {
  const tab = document.getElementById("directory-tab");

  let filtered = [...directory];
  let sortBy = "alpha"; // 'alpha' or 'count'

  const renderTable = (songs) => {
    return `
      <div class="directory-info">${songs.length} song${songs.length !== 1 ? "s" : ""} displayed</div>
      <div class="directory-table">
        ${songs
          .map(
            (song) => `
          <div class="dir-row">
            <div class="dir-title" onclick="openSongModal('${song.title.replace(/'/g, "\\'")}')">
              ${song.title}
              ${song.majesty ? `<span class="tag" style="color: #58a6ff;">M</span>` : ""}
            </div>
            <div class="dir-hymnal ${song.type === "hymnal" ? "gold" : "blue"}">${song.hymnal_num ? "#" + song.hymnal_num : "—"}</div>
            <div class="dir-key">${song.key || "—"}</div>
            <div class="dir-count">${song.count}</div>
            <div class="dir-most-recent ${song.dates.length > 0 && new Date(song.dates[0]) > twoYearsAgo ? "blue" : "gold"}" onclick="openServiceModal('${song.dates[0]}')">
              Most Recent: ${song.dates.length > 0 ? new Date(song.dates[0]).toLocaleDateString() : "—"}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  };

  const html = `
    <div class="directory-controls">
      <input type="text" class="search-input" placeholder="Search songs..." onkeyup="filterDirectory(this.value)">
      <div class="filter-buttons">
        <button class="filter-btn active" data-filter="all" onclick="filterByType('all')">All</button>
        <button class="filter-btn" data-filter="hymnal" onclick="filterByType('hymnal')">Hymnal</button>
        <button class="filter-btn" data-filter="majesty" onclick="filterByType('majesty')">Majesty</button>
        <button class="filter-btn" data-filter="contemporary" onclick="filterByType('contemporary')">Non-Hymnal</button>
      </div>
      <div class="sort-buttons">
        <button class="sort-btn" data-sort="alpha" onclick="sortDirectory('alpha')">A→Z</button>
        <button class="sort-btn active" data-sort="count" onclick="sortDirectory('count')">Most Used</button>
      </div>
    </div>
    <div id="directory-content">
      ${renderTable(filtered)}
    </div>
  `;

  tab.innerHTML = html;

  // Store for filter functions
  window.directoryState = { filtered, sortBy, allSongs: directory };
}

function filterDirectory(search) {
  const state = window.directoryState;
  let songs = [...state.allSongs];

  if (search) {
    songs = songs.filter((s) =>
      s.title.toLowerCase().includes(search.toLowerCase()),
    );
  }

  // Apply current filter
  const activeFilter =
    document.querySelector(".filter-btn.active").dataset.filter;
  if (activeFilter === "hymnal") {
    songs = songs.filter((s) => s.type === "hymnal");
  } else if (activeFilter === "majesty") {
    songs = songs.filter((s) => s.majesty);
  } else if (activeFilter === "contemporary") {
    songs = songs.filter((s) => s.type === "contemporary");
  }

  // Apply sort
  const activeSort = document.querySelector(".sort-btn.active").dataset.sort;
  if (activeSort === "count") {
    songs.sort((a, b) => b.count - a.count);
  } else {
    songs.sort((a, b) => {
      const cleanA = a.title.replace(/[^a-z]/gi, "");
      const cleanB = b.title.replace(/[^a-z]/gi, "");
      return cleanA.localeCompare(cleanB);
    });
  }

  state.filtered = songs;
  updateDirectoryView(songs);
}

function filterByType(type) {
  document
    .querySelectorAll(".filter-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`[data-filter="${type}"]`).classList.add("active");

  filterDirectory(document.querySelector(".search-input").value);
}

function sortDirectory(sort) {
  document
    .querySelectorAll(".sort-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`[data-sort="${sort}"]`).classList.add("active");

  filterDirectory(document.querySelector(".search-input").value);
}

function updateDirectoryView(songs) {
  const content = document.getElementById("directory-content");
  if (!content) return;

  content.innerHTML = `
    <div class="directory-info">${songs.length} song${songs.length !== 1 ? "s" : ""} displayed</div>
    <div class="directory-table">
      ${songs
        .map(
          (song) => `
        <div class="dir-row">
          <div class="dir-title" onclick="openSongModal('${song.title.replace(/'/g, "\\'")}')">
              ${song.title}
              ${song.majesty ? `<span class="tag" style="color: #58a6ff;">M</span>` : ""}
            </div>
            <div class="dir-hymnal ${song.type === "hymnal" ? "gold" : "blue"}">${song.hymnal_num ? "#" + song.hymnal_num : "—"}</div>
            <div class="dir-key">${song.key || "—"}</div>
            <div class="dir-count">${song.count}</div>
            <div class="dir-most-recent ${song.dates.length > 0 && new Date(song.dates[0]) > twoYearsAgo ? "blue" : "gold"}" onclick="openServiceModal('${song.dates[0]}')">
              Most Recent: ${song.dates.length > 0 ? new Date(song.dates[0]).toLocaleDateString() : "—"}
            </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

/**
 * SERVICES TAB
 */
function renderServicesTab() {
  const tab = document.getElementById("services-tab");
  // Unique dates sorted
  const dates = [
    ...new Set(occurrences.map((occ) => occ["Date"]).filter((d) => !!d)),
  ].sort((a, b) => new Date(b) - new Date(a));
  // Unique years for headings
  const years = [...new Set(dates.map((d) => new Date(d).getFullYear()))].sort(
    (a, b) => b - a,
  );

  const html = `
      <div class="services-info">${dates.length} service${dates.length !== 1 ? "s" : ""}</div>
      ${years
        .map(
          (year) => `
        <h3 class="services-year">${year}</h3>
        <div class="services-grid">
        ${dates
          .filter((d) => new Date(d).getFullYear() === year)
          .map(
            (date) => `
          <div class="service-date" onclick="openServiceModal('${date}')">
            ${new Date(date).toLocaleDateString()}
          </div>
        `,
          )
          .join("")}
      </div>`,
        )
        .join("")}
      </div>
    `;
  tab.innerHTML = html;
}

/**
 * MODAL - Song Details
 */
function openSongModal(title) {
  const song = directory.find((s) => s.title === title);
  if (!song) return;

  const modal = document.getElementById("song-modal");
  const modalContent = modal.querySelector(".modal-content");

  const html = `
    <div class="modal-header">
      <h2>${song.title}</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-detail-row">
        <span class="modal-detail-label">Type</span>
        <span class="modal-detail-value">${song.type === "hymnal" ? "Hymnal" : "Non-Hymnal"}</span>
      </div>
      ${
        song.hymnal_num
          ? `
        <div class="modal-detail-row">
          <span class="modal-detail-label">Hymnal #</span>
          <span class="modal-detail-value">${song.hymnal_num}</span>
        </div>
      `
          : ""
      }
      ${
        song.key
          ? `
        <div class="modal-detail-row">
          <span class="modal-detail-label">Key</span>
          <span class="modal-detail-value">${song.key}</span>
        </div>
      `
          : ""
      }
      ${
        song.majesty
          ? `
        <div class="modal-detail-row">
          <span class="modal-detail-label">Designation</span>
          <span class="modal-detail-value">Majesty</span>
        </div>
      `
          : ""
      }
      <div class="modal-detail-row">
        <span class="modal-detail-label">Times Used</span>
        <span class="modal-detail-value">${song.count}</span>
      </div>
      
      <div class="modal-columns">
      <div class="modal-usages">
        <div class="modal-usages-title">Usage Dates (${song.dates.length})</div>
        ${song.dates
          .map(
            (date) => `
          <div class="modal-usage-date">
            <details>
              <summary>${date}</summary>
              ${getSongsByDate(date)
                .map((title) => `<div class="modal-usage-song">${title}</div>`)
                .join("")}
            </details>
          </div>
        `,
          )
          .join("")}
      </div>
      ${
        song.key
          ? `
        <div class="modal-same-key">
          <div class="modal-same-key-title">Songs in Key of ${song.key}</div>
          ${directory
            .filter((s) => s.key === song.key && s.title !== song.title)
            .map((s) => `<div class="modal-same-key-song">${s.title}</div>`)
            .join("")}
        </div>`
          : ""
      }
      </div>
    </div>
  `;

  modalContent.innerHTML = html;
  modal.classList.remove("hidden");
}

function getSongsByDate(date) {
  return occurrences
    .filter((occ) => occ["Date"] === date)
    .map((occ) => [
      occ["Song Title"],
      allSongs.find((s) => s["Song Title"] === occ["Song Title"])?.Key,
    ]);
}

function openServiceModal(date) {
  const services = occurrences.filter((occ) => occ["Date"] === date);
  if (services.length === 0) return;
  const modal = document.getElementById("song-modal");
  const modalContent = modal.querySelector(".modal-content");
  const html = `
      <div class="modal-header">
        <h2>Service Details - ${new Date(date).toLocaleDateString()}</h2>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="modal-usages">
          <div class="modal-usages-title">Songs Used (${services.length})</div>
            ${getSongsByDate(date)
              .map(
                (song) =>
                  `<div class="modal-usage-date">${song[0]} ${song[1] ? `(${song[1]})` : ""}</div>`,
              )
              .join("")}
        </div>
      </div>
    `;

  modalContent.innerHTML = html;
  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("song-modal").classList.add("hidden");
}

// Close modal when clicking overlay
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("song-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.classList.contains("modal-overlay")) {
        closeModal();
      }
    });
  }
});

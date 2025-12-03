// script.js – BULLETPROOF CORS FIX (December 2025)
const GITHUB_USERNAME = 'artashes-tumo';

// NEW: Reliable free CORS proxy (corsproxy.io – works for GitHub API)
const PROXY = 'https://corsproxy.io/?';
const API_URL = `${PROXY}${encodeURIComponent(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=created`)}`;

const PAGES_BASE = `https://${GITHUB_USERNAME}.github.io/`;
let allRepos = [];

// Theme toggle (unchanged)
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('theme-toggle').textContent = savedTheme === 'dark' ? 'Light Mode' : 'Dark Mode';

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  document.getElementById('theme-toggle').textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
});

// Visitor counter (fallback if DNS fails)
fetch('https://api.countapi.xyz/hit/artashes-tumo-portfolio/visits')
  .then(r => r.json())
  .then(d => document.getElementById('visitor-count').textContent = d.value.toLocaleString())
  .catch(() => document.getElementById('visitor-count').textContent = 'Many');

// Back to top (unchanged)
const backToTop = document.getElementById('back-to-top');
window.addEventListener('scroll', () => backToTop.classList.toggle('visible', window.scrollY > 500));
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

async function fetchRepos() {
  try {
    console.log('Fetching repos via proxy...'); // Debug log
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
    const repos = await response.json();

    console.log('Got repos:', repos.length); // Debug

    const checks = repos.map(async repo => {
      if (repo.fork) return null;
      const pagesLink = await checkPages(repo.name);
      return { repo, pagesLink };
    });

    const results = await Promise.all(checks);
    allRepos = results.filter(Boolean);

    displayRepos(allRepos);
    updateStats(allRepos);
    setupSearchAndFilters();
  } catch (err) {
    console.error('Fetch error:', err);
    document.getElementById("repo-container").innerHTML = `
      <div class="loading" style="color:#ff6b6b; text-align:center; padding:80px;">
        <h3>Failed to load projects</h3>
        <p>GitHub proxy issue (CORS/rate limit). Try:</p>
        <ul style="list-style:none; padding:0;">
          <li>• Refresh page</li>
          <li>• Wait 1-2 min</li>
          <li>• Check console for details</li>
        </ul>
        <small>Or visit <a href="https://github.com/${GITHUB_USERNAME}?tab=repositories" target="_blank" style="color:#79c8ff;">GitHub directly</a></small>
      </div>`;
  }
}

async function checkPages(name) {
  try {
    const res = await fetch(`${PAGES_BASE}${name}/`, { method: "HEAD" });
    return res.ok ? `${PAGES_BASE}${name}/` : null;
  } catch { return null; }
}

function toTitleCase(str) {
  return str.replace(/-/g, ' ').replace(/_/g, ' ')
    .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

const LANG_COLORS = {
  javascript: '#f1e05a', typescript: '#2b7489', html: '#e34c26', css: '#563d7c',
  python: '#3572A5', java: '#b07219', rust: '#dea584', go: '#00ADD8',
  react: '#61dafb', vue: '#41b883', svelte: '#ff3e00', default: '#8b8b8b'
};

async function getLanguageBadge(repo) {
  if (!repo.language) return '';
  try {
    const langUrl = `${PROXY}${encodeURIComponent(repo.languages_url)}`;
    const res = await fetch(langUrl);
    if (!res.ok) throw new Error('Lang fetch failed');
    const langData = await res.json();
    const total = Object.values(langData).reduce((a,b) => a+b, 0);
    const [[lang, bytes]] = Object.entries(langData).sort(([,a],[,b]) => b-a);
    const percent = Math.round((bytes/total)*100);
    const color = LANG_COLORS[lang.toLowerCase()] || LANG_COLORS.default;
    return `<div class="lang-badge" style="--lang-color:${color};--percent:${percent}%">
      <span class="lang-name">${lang}</span>
      <span class="lang-percent">${percent}%</span>
      <div class="lang-bar"><div class="lang-fill"></div></div>
    </div>`;
  } catch {
    const color = LANG_COLORS[repo.language.toLowerCase()] || LANG_COLORS.default;
    return `<div class="lang-badge simple" style="--lang-color:${color}">
      <span class="lang-name">${repo.language}</span>
    </div>`;
  }
}

async function repoCardHtml(item) {
  const { repo, pagesLink } = item;
  const badge = await getLanguageBadge(repo);
  return `
    <article class="repo-card" data-name="${repo.name}" data-lang="${repo.language||''}">
      <div class="card-header">
        <h2>${toTitleCase(repo.name)}</h2>
        <button class="copy-btn" title="Copy GitHub link">Copy</button>
        ${badge}
      </div>
      <p>${repo.description || "No description."}</p>
      <div class="links">
        <a href="${repo.html_url}" target="_blank">GitHub Repo</a>
        ${pagesLink ? `<a class="pages-link" href="${pagesLink}" target="_blank">Live Demo</a>` : ""}
      </div>
    </article>
  `;
}

async function displayRepos(items) {
  const container = document.getElementById("repo-container");
  container.innerHTML = "<div class='loading'>Loading your awesome projects...</div>";
  const html = await Promise.all(items.map(repoCardHtml));
  container.innerHTML = html.join('');
  container.querySelectorAll('.repo-card').forEach((c,i) => c.style.animationDelay = `${i*0.08}s`);
}

function updateStats(repos) {
  const live = repos.filter(r => r.pagesLink).length;
  const languages = new Set(repos.map(r => r.repo.language).filter(Boolean)).size;
  document.getElementById('total-projects').textContent = repos.length;
  document.getElementById('live-projects').textContent = live;
  document.getElementById('total-languages').textContent = languages;
}

function setupSearchAndFilters() {
  const search = document.getElementById('search');
  const apply = () => {
    let list = [...allRepos];
    const q = search.value.toLowerCase().trim();
    if (q) list = list.filter(i => 
      i.repo.name.toLowerCase().includes(q) || 
      (i.repo.description||'').toLowerCase().includes(q) ||
      (i.repo.language||'').toLowerCase().includes(q)
    );
    const filter = document.querySelector('[data-filter].active')?.dataset.filter;
    if (filter === 'with-pages') list = list.filter(i => i.pagesLink);
    const sort = document.querySelector('[data-sort].active')?.dataset.sort;
    if (sort === 'newest') list.sort((a,b) => new Date(b.repo.created_at) - new Date(a.repo.created_at));
    if (sort === 'oldest') list.sort((a,b) => new Date(a.repo.created_at) - new Date(b.repo.created_at));
    displayRepos(list);
  };
  search.addEventListener('input', apply);
  document.querySelector('.filter-controls').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    apply();
  });
}

// Copy link (unchanged)
document.addEventListener('click', async e => {
  if (e.target.classList.contains('copy-btn')) {
    const url = e.target.closest('.repo-card').querySelector('a').href;
    await navigator.clipboard.writeText(url);
    e.target.classList.add('copy-success');
    setTimeout(() => e.target.classList.remove('copy-success'), 2000);
  }
});

document.addEventListener("DOMContentLoaded", fetchRepos);
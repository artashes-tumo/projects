const GITHUB_USERNAME = 'artashes-tumo';
const API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos`;
const PAGES_BASE = `https://${GITHUB_USERNAME}.github.io/`;

async function fetchRepos() {
    const response = await fetch(API_URL);
    const repos = await response.json();
    displayRepos(repos);
}

async function checkPages(repoName) {
    const url = `${PAGES_BASE}${repoName}/`;
    try {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) return url;  // page exists
    } catch (e) {}
    return null;
}

function repoCardHtml(repo, pagesLink) {
    const prettyName = toTitleCase(repo.name);

    return `
    <article class="repo-card">
        <h2>${prettyName}</h2>
        <p>${repo.description || "No description."}</p>

        <div class="links">
            <a href="${repo.html_url}" target="_blank">GitHub Repo</a>
            ${pagesLink ? `<a class="pages-link" href="${pagesLink}" target="_blank">Visit Project Page</a>` : ""}
        </div>
    </article>
    `;
}

async function displayRepos(repos) {
    const container = document.getElementById("repo-container");
    container.innerHTML = "";

    for (const repo of repos) {
        const pagesLink = await checkPages(repo.name);
        container.innerHTML += repoCardHtml(repo, pagesLink);
    }
}

document.addEventListener("DOMContentLoaded", fetchRepos);

function toTitleCase(str) {
    return str
        .replace(/-/g, ' ')           // replace hyphens with spaces
        .replace(/_/g, ' ')           // also handle underscores if you have any
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}
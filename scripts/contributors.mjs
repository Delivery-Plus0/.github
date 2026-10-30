#!/usr/bin/env node
/**
 * Builds the Delivery Plus contributor leaderboard and writes it between
 * <!-- CONTRIBUTORS:START --> and <!-- CONTRIBUTORS:END --> in the profile README.
 *
 * What counts (merged work only, bots excluded):
 *   - a merged pull request ........ 5 points  (role: Builder)
 *   - a review on someone else's PR . 2 points  (role: Reviewer, once per PR)
 *   - an issue opened .............. 1 point   (role: Planner)
 * Ranking = points in the last 30 days, then all-time points. A new contribution
 * raises the recent score, so the person moves up on the next run.
 *
 * Env:
 *   GITHUB_TOKEN   token the workflow already has (reads public repos)
 *   STATS_TOKEN    optional: a token that can also read the private app repos
 *   TARGET_REPOS   optional: "owner/repo,owner/repo" (default: the backend repo)
 *   README_PATH    optional: default profile/README.md
 *
 * No dependencies. Needs Node 18+ (built-in fetch).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const WEIGHTS = { pr: 5, review: 2, issue: 1 };
const ROLES = {
  pr: '🛠️ Builder',
  review: '🔍 Reviewer',
  issue: '🧭 Planner',
};
const DAY = 86_400_000;
const START = '<!-- CONTRIBUTORS:START -->';
const END = '<!-- CONTRIBUTORS:END -->';

/** Which part of the project a changed file belongs to (null = ignore). */
export function areaOf(repo, path) {
  if (repo !== 'delivery-plus') return repo.replace(/^delivery-plus-/, '');
  const [top, second] = path.split('/');
  if (top === 'services' && second) return second.replace(/-service$/, '');
  if (top === 'shared') return 'shared';
  if (top === 'docs' || top === '.project-context') return 'docs';
  if (top === 'scripts' || top === 'docker' || top.startsWith('docker-compose') || top === 'Dockerfile') return 'infra';
  if (top === '.github') return 'ci';
  return null;
}

/** Turns raw PRs and issues into one record per human contributor. */
export function aggregate({ prs, issues }, { now = Date.now(), windowDays = 30 } = {}) {
  const since = now - windowDays * DAY;
  const people = new Map();

  const person = (user, assoc) => {
    if (!user || user.__typename !== 'User') return null; // skips bots and deleted users
    let p = people.get(user.login);
    if (!p) {
      p = { login: user.login, team: false, counts: { pr: 0, review: 0, issue: 0 }, recent: 0, total: 0, last: 0, areas: new Map() };
      people.set(user.login, p);
    }
    if (assoc === 'OWNER' || assoc === 'MEMBER') p.team = true;
    return p;
  };
  const credit = (p, kind, when) => {
    const t = Date.parse(when);
    if (!p || Number.isNaN(t)) return;
    p.counts[kind] += 1;
    p.total += WEIGHTS[kind];
    if (t >= since) p.recent += WEIGHTS[kind];
    if (t > p.last) p.last = t;
  };

  for (const pr of prs) {
    const author = person(pr.author, pr.authorAssociation);
    credit(author, 'pr', pr.mergedAt);
    if (author) {
      const seen = new Set();
      for (const file of pr.files ?? []) {
        const area = areaOf(pr.repo, file.path);
        if (area && !seen.has(area)) {
          seen.add(area);
          author.areas.set(area, (author.areas.get(area) ?? 0) + 1);
        }
      }
    }
    // One review credit per reviewer per PR (their latest), never for reviewing your own PR.
    const latest = new Map();
    for (const review of pr.reviews ?? []) {
      const login = review.author?.login;
      if (!login || review.author.__typename !== 'User' || login === pr.author?.login || !review.submittedAt) continue;
      const prev = latest.get(login);
      if (!prev || Date.parse(review.submittedAt) > Date.parse(prev.submittedAt)) latest.set(login, review);
    }
    for (const review of latest.values()) credit(person(review.author, review.authorAssociation), 'review', review.submittedAt);
  }
  for (const issue of issues) credit(person(issue.author, issue.authorAssociation), 'issue', issue.createdAt);

  return [...people.values()].filter((p) => p.total > 0);
}

/** Markdown for the block between the markers. */
export function render(people, { now = Date.now(), top = 20, windowDays = 30, activeDays = 14, recentDays = 60 } = {}) {
  const ranked = [...people]
    .sort((a, b) => b.recent - a.recent || b.total - a.total || b.last - a.last)
    .slice(0, top);
  if (ranked.length === 0) return '_No contributions yet._';

  const max = Math.max(...ranked.map((p) => p.recent));
  const bar = (value) => {
    const filled = max ? Math.round((10 * value) / max) : 0;
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
  };
  const status = (p) => {
    const days = (now - p.last) / DAY;
    return days <= activeDays ? '🟢 Active' : days <= recentDays ? '🟡 Recent' : '⚪ Away';
  };
  const role = (p) => {
    const [kind] = Object.keys(WEIGHTS)
      .map((k) => [k, p.counts[k] * WEIGHTS[k]])
      .sort((a, b) => b[1] - a[1])[0];
    return ROLES[kind];
  };
  const focus = (p) =>
    [...p.areas.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([area]) => `\`${area}\``)
      .join(' ') || '–';

  const lines = [
    `| # | Contributor | Group | Role | Status | Last ${windowDays} days | All time | Focus |`,
    '|---|---|---|---|---|---|---|---|',
    ...ranked.map((p, i) => {
      const user = `<a href="https://github.com/${p.login}"><img src="https://github.com/${p.login}.png?size=48" width="24" height="24" alt=""></a> [@${p.login}](https://github.com/${p.login})`;
      return `| ${i + 1} | ${user} | ${p.team ? '⭐ Team' : '🌍 Community'} | ${role(p)} | ${status(p)} | ${bar(p.recent)} ${p.recent} | ${p.total} | ${focus(p)} |`;
    }),
    '',
    `<sub>Updated ${new Date(now).toISOString().slice(0, 10)}. Points: ${WEIGHTS.pr} per merged pull request, ${WEIGHTS.review} per review of someone else's pull request, ${WEIGHTS.issue} per issue opened. ` +
      `Ranked by the last ${windowDays} days, then all time. 🟢 active in the last ${activeDays} days · 🟡 in the last ${recentDays} · ⚪ earlier. Bots are excluded.</sub>`,
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------- GitHub API
async function gql(token, query, variables) {
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'contributors-leaderboard' },
      body: JSON.stringify({ query, variables }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && !body.errors) return body.data;
    if (attempt >= 3 || (res.status < 500 && res.status !== 403)) {
      throw new Error(`GraphQL failed (${res.status}): ${JSON.stringify(body.errors ?? body).slice(0, 300)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
}

const ACTOR = 'author { __typename login } authorAssociation';
const PR_QUERY = `query($owner:String!,$repo:String!,$after:String){
  repository(owner:$owner,name:$repo){
    pullRequests(first:50,states:MERGED,after:$after,orderBy:{field:UPDATED_AT,direction:DESC}){
      pageInfo{hasNextPage endCursor}
      nodes{ mergedAt ${ACTOR}
        reviews(first:50){nodes{submittedAt ${ACTOR}}}
        files(first:100){nodes{path}} }
    }
  }
}`;
const ISSUE_QUERY = `query($owner:String!,$repo:String!,$after:String){
  repository(owner:$owner,name:$repo){
    issues(first:100,after:$after,orderBy:{field:CREATED_AT,direction:DESC}){
      pageInfo{hasNextPage endCursor}
      nodes{ createdAt ${ACTOR} }
    }
  }
}`;

async function pages(token, query, owner, repo, field) {
  const nodes = [];
  let after = null;
  do {
    const data = await gql(token, query, { owner, repo, after });
    const connection = data.repository[field];
    nodes.push(...connection.nodes);
    after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (after);
  return nodes;
}

async function fetchRepo(token, fullName) {
  const [owner, repo] = fullName.split('/');
  const prs = (await pages(token, PR_QUERY, owner, repo, 'pullRequests')).map((pr) => ({
    ...pr,
    reviews: pr.reviews.nodes,
    files: pr.files.nodes,
    repo,
  }));
  const issues = await pages(token, ISSUE_QUERY, owner, repo, 'issues');
  return { prs, issues };
}

async function main() {
  const token = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Set GITHUB_TOKEN (or STATS_TOKEN)');
  const repos = (process.env.TARGET_REPOS || 'Delivery-Plus0/delivery-plus').split(',').map((s) => s.trim()).filter(Boolean);
  const readmePath = process.env.README_PATH || 'profile/README.md';

  const all = { prs: [], issues: [] };
  for (const repo of repos) {
    try {
      const data = await fetchRepo(token, repo);
      all.prs.push(...data.prs);
      all.issues.push(...data.issues);
      console.log(`${repo}: ${data.prs.length} merged PRs, ${data.issues.length} issues`);
    } catch (error) {
      // A private repo the token can't read must not break the public leaderboard.
      console.warn(`Skipping ${repo}: ${error.message}`);
    }
  }
  if (all.prs.length === 0 && all.issues.length === 0) throw new Error('No data fetched from any repository');

  const markdown = render(aggregate(all));
  const readme = await readFile(readmePath, 'utf8');
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start < 0 || end < start) throw new Error(`Markers ${START} / ${END} not found in ${readmePath}`);
  const next = `${readme.slice(0, start + START.length)}\n${markdown}\n${readme.slice(end)}`;
  if (next !== readme) await writeFile(readmePath, next);
  console.log(next === readme ? 'README already up to date' : 'README updated');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

import './style.css';
import catalog from '../data/catalog.json';

const app = document.querySelector('#app');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [page, slug] = hash.split('/');
  if (page === 'product' && slug) {
    const product = catalog.products.find((p) => p.slug === slug);
    renderProduct(product);
    return;
  }
  renderHome();
}

function shell(inner) {
  const generated = catalog.generatedAt
    ? new Date(catalog.generatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return `
    <div class="shell">
      <header class="site-header">
        <div class="brand">
          <a class="brand-mark" href="#/">kilrkrow</a>
          <p class="brand-sub">Windows utilities, quietly listed</p>
        </div>
        <nav class="nav-quiet" aria-label="Site">
          <a href="https://github.com/kilrkrow">github.com/kilrkrow</a>
        </nav>
      </header>
      <main>${inner}</main>
      <footer class="site-footer">
        Public Windows releases only. No download counters, no directory badges.
        ${generated ? `Catalog refreshed ${escapeHtml(generated)}.` : ''}
      </footer>
    </div>
  `;
}

function renderHome() {
  const products = catalog.products ?? [];
  const cards = products
    .map(
      (p) => `
      <a class="card" href="#/product/${escapeHtml(p.slug)}">
        <img class="card-thumb" src="${escapeHtml(p.screenshots?.[0] || './screenshots/placeholder.svg')}" alt="" loading="lazy" />
        <h2>${escapeHtml(p.name)}</h2>
        <p class="pitch">${escapeHtml(p.pitch || 'A small Windows utility.')}</p>
        <div class="meta">
          <span class="tag">${escapeHtml(p.version || 'release')}</span>
          <span>${escapeHtml(p.repo)}</span>
        </div>
      </a>
    `,
    )
    .join('');

  app.innerHTML = shell(`
    <section class="hero">
      <h1>Tools for people who still open freeware directories</h1>
      <p>
        A humble shelf of kilrkrow’s public Windows utilities.
        Download the latest release zip — no accounts, no fake rankings.
      </p>
    </section>
    ${
      products.length
        ? `<section class="grid" aria-label="Products">${cards}</section>`
        : `<div class="empty">No public Windows utilities with release assets yet. Run <code>npm run catalog</code>.</div>`
    }
  `);
}

function renderProduct(product) {
  if (!product) {
    app.innerHTML = shell(`
      <a class="back" href="#/">← All tools</a>
      <div class="empty">That product is not in the catalog.</div>
    `);
    return;
  }

  const shots = (product.screenshots?.length
    ? product.screenshots
    : ['./screenshots/placeholder.svg', './screenshots/placeholder.svg']
  )
    .map(
      (src, i) => `
      <figure class="shot">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(product.name)} screenshot ${i + 1}" loading="lazy" />
        <figcaption>Screenshot ${i + 1}${src.includes('placeholder') ? ' · placeholder' : ''}</figcaption>
      </figure>
    `,
    )
    .join('');

  const downloadHref = product.downloadUrl || product.releaseUrl || product.repoUrl;
  const downloadLabel = product.downloadUrl
    ? `Download ${product.assetName || 'Windows zip'}`
    : 'View release';

  app.innerHTML = shell(`
    <a class="back" href="#/">← All tools</a>
    <article class="product">
      <header class="product-head">
        <div class="meta">
          <span class="tag">${escapeHtml(product.version || 'release')}</span>
          <span>${escapeHtml(product.repo)}</span>
        </div>
        <h1>${escapeHtml(product.name)}</h1>
        <p>${escapeHtml(product.pitch || '')}</p>
        <div class="product-actions">
          <a class="btn" href="${escapeHtml(downloadHref)}" rel="noopener noreferrer">${escapeHtml(downloadLabel)}</a>
          <a class="btn btn-ghost" href="${escapeHtml(product.releaseUrl || product.repoUrl)}" rel="noopener noreferrer">Release notes</a>
          <a class="btn btn-ghost" href="${escapeHtml(product.repoUrl)}" rel="noopener noreferrer">Source</a>
        </div>
      </header>

      <section aria-label="Screenshots">
        <div class="shots">${shots}</div>
      </section>

      <section class="panel" aria-label="Video">
        <h2>Video</h2>
        <p>YouTube embed stub — empty for now. A release fan-out PR can fill this in later.</p>
      </section>
    </article>
  `);
}

window.addEventListener('hashchange', route);
route();

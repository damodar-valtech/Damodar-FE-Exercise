const LIMIT = 8;
let currentPage = 0;
let totalProducts = 0;

async function fetchProducts(skip) {
  const res = await fetch(`https://dummyjson.com/products?limit=${LIMIT}&skip=${skip}`);
  return res.json();
}

function stockBadge(status) {
  const map = {
    'In Stock':     ['in-stock',     'In Stock'],
    'Low Stock':    ['low-stock',    'Low Stock'],
    'Out of Stock': ['out-of-stock', 'Out of Stock'],
  };
  const [cls, label] = map[status] || ['in-stock', status];
  return `<span class="stock ${cls}">${label}</span>`;
}

function stars(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function renderCards(products) {
  return products.map(p => `
    <div class="card">
      <a href="#/product/${p.id}">
        <img src="${p.thumbnail}" alt="${p.title}" loading="lazy" />
        <div class="card-body">
          <p class="card-category">${p.category}</p>
          <p class="card-title">${p.title}</p>
          <div class="card-footer">
            <span class="price">$${p.price.toFixed(2)}</span>
            <span class="rating"><span class="star">${stars(p.rating)}</span> ${p.rating.toFixed(1)}</span>
          </div>
          ${stockBadge(p.availabilityStatus)}
        </div>
      </a>
      <div class="card-actions">
        <button class="quickview-btn" data-id="${p.id}">Quick View</button>
        <button class="add-to-cart"
          data-id="${p.id}"
          data-title="${p.title}"
          data-price="${p.price}"
          data-thumbnail="${p.thumbnail}">
          Add to cart
        </button>
      </div>
    </div>
  `).join('');
}

function renderPagination(totalPages) {
  const $pag = $('#pagination');
  $pag.empty();

  function getPageNumbers(current, total) {
    const delta = $(window).width() < 480 ? 1 : 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = 0; i < total; i++) {
      if (
        i === 0 ||
        i === total - 1 ||
        (i >= current - delta && i <= current + delta)
      ) {
        range.push(i);
      }
    }

    let prev = null;
    for (const i of range) {
      if (prev !== null && i - prev > 1) {
        rangeWithDots.push('...');
      }
      rangeWithDots.push(i);
      prev = i;
    }

    return rangeWithDots;
  }

  const $prev = $('<button>')
    .addClass('page-btn')
    .text('←')
    .prop('disabled', currentPage === 0)
    .on('click', () => loadPage(currentPage - 1));
  $pag.append($prev);

  getPageNumbers(currentPage, totalPages).forEach(i => {
    if (i === '...') {
      $pag.append($('<span>').addClass('page-info').text('...'));
      return;
    }
    const $btn = $('<button>')
      .addClass('page-btn' + (i === currentPage ? ' active' : ''))
      .text(i + 1)
      .on('click', () => loadPage(i));
    $pag.append($btn);
  });

  const $info = $('<span>')
    .addClass('page-info')
    .text(`${currentPage * LIMIT + 1}–${Math.min((currentPage + 1) * LIMIT, totalProducts)} of ${totalProducts}`);
  $pag.append($info);

  const $next = $('<button>')
    .addClass('page-btn')
    .text('→')
    .prop('disabled', currentPage >= totalPages - 1)
    .on('click', () => loadPage(currentPage + 1));
  $pag.append($next);
}

async function loadPage(page) {
  currentPage = page;
  const $state = $('#state');
  const $grid  = $('#grid');
  const $pag   = $('#pagination');

  $grid.hide();
  $pag.hide();
  $state.show();

  try {
    const data = await fetchProducts(page * LIMIT);
    totalProducts = data.total;
    const totalPages = Math.ceil(totalProducts / LIMIT);

    $('#total-label').text(`${totalProducts} items`);
    $grid.html(renderCards(data.products));
    $grid.css('display', 'grid');
    $state.hide();
    $pag.css('display', 'flex');
    renderPagination(totalPages);
    $('html, body').animate({ scrollTop: 0 }, 300);
  } catch (e) {
    $state.html('<span class="state-text">Failed to load products. Please try again.</span>');
  }
}

function getRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#/product/')) {
    return { page: 'product', id: hash.split('/')[2] };
  }
  if (hash === '#/cart') {
    return { page: 'cart' };
  }
  return { page: 'listing' };
}

async function router() {
  const route = getRoute();

  $('#grid').hide();
  $('#pagination').hide();
  $('#cart-page').hide();
  $('#state').hide();

  if (route.page === 'product') {
    await loadProduct(route.id);
  } else if (route.page === 'cart') {
    $('#cart-page').show();
    renderCartPage();
  } else {
    await loadPage(currentPage);
  }
}

// ── Reusable slider ───────────────────────────────────────────────────────────

function buildSliderHTML(images, alt) {
  return `
    <div class="slider">
      <div class="slider-track">
        ${images.map((img, i) => `<img src="${img}" alt="${alt}" class="slide${i === 0 ? ' active' : ''}" />`).join('')}
      </div>
      ${images.length > 1 ? `
      <button class="slider-btn prev" aria-label="Previous">&#8249;</button>
      <button class="slider-btn next" aria-label="Next">&#8250;</button>
      <div class="slider-dots">
        ${images.map((_, i) => `<span class="dot${i === 0 ? ' active' : ''}" data-index="${i}"></span>`).join('')}
      </div>
      ` : ''}
    </div>
  `;
}

function initSlider(container) {
  const $slider = $(container);
  const $slides = $slider.find('.slide');
  const $dots   = $slider.find('.dot');
  const total   = $slides.length;
  if (total <= 1) return;

  let current = 0;

  function goTo(n) {
    $slides.eq(current).removeClass('active');
    $dots.eq(current).removeClass('active');
    current = (n + total) % total;
    $slides.eq(current).addClass('active');
    $dots.eq(current).addClass('active');
  }

  $slider.find('.slider-btn.prev').on('click', () => goTo(current - 1));
  $slider.find('.slider-btn.next').on('click', () => goTo(current + 1));
  $slider.find('.dot').on('click', function () { goTo(Number($(this).data('index'))); });
}

async function loadProduct(id) {
  $('#state').show();

  const res = await fetch(`https://dummyjson.com/products/${id}`);
  const p = await res.json();

  $('#state').hide();
  $('#grid').css('display', 'block').html(`
    <div class="product-detail">
      <a href="#/" class="back-link" data-page="${currentPage}">← Back</a>
      <div class="product-layout">
        ${buildSliderHTML(p.images, p.title)}
        <div class="product-info">
          <p class="card-category">${p.category}${p.brand ? ' — ' + p.brand : ''}</p>
          <h2 class="product-detail-title">${p.title}</h2>
          <p class="product-detail-desc">${p.description}</p>
          <div class="product-detail-meta">
            <span class="price">$${p.price.toFixed(2)}</span>
            <span class="rating"><span class="star">${stars(p.rating)}</span> ${p.rating.toFixed(1)}</span>
            ${stockBadge(p.availabilityStatus)}
          </div>
          <p class="product-detail-info">${p.warrantyInformation} &nbsp;·&nbsp; ${p.shippingInformation}</p>
          <button class="add-to-cart qv-add-btn"
            data-id="${p.id}"
            data-title="${p.title}"
            data-price="${p.price}"
            data-thumbnail="${p.thumbnail}">
            Add to cart
          </button>
        </div>
      </div>
    </div>
  `);

  initSlider('#grid .slider');
  $('#pagination').hide();
}

// ── Cart ──────────────────────────────────────────────────────────────────────

const Cart = {
  get() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  },
  add(product) {
    const cart = this.get();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    this.updateBadge();
  },
  remove(id) {
    const cart = this.get().filter(item => item.id !== id);
    localStorage.setItem('cart', JSON.stringify(cart));
    this.updateBadge();
  },
  total() {
    return this.get().reduce((sum, item) => sum + item.quantity, 0);
  },
  updateBadge() {
    $('.minicart-quantity').text(this.total() || '');
  }
};

// ── QuickView ─────────────────────────────────────────────────────────────────

const QuickView = {
  open(product) {
    $('#qv-content').html(`
      ${buildSliderHTML(product.images, product.title)}
      <div class="qv-info">
        <p class="meta">${product.category}${product.brand ? ' — ' + product.brand : ''}</p>
        <h2>${product.title}</h2>
        <p class="price">$${product.price.toFixed(2)}</p>
        <p class="description">${product.description}</p>
        <p class="meta">⭐ ${product.rating.toFixed(1)} &nbsp;|&nbsp; Stock: ${product.stock}</p>
        <p class="meta">${product.warrantyInformation} &nbsp;|&nbsp; ${product.shippingInformation}</p>
        ${stockBadge(product.availabilityStatus)}
        <button class="qv-add-btn add-to-cart"
          data-id="${product.id}"
          data-title="${product.title}"
          data-price="${product.price}"
          data-thumbnail="${product.thumbnail}">
          Add to cart
        </button>
      </div>
    `);
    initSlider('#qv-content .slider');
    $('#quickview-overlay').css('display', 'flex');
    $('body').css('overflow', 'hidden');
  },
  close() {
    $('#quickview-overlay').hide();
    $('body').css('overflow', '');
  }
};

// ── Cart page ─────────────────────────────────────────────────────────────────

function renderCartPage() {
  const cart    = Cart.get();
  const $items   = $('#cart-items');
  const $empty   = $('#cart-empty');
  const $summary = $('#cart-summary');

  if (cart.length === 0) {
    $items.empty();
    $empty.show();
    $summary.empty();
    return;
  }

  $empty.hide();

  $items.html(cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.thumbnail}" alt="${item.title}" />
      <div class="cart-item-info">
        <p class="cart-item-title">${item.title}</p>
        <p class="cart-item-price">$${item.price.toFixed(2)} each</p>
      </div>
      <div class="qty-controls">
        <div class="qty-row">
          <button class="qty-btn decrease" data-id="${item.id}">-</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn increase" data-id="${item.id}">+</button>
        </div>
        <button class="remove-btn" data-id="${item.id}">Remove</button>
      </div>
      <span class="cart-item-total">$${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join(''));

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  $summary.html(`<span>Total: $${total.toFixed(2)}</span>`);
}

// ── Event bindings ────────────────────────────────────────────────────────────

$(document).ready(function () {
  Cart.updateBadge();
  router();

  // routing
  $(window).on('hashchange', router);

  // Fix 3: delegate on $(document) so QuickView modal buttons are also caught
  $(document).on('click', '.add-to-cart', function () {
    const $btn = $(this);
    Cart.add({
      id:        Number($btn.data('id')),
      title:     $btn.data('title'),
      price:     Number($btn.data('price')),
      thumbnail: $btn.data('thumbnail'),
    });
    $btn.text('Added ✓');
    setTimeout(() => $btn.text('Add to cart'), 1500);
  });

  // quickview open
  $('#grid').on('click', '.quickview-btn', async function () {
    const id  = $(this).data('id');
    const res = await fetch(`https://dummyjson.com/products/${id}`);
    QuickView.open(await res.json());
  });

  // quickview close
  $('#qv-close').on('click', () => QuickView.close());
  $('#quickview-overlay').on('click', function (e) {
    if ($(e.target).is('#quickview-overlay')) QuickView.close();
  });
  $(document).on('keydown', e => { if (e.key === 'Escape') QuickView.close(); });

  // Fix 4: back link restores the page the user was on
  $(document).on('click', 'a[data-page]', function () {
    currentPage = Number($(this).data('page'));
  });

  // cart page qty / remove
  $('#cart-items').on('click', 'button', function () {
    const id   = Number($(this).data('id'));
    if (!id) return;

    const cart = Cart.get();
    const item = cart.find(i => i.id === id);

    if ($(this).hasClass('increase')) {
      item.quantity += 1;
    } else if ($(this).hasClass('decrease')) {
      item.quantity -= 1;
      if (item.quantity <= 0) { Cart.remove(id); renderCartPage(); return; }
    } else if ($(this).hasClass('remove-btn')) {
      Cart.remove(id); renderCartPage(); return;
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    Cart.updateBadge();
    renderCartPage();
  });
});
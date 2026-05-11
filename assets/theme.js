/* =============================================================================
   FOUNDRY — Theme JavaScript
   assets/theme.js

   Load order: deferred, runs after DOM is parsed
   Architecture:
     - Pub/sub for component communication
     - Web Components for interactive UI
     - No frameworks, no build step required
   ============================================================================= */


/* -----------------------------------------------------------------------------
   1. PUB/SUB
   A minimal publish/subscribe event bus.

   Usage:
     // Subscribe
     const unsubscribe = subscribe('cart:updated', (payload) => {
       console.log(payload.itemCount);
     });

     // Publish
     publish('cart:updated', { itemCount: 3 });

     // Unsubscribe when done
     unsubscribe();
----------------------------------------------------------------------------- */

const subscribers = {};

function subscribe(topic, callback) {
  if (!subscribers[topic]) {
    subscribers[topic] = [];
  }

  subscribers[topic].push(callback);

  return function unsubscribe() {
    subscribers[topic] = subscribers[topic].filter(fn => fn !== callback);
  };
}

function publish(topic, data = {}) {
  if (!subscribers[topic]) return;
  subscribers[topic].forEach(callback => callback(data));
}

window.Foundry = window.Foundry || {};
window.Foundry.subscribe = subscribe;
window.Foundry.publish = publish;


/* -----------------------------------------------------------------------------
   2. UTILITY FUNCTIONS
----------------------------------------------------------------------------- */

/**
 * Trap focus inside an element (for modals, drawers).
 * Call removeTrapFocus() to release.
 */
function trapFocus(element) {
  const focusable = element.querySelectorAll(
    'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
  );

  if (!focusable.length) return;

  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  function handleKeydown(e) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  element.addEventListener('keydown', handleKeydown);
  element._removeTrapFocus = () => element.removeEventListener('keydown', handleKeydown);

  first.focus();
}

function removeTrapFocus(element) {
  if (element._removeTrapFocus) {
    element._removeTrapFocus();
    delete element._removeTrapFocus;
  }
}

window.Foundry.trapFocus = trapFocus;
window.Foundry.removeTrapFocus = removeTrapFocus;


/**
 * Debounce — delays a function until after a pause in calls.
 * Useful for resize and scroll handlers.
 *
 * Usage:
 *   window.addEventListener('resize', debounce(() => { ... }, 200));
 */
function debounce(fn, delay = 200) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

window.Foundry.debounce = debounce;


/**
 * Fetch wrapper with JSON parsing and basic error handling.
 *
 * Usage:
 *   const data = await fetchJSON('/cart.js');
 */
async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Foundry fetchJSON: ${response.status} ${response.statusText} — ${url}`);
  }

  return response.json();
}

window.Foundry.fetchJSON = fetchJSON;


/* -----------------------------------------------------------------------------
   3. WEB COMPONENTS — Base patterns

   Foundry uses native Web Components (Custom Elements) for interactive UI.
   Each component is a class that extends HTMLElement and is registered
   with customElements.define().

   Example usage in Liquid:
     <foundry-disclosure>
       <button type="button">Toggle</button>
       <div>Content</div>
     </foundry-disclosure>
----------------------------------------------------------------------------- */

/**
 * FoundryDisclosure
 * A generic show/hide toggle component.
 * Powers accordions, FAQs, expandable content.
 *
 * Attributes:
 *   open — add to start open
 *
 * Usage:
 *   <foundry-disclosure>
 *     <button type="button" aria-expanded="false">Toggle</button>
 *     <div hidden>Content</div>
 *   </foundry-disclosure>
 */
class FoundryDisclosure extends HTMLElement {
  connectedCallback() {
    this.button  = this.querySelector('button');
    this.content = this.querySelector('[hidden], [data-content]');

    if (!this.button || !this.content) return;

    this.button.addEventListener('click', () => this.toggle());

    if (this.hasAttribute('open')) {
      this.open();
    }
  }

  open() {
    this.content.removeAttribute('hidden');
    this.button.setAttribute('aria-expanded', 'true');
    this.setAttribute('open', '');
  }

  close() {
    this.content.setAttribute('hidden', '');
    this.button.setAttribute('aria-expanded', 'false');
    this.removeAttribute('open');
  }

  toggle() {
    this.hasAttribute('open') ? this.close() : this.open();
  }
}

customElements.define('foundry-disclosure', FoundryDisclosure);


/* -----------------------------------------------------------------------------
   4. PRODUCT FORM
   Handles variant selection, image gallery, and quantity stepper
   on the product page.

   Depends on:
     - #product-json-{sectionId}  embedded in sections/product.liquid
     - window.Foundry.strings     set in layout/theme.liquid
     - Publishes: 'variant:changed' — subscribe in cart drawer etc.
----------------------------------------------------------------------------- */

class ProductForm extends HTMLElement {
  connectedCallback() {
    // ── Refs ──────────────────────────────────────────────────
    this.form          = this.querySelector('#product-form');
    this.variantInput  = this.querySelector('[data-variant-id]');
    this.priceWrap     = this.querySelector('#product-price');
    this.addToCartBtn  = this.querySelector('[data-add-to-cart]');
    this.addToCartText = this.querySelector('[data-add-to-cart-text]');
    this.featuredImg   = document.querySelector('#product-featured-image');
    this.thumbnails    = this.querySelectorAll('.product__thumbnail');

    // ── Parse product JSON ────────────────────────────────────
    const sectionId  = this.form?.dataset.sectionId;
    const dataScript = document.querySelector(`#product-json-${sectionId}`);

    if (!dataScript) return;

    try {
      this.productData = JSON.parse(dataScript.textContent);
      this.variants    = this.productData.variants;
    } catch (e) {
      console.error('[Foundry] Failed to parse product JSON', e);
      return;
    }

    // ── Bind events ───────────────────────────────────────────
    this.bindVariantPicker();
    this.bindThumbnails();
    this.bindQuantityStepper();
  }

  // ─────────────────────────────────────────────────────────────
  // Variant picker
  // ─────────────────────────────────────────────────────────────

  bindVariantPicker() {
    const radios = this.querySelectorAll('.product__option-value input[type="radio"]');
    if (!radios.length) return;

    radios.forEach(radio => {
      radio.addEventListener('change', () => this.onVariantChange());
    });
  }

  /**
   * Read the currently selected option values, find the matching
   * variant, then update all dependent UI.
   */
  onVariantChange() {
    const selectedOptions = this.getSelectedOptions();
    const variant         = this.findVariant(selectedOptions);

    if (!variant) return;

    this.currentVariant = variant;
    this.updateVariantInput(variant);
    this.updatePrice(variant);
    this.updateAddToCart(variant);
    this.updateFeaturedImage(variant);

    // Publish for any other components that care (e.g. a cart drawer)
    Foundry.publish('variant:changed', { variant, form: this.form });
  }

  /**
   * Returns an array of the currently selected option values,
   * in option position order [option1, option2, option3].
   */
  getSelectedOptions() {
    const options = {};

    this.querySelectorAll('.product__option-value input[type="radio"]:checked')
      .forEach(radio => {
        options[radio.dataset.optionPosition] = radio.value;
      });

    // Return as ordered array: position 1, 2, 3
    return Object.keys(options)
      .sort()
      .map(pos => options[pos]);
  }

  /**
   * Find the variant whose options array matches selectedOptions.
   */
  findVariant(selectedOptions) {
    return this.variants.find(variant =>
      selectedOptions.every(
        (val, index) => variant[`option${index + 1}`] === val
      )
    );
  }

  updateVariantInput(variant) {
    if (this.variantInput) {
      this.variantInput.value = variant.id;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Price
  // ─────────────────────────────────────────────────────────────

  updatePrice(variant) {
    if (!this.priceWrap) return;

    const price        = this.formatMoney(variant.price);
    const comparePrice = variant.compare_at_price;
    const available    = variant.available;

    let html = '';

    if (comparePrice && comparePrice > variant.price) {
      html += `<span class="product__price product__price--sale">${price}</span>`;
      html += `<s class="product__price product__price--compare">${this.formatMoney(comparePrice)}</s>`;
      html += `<span class="product__badge product__badge--sale">${window.Foundry.strings?.on_sale ?? 'Sale'}</span>`;
    } else {
      html += `<span class="product__price">${price}</span>`;
    }

    if (!available) {
      html += `<span class="product__badge product__badge--sold-out">${window.Foundry.strings?.sold_out ?? 'Sold out'}</span>`;
    }

    this.priceWrap.innerHTML = html;
  }

  /**
   * Shopify stores prices as integers in the smallest currency unit
   * (cents). This converts to a formatted string.
   * Prefers window.Shopify.formatMoney if available (respects the
   * store's money format setting), falls back to a plain dollar string.
   */
  formatMoney(cents) {
    if (window.Shopify?.formatMoney) {
      return window.Shopify.formatMoney(cents, window.Shopify.money_format);
    }
    return '$' + (cents / 100).toFixed(2);
  }

  // ─────────────────────────────────────────────────────────────
  // Add to cart button
  // ─────────────────────────────────────────────────────────────

  updateAddToCart(variant) {
    if (!this.addToCartBtn || !this.addToCartText) return;

    if (variant.available) {
      this.addToCartBtn.disabled     = false;
      this.addToCartText.textContent = window.Foundry.strings?.add_to_cart ?? 'Add to cart';
    } else {
      this.addToCartBtn.disabled     = true;
      this.addToCartText.textContent = window.Foundry.strings?.sold_out ?? 'Sold out';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Featured image
  // ─────────────────────────────────────────────────────────────

  updateFeaturedImage(variant) {
    if (!variant.featured_image || !this.featuredImg) return;

    // Shopify gives us the image src on the variant object —
    // append a size suffix to request the 900px wide version
    const newSrc = variant.featured_image.src
      .replace(/(\.[^.]+)$/, '_900x$1');

    this.featuredImg.src = newSrc;
    this.featuredImg.alt = variant.featured_image.alt ?? '';

    // Sync thumbnail active state to match the new featured image
    const baseSrc = variant.featured_image.src.split('?')[0];
    const baseKey = baseSrc.substring(0, baseSrc.lastIndexOf('.'));

    this.thumbnails.forEach(thumb => {
      thumb.classList.toggle(
        'is-active',
        thumb.dataset.imageSrc.includes(baseKey)
      );
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Thumbnail gallery
  // ─────────────────────────────────────────────────────────────

  bindThumbnails() {
    if (!this.thumbnails.length) return;

    this.thumbnails.forEach(thumb => {
      thumb.addEventListener('click', () => this.onThumbnailClick(thumb));
    });
  }

  onThumbnailClick(thumb) {
    if (!this.featuredImg) return;

    // Swap main image
    this.featuredImg.src = thumb.dataset.imageSrc;
    this.featuredImg.alt = thumb.dataset.imageAlt;

    // Update active state
    this.thumbnails.forEach(t => t.classList.remove('is-active'));
    thumb.classList.add('is-active');
  }

  // ─────────────────────────────────────────────────────────────
  // Quantity stepper
  // ─────────────────────────────────────────────────────────────

  bindQuantityStepper() {
    const minusBtn = this.querySelector('[data-quantity-minus]');
    const plusBtn  = this.querySelector('[data-quantity-plus]');
    const input    = this.querySelector('.quantity-input__field');

    if (!minusBtn || !plusBtn || !input) return;

    minusBtn.addEventListener('click', () => {
      const current = parseInt(input.value, 10);
      const min     = parseInt(input.min, 10) || 1;
      if (current > min) {
        input.value = current - 1;
      }
    });

    plusBtn.addEventListener('click', () => {
      const current = parseInt(input.value, 10);
      const max     = parseInt(input.max, 10);
      if (!max || current < max) {
        input.value = current + 1;
      }
    });
  }
}

customElements.define('product-form', ProductForm);


/* -----------------------------------------------------------------------------
   5. CART HELPERS
   Thin wrappers around Shopify's Cart API endpoints.
   These publish pub/sub events so any component can react to cart changes.
----------------------------------------------------------------------------- */

const Cart = {
  async add(items) {
    const data = await fetchJSON(window.routes.cart_add_url, {
      method: 'POST',
      body: JSON.stringify({ items })
    });
    publish('cart:item-added', data);
    await Cart.refresh();
    return data;
  },

  async change(payload) {
    const data = await fetchJSON(window.routes.cart_change_url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    publish('cart:changed', data);
    return data;
  },

  async get() {
    return fetchJSON(window.routes.cart_url + '.js');
  },

  async refresh() {
    const cart = await Cart.get();
    publish('cart:updated', { cart });
    return cart;
  }
};

window.Foundry.Cart = Cart;


/* -----------------------------------------------------------------------------
   6. INIT
   Anything that should run on every page load.
----------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {

  // Animate elements into view as they enter the viewport
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-animate]').forEach(el => {
      if (prefersReduced) {
        el.classList.add('is-visible');
      } else {
        observer.observe(el);
      }
    });
  }

});
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
   4. CART HELPERS
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
   5. INIT
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

    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
  }

});
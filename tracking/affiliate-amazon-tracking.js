/* Amazon click measurement; no destination URLs, search text or visitor IDs. */
(function () {
  'use strict';
  if (window.__affiliateAmazonTracking) return;
  window.__affiliateAmazonTracking = true;
  var config = {"managed": false, "consent": null, "events": []};
  function allowed() {
    if (navigator.doNotTrack === '1' || window['va-disable']) return false;
    try { if (localStorage.getItem('affiliate-amazon-tracking-disabled') === 'yes') return false; } catch (_) { return false; }
    if (!config.consent) return true;
    try {
      var value = localStorage.getItem(config.consent.key);
      if (config.consent.value) return value === config.consent.value;
      var settings = JSON.parse(value || 'null');
      return Boolean(settings && settings.version === config.consent.version && settings.necessary === true && typeof settings.decidedAt === 'string' && typeof settings.marketing === 'boolean' && typeof settings.externalMedia === 'boolean' && settings.analytics === true && (!config.consent.ageKey || localStorage.getItem(config.consent.ageKey) === 'yes'));
    } catch (_) { return false; }
  }
  function queue() {
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(Array.prototype.slice.call(arguments)); };
  }
  function setup() {
    if (!allowed() || config.managed) return;
    queue();
    if (document.querySelector('script[src*="/_vercel/insights/script.js"]')) return;
    window.va('beforeSend', function (event) {
      if (!allowed()) return null;
      try { var url = new URL(event.url); return Object.assign({}, event, {url: url.origin + url.pathname}); } catch (_) { return null; }
    });
    var script = document.createElement('script');
    script.src = '/_vercel/insights/script.js'; script.defer = true;
    script.dataset.sdkn = 'affiliate-amazon-tracking'; script.dataset.sdkv = '1.0.0';
    document.head.appendChild(script);
  }
  function click(event) {
    if (!allowed() || (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0)) return;
    var target = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
    var link = target && target.closest('a[href]');
    if (!link || link.hasAttribute('download')) return;
    var url; try { url = new URL(link.href, location.href); } catch (_) { return; }
    if (!/^https?:$/.test(url.protocol) || !(/(^|\.)amazon\.(de|com|co\.uk|fr|it|es|nl|pl|se|com\.be|ie|ca|com\.au|co\.jp|in|com\.br|com\.mx|ae|sa|sg|com\.tr)$/.test(url.hostname) || /^(amzn\.to|amzn\.eu)$/.test(url.hostname))) return;
    var match = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i);
    var asin = match ? match[1].toUpperCase() : 'search';
    var placement = link.closest('[data-finder-results],.finder-product,.finder-results,#finder,#finder-results') ? 'finder' : link.closest('[data-comparison],.comparison,#vergleich,#compare') ? 'comparison' : link.closest('article') ? 'article' : link.closest('main') ? 'content' : 'navigation';
    setup();
    queue();
    if (typeof window.va === 'function') window.va('event', {name:'amazon_click',data:{asin:asin,placement:placement}});
  }
  document.addEventListener('click', click, true);
  document.addEventListener('auxclick', click, true);
  window.addEventListener('storage', setup);
  (config.events || []).forEach(function (name) { window.addEventListener(name, setup); });
  document.addEventListener('change', function () { queueMicrotask(setup); });
  setup();
})();

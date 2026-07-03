// Lightweight mockup-data randomizer.
// This ONLY touches illustrative marketing copy (sample deadline counts,
// sample funding-round mentions, sample email counts) inside elements
// tagged with data-mock. It has nothing to do with the simulation engine -
// it does not affect conversion rates, section affinity, or any real
// metric. It exists purely so the feature-preview sections don't show the
// exact same frozen numbers on every single visit, since that reads more
// like a placeholder than a product preview.
//
// Usage: <span data-mock='{"min":1,"max":5}'>2</span>
//        <span data-mock='{"type":"options","options":["Acme","Nova","Vertex"]}'>Acme</span>
window.WP = window.WP || {};

function pickMockValue(spec) {
  if (spec.type === 'options' && Array.isArray(spec.options)) {
    return spec.options[Math.floor(Math.random() * spec.options.length)];
  }
  const min = spec.min !== undefined ? spec.min : 1;
  const max = spec.max !== undefined ? spec.max : 9;
  return Math.floor(min + Math.random() * (max - min + 1));
}

window.WP.mockRandomize = function (root) {
  root = root || document;
  const nodes = root.querySelectorAll('[data-mock]');
  nodes.forEach(function (el) {
    try {
      const spec = JSON.parse(el.getAttribute('data-mock'));
      el.textContent = pickMockValue(spec);
    } catch (e) {
      // malformed spec - leave the original static value in place
    }
  });
};

// Shuffles the DOM order of a container's children on load - unlike
// mockRandomize, nothing is replaced or hidden, every item stays visible,
// only the order changes each visit.
window.WP.shuffleContainer = function (root) {
  root = root || document;
  const containers = root.querySelectorAll('[data-mock-shuffle]');
  containers.forEach(function (container) {
    const children = Array.prototype.slice.call(container.children);
    for (let i = children.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = children[i]; children[i] = children[j]; children[j] = tmp;
    }
    children.forEach(function (child) { container.appendChild(child); });
  });
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    window.WP.mockRandomize(document);
    window.WP.shuffleContainer(document);
  });
}

import '@testing-library/jest-dom/vitest'

// jsdom implements neither of these. Both are standard browser APIs that the
// app relies on for scroll-into-view on palette navigation, so they are stubbed
// rather than the app being bent around the missing implementation.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

if (typeof window.confirm === 'undefined') {
  window.confirm = () => true
}

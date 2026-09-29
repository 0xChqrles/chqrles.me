// CloudFront Function, viewer response, runtime cloudfront-js-2.0.
// Remembers the language of the last page a visitor read, in a cookie the edge
// reads back (directory-urls.js) to send a path with no language to it. Only a
// page in a language sets it (a path that is a folder, or its index.html): not
// a file, not an error. A revisit is answered 304, which counts as reading it.
var LANGS = ['fr', 'en'];
var YEAR = 31536000;

function handler(event) {
  var response = event.response;
  var uri = event.request.uri;
  var lang = uri.split('/')[1];
  var isPage = uri.slice(-1) === '/' || uri.slice(-11) === '/index.html';
  if (LANGS.indexOf(lang) !== -1 && isPage && (response.statusCode === 200 || response.statusCode === 304)) {
    response.cookies = response.cookies || {};
    // Nothing in the page reads it, so HttpOnly; a year, as a preference lasts.
    response.cookies.lang = { value: lang, attributes: 'Path=/; Max-Age=' + YEAR + '; Secure; HttpOnly; SameSite=Lax' };
  }
  return response;
}

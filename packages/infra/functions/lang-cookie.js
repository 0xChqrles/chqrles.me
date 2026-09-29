// CloudFront Function, viewer response, runtime cloudfront-js-2.0.
// Remembers the language of the last page a visitor read, in a cookie the edge
// reads back (directory-urls.js) to send a path with no language to it. Only a
// page in a language sets it: not a file, not an error.
var LANGS = ['fr', 'en'];
var YEAR = 31536000;

function handler(event) {
  var response = event.response;
  var lang = event.request.uri.split('/')[1];
  var type = response.headers['content-type'];
  if (LANGS.indexOf(lang) !== -1 && response.statusCode === 200 && type && type.value.indexOf('text/html') === 0) {
    response.cookies = response.cookies || {};
    // Nothing in the page reads it, so HttpOnly; a year, as a preference lasts.
    response.cookies.lang = { value: lang, attributes: 'Path=/; Max-Age=' + YEAR + '; Secure; HttpOnly; SameSite=Lax' };
  }
  return response;
}

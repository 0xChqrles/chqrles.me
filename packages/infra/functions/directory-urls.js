// CloudFront Function, viewer request, runtime cloudfront-js-2.0.
//
// Every page lives under its language: /<lang>/<slug>/ (LANGS below, kept in
// step with packages/site/src/lib/lang.ts by a test). A path with no language
// is answered with a redirect (302, because it depends on who asks) to the same
// path in the visitor's language: the one they last read (the `lang` cookie,
// set by lang-cookie.js), else the first language of their Accept-Language
// that the site has, else the default.
//
// A page's canonical URL ends in a slash: /<lang>/<slug>/. S3 only holds
// /<lang>/<slug>/index.html, so the canonical form is rewritten to that key and
// the other forms (/<lang>/<slug> and /<lang>/<slug>/index.html) are redirected
// to it. Paths whose last segment has a dot are files (/fr/rss.xml,
// /_astro/x.css) and pass through untouched. The files every language shares
// (SHARED) are served as they are, with no language.
var LANGS = ['fr', 'en'];
var DEFAULT_LANG = 'fr';
var SHARED = /^\/(_astro\/|404\.html$|apple-touch-icon\.png$|favicon\.svg$|robots\.txt$|share\.png$|sitemap\.xml$)/;

function handler(event) {
  var request = event.request;
  // Runs of slashes collapse to one: a redirect to //host/… would leave the site.
  var uri = request.uri.replace(/[\/\\]{2,}/g, '/');
  var isFile = uri.slice(uri.lastIndexOf('/') + 1).indexOf('.') !== -1;

  // The canonical form of the path: no index.html, a slash after a page.
  var path = uri;
  if (path.endsWith('/index.html')) path = path.slice(0, -'index.html'.length);
  else if (!isFile && !path.endsWith('/')) path = path + '/';

  if (LANGS.indexOf(path.split('/')[1]) === -1) {
    if (SHARED.test(path)) {
      request.uri = path.endsWith('/') ? path + 'index.html' : path;
      return request;
    }
    return redirect(302, 'Found', '/' + chooseLang(request) + path, request.querystring);
  }
  if (path !== uri) return redirect(301, 'Moved Permanently', path, request.querystring);
  request.uri = path.endsWith('/') ? path + 'index.html' : path;
  return request;
}

// The visitor's language: what they last read, else what their browser asks for.
function chooseLang(request) {
  var cookie = request.cookies.lang;
  if (cookie && LANGS.indexOf(cookie.value) !== -1) return cookie.value;
  var header = request.headers['accept-language'];
  // A real header is a few dozen characters: the parser never reads more than 256.
  var accepted = header ? parseAcceptLanguage(header.value.slice(0, 256)) : [];
  for (var i = 0; i < accepted.length; i++) {
    if (LANGS.indexOf(accepted[i]) !== -1) return accepted[i];
  }
  return DEFAULT_LANG;
}

// "fr-CH, fr;q=0.9, en;q=0.8, *;q=0.5" → ['fr', 'fr', 'en'], best first, the
// order they came in breaking a tie. A tag stands for its primary language
// (fr-CH is fr). q=0 means "not this one", and * or anything unreadable says nothing.
function parseAcceptLanguage(header) {
  var tags = [];
  var parts = header.split(',');
  for (var i = 0; i < parts.length; i++) {
    var fields = parts[i].split(';');
    var lang = fields[0].trim().toLowerCase().split('-')[0];
    var q = 1;
    for (var j = 1; j < fields.length; j++) {
      var param = fields[j].trim();
      if (param.slice(0, 2).toLowerCase() === 'q=') q = parseFloat(param.slice(2));
    }
    if (/^[a-z]{2,3}$/.test(lang) && q > 0) tags.push({ lang: lang, q: q, order: i });
  }
  tags.sort(function (a, b) {
    return b.q - a.q || a.order - b.order;
  });
  return tags.map(function (tag) {
    return tag.lang;
  });
}

// The query string comes along: a shared link's ?utm_… must reach the page.
// It goes into a header, so a control character, a space or a # in it (whatever
// form the runtime hands it over in) is written as %XX.
function safe(text) {
  return text.replace(/[\x00-\x20\x7f#]/g, function (c) {
    return '%' + ('0' + c.charCodeAt(0).toString(16)).slice(-2);
  });
}

function redirect(statusCode, statusDescription, location, querystring) {
  var pairs = [];
  for (var key in querystring) {
    var values = querystring[key].multiValue || [querystring[key]];
    for (var i = 0; i < values.length; i++) pairs.push(values[i].value === '' ? safe(key) : safe(key) + '=' + safe(values[i].value));
  }
  return {
    statusCode: statusCode,
    statusDescription: statusDescription,
    headers: { location: { value: pairs.length ? location + '?' + pairs.join('&') : location } },
  };
}

// CloudFront Function, viewer request, runtime cloudfront-js-2.0.
//
// A course has one language, so unlike directory-urls.js its paths name none.
//
// A page's canonical URL ends in a slash: /<page>/. S3 only holds
// /<page>/index.html, so the canonical form is rewritten to that key and the
// other forms (/<page> and /<page>/index.html) are redirected to it. Paths whose
// last segment has a dot are files (/math.css, /_astro/x.css) and pass through
// untouched.

function handler(event) {
  var request = event.request;
  // Runs of slashes collapse to one: a redirect to //host/… would leave the site.
  var uri = request.uri.replace(/[\/\\]{2,}/g, '/');
  var isFile = uri.slice(uri.lastIndexOf('/') + 1).indexOf('.') !== -1;

  // The canonical form of the path: no index.html, a slash after a page.
  var path = uri;
  if (path.endsWith('/index.html')) path = path.slice(0, -'index.html'.length);
  else if (!isFile && !path.endsWith('/')) path = path + '/';

  if (path !== uri) return redirect(301, 'Moved Permanently', path, request.querystring);
  request.uri = path.endsWith('/') ? path + 'index.html' : path;
  return request;
}

// safe() and redirect() are directory-urls.js's: a CloudFront Function cannot import.
//
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

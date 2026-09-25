// CloudFront Function, viewer request, runtime cloudfront-js-2.0.
// A post's canonical URL ends in a slash: /<slug>/. S3 only holds
// /<slug>/index.html, so the canonical form is rewritten to that key and the
// other forms (/<slug> and /<slug>/index.html) are redirected to it.
// Paths whose last segment has a dot are files (/rss.xml, /_astro/x.css) and
// pass through untouched.
function handler(event) {
  var request = event.request;
  // Runs of slashes collapse to one: a redirect to //host/… would leave the site.
  var uri = request.uri.replace(/[\/\\]{2,}/g, '/');
  request.uri = uri;

  if (uri.endsWith('/index.html')) {
    return redirect(uri.slice(0, -'index.html'.length));
  }
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }
  if (uri.slice(uri.lastIndexOf('/') + 1).indexOf('.') === -1) {
    return redirect(uri + '/');
  }
  return request;
}

function redirect(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location } },
  };
}

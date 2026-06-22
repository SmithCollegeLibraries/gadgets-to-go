export const DEFAULT_AUTH_URL = 'https://libtools2.smith.edu/gadgets-to-go/backend/admin/authorize.php';

function joinUrlPath(basePath, path) {
  const cleanBase = `/${String(basePath || '/').replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '');
  const cleanPath = `/${String(path || '').replace(/^\/+/, '')}`;
  return `${cleanBase}${cleanPath}` || '/';
}

export function buildAdminReturnUrl(origin, basePath = '/', adminPath = '/admin/smith') {
  return `${origin}${joinUrlPath(basePath, adminPath)}`;
}

export function buildAuthRedirectUrl(authUrl, returnUrl) {
  const targetAuthUrl = authUrl || DEFAULT_AUTH_URL;
  const separator = targetAuthUrl.includes('?') ? '&' : '?';
  return `${targetAuthUrl}${separator}return_url=${encodeURIComponent(returnUrl)}`;
}

export const DEFAULT_AUTH_URL = 'https://libtools2.smith.edu/gadgets-to-go/backend/admin/authorize.php';
export const DEV_AUTH_URL = 'https://libtools2.smith.edu/gadgets-to-go/backend/admin/authorize-dev.php';

function joinUrlPath(basePath, path) {
  const cleanBase = `/${String(basePath || '/').replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '');
  const cleanPath = `/${String(path || '').replace(/^\/+/, '')}`;
  return `${cleanBase}${cleanPath}` || '/';
}

export function buildAdminReturnUrl(origin, basePath = '/', adminPath = '/admin/smith') {
  return `${origin}${joinUrlPath(basePath, adminPath)}`;
}

export function buildAuthRedirectUrl(authUrl, returnUrl) {
  const targetAuthUrl = authUrl || getDefaultAuthUrl(returnUrl);
  const separator = targetAuthUrl.includes('?') ? '&' : '?';

  if (targetAuthUrl.includes('authorize-dev.php')) {
    return `${targetAuthUrl}${separator}port=${getDevPort(returnUrl)}`;
  }

  return `${targetAuthUrl}${separator}return_url=${encodeURIComponent(returnUrl)}`;
}

function getDevPort(returnUrl) {
  try {
    const { port } = new URL(returnUrl);
    if (/^517\d$/.test(port)) return port;
  } catch (error) {
    console.warn('Could not parse auth return URL port:', error);
  }

  return '5173';
}

function getDefaultAuthUrl(returnUrl) {
  try {
    const { hostname } = new URL(returnUrl);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return DEV_AUTH_URL;
  } catch (error) {
    console.warn('Could not parse auth return URL:', error);
  }

  return DEFAULT_AUTH_URL;
}

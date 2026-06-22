import assert from 'node:assert/strict';

import {
  buildAdminReturnUrl,
  buildAuthRedirectUrl,
  DEFAULT_AUTH_URL,
  DEV_AUTH_URL,
} from './authUrls.js';

assert.equal(
  buildAdminReturnUrl('https://localhost:5173', '/gadgets-to-go/', '/admin/smith'),
  'https://localhost:5173/gadgets-to-go/admin/smith',
);

assert.equal(
  buildAdminReturnUrl('https://localhost:5173', '/', '/admin/smith'),
  'https://localhost:5173/admin/smith',
);

assert.equal(
  buildAuthRedirectUrl(undefined, 'https://localhost:5173/gadgets-to-go/admin/smith'),
  `${DEV_AUTH_URL}?return_url=https%3A%2F%2Flocalhost%3A5173%2Fgadgets-to-go%2Fadmin%2Fsmith`,
);

assert.equal(
  buildAuthRedirectUrl(undefined, 'https://127.0.0.1:5173/gadgets-to-go/admin/smith'),
  `${DEV_AUTH_URL}?return_url=https%3A%2F%2F127.0.0.1%3A5173%2Fgadgets-to-go%2Fadmin%2Fsmith`,
);

assert.equal(
  buildAuthRedirectUrl(undefined, 'https://example.edu/gadgets-to-go/admin/smith'),
  `${DEFAULT_AUTH_URL}?return_url=https%3A%2F%2Fexample.edu%2Fgadgets-to-go%2Fadmin%2Fsmith`,
);

assert.equal(
  buildAuthRedirectUrl('http://localhost:8000/admin/authorize-dev.php', 'https://localhost:5173/gadgets-to-go/admin/smith'),
  'http://localhost:8000/admin/authorize-dev.php?return_url=https%3A%2F%2Flocalhost%3A5173%2Fgadgets-to-go%2Fadmin%2Fsmith',
);

console.log('auth URL utilities passed');

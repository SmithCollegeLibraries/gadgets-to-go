<?php

namespace tests\unit\models;

use app\models\FOLIO;
use Codeception\Test\Unit;

class FolioTest extends Unit
{
    public function testExtractsAccessTokenFromLoginWithExpiryCookie()
    {
        $headers = implode("\r\n", [
            'HTTP/2 201',
            'set-cookie: folioRefreshToken=refresh-value; Path=/; HttpOnly',
            'set-cookie: folioAccessToken=access-value; Path=/; HttpOnly',
            '',
        ]);

        $this->assertSame('access-value', FOLIO::extractFolioAccessToken($headers));
    }

    public function testExtractsAccessTokenFromCombinedRedirectHeaders()
    {
        $headers = implode("\r\n", [
            'HTTP/1.1 302 Found',
            'Set-Cookie: other=value; Path=/',
            '',
            'HTTP/2 201',
            'Set-Cookie: folioAccessToken=redirect-access-value; Path=/; HttpOnly',
            '',
        ]);

        $this->assertSame('redirect-access-value', FOLIO::extractFolioAccessToken($headers));
    }

    public function testReturnsFalseWhenAccessTokenCookieIsMissing()
    {
        $headers = implode("\r\n", [
            'HTTP/2 401',
            'set-cookie: folioRefreshToken=refresh-value; Path=/; HttpOnly',
            '',
        ]);

        $this->assertFalse(FOLIO::extractFolioAccessToken($headers));
    }
}

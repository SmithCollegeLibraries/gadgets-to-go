<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

session_unset();
session_destroy();

$frontendBaseUrl = getenv('FRONTEND_BASE_URL') ?: '/';
$shibbolethLogoutUrl = getenv('SHIBBOLETH_LOGOUT_URL') ?: '';

header('Location: ' . ($shibbolethLogoutUrl ?: $frontendBaseUrl));
exit();

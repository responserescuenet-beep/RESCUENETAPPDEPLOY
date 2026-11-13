<?php
/**
 * RescueNet — local dev server router for PHP's built-in server.
 *
 * Mirrors the deployed .htaccess front controller: every /api/* request goes to
 * api/index.php, everything else is served as a static file from the docroot
 * (the front-end). Run from the project root:
 *
 *   php -S 0.0.0.0:3000 -t www php-backend/dev-router.php
 *
 * This file is NOT part of the deployed package.
 */
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($uri === '/maps-key.js') {
    $_SERVER['SCRIPT_NAME'] = '/api/maps-key.php';
    require __DIR__ . '/api/maps-key.php';
    return true;
}

if (preg_match('#^/api(/.*)?$#', $uri)) {
    $_SERVER['SCRIPT_NAME'] = '/api/index.php';
    require __DIR__ . '/api/index.php';
    return true;
}

// Anything else: let the built-in server serve it from the -t docroot.
return false;

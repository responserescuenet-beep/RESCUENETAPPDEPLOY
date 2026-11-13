<?php
/**
 * RescueNet — serves the Google Maps SDK key as a tiny JS file so the key
 * never appears in the pages' HTML source. Routed here from /maps-key.js by
 * .htaccess. Mirrors the /maps-key.js endpoint in server.js.
 *
 * Provide the key via the GOOGLE_MAPS_API_KEY constant in config.php, or by
 * creating maps-config.php next to config.php:
 *     <?php return ['googleMapsApiKey' => 'AIza...'];
 */

require_once __DIR__ . '/config.php';

$key = GOOGLE_MAPS_API_KEY;
$cfgFile = __DIR__ . '/maps-config.php';
if (is_file($cfgFile)) {
    $cfg = @include $cfgFile;
    if (is_array($cfg) && !empty($cfg['googleMapsApiKey'])) $key = (string)$cfg['googleMapsApiKey'];
}

// Only characters a Google Maps key can contain.
$key = preg_replace('/[^A-Za-z0-9_\-]/', '', (string)$key);

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-store');
echo 'window.RN_GOOGLE_MAPS_KEY=' . json_encode($key) . ";\n";

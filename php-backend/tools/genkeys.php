<?php
/**
 * RescueNet — secret generator.
 *
 * Prints the CRYPTO_KEY and HMAC_KEY values to paste into api/config.php.
 * Run once, locally or via your host's PHP CLI:
 *
 *     php tools/genkeys.php
 *
 * CRYPTO_KEY must be the base64 of exactly 32 random bytes (AES-256-GCM).
 * Keep both values secret and identical across every deployment of this DB —
 * changing CRYPTO_KEY makes all previously-encrypted records unreadable.
 */

if (PHP_SAPI !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
}

$cryptoKey = base64_encode(random_bytes(32));
$hmacKey   = bin2hex(random_bytes(48)); // 96 hex chars

echo "Paste these into api/config.php (replace the placeholder defines):\n\n";
echo "define('CRYPTO_KEY', '" . $cryptoKey . "');\n";
echo "define('HMAC_KEY',   '" . $hmacKey . "');\n\n";
echo "Also change:\n";
echo "  - DB_HOST / DB_NAME / DB_USER / DB_PASS  (InfinityFree MySQL details)\n";
echo "  - ADMIN_BOOTSTRAP_PASS                    (initial admin password)\n";
echo "  - EMAIL_FROM, SMS_API_KEY, SMS_API_SECRET (if you want real email/SMS)\n";

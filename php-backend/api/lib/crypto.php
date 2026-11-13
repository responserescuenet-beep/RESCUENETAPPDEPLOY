<?php
/**
 * RescueNet — encryption primitives.
 *
 *  * Record payloads  -> AES-256-GCM (authenticated) via rn_encrypt()/rn_decrypt().
 *  * PII lookups      -> HMAC-SHA256 of a normalised value (rn_lookup_hash()),
 *                        so we can match an email/phone WITHOUT storing it in
 *                        the clear and WITHOUT decrypting the whole table.
 *  * OTP codes        -> SHA-256 of the 6 digits (rn_otp_hash()); the code is
 *                        never persisted in readable form.
 *  * Passwords        -> bcrypt via PHP's password_hash()/password_verify().
 */

require_once __DIR__ . '/../config.php';

/** Decode + validate the 32-byte AES key. Returns raw bytes or null. */
function rn_aes_key() {
    $raw = base64_decode(CRYPTO_KEY, true);
    if ($raw === false || strlen($raw) !== 32) return null;
    return $raw;
}

/** Encrypt a UTF-8 string with AES-256-GCM. Returns base64(iv|tag|cipher) or null. */
function rn_encrypt($plaintext) {
    $key = rn_aes_key();
    if ($key === null) return null;               // mis-configured key
    $iv  = random_bytes(12);
    $tag = '';
    $ct  = openssl_encrypt((string)$plaintext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, '', 16);
    if ($ct === false) return null;
    return base64_encode($iv . $tag . $ct);       // 12 + 16 + N bytes
}

/** Reverse of rn_encrypt(). Returns the plaintext string, or null on failure. */
function rn_decrypt($b64) {
    $key = rn_aes_key();
    if ($key === null) return null;
    $raw = base64_decode((string)$b64, true);
    if ($raw === false || strlen($raw) < 29) return null;
    $iv  = substr($raw, 0, 12);
    $tag = substr($raw, 12, 16);
    $ct  = substr($raw, 28);
    $pt  = openssl_decrypt($ct, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    return $pt === false ? null : $pt;
}

/** Encrypt an associative array as JSON. */
function rn_encrypt_json($array) {
    return rn_encrypt(json_encode($array, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

/** Decrypt to an associative array (empty array if anything is wrong). */
function rn_decrypt_json($b64) {
    $pt = rn_decrypt($b64);
    if ($pt === null) return [];
    $obj = json_decode($pt, true);
    return is_array($obj) ? $obj : [];
}

/** Normalise a value before hashing so matching is stable across formatting. */
function rn_normalize_lookup($value) {
    $v = strtolower(trim((string)$value));
    // Phones: keep digits only. Emails/names: collapse whitespace.
    if (strpos($v, '@') === false) {
        $digits = preg_replace('/\D+/', '', $v);
        if ($digits !== '' && strlen($digits) >= 7) return $digits;
        $v = preg_replace('/\s+/', ' ', $v);
    }
    return $v;
}

/** Deterministic, keyed hash used for indexed PII lookups. */
function rn_lookup_hash($value) {
    return hash_hmac('sha256', rn_normalize_lookup($value), HMAC_KEY);
}

/** SHA-256 of an OTP code (digits only). */
function rn_otp_hash($code) {
    return hash('sha256', preg_replace('/\D+/', '', (string)$code));
}

/** bcrypt hash of a password. */
function rn_password_hash($password) {
    return password_hash((string)$password, PASSWORD_BCRYPT);
}

/** Constant-time password check against a stored bcrypt hash. */
function rn_password_verify($password, $hash) {
    if (!$hash) return false;
    return password_verify((string)$password, $hash);
}

/** Cryptographically strong 6-digit OTP. */
function rn_generate_otp() {
    return (string)random_int(100000, 999999);
}

/** Opaque 256-bit session token (hex). */
function rn_new_token() {
    return bin2hex(random_bytes(32));
}

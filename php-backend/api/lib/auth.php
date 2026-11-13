<?php
/**
 * RescueNet — credentials + login sessions.
 *
 * Passwords live ONLY in the `credentials` table as bcrypt hashes; nothing
 * else in the system stores a password. Successful logins mint an opaque
 * session token (see the `sessions` table) which the clients send back as
 * `Authorization: Bearer <token>`.
 *
 * The Node build had no real authentication (the admin login was a no-op
 * redirect). This module introduces it for the PHP build.
 */

require_once __DIR__ . '/db.php';        // pulls in config.php + crypto.php

/* ---- Credentials ----------------------------------------------------------*/

function rn_set_credential($type, $id, $password) {
    $now  = rn_now_iso();
    $hash = rn_password_hash($password);
    $sql  = 'INSERT INTO credentials (principal_type, principal_id, password_hash, created_at, updated_at)
             VALUES (?,?,?,?,?)
             ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), updated_at=VALUES(updated_at)';
    rn_pdo()->prepare($sql)->execute([$type, (string)$id, $hash, $now, $now]);
}

function rn_get_credential($type, $id) {
    $st = rn_pdo()->prepare('SELECT password_hash FROM credentials WHERE principal_type=? AND principal_id=? LIMIT 1');
    $st->execute([$type, (string)$id]);
    $row = $st->fetch();
    return $row ? (string)$row['password_hash'] : null;
}

function rn_has_credential($type, $id) {
    return rn_get_credential($type, $id) !== null;
}

/** Verify a password; returns true on match. */
function rn_check_credential($type, $id, $password) {
    $hash = rn_get_credential($type, $id);
    return $hash !== null && rn_password_verify($password, $hash);
}

/* ---- Sessions -------------------------------------------------------------*/

function rn_create_session($type, $id) {
    $token = rn_new_token();
    $now   = (int)round(microtime(true) * 1000);
    $exp   = $now + (int)SESSION_TTL_MS;
    rn_pdo()->prepare('INSERT INTO sessions (token, principal_type, principal_id, created_at, expires_at) VALUES (?,?,?,?,?)')
        ->execute([$token, $type, (string)$id, $now, $exp]);
    return ['token' => $token, 'expiresAt' => $exp];
}

function rn_session($token) {
    if (!$token) return null;
    $st = rn_pdo()->prepare('SELECT principal_type, principal_id, expires_at FROM sessions WHERE token=? LIMIT 1');
    $st->execute([$token]);
    $row = $st->fetch();
    if (!$row) return null;
    if ((int)$row['expires_at'] < (int)round(microtime(true) * 1000)) {
        rn_destroy_session($token);
        return null;
    }
    return ['type' => $row['principal_type'], 'id' => $row['principal_id'], 'expiresAt' => (int)$row['expires_at']];
}

function rn_destroy_session($token) {
    if (!$token) return;
    rn_pdo()->prepare('DELETE FROM sessions WHERE token=?')->execute([$token]);
}

/** Bearer token from the request headers (or ?token= / JSON body fallback). */
function rn_bearer_token() {
    $hdr = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) $hdr = $_SERVER['HTTP_AUTHORIZATION'];
    elseif (function_exists('apache_request_headers')) {
        $h = apache_request_headers();
        foreach ($h as $k => $v) { if (strcasecmp($k, 'Authorization') === 0) { $hdr = $v; break; } }
    }
    if ($hdr && preg_match('/Bearer\s+(.+)/i', $hdr, $m)) return trim($m[1]);
    if (!empty($_GET['token'])) return (string)$_GET['token'];
    return '';
}

/* ---- Admin seeding --------------------------------------------------------*/

/** Create the admin credential on first use.
 *  The email admin signs in with ADMIN_EMAIL/ADMIN_PASSWORD; falls back to the
 *  bootstrap password only when ADMIN_PASSWORD is blank. */
function rn_ensure_admin() {
    if (!rn_has_credential('admin', ADMIN_ID)) {
        $pass = (defined('ADMIN_PASSWORD') && ADMIN_PASSWORD !== '') ? ADMIN_PASSWORD : ADMIN_BOOTSTRAP_PASS;
        rn_set_credential('admin', ADMIN_ID, $pass);
    }
}

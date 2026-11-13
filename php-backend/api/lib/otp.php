<?php
/**
 * RescueNet — OTP store.
 *
 * Codes are stored HASHED (sha256 of the digits) in the shared `otp_store`
 * table so a DB dump never reveals a live code. Mirrors the Node OTP store,
 * including the resend cooldown, attempt cap and 2-minute TTL.
 */

require_once __DIR__ . '/db.php';        // config.php + crypto.php

function rn_otp_key($email, $phone) {
    $email = strtolower(trim((string)$email));
    if ($email !== '' && preg_match(RN_EMAIL_RE, $email)) return $email;
    return $phone ? 'phone:' . $phone : null;
}

function rn_otp_put($key, $code, $phone = null) {
    $now = (int)round(microtime(true) * 1000);
    $sql = 'INSERT INTO otp_store (otp_key, code_hash, expires_at, attempts, last_sent_at, phone)
            VALUES (?,?,?,0,?,?)
            ON DUPLICATE KEY UPDATE code_hash=VALUES(code_hash), expires_at=VALUES(expires_at),
              attempts=0, last_sent_at=VALUES(last_sent_at), phone=VALUES(phone)';
    rn_pdo()->prepare($sql)->execute([
        $key,
        rn_otp_hash($code),
        $now + (int)OTP_TTL_MS,
        $now,
        $phone,
    ]);
}

function rn_otp_get($key) {
    if (!$key) return null;
    $st = rn_pdo()->prepare('SELECT * FROM otp_store WHERE otp_key=? LIMIT 1');
    $st->execute([$key]);
    $row = $st->fetch();
    return $row ?: null;
}

function rn_otp_bump_attempts($key) {
    rn_pdo()->prepare('UPDATE otp_store SET attempts = attempts + 1 WHERE otp_key=?')->execute([$key]);
}

function rn_otp_delete($key) {
    if (!$key) return;
    rn_pdo()->prepare('DELETE FROM otp_store WHERE otp_key=?')->execute([$key]);
}

/** Housekeeping — drop expired rows (called opportunistically). */
function rn_otp_sweep() {
    $now = (int)round(microtime(true) * 1000);
    rn_pdo()->prepare('DELETE FROM otp_store WHERE expires_at < ?')->execute([$now]);
}

<?php
/**
 * RescueNet — database connection + shared helpers.
 * Thin PDO layer plus the entity read/write helpers used by the API router.
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/crypto.php';

/** Shared PDO handle (lazily created). */
function rn_pdo() {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (Throwable $e) {
        rn_json_out(['ok' => false, 'error' => 'Database connection failed'], 500);
    }
    return $pdo;
}

/* ---- HTTP helpers --------------------------------------------------------*/

function rn_json_out($data, $status = 200) {
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Cache-Control headers so no client (or proxy) caches API responses. */
function rn_no_cache_headers() {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
}

/** Raw request body as a string (handles chunked/streamed uploads). */
function rn_raw_body() {
    $body = file_get_contents('php://input');
    return $body === false ? '' : $body;
}

/** Decoded JSON body as an associative array (empty array if invalid). */
function rn_input() {
    $raw = rn_raw_body();
    if ($raw === '') return [];
    $obj = json_decode($raw, true);
    return is_array($obj) ? $obj : [];
}

function rn_now_iso() {
    return gmdate('Y-m-d\TH:i:s\Z');
}

function rn_method() {
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

/* ---- Realtime ------------------------------------------------------------*/

/** Append an event to the log that /api/longpoll + /api/events read from. */
function rn_broadcast($type, $data) {
    try {
        $st = rn_pdo()->prepare('INSERT INTO events (type, data, ts) VALUES (?, ?, ?)');
        $st->execute([$type, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), (int)round(microtime(true) * 1000)]);
        // Trim old rows so the table does not grow forever.
        $pdo = rn_pdo();
        $max = (int)$pdo->query('SELECT COALESCE(MAX(id),0) FROM events')->fetchColumn();
        if ($max > EVENT_BUFFER_MAX) {
            $pdo->exec('DELETE FROM events WHERE id <= ' . ($max - EVENT_BUFFER_MAX));
        }
    } catch (Throwable $e) { /* realtime is best-effort */ }
}

/** Fetch events with id > $since (ascending). */
function rn_events_since($since) {
    $st = rn_pdo()->prepare('SELECT id, type, data, ts FROM events WHERE id > ? ORDER BY id ASC LIMIT ' . (int)EVENT_BUFFER_MAX);
    $st->execute([(int)$since]);
    $out = [];
    foreach ($st->fetchAll() as $row) {
        $out[] = [
            'id'   => (int)$row['id'],
            'type' => $row['type'],
            'data' => json_decode($row['data'], true),
            'ts'   => (int)$row['ts'],
        ];
    }
    return $out;
}

/* ---- Generic encrypted entity store --------------------------------------*/

/**
 * Read every row of an entity table and return the decrypted JSON records.
 * $table is a fixed whitelist name; callers never pass user input here.
 */
function rn_all($table) {
    $st = rn_pdo()->query('SELECT data FROM ' . rn_table($table) . ' ORDER BY ' . rn_order_column($table) . ' DESC');
    $out = [];
    foreach ($st->fetchAll() as $row) {
        $rec = rn_decrypt_json($row['data']);
        if ($rec) $out[] = $rec;
    }
    return $out;
}

/** Allowed entity tables (guards against SQL injection via table name). */
function rn_table($name) {
    static $ok = ['alerts', 'reports', 'residents', 'assignments', 'households', 'announcements', 'resources', 'responders'];
    if (!in_array($name, $ok, true)) rn_json_out(['ok' => false, 'error' => 'bad table'], 500);
    return $name;
}

function rn_order_column($table) {
    switch ($table) {
        case 'alerts':
        case 'reports':       return 'created_at';
        case 'announcements': return 'created_at';
        case 'resources':     return 'updated_at';
        case 'households':    return 'updated_at';
        case 'assignments':   return 'updated_at';
        case 'residents':     return 'created_at';
        case 'responders':    return 'created_at';
        default:              return 'id';
    }
}

/**
 * Insert or update one record. $record is the full JSON payload; $columns holds
 * the extra indexed values (status, *_hash, lat, lng, timestamps ...). The
 * payload itself is encrypted before it touches disk.
 */
function rn_upsert($table, $id, $record, array $columns = []) {
    $table = rn_table($table);
    $enc   = rn_encrypt_json($record);
    if ($enc === null) rn_json_out(['ok' => false, 'error' => 'Encryption key not configured'], 500);

    $cols = array_merge(['id' => $id, 'data' => $enc], $columns);
    $names = array_keys($cols);
    $place = implode(',', array_fill(0, count($names), '?'));
    $upd   = [];
    foreach ($names as $n) { if ($n !== 'id') $upd[] = "$n=VALUES($n)"; }
    $sql = 'INSERT INTO ' . $table . ' (' . implode(',', $names) . ') VALUES (' . $place . ')'
         . ' ON DUPLICATE KEY UPDATE ' . implode(',', $upd);
    rn_pdo()->prepare($sql)->execute(array_values($cols));
}

/** Delete one row by primary key. */
function rn_delete($table, $id) {
    $table = rn_table($table);
    rn_pdo()->prepare('DELETE FROM ' . $table . ' WHERE id = ?')->execute([$id]);
}

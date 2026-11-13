<?php
/**
 * RescueNet — entity persistence + dispatch domain logic.
 *
 * Mirrors the behaviour of the Node backend's readStore()/writeStore() layer,
 * but stores every record in the shared MySQL database with the payload
 * encrypted (see db.php rn_upsert / crypto.php rn_encrypt_json).
 *
 * Each "save" helper supplies the indexed plaintext columns the schema keeps
 * next to the encrypted payload so the server can sort/filter without
 * decrypting the whole table.
 */

require_once __DIR__ . '/db.php';

/* ---- Column builders ------------------------------------------------------*/

function rn_save_alert(array $a) {
    rn_upsert('alerts', (string)$a['id'], $a, [
        'status'      => isset($a['status']) ? (string)$a['status'] : null,
        'resolved_at' => isset($a['resolvedAt']) ? (string)$a['resolvedAt'] : null,
        'created_at'  => isset($a['createdAt']) ? (string)$a['createdAt'] : null,
        'updated_at'  => isset($a['updatedAt']) ? (string)$a['updatedAt'] : null,
        'latitude'    => (isset($a['latitude'])  && $a['latitude']  !== '') ? (float)$a['latitude']  : null,
        'longitude'   => (isset($a['longitude']) && $a['longitude'] !== '') ? (float)$a['longitude'] : null,
    ]);
}

function rn_save_report(array $r) {
    rn_upsert('reports', (string)$r['id'], $r, [
        'status'      => isset($r['status']) ? (string)$r['status'] : null,
        'resolved_at' => isset($r['resolvedAt']) ? (string)$r['resolvedAt'] : null,
        'created_at'  => isset($r['createdAt']) ? (string)$r['createdAt'] : null,
    ]);
}

function rn_save_resident(array $res) {
    $name = trim(((string)($res['firstName'] ?? '')) . ' ' . ((string)($res['lastName'] ?? '')));
    if ($name === '') $name = (string)($res['name'] ?? '');
    rn_upsert('residents', (string)$res['id'], $res, [
        'status'     => isset($res['status']) ? (string)$res['status'] : null,
        'name'       => $name !== '' ? $name : null,
        'email_hash' => !empty($res['email']) ? rn_lookup_hash($res['email']) : null,
        'phone_hash' => !empty($res['phone']) ? rn_lookup_hash($res['phone']) : null,
        'created_at' => isset($res['registeredAt']) ? (string)$res['registeredAt'] : (isset($res['createdAt']) ? (string)$res['createdAt'] : null),
    ]);
}

function rn_assignment_key($caseId, $responderId) {
    return (string)$caseId . '|' . (string)$responderId;
}

function rn_save_assignment(array $a) {
    $id = rn_assignment_key($a['caseId'] ?? '', $a['responderId'] ?? '');
    rn_upsert('assignments', $id, $a, [
        'case_id'      => (string)($a['caseId'] ?? ''),
        'responder_id' => (string)($a['responderId'] ?? ''),
        'status'       => isset($a['status']) ? (string)$a['status'] : null,
        'closed_at'    => isset($a['closedAt']) ? (string)$a['closedAt'] : null,
        'updated_at'   => isset($a['updatedAt']) ? (string)$a['updatedAt'] : null,
    ]);
}

function rn_save_household(array $h) {
    rn_upsert('households', (string)$h['id'], $h, [
        'status'     => isset($h['status']) ? (string)$h['status'] : null,
        'kind'       => isset($h['kind']) ? (string)$h['kind'] : null,
        'latitude'   => (isset($h['latitude'])  && $h['latitude']  !== '') ? (float)$h['latitude']  : null,
        'longitude'  => (isset($h['longitude']) && $h['longitude'] !== '') ? (float)$h['longitude'] : null,
        'updated_at' => isset($h['updatedAt']) ? (string)$h['updatedAt'] : null,
    ]);
}

function rn_save_announcement(array $a) {
    rn_upsert('announcements', (string)$a['id'], $a, [
        'created_at' => isset($a['createdAt']) ? (string)$a['createdAt'] : (isset($a['publishedAt']) ? (string)$a['publishedAt'] : null),
    ]);
}

function rn_save_resource(array $r) {
    rn_upsert('resources', (string)$r['id'], $r, [
        'updated_at' => isset($r['updatedAt']) ? (string)$r['updatedAt'] : null,
    ]);
}

function rn_save_responder(array $r) {
    $norm = strtolower(trim(preg_replace('/\s+/', ' ', (string)($r['name'] ?? ''))));
    rn_upsert('responders', (string)$r['id'], $r, [
        'name'       => isset($r['name']) ? (string)$r['name'] : null,
        'name_norm'  => $norm !== '' ? $norm : null,
        'phone_hash' => !empty($r['phone']) ? rn_lookup_hash($r['phone']) : null,
        'status'     => isset($r['status']) ? (string)$r['status'] : null,
        'latitude'   => (isset($r['lat']) && $r['lat'] !== '') ? (float)$r['lat'] : null,
        'longitude'  => (isset($r['lng']) && $r['lng'] !== '') ? (float)$r['lng'] : null,
        'created_at' => isset($r['createdAt']) ? (string)$r['createdAt'] : null,
    ]);
}

/** Fetch one record of a single-id table by primary key (or null). */
function rn_one($table, $id) {
    $st = rn_pdo()->prepare('SELECT data FROM ' . rn_table($table) . ' WHERE id = ? LIMIT 1');
    $st->execute([(string)$id]);
    $row = $st->fetch();
    return $row ? rn_decrypt_json($row['data']) : null;
}

/** Persist one already-decrypted record into its table (table name dispatcher). */
function rn_save_entity($table, array $rec) {
    switch ($table) {
        case 'alerts':        rn_save_alert($rec);        break;
        case 'reports':       rn_save_report($rec);       break;
        case 'residents':     rn_save_resident($rec);     break;
        case 'assignments':   rn_save_assignment($rec);   break;
        case 'households':    rn_save_household($rec);    break;
        case 'announcements': rn_save_announcement($rec); break;
        case 'resources':     rn_save_resource($rec);     break;
        case 'responders':    rn_save_responder($rec);    break;
    }
}

/** Wipe a table and re-insert the supplied records (POST /api/sync). */
function rn_replace_all($table, array $records) {
    $table = rn_table($table);
    rn_pdo()->exec('DELETE FROM ' . $table);
    foreach ($records as $rec) {
        if (!is_array($rec)) continue;
        if ($table === 'assignments') {
            if (empty($rec['caseId'])) continue;
            rn_save_assignment($rec);
        } else {
            if (empty($rec['id'])) continue;
            rn_save_entity($table, $rec);
        }
    }
}

/* ---- Live responder GPS ---------------------------------------------------
 * Primary key is `responder_id` (not `id`), so this cannot reuse rn_upsert().
 */
function rn_save_location($responderId, array $loc) {
    $sql = 'INSERT INTO responder_locations (responder_id, data, latitude, longitude, status, updated_at)
            VALUES (?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE data=VALUES(data), latitude=VALUES(latitude),
              longitude=VALUES(longitude), status=VALUES(status), updated_at=VALUES(updated_at)';
    rn_pdo()->prepare($sql)->execute([
        (string)$responderId,
        rn_encrypt_json($loc),
        isset($loc['lat']) && $loc['lat'] !== '' ? (float)$loc['lat'] : null,
        isset($loc['lng']) && $loc['lng'] !== '' ? (float)$loc['lng'] : null,
        isset($loc['status']) ? (string)$loc['status'] : null,
        isset($loc['updatedAt']) ? (string)$loc['updatedAt'] : null,
    ]);
}

function rn_load_locations() {
    $out = [];
    foreach (rn_pdo()->query('SELECT responder_id, data FROM responder_locations')->fetchAll() as $row) {
        $rec = rn_decrypt_json($row['data']);
        if ($rec) $out[(string)$row['responder_id']] = $rec;
    }
    return $out;
}

/* ---- Full state snapshot (GET /api/sync) ---------------------------------*/
function rn_full_store() {
    return [
        'alerts'             => rn_all('alerts'),
        'reports'            => rn_all('reports'),
        'residents'          => rn_all('residents'),
        'assignments'        => rn_all('assignments'),
        'households'         => rn_all('households'),
        'announcements'      => rn_all('announcements'),
        'resources'          => rn_all('resources'),
        'responderLocations' => (object)rn_load_locations(),
        'responders'         => rn_all('responders'),
    ];
}

/* ---- Dispatch logic (ported from server.js) ------------------------------*/

function rn_distance_meters($fromLat, $fromLng, $toLat, $toLng) {
    $rad = function ($v) { return $v * M_PI / 180.0; };
    $latDelta = $rad($toLat - $fromLat);
    $lngDelta = $rad($toLng - $fromLng);
    $h = sin($latDelta / 2) ** 2
       + cos($rad($fromLat)) * cos($rad($toLat)) * sin($lngDelta / 2) ** 2;
    $bounded = min(1.0, max(0.0, $h));
    return 6371000.0 * 2 * atan2(sqrt($bounded), sqrt(1 - $bounded));
}

/**
 * Nearest *available* responder within the 15-minute location freshness
 * window. Mirrors nearestAvailableResponder() in server.js.
 */
function rn_nearest_available_responder(array $alert) {
    if (!isset($alert['latitude']) || $alert['latitude'] === ''
        || !isset($alert['longitude']) || $alert['longitude'] === '') return null;
    $lat = (float)$alert['latitude'];
    $lng = (float)$alert['longitude'];
    if (!is_finite($lat) || $lat < -90 || $lat > 90 || !is_finite($lng) || $lng < -180 || $lng > 180) return null;

    $roster = rn_all('responders');
    $nowMs  = (int)round(microtime(true) * 1000);
    $nearest = null;
    foreach (rn_load_locations() as $responderId => $location) {
        if (!is_array($location)) continue;
        if (!isset($location['lat'], $location['lng']) || $location['lat'] === '' || $location['lng'] === '') continue;
        $updatedAt = strtotime((string)($location['updatedAt'] ?? ''));
        if ($updatedAt === false) continue;
        $updatedMs = $updatedAt * 1000;
        if ($nowMs - $updatedMs > 15 * 60 * 1000 || $updatedMs > $nowMs + 60 * 1000) continue;
        $rLat = (float)$location['lat'];
        $rLng = (float)$location['lng'];
        if (!is_finite($rLat) || $rLat < -90 || $rLat > 90 || !is_finite($rLng) || $rLng < -180 || $rLng > 180) continue;

        $responder = null;
        foreach ($roster as $item) {
            if ((string)($item['id'] ?? '') === (string)$responderId) { $responder = $item; break; }
        }
        $status = strtolower((string)($location['status'] ?? ($responder['status'] ?? 'available')));
        if ($status !== 'available') continue;

        $distance = rn_distance_meters($lat, $lng, $rLat, $rLng);
        if ($nearest === null || $distance < $nearest['distance']) {
            $nearest = [
                'responderId'    => (string)$responderId,
                'responderName'  => (string)($location['name'] ?? ($responder['name'] ?? $responderId)),
                'responderPhone' => (string)($responder['phone'] ?? ''),
                'distance'       => $distance,
            ];
        }
    }
    return $nearest;
}

/**
 * Create a `claimedBy: auto` assignment for an open alert that has no active
 * assignment yet. Returns the assignment array, or null when nothing changed.
 */
function rn_assign_alert_to_nearest(array $alert) {
    $status = strtolower((string)($alert['status'] ?? ''));
    $isOpen = empty($alert['resolvedAt']) && !in_array($status, ['resolved', 'cancelled'], true);
    if (!$isOpen) return null;

    foreach (rn_all('assignments') as $a) {
        if ((string)($a['caseId'] ?? '') === (string)$alert['id']
            && empty($a['closedAt'])
            && strtolower((string)($a['status'] ?? '')) !== 'resolved') {
            return null; // already has an active assignment
        }
    }

    $nearest = rn_nearest_available_responder($alert);
    if (!$nearest) return null;

    $now = rn_now_iso();
    $assignment = [
        'caseId'         => (string)$alert['id'],
        'responderId'    => $nearest['responderId'],
        'responderName'  => $nearest['responderName'],
        'responderPhone' => $nearest['responderPhone'],
        'status'         => 'assigned',
        'assignedAt'     => $now,
        'updatedAt'      => $now,
        'claimedBy'      => 'auto',
        'history'        => [['status' => 'assigned', 'at' => $now]],
    ];
    rn_save_assignment($assignment);

    // Flip the responder + location to busy so they are not double-booked.
    $locations = rn_load_locations();
    if (isset($locations[$nearest['responderId']])) {
        $loc = $locations[$nearest['responderId']];
        $loc['status'] = 'busy';
        rn_save_location($nearest['responderId'], $loc);
    }
    foreach (rn_all('responders') as $resp) {
        if ((string)($resp['id'] ?? '') === $nearest['responderId']) {
            $resp['status'] = 'busy';
            rn_save_responder($resp);
            break;
        }
    }
    return $assignment;
}

/** Keep only the newest $limit rows of a table (mirrors the 50-item cap). */
function rn_trim($table, $limit, $orderColumn) {
    $table = rn_table($table);
    $orderColumn = preg_replace('/[^a-z_]/', '', $orderColumn);
    rn_pdo()->exec('DELETE FROM ' . $table . ' WHERE id NOT IN ('
        . 'SELECT id FROM (SELECT id FROM ' . $table . ' ORDER BY ' . $orderColumn . ' DESC LIMIT ' . (int)$limit . ') AS keep)');
}

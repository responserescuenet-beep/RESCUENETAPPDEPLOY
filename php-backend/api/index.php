<?php
/**
 * RescueNet — single PHP front controller for the whole /api surface.
 *
 * Drop-in replacement for the Node.js server.js API. Every request is routed
 * here by .htaccess (RewriteRule ^api(/.*)?$ api/index.php). Data lives in the
 * ONE shared database `rescuenetdb`; payloads are AES-256-GCM encrypted at
 * rest and PII lookups use keyed HMAC hashes (see lib/crypto.php).
 *
 * Endpoint parity with server.js:
 *   GET  /api/sync                 POST /api/sync
 *   GET  /api/events (SSE)         GET  /api/longpoll
 *   GET  /api/config               GET  /maps-key.js   (api/maps-key.php)
 *   GET  /api/alerts               POST /api/alert      PATCH /api/alert/:id
 *   GET  /api/reports              POST /api/report     DELETE /api/report/:id
 *   GET  /api/residents            POST /api/resident
 *   GET  /api/resident/status      POST /api/resident/:id/approve|reject
 *   GET  /api/assignments          POST /api/assignment
 *   GET  /api/households           POST /api/household
 *   GET  /api/announcements        POST /api/announcement   DELETE /api/announcement/:id
 *   GET  /api/resources            POST /api/resource       DELETE /api/resource/:id
 *   POST /api/responder-location   GET  /api/responder-locations
 *   GET  /api/responders           POST /api/responder      POST /api/responders
 *   POST /api/responder/login
 *   POST /api/send-otp             POST /api/verify-otp
 *
 * Plus real authentication (new in the PHP build):
 *   POST /api/auth/login|logout|set-password   GET /api/auth/session
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/crypto.php';
require_once __DIR__ . '/lib/store.php';
require_once __DIR__ . '/lib/mailer.php';
require_once __DIR__ . '/lib/otp.php';
require_once __DIR__ . '/lib/auth.php';

/* ---- CORS + preflight -----------------------------------------------------*/
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');
rn_no_cache_headers();
if (rn_method() === 'OPTIONS') { http_response_code(204); exit; }

/* ---- Resolve the path relative to this controller -------------------------*/
$uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '/index.php');
$baseDir = rtrim(dirname($script), '/');
$path = ($baseDir !== '' && strpos($uri, $baseDir) === 0) ? substr($uri, strlen($baseDir)) : $uri;
$path = '/' . trim($path, '/');           // '' -> '/', '/alerts' stays '/alerts'

$method = rn_method();

/* ---- Helpers used only by the router --------------------------------------*/

/** Current absolute base URL (scheme://host[/subdir]). */
function rn_base_url() {
    $https  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
           || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $scheme = $https ? 'https' : 'http';
    $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '/api/index.php');
    // dirname() returns a platform separator, so normalise before trimming.
    $dir    = rtrim(str_replace('\\', '/', dirname(dirname($script))), '/'); // strip '/api'
    return $scheme . '://' . $host . $dir;
}

function rn_is_private_ipv4($ip) {
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) return false;
    if (strpos($ip, '192.168.') === 0) return true;
    if (strpos($ip, '10.') === 0) return true;
    if (preg_match('/^172\.(1[6-9]|2[0-9]|3[01])\./', $ip)) return true;
    return false;
}

/** Best-effort LAN IPv4 of the machine running this backend.
 *
 *  Not used for routing — clients always prefer the public URL — but reported
 *  on /api/config so an app on the same Wi-Fi can fall back to the LAN when the
 *  tunnel is briefly unavailable, and so the "server IP" readouts stay accurate
 *  even though the LAN IP changes from one network to the next. */
function rn_lan_ip() {
    $cands = [];
    $sa = $_SERVER['SERVER_ADDR'] ?? '';
    if ($sa !== '') $cands[] = $sa;
    $host = @gethostname();
    if ($host) {
        $resolved = @gethostbyname($host);
        if ($resolved && $resolved !== $host) $cands[] = $resolved;
    }
    foreach ($cands as $ip) {
        if (rn_is_private_ipv4($ip)) return $ip;
    }
    return '';
}

/** How long an SSE / long-poll request may hold the connection open.
 *
 *  Production (Apache, shared hosting) streams in LONGPOLL_MAX_SECONDS
 *  windows. The PHP CLI dev server (`php -S`) is single-threaded on Windows,
 *  so a held connection blocks every other request — and the admin dashboard
 *  opens BOTH /events and /longpoll. That starved /api/residents, which is why
 *  newly registered residents never reached the admin's Verification queue
 *  locally. Under the CLI server we answer straight away and let the clients'
 *  own poll loop carry the updates instead. */
function rn_realtime_window() {
    return PHP_SAPI === 'cli-server' ? 0 : (int)LONGPOLL_MAX_SECONDS;
}

/* ==========================================================================
   REALTIME
   ==========================================================================*/

/* Server-Sent Events. Bounded to LONGPOLL_MAX_SECONDS because shared hosting
 * kills long-lived requests; EventSource auto-reconnects, so this streams in
 * short windows and resumes from the Last-Event-ID header. */
if ($path === '/events' && $method === 'GET') {
    @ini_set('zlib.output_compression', '0');
    @ini_set('output_buffering', 'off');
    @ini_set('implicit_flush', '1');
    @set_time_limit(0);
    while (ob_get_level() > 0) { @ob_end_flush(); }

    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache, no-transform');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no');
    echo ":connected\r\n\r\n";
    @ob_flush(); @flush();

    $since = 0;
    if (isset($_SERVER['HTTP_LAST_EVENT_ID']) && is_numeric($_SERVER['HTTP_LAST_EVENT_ID'])) {
        $since = (int)$_SERVER['HTTP_LAST_EVENT_ID'];
    }
    if ($since <= 0) {
        // No resume point: only stream events that happen from now on.
        $since = (int)rn_pdo()->query('SELECT COALESCE(MAX(id),0) FROM events')->fetchColumn();
    }

    $deadline = time() + rn_realtime_window();
    do {
        if (connection_aborted()) break;
        $events = rn_events_since($since);
        if ($events) {
            foreach ($events as $e) {
                $since = max($since, (int)$e['id']);
                echo 'id: ' . (int)$e['id'] . "\r\n";
                echo 'event: ' . $e['type'] . "\r\n";
                echo 'data: ' . json_encode($e['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\r\n\r\n";
            }
        } else {
            echo ":ping\r\n\r\n";
        }
        @ob_flush(); @flush();
        if (time() >= $deadline) break;
        usleep(1000000); // 1 s between checks
    } while (true);
    echo ":bye\r\n\r\n";
    @ob_flush(); @flush();
    exit;
}

/* Long-poll transport (used by the Capacitor apps via fetch). */
if ($path === '/longpoll' && $method === 'GET') {
    @set_time_limit(rn_realtime_window() + 10);
    $since = (isset($_GET['since']) && is_numeric($_GET['since'])) ? (int)$_GET['since'] : null;
    if ($since !== null) {
        $missed = rn_events_since($since);
        if ($missed) rn_json_out(['events' => $missed]);
    }
    // No cursor supplied: only surface events that arrive during this window.
    $cursor = $since !== null
        ? $since
        : (int)rn_pdo()->query('SELECT COALESCE(MAX(id),0) FROM events')->fetchColumn();

    $deadline = time() + rn_realtime_window();
    while (time() < $deadline) {
        if (connection_aborted()) break;
        $events = rn_events_since($cursor);
        if ($events) rn_json_out(['events' => $events]);
        usleep(700000);
    }
    rn_json_out(['events' => []]);
}

/* ==========================================================================
   SYNC + CONFIG
   ==========================================================================*/

if ($path === '/sync' && $method === 'GET') {
    rn_json_out(rn_full_store());
}

if ($path === '/sync' && $method === 'POST') {
    $in = rn_input();
    $tables = ['alerts', 'reports', 'residents', 'assignments', 'households', 'announcements', 'resources'];
    foreach ($tables as $t) {
        if (isset($in[$t]) && is_array($in[$t])) {
            rn_replace_all($t, $in[$t]);
            rn_broadcast('sync_' . $t, $in[$t]);
        }
    }
    rn_json_out(['ok' => true]);
}

if ($path === '/config' && $method === 'GET') {
    $base = rn_base_url();
    rn_json_out([
        'googleMapsApiKey' => GOOGLE_MAPS_API_KEY,
        'lanIp'            => rn_lan_ip(),
        'serverUrl'        => $base,
        'serverSecureUrl'  => $base,
        /* Backend / store identity. Clients compare this to confirm the Admin,
         * Resident and Responder apps are all pointed at the ONE shared store. */
        'backend'          => 'php',
        'store'            => DB_NAME,
        'storeHost'        => DB_HOST,
        'storeId'          => DB_HOST . '/' . DB_NAME,
        'otp'              => [
            'emailConfigured' => rn_mail_configured(),       // true when SMTP credentials are set
            'smsConfigured'   => SMS_API_KEY !== '' && SMS_API_SECRET !== '',
        ],
        'builtAt'          => rn_now_iso(),
    ]);
}

/* ==========================================================================
   ALERTS (SOS)
   ==========================================================================*/

if ($path === '/alerts' && $method === 'GET') {
    rn_json_out(rn_all('alerts'));
}

if ($path === '/alert' && $method === 'POST') {
    $alert = rn_input();
    if (!$alert || empty($alert['id'])) rn_json_out(['ok' => false, 'error' => 'Missing alert payload'], 400);

    $existing = rn_one('alerts', $alert['id']);
    $isNew = ($existing === null);
    $saved = $isNew ? $alert : array_merge($existing, $alert);
    if (empty($saved['updatedAt'])) $saved['updatedAt'] = rn_now_iso();

    rn_save_alert($saved);
    rn_trim('alerts', 50, 'created_at');

    $assignment = $isNew ? rn_assign_alert_to_nearest($saved) : null;

    rn_broadcast($isNew ? 'new_alert' : 'alert_updated', $saved);
    if ($assignment) rn_broadcast('assignment_updated', $assignment);

    rn_json_out([
        'ok'               => true,
        'delivery'         => $assignment ? 'assigned' : 'queued',
        'assignedResponder'=> $assignment
            ? ['id' => $assignment['responderId'], 'name' => $assignment['responderName']]
            : null,
    ]);
}

if (preg_match('#^/alert/([^/]+)$#', $path, $m) && $method === 'PATCH') {
    $id = urldecode($m[1]);
    $existing = rn_one('alerts', $id);
    if (!$existing) rn_json_out(['ok' => false, 'error' => 'Alert not found'], 404);
    $merged = array_merge($existing, rn_input());
    rn_save_alert($merged);
    rn_broadcast('alert_updated', $merged);
    rn_json_out(['ok' => true]);
}

/* ==========================================================================
   REPORTS
   ==========================================================================*/

if ($path === '/reports' && $method === 'GET') {
    rn_json_out(rn_all('reports'));
}

if ($path === '/report' && $method === 'POST') {
    $report = rn_input();
    if (!$report || empty($report['id'])) rn_json_out(['ok' => false, 'error' => 'Missing report payload'], 400);
    rn_save_report($report);
    rn_trim('reports', 50, 'created_at');
    rn_broadcast('new_report', $report);
    rn_json_out(['ok' => true]);
}

if (preg_match('#^/report/([^/]+)$#', $path, $m) && $method === 'DELETE') {
    $id = urldecode($m[1]);
    rn_delete('reports', $id);
    rn_broadcast('report_deleted', ['id' => $id]);
    rn_json_out(['ok' => true]);
}

/* ==========================================================================
   RESIDENTS
   ==========================================================================*/

if ($path === '/residents' && $method === 'GET') {
    rn_json_out(rn_all('residents'));
}

if ($path === '/resident' && $method === 'POST') {
    $resident = rn_input();
    if (!$resident || (empty($resident['id']) && empty($resident['phone']) && empty($resident['email']))) {
        rn_json_out(['ok' => false, 'error' => 'Missing resident payload'], 400);
    }

    $strip = function ($v) { return preg_replace('/\s+/', '', (string)$v); };
    $list  = rn_all('residents');
    $matchIdx = -1;
    foreach ($list as $i => $r) {
        $sameId    = !empty($resident['id'])    && (string)($r['id'] ?? '') === (string)$resident['id'];
        $samePhone = !empty($resident['phone']) && !empty($r['phone']) && $strip($r['phone']) === $strip($resident['phone']);
        $sameEmail = !empty($resident['email']) && !empty($r['email']) && strtolower((string)$r['email']) === strtolower((string)$resident['email']);
        if ($sameId || $samePhone || $sameEmail) { $matchIdx = $i; break; }
    }

    /* A client-supplied `status` is NEVER trusted: only the admin approve/
     * reject endpoints may write 'approved'/'rejected'. New and re-submitted
     * records enter the admin queue as 'pending'; an existing approval is
     * preserved (see server.js for the full rationale). */
    $existingStatus = $matchIdx >= 0 ? strtolower((string)($list[$matchIdx]['status'] ?? '')) : '';
    $finalStatus = ($existingStatus === 'approved') ? 'approved' : 'pending';
    if ($finalStatus === 'pending' && RESIDENT_AUTO_APPROVE) $finalStatus = 'approved';

    $id = !empty($resident['id']) ? (string)$resident['id'] : ('R' . round(microtime(true) * 1000));
    $plainPassword = isset($resident['password']) ? (string)$resident['password'] : '';

    $withStatus = array_merge($resident, [
        'id'           => $id,
        'status'       => $finalStatus,
        'registeredAt' => $resident['registeredAt'] ?? rn_now_iso(),
    ]);
    unset($withStatus['password']); // never persist a plaintext password

    if ($matchIdx >= 0) {
        $merged = array_merge($list[$matchIdx], $withStatus, ['status' => $finalStatus]);
        if ($finalStatus === 'pending') unset($merged['rejectedAt'], $merged['rejectedReason'], $merged['approvedAt']);
    } else {
        $merged = $withStatus;
    }

    rn_save_resident($merged);

    if ($plainPassword !== '') rn_set_credential('resident', $id, $plainPassword);

    rn_broadcast('resident_registered', $merged);
    rn_json_out(['ok' => true, 'resident' => $merged]);
}

if ($path === '/resident/status' && $method === 'GET') {
    $em = strtolower(trim((string)($_GET['email'] ?? '')));
    $ph = preg_replace('/\D+/', '', (string)($_GET['phone'] ?? ''));
    if ($em === '' && $ph === '') rn_json_out(['ok' => false, 'error' => 'email or phone required'], 400);

    $match = null;
    foreach (rn_all('residents') as $r) {
        if ($em !== '' && strtolower((string)($r['email'] ?? '')) === $em) { $match = $r; break; }
        if ($ph !== '' && preg_replace('/\D+/', '', (string)($r['phone'] ?? '')) === $ph) { $match = $r; break; }
    }
    if (!$match) rn_json_out(['ok' => true, 'found' => false]);
    rn_json_out([
        'ok'     => true,
        'found'  => true,
        'status' => $match['status'] ?? 'pending',
        'resident' => [
            'id'            => $match['id'] ?? null,
            'firstName'     => $match['firstName'] ?? null,
            'lastName'      => $match['lastName'] ?? null,
            'email'         => $match['email'] ?? null,
            'phone'         => $match['phone'] ?? null,
            'facialDataUrl' => $match['facialDataUrl'] ?? '',
            'approvedAt'    => $match['approvedAt'] ?? null,
            'rejectedAt'    => $match['rejectedAt'] ?? null,
        ],
    ]);
}

if (preg_match('#^/resident/([^/]+)/approve$#', $path, $m) && $method === 'POST') {
    $id = urldecode($m[1]);
    $resident = rn_one('residents', $id);
    if (!$resident) rn_json_out(['ok' => false, 'error' => 'Resident not found'], 404);

    $approvedAt = rn_now_iso();
    $resident['status'] = 'approved';
    $resident['approvedAt'] = $approvedAt;
    unset($resident['rejectedAt'], $resident['rejectedReason']);
    rn_save_resident($resident);
    rn_broadcast('resident_approved', $resident);

    $name = trim((string)($resident['firstName'] ?? '') . ' ' . (string)($resident['lastName'] ?? ''));
    if ($name === '') $name = (string)($resident['name'] ?? 'Resident');

    $channels = ['email' => 'skipped', 'sms' => 'skipped'];
    $errors   = [];

    if (!empty($resident['email'])) {
        $html = '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;background:#f6f9fd;border-radius:12px;color:#1a2942">'
              . '<h2 style="color:#102d5c;margin:0 0 10px">Account Approved ✓</h2>'
              . '<p>Hi <b>' . htmlspecialchars($name) . '</b>,</p>'
              . '<p>A barangay official has reviewed and approved your RescueNet registration. You can now sign in using your registered email or mobile number.</p>'
              . '<p style="margin-top:22px;color:#5b7392;font-size:12px">RescueNet · Barangay Taculing</p></div>';
        $text = "Hi $name,\n\nYour RescueNet registration has been approved. You can now sign in.\n\n— RescueNet · Barangay Taculing";
        $channels['email'] = rn_send_email($resident['email'], 'RescueNet — Your account has been approved', $text, $html) ? 'sent' : 'failed';
        if ($channels['email'] === 'failed') $errors[] = 'email: send failed';
    }

    if (!empty($resident['phone'])) {
        try {
            $to = rn_normalize_phone($resident['phone']);
            $res = $to ? rn_send_sms($to, 'RescueNet: Your account has been APPROVED by the barangay. Sign in now. -Brgy Taculing') : null;
            $channels['sms'] = $res ? (($res['dev'] ?? false) ? 'dev-log' : 'sent') : 'invalid phone';
        } catch (Throwable $e) {
            $channels['sms'] = 'failed';
            $errors[] = 'sms: ' . $e->getMessage();
        }
    }

    rn_json_out(['ok' => true, 'resident' => $resident, 'channels' => $channels, 'errors' => $errors]);
}

if (preg_match('#^/resident/([^/]+)/reject$#', $path, $m) && $method === 'POST') {
    $id = urldecode($m[1]);
    $resident = rn_one('residents', $id);
    if (!$resident) rn_json_out(['ok' => false, 'error' => 'Resident not found'], 404);
    $resident['status'] = 'rejected';
    $resident['rejectedAt'] = rn_now_iso();
    rn_save_resident($resident);
    rn_broadcast('resident_rejected', $resident);
    rn_json_out(['ok' => true, 'resident' => $resident]);
}

/* ==========================================================================
   ASSIGNMENTS
   ==========================================================================*/

if ($path === '/assignments' && $method === 'GET') {
    rn_json_out(rn_all('assignments'));
}

if ($path === '/assignment' && $method === 'POST') {
    $assignment = rn_input();
    if (!$assignment || empty($assignment['caseId'])) rn_json_out(['ok' => false, 'error' => 'Missing assignment'], 400);
    if (empty($assignment['responderId'])) $assignment['responderId'] = '';

    $merged = $assignment;
    foreach (rn_all('assignments') as $a) {
        if ((string)($a['caseId'] ?? '') === (string)$assignment['caseId']
            && (string)($a['responderId'] ?? '') === (string)$assignment['responderId']) {
            $merged = array_merge($a, $assignment);
            break;
        }
    }
    rn_save_assignment($merged);
    rn_broadcast('assignment_updated', $merged);
    rn_json_out(['ok' => true]);
}

/* ==========================================================================
   HOUSEHOLDS
   ==========================================================================*/

if ($path === '/households' && $method === 'GET') {
    rn_json_out(rn_all('households'));
}

if ($path === '/household' && $method === 'POST') {
    $hh = rn_input();
    if (!$hh || empty($hh['id'])) rn_json_out(['ok' => false, 'error' => 'Missing household payload'], 400);
    $merged = $hh;
    $existing = rn_one('households', $hh['id']);
    if ($existing) $merged = array_merge($existing, $hh);
    rn_save_household($merged);
    rn_broadcast('household_update', $merged);
    rn_json_out(['ok' => true]);
}

/* ==========================================================================
   ANNOUNCEMENTS
   ==========================================================================*/

if ($path === '/announcements' && $method === 'GET') {
    rn_json_out(rn_all('announcements'));
}

if ($path === '/announcement' && $method === 'POST') {
    $ann = rn_input();
    if (!$ann || empty($ann['id'])) rn_json_out(['ok' => false, 'error' => 'Missing announcement'], 400);
    rn_save_announcement($ann);
    rn_broadcast('announcement_published', $ann);
    rn_json_out(['ok' => true]);
}

if (preg_match('#^/announcement/([^/]+)$#', $path, $m) && $method === 'DELETE') {
    $id = urldecode($m[1]);
    rn_delete('announcements', $id);
    rn_broadcast('announcement_deleted', ['id' => $id]);
    rn_json_out(['ok' => true]);
}

/* ==========================================================================
   RESOURCES
   ==========================================================================*/

if ($path === '/resources' && $method === 'GET') {
    rn_json_out(rn_all('resources'));
}

if ($path === '/resource' && $method === 'POST') {
    $rec = rn_input();
    if (!$rec || empty($rec['id'])) rn_json_out(['ok' => false, 'error' => 'Missing resource'], 400);
    rn_save_resource($rec);
    rn_broadcast('resource_updated', $rec);
    rn_json_out(['ok' => true]);
}

if (preg_match('#^/resource/([^/]+)$#', $path, $m) && $method === 'DELETE') {
    $id = urldecode($m[1]);
    rn_delete('resources', $id);
    rn_broadcast('resource_deleted', ['id' => $id]);
    rn_json_out(['ok' => true]);
}

/* ==========================================================================
   RESPONDER LOCATIONS
   ==========================================================================*/

if ($path === '/responder-location' && $method === 'POST') {
    $in = rn_input();
    $responderId = (string)($in['responderId'] ?? '');
    if ($responderId === '') rn_json_out(['ok' => false], 400);

    $lat = isset($in['lat']) ? (float)$in['lat'] : NAN;
    $lng = isset($in['lng']) ? (float)$in['lng'] : NAN;
    if (!is_finite($lat) || !is_finite($lng)) {
        rn_json_out(['ok' => false, 'error' => 'Valid lat and lng are required'], 400);
    }

    $status = $in['status'] ?? null;
    $loc = [
        'lat'       => $lat,
        'lng'       => $lng,
        'updatedAt' => !empty($in['updatedAt']) ? (string)$in['updatedAt'] : rn_now_iso(),
    ];
    if (isset($in['accuracy']) && is_numeric($in['accuracy'])) $loc['accuracy'] = (float)$in['accuracy'];
    if (!empty($in['name'])) $loc['name'] = (string)$in['name'];
    if (!empty($in['role'])) $loc['role'] = (string)$in['role'];
    if ($status !== null && $status !== '') $loc['status'] = (string)$status;

    rn_save_location($responderId, $loc);

    // Keep the roster record's coordinates/status in sync (freshest GPS wins).
    foreach (rn_all('responders') as $resp) {
        if ((string)($resp['id'] ?? '') === $responderId) {
            $resp['lat'] = $lat;
            $resp['lng'] = $lng;
            if ($status !== null && $status !== '') $resp['status'] = (string)$status;
            rn_save_responder($resp);
            break;
        }
    }

    $newAssignments = [];
    if (strtolower((string)$status) === 'available') {
        $queued = array_values(array_filter(rn_all('alerts'), function ($a) {
            return !empty($a['id']) && empty($a['resolvedAt'])
                && !in_array(strtolower((string)($a['status'] ?? '')), ['resolved', 'cancelled'], true);
        }));
        usort($queued, function ($a, $b) {
            return strtotime((string)($a['createdAt'] ?? '')) <=> strtotime((string)($b['createdAt'] ?? ''));
        });
        foreach ($queued as $alert) {
            $assignment = rn_assign_alert_to_nearest($alert);
            if ($assignment) $newAssignments[] = $assignment;
        }
    }

    rn_broadcast('responder_location', [
        'responderId' => $responderId,
        'lat'         => $lat,
        'lng'         => $lng,
        'updatedAt'   => $loc['updatedAt'],
        'name'        => $loc['name'] ?? null,
        'role'        => $loc['role'] ?? null,
        'status'      => $loc['status'] ?? null,
    ]);
    foreach ($newAssignments as $assignment) rn_broadcast('assignment_updated', $assignment);

    rn_json_out([
        'ok'            => true,
        'assignedCases' => array_map(function ($a) { return $a['caseId']; }, $newAssignments),
    ]);
}

if ($path === '/responder-locations' && $method === 'GET') {
    rn_json_out((object)rn_load_locations());
}

/* ==========================================================================
   RESPONDER DIRECTORY
   ==========================================================================*/

if ($path === '/responders' && $method === 'GET') {
    rn_json_out(rn_all('responders'));
}

if ($path === '/responder/login' && $method === 'POST') {
    $in    = rn_input();
    $name  = strtolower(trim(preg_replace('/\s+/', ' ', (string)($in['name'] ?? ''))));
    $phone = preg_replace('/\D+/', '', (string)($in['phone'] ?? ''));
    if ($name === '' || !preg_match('/^09\d{9}$/', $phone)) {
        rn_json_out(['ok' => false, 'error' => 'Name and an 11-digit phone starting with 09 are required'], 400);
    }

    $match = null;
    foreach (rn_all('responders') as $r) {
        $rn = strtolower(trim(preg_replace('/\s+/', ' ', (string)($r['name'] ?? ''))));
        $rp = preg_replace('/\D+/', '', (string)($r['phone'] ?? ''));
        if ($rn === $name && $rp === $phone) { $match = $r; break; }
    }
    if (!$match) rn_json_out(['ok' => false, 'error' => 'Credentials do not match any registered responder', 'code' => 'NO_ACCOUNT'], 401);

    // If a password was set for this responder, it must match (blank is rejected
    // when a credential exists, so a name+phone pair alone can't bypass it).
    $password = (string)($in['password'] ?? '');
    if (rn_has_credential('responder', $match['id'])
        && !rn_check_credential('responder', $match['id'], $password)) {
        rn_json_out(['ok' => false, 'error' => 'Invalid password', 'code' => 'BAD_PASSWORD'], 401);
    }

    $session = rn_create_session('responder', $match['id']);
    rn_json_out(['ok' => true, 'responder' => $match, 'session' => $session]);
}

if ($path === '/responder' && $method === 'POST') {
    $r = rn_input();
    $name = trim(preg_replace('/\s+/', ' ', (string)($r['name'] ?? '')));
    if ($name === '' || empty($r['phone'])) {
        rn_json_out(['ok' => false, 'error' => 'Responder requires name and phone'], 400);
    }
    $phoneDigits = preg_replace('/\D+/', '', (string)$r['phone']);
    if (!preg_match('/^09\d{9}$/', $phoneDigits)) {
        rn_json_out(['ok' => false, 'error' => 'Phone must be exactly 11 digits starting with 09'], 400);
    }

    $list = rn_all('responders');

    // Reject a phone that already belongs to a different responder id.
    $id = trim((string)($r['id'] ?? ''));
    foreach ($list as $x) {
        if (preg_replace('/\D+/', '', (string)($x['phone'] ?? '')) === $phoneDigits
            && (!$id || (string)($x['id'] ?? '') !== $id)) {
            rn_json_out(['ok' => false, 'error' => 'A responder with that phone number is already registered'], 409);
        }
    }
    // Auto-assign the next RS### id when the admin omitted it.
    if ($id === '') {
        $max = 0;
        foreach ($list as $x) $max = max($max, (int)preg_replace('/\D+/', '', (string)($x['id'] ?? '')));
        $id = 'RS' . str_pad((string)($max + 1), 3, '0', STR_PAD_LEFT);
    }
    foreach ($list as $x) {
        if ((string)($x['id'] ?? '') === $id && preg_replace('/\D+/', '', (string)($x['phone'] ?? '')) !== $phoneDigits) {
            rn_json_out(['ok' => false, 'error' => 'Responder ID is already assigned. Refresh and try again.'], 409);
        }
    }

    $rec = [
        'id'        => $id,
        'name'      => $name,
        'role'      => trim((string)($r['role'] ?? 'Responder')),
        'skill'     => trim((string)($r['skill'] ?? '')),
        'phone'     => $phoneDigits,
        'email'     => trim((string)($r['email'] ?? '')),
        'status'    => trim((string)($r['status'] ?? 'available')),
        'lat'       => is_numeric($r['lat'] ?? null) ? (float)$r['lat'] : 13.3520,
        'lng'       => is_numeric($r['lng'] ?? null) ? (float)$r['lng'] : 123.7490,
        'joined'    => $r['joined'] ?? gmdate('Y-m-d'),
        'createdAt' => $r['createdAt'] ?? rn_now_iso(),
    ];

    foreach ($list as $x) {
        if ((string)($x['id'] ?? '') === $id) { $rec = array_merge($x, $rec); break; }
    }
    rn_save_responder($rec);

    if (!empty($r['password'])) rn_set_credential('responder', $id, (string)$r['password']);

    rn_broadcast('responder_registered', $rec);
    rn_json_out(['ok' => true, 'responder' => $rec]);
}

if ($path === '/responders' && $method === 'POST') {
    $body = rn_input();
    $incoming = null;
    if (isset($body[0]) && is_array($body[0])) $incoming = $body;
    elseif (isset($body['responders']) && is_array($body['responders'])) $incoming = $body['responders'];
    if ($incoming === null) rn_json_out(['ok' => false, 'error' => 'Expected array of responders'], 400);

    $list = rn_all('responders');
    $max = 0;
    foreach ($list as $x) $max = max($max, (int)preg_replace('/\D+/', '', (string)($x['id'] ?? '')));

    foreach ($incoming as $r) {
        if (!is_array($r) || empty($r['name']) || empty($r['phone'])) continue;
        $id = trim((string)($r['id'] ?? ''));
        if ($id === '') { $max++; $id = 'RS' . str_pad((string)$max, 3, '0', STR_PAD_LEFT); }
        $rec = [
            'id'        => $id,
            'name'      => trim((string)$r['name']),
            'role'      => trim((string)($r['role'] ?? 'Responder')),
            'skill'     => trim((string)($r['skill'] ?? '')),
            'phone'     => trim((string)$r['phone']),
            'email'     => trim((string)($r['email'] ?? '')),
            'status'    => trim((string)($r['status'] ?? 'available')),
            'lat'       => is_numeric($r['lat'] ?? null) ? (float)$r['lat'] : 13.3520,
            'lng'       => is_numeric($r['lng'] ?? null) ? (float)$r['lng'] : 123.7490,
            'joined'    => $r['joined'] ?? gmdate('Y-m-d'),
            'createdAt' => $r['createdAt'] ?? rn_now_iso(),
        ];
        foreach ($list as $x) {
            if ((string)($x['id'] ?? '') === $id) { $rec = array_merge($x, $rec); break; }
        }
        rn_save_responder($rec);
    }

    $all = rn_all('responders');
    rn_broadcast('responders_synced', $all);
    rn_json_out(['ok' => true, 'count' => count($all)]);
}

/* ==========================================================================
   OTP
   ==========================================================================*/

if ($path === '/send-otp' && $method === 'POST') {
    $in     = rn_input();
    $email  = strtolower(trim((string)($in['email'] ?? '')));
    $phone  = rn_normalize_phone($in['phone'] ?? '');
    $hasEmail = ($email !== '' && preg_match(RN_EMAIL_RE, $email));
    $hasPhone = !empty($phone);
    if (!$hasEmail && !$hasPhone) {
        rn_json_out(['ok' => false, 'error' => 'Provide a valid email or phone number.'], 400);
    }

    rn_otp_sweep();
    $otpKey = $hasEmail ? $email : ('phone:' . $phone);

    $existing = rn_otp_get($otpKey);
    if ($existing && $existing['last_sent_at']) {
        $elapsed = (int)round(microtime(true) * 1000) - (int)$existing['last_sent_at'];
        if ($elapsed < (int)OTP_RESEND_COOLDOWN_MS) {
            $wait = (int)ceil(((int)OTP_RESEND_COOLDOWN_MS - $elapsed) / 1000);
            rn_json_out(['ok' => false, 'error' => "Please wait {$wait}s before requesting a new code."], 429);
        }
    }

    $code = rn_generate_otp();
    rn_otp_put($otpKey, $code, $hasPhone ? $phone : null);

    $channels = ['email' => 'skipped', 'sms' => 'skipped'];
    $tasks = 0;

    if ($hasEmail) {
        $html = '<div style="font-family:Segoe UI,Arial,sans-serif;background:#ffffff;padding:28px;max-width:480px;margin:auto;border:1px solid #e5eaf2;border-radius:14px;">'
              . '<h2 style="color:#102d5c;margin:0 0 8px;">RescueNet verification code</h2>'
              . '<p style="color:#5b7392;margin:0 0 20px;font-size:14px;">Use this 6-digit code to verify your number. It expires in 2 minutes.</p>'
              . '<div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#102d5c;background:#f6f9fd;border:1px solid rgba(16,45,92,0.14);border-radius:12px;padding:16px;text-align:center;">' . $code . '</div>'
              . '<p style="color:#5b7392;margin:20px 0 0;font-size:12px;">If you didn\'t request this, you can ignore this email.</p></div>';
        $ok = rn_send_email($email, 'Your RescueNet verification code: ' . $code, 'Your RescueNet verification code is ' . $code . '. It expires in 2 minutes.', $html);
        $channels['email'] = $ok ? 'sent' : 'failed';
        $tasks++;
    }

    if ($hasPhone) {
        try {
            $res = rn_send_sms($phone, 'RescueNet: your verification code is ' . $code . '. It expires in 2 minutes.');
            $channels['sms'] = ($res['dev'] ?? false) ? 'dev-log' : 'sent';
        } catch (Throwable $e) {
            $channels['sms'] = 'failed';
        }
        $tasks++;
    }

    if ($tasks > 0 && $channels['email'] === 'failed' && $channels['sms'] === 'failed') {
        rn_otp_delete($otpKey);
        rn_json_out(['ok' => false, 'error' => 'Could not send code via email or SMS. Check server config.', 'channels' => $channels], 502);
    }

    // Dev visibility: always log the code server-side.
    error_log('[RESCUENET OTP] ' . $otpKey . ' -> ' . $code);

    rn_json_out([
        'ok'        => true,
        'expiresAt' => (int)round(microtime(true) * 1000) + (int)OTP_TTL_MS,
        'channels'  => $channels,
        'phone'     => $hasPhone ? $phone : null,
    ]);
}

if ($path === '/verify-otp' && $method === 'POST') {
    $in    = rn_input();
    $email = strtolower(trim((string)($in['email'] ?? '')));
    $phone = rn_normalize_phone($in['phone'] ?? '');
    $code  = preg_replace('/\D+/', '', (string)($in['code'] ?? ''));

    if (!preg_match('/^\d{6}$/', $code)) {
        rn_json_out(['ok' => false, 'error' => 'Enter the complete 6-digit code (digits only).'], 400);
    }
    if ($email === '' && !$phone) rn_json_out(['ok' => false, 'error' => 'No identifier provided.'], 400);

    $primary = ($email !== '' && preg_match(RN_EMAIL_RE, $email)) ? $email : ($phone ? 'phone:' . $phone : null);
    $alt     = ($phone ? 'phone:' . $phone : null);

    $record = $primary ? rn_otp_get($primary) : null;
    $activeKey = ($primary && $record) ? $primary : null;
    if (!$record && $alt && $alt !== $primary) { $record = rn_otp_get($alt); if ($record) $activeKey = $alt; }

    if (!$record) {
        rn_json_out(['ok' => false, 'error' => 'No active code for this email/phone. Tap "Resend Code" and use the newest email.'], 400);
    }
    $nowMs = (int)round(microtime(true) * 1000);
    if ($nowMs > (int)$record['expires_at']) {
        rn_otp_delete($activeKey);
        rn_json_out(['ok' => false, 'error' => 'Code expired (older than 2 min). Tap "Resend Code".'], 400);
    }
    if ((int)$record['attempts'] >= (int)OTP_MAX_ATTEMPTS) {
        rn_otp_delete($activeKey);
        rn_json_out(['ok' => false, 'error' => 'Too many attempts. Please request a new code.'], 429);
    }

    rn_otp_bump_attempts($activeKey);

    if (!hash_equals((string)$record['code_hash'], rn_otp_hash($code))) {
        $remaining = max(0, (int)OTP_MAX_ATTEMPTS - ((int)$record['attempts'] + 1));
        rn_json_out(['ok' => false, 'error' => "Incorrect code. {$remaining} attempt(s) left. Use the code from the LATEST email.", 'remaining' => $remaining], 401);
    }

    rn_otp_delete($activeKey);
    rn_json_out(['ok' => true, 'verified' => true]);
}

/* ==========================================================================
   AUTH (new — the Node build had no server-side authentication)
   ==========================================================================*/

if ($path === '/auth/login' && $method === 'POST') {
    $in         = rn_input();
    $role       = strtolower(trim((string)($in['role'] ?? '')));
    $identifier = trim((string)($in['identifier'] ?? ''));
    $password   = (string)($in['password'] ?? '');

    if ($role === '') rn_json_out(['ok' => false, 'error' => 'role is required'], 400);
    if ($password === '') rn_json_out(['ok' => false, 'error' => 'password is required'], 400);

    if ($role === 'admin') {
        rn_ensure_admin();
        // Accept either the configured admin email or the "admin" shorthand.
        $id    = strtolower(trim($identifier));
        $email = strtolower(trim((string)(defined('ADMIN_EMAIL') ? ADMIN_EMAIL : '')));
        if ($id !== '' && $id !== strtolower(ADMIN_ID) && !($email !== '' && $id === $email)) {
            rn_json_out(['ok' => false, 'error' => 'Invalid admin credentials', 'code' => 'BAD_PASSWORD'], 401);
        }
        if (!rn_check_credential('admin', ADMIN_ID, $password)) {
            rn_json_out(['ok' => false, 'error' => 'Invalid admin credentials', 'code' => 'BAD_PASSWORD'], 401);
        }
        $session = rn_create_session('admin', ADMIN_ID);
        rn_json_out(['ok' => true, 'role' => 'admin', 'session' => $session, 'profile' => ['id' => ADMIN_ID, 'email' => $email]]);
    }

    if ($role === 'resident') {
        $em = strtolower($identifier);
        $ph = preg_replace('/\D+/', '', $identifier);
        $match = null;
        foreach (rn_all('residents') as $r) {
            if (($em !== '' && strtolower((string)($r['email'] ?? '')) === $em)
                || ($ph !== '' && preg_replace('/\D+/', '', (string)($r['phone'] ?? '')) === $ph)) { $match = $r; break; }
        }
        if (!$match) rn_json_out(['ok' => false, 'error' => 'No account found', 'code' => 'NO_ACCOUNT'], 401);
        if (!rn_has_credential('resident', $match['id'])) {
            rn_json_out(['ok' => false, 'error' => 'No password on record', 'code' => 'NO_CREDENTIAL'], 401);
        }
        if (!rn_check_credential('resident', $match['id'], $password)) {
            rn_json_out(['ok' => false, 'error' => 'Invalid password', 'code' => 'BAD_PASSWORD'], 401);
        }
        if (strtolower((string)($match['status'] ?? '')) !== 'approved') {
            rn_json_out(['ok' => false, 'error' => 'Account not approved', 'status' => $match['status'] ?? 'pending'], 403);
        }
        $session = rn_create_session('resident', $match['id']);
        rn_json_out(['ok' => true, 'role' => 'resident', 'session' => $session, 'profile' => $match]);
    }

    if ($role === 'responder') {
        $ph = preg_replace('/\D+/', '', $identifier);
        $match = null;
        foreach (rn_all('responders') as $r) {
            if ($ph !== '' && preg_replace('/\D+/', '', (string)($r['phone'] ?? '')) === $ph) { $match = $r; break; }
        }
        if (!$match) rn_json_out(['ok' => false, 'error' => 'No responder found', 'code' => 'NO_ACCOUNT'], 401);
        if (rn_has_credential('responder', $match['id']) && !rn_check_credential('responder', $match['id'], $password)) {
            rn_json_out(['ok' => false, 'error' => 'Invalid password', 'code' => 'BAD_PASSWORD'], 401);
        }
        $session = rn_create_session('responder', $match['id']);
        rn_json_out(['ok' => true, 'role' => 'responder', 'session' => $session, 'profile' => $match]);
    }

    rn_json_out(['ok' => false, 'error' => 'Unknown role'], 400);
}

if ($path === '/auth/logout' && $method === 'POST') {
    rn_destroy_session(rn_bearer_token());
    rn_json_out(['ok' => true]);
}

if ($path === '/auth/session' && $method === 'GET') {
    $s = rn_session(rn_bearer_token());
    rn_json_out($s ? ['ok' => true, 'session' => $s] : ['ok' => false]);
}

if ($path === '/auth/set-password' && $method === 'POST') {
    $in   = rn_input();
    $role = strtolower(trim((string)($in['role'] ?? '')));
    $id   = trim((string)($in['id'] ?? ''));
    $password = (string)($in['password'] ?? '');
    if (!in_array($role, ['admin', 'resident', 'responder'], true) || $id === '' || strlen($password) < 6) {
        rn_json_out(['ok' => false, 'error' => 'role, id and a 6+ char password are required'], 400);
    }
    // Changing an existing credential requires a valid session for the same principal.
    if (rn_has_credential($role, $id)) {
        $s = rn_session(rn_bearer_token());
        if (!$s || $s['type'] !== $role || (string)$s['id'] !== $id) {
            rn_json_out(['ok' => false, 'error' => 'Not authorised to change this password'], 403);
        }
    }
    rn_set_credential($role, $id, $password);
    rn_json_out(['ok' => true]);
}

/* ---- Fallthrough ----------------------------------------------------------*/
rn_json_out(['ok' => false, 'error' => 'Not found', 'path' => $path], 404);

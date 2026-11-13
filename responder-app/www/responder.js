/* =====================================================
   RESCUENET RESPONDER — dispatch logic
   Connects to the Admin console (dashboards.html) and
   resident app (dashboard.html) through shared storage
   + BroadcastChannel + the Node API.
   ===================================================== */
const API_BASE = (function () {
    // If we're already served from the Node server (browser testing), use same origin
    const o = window.location.origin || '';
    if (o.indexOf(':3000') !== -1 || o.indexOf(':3443') !== -1) return o;
    // In Capacitor (https://localhost), use the configured LAN IP
    if (window.RN_SERVER) return window.RN_SERVER;
    if (o.indexOf('http') === 0 && o.indexOf('localhost') === -1) return o;
    return 'http://localhost:3000';
})();

const LS = {
    responders:  'rn_responders',
    assignments: 'rn_response_assignments',
    alerts:      'rn_alerts',
    reports:     'rn_reports',
    households:  'rn_households',
    messages:    'rn_messages',
    notifs:      'rn_resp_notifs',
    me:          'rn_current_responder',
    prefs:       'rn_resp_prefs',
    seenMsg:     'rn_resp_seen_msgs',
    respLoc:     'rn_responder_locations'
};

const FLOW = ['assigned', 'acknowledged', 'on-the-way', 'arrived', 'responding', 'resolved'];
const FLOW_LABEL = {
    'assigned': 'Assigned', 'acknowledged': 'Acknowledged', 'on-the-way': 'On the Way',
    'arrived': 'Arrived', 'responding': 'Responding', 'resolved': 'Resolved'
};
/* legacy values the admin console used before */
const LEGACY = { 'en-route': 'on-the-way', 'on-scene': 'arrived' };
const normStatus = s => LEGACY[s] || (FLOW.includes(s) ? s : 'assigned');

/* ---------- helpers ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function lsGet(k, f) { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch (e) { return f; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = n => String(n || '?').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
function ago(d) {
    if (!d) return '—';
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
}
function metersBetween(a, b) {
    if (!a || !b) return null;
    const R = 6371000, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng/2)**2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
function fmtDist(m) { return m == null ? '—' : (m < 1000 ? m + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km'); }
function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._tm);
    t._tm = setTimeout(() => t.classList.remove('show'), ms || 2600);
}
function broadcast(tag) { try { const bc = new BroadcastChannel('rescuenet'); bc.postMessage(tag); bc.close(); } catch (e) {} }
let audioCtx = null;
function beep() {
    const prefs = lsGet(LS.prefs, {});
    if (prefs.sound === false) return;
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.frequency.value = 880; g.gain.value = 0.08;
        o.start(); o.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.28);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.32);
        o.stop(audioCtx.currentTime + 0.34);
    } catch (e) {}
}

/* ---------- roster seed (mirrors the admin SEED) ---------- */
(function seedResponders() {
    if (lsGet(LS.responders)) return;
    lsSet(LS.responders, [
        { id:'RS001', name:'Ramon Dela Cruz',  role:'Team Leader',    skill:'Medical / CPR',  phone:'0917-555-1001', email:'ramon.d@rescuenet.app',  status:'available', lat:13.3525, lng:123.7495, joined:'2024-02-10' },
        { id:'RS002', name:'Grace Villanueva', role:'First Responder',skill:'Fire / Rescue',  phone:'0917-555-1002', email:'grace.v@rescuenet.app',  status:'available', lat:13.3481, lng:123.7532, joined:'2024-03-02' },
        { id:'RS003', name:'Jun Torre',        role:'Driver',         skill:'Ambulance',      phone:'0917-555-1003', email:'jun.t@rescuenet.app',    status:'busy',      lat:13.3450, lng:123.7470, joined:'2023-11-19' },
        { id:'RS004', name:'Mhy Alonzo',       role:'Coordinator',    skill:'Comms / Evac',   phone:'0917-555-1004', email:'mhy.a@rescuenet.app',    status:'available', lat:13.3568, lng:123.7550, joined:'2024-01-08' }
    ]);
})();

/* ---------- session ---------- */
function getMe() {
    const id = sessionStorage.getItem(LS.me);
    if (!id) return null;
    return lsGet(LS.responders, []).find(r => r.id === id) || null;
}
function setMe(rec) {
    const list = lsGet(LS.responders, []).map(r => r.id === rec.id ? Object.assign({}, r, rec) : r);
    lsSet(LS.responders, list);
    broadcast('rn_responders_updated');
}

/* ---------- LOGIN ---------- */
const loginScreen = $('#loginScreen');

/* Normalize phone digits for comparison. Requires exactly 11 digits starting with 09. */
function _phoneDigits(s) { return String(s || '').replace(/\D/g, ''); }
function _isValidPhone(s) { return /^09\d{9}$/.test(_phoneDigits(s)); }
function _normName(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

/* Force the phone input to only accept digits, cap at 11 */
(function bindPhoneInput() {
    const el = document.getElementById('loginPhone');
    if (!el) return;
    el.addEventListener('input', () => {
        el.value = el.value.replace(/\D/g, '').slice(0, 11);
    });
    el.addEventListener('paste', () => setTimeout(() => {
        el.value = el.value.replace(/\D/g, '').slice(0, 11);
    }, 0));
})();

function setLoginPreview(html, kind) {
    const card = $('#loginPreview');
    if (!card) return;
    if (!html) { card.hidden = true; card.innerHTML = ''; return; }
    card.hidden = false;
    card.innerHTML = html;
    card.style.borderColor = kind === 'err'
        ? 'rgba(220,38,38,0.35)'
        : (kind === 'ok' ? 'rgba(22,163,74,0.35)' : 'var(--line-2)');
    card.style.background = kind === 'err'
        ? 'rgba(220,38,38,0.06)'
        : (kind === 'ok' ? 'rgba(22,163,74,0.06)' : 'var(--soft)');
}

/* Local fallback: search LS.responders for a name+phone match */
function _findLocalResponder(name, phone) {
    const nn = _normName(name);
    const pd = _phoneDigits(phone);
    return lsGet(LS.responders, []).find(r =>
        _normName(r.name) === nn && _phoneDigits(r.phone) === pd
    );
}

/* Pull admin-registered responders from the server so login works across devices.
 * Falls back silently to the local seed when the server is unreachable. */
async function hydrateLoginRoster() {
    try {
        const res = await fetch(API_BASE + '/api/responders', { cache: 'no-store' });
        if (!res.ok) return;
        const remote = await res.json();
        if (!Array.isArray(remote) || !remote.length) return;
        const local = lsGet(LS.responders, []);
        let changed = false;
        remote.forEach(r => {
            if (!r || !r.id) return;
            const idx = local.findIndex(x => x.id === r.id);
            if (idx < 0) { local.push(r); changed = true; }
            else {
                const merged = { ...local[idx], ...r, status: local[idx].status || r.status, lat: r.lat ?? local[idx].lat, lng: r.lng ?? local[idx].lng };
                if (JSON.stringify(merged) !== JSON.stringify(local[idx])) { local[idx] = merged; changed = true; }
            }
        });
        if (changed) lsSet(LS.responders, local);
    } catch (e) { /* offline */ }
}

/* Authenticate: hit the server first; if unreachable, fall back to local directory */
async function attemptLogin() {
    const name  = ($('#loginName')  && $('#loginName').value)  || '';
    const phone = ($('#loginPhone') && $('#loginPhone').value) || '';

    if (!name.trim()) {
        setLoginPreview('<b style="color:var(--err)">Full name required</b><br>Enter the exact name the admin registered.', 'err');
        $('#loginName').focus();
        return;
    }
    if (!_isValidPhone(phone)) {
        setLoginPreview('<b style="color:var(--err)">Phone must be 11 digits starting with 09</b><br>Example: 09171234567', 'err');
        $('#loginPhone').focus();
        return;
    }

    setLoginPreview('<span style="color:var(--muted)">Verifying credentials…</span>');
    const payload = { name: name.trim(), phone: _phoneDigits(phone) };

    // Try server first
    try {
        const res = await fetch(API_BASE + '/api/responder/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.ok && data.responder) {
                grantAccess(data.responder);
                return;
            }
        }
        if (res.status === 401) {
            setLoginPreview('<b style="color:var(--err)">Credentials not recognized</b><br>No responder account matches that name and phone. Ask the admin to confirm your registration.', 'err');
            toast('Incorrect name or phone');
            return;
        }
        if (res.status === 400) {
            const err = await res.json().catch(() => ({}));
            setLoginPreview('<b style="color:var(--err)">' + esc(err.error || 'Invalid input') + '</b>', 'err');
            return;
        }
        // Non-OK non-auth error → try local fallback below
    } catch (e) {
        // Server unreachable → local fallback
    }

    const local = _findLocalResponder(name, phone);
    if (local) {
        grantAccess(local);
        setLoginPreview('<b style="color:var(--ok)">Signed in offline</b><br>Server unreachable — using the local directory.', 'ok');
        return;
    }
    setLoginPreview('<b style="color:var(--err)">Cannot reach server</b><br>No local record matches that name and phone. Reconnect and try again.', 'err');
}

function grantAccess(rec) {
    // Persist the account into the local roster — getMe() resolves the session
    // id against it, so without this the app goes silent after a relaunch.
    const list = lsGet(LS.responders, []);
    const idx = list.findIndex(r => r.id === rec.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...rec }; else list.push(rec);
    lsSet(LS.responders, list);
    sessionStorage.setItem(LS.me, rec.id);
    setLoginPreview('', null);
    loginScreen.classList.remove('show');
    boot();
    toast('Welcome, ' + String(rec.name || '').split(' ')[0] + ' — you are on duty');
}

$('#loginBtn').addEventListener('click', () => { attemptLogin(); });
document.addEventListener('keydown', (e) => {
    if (!loginScreen || !loginScreen.classList.contains('show')) return;
    if (e.key === 'Enter' && (e.target.id === 'loginName' || e.target.id === 'loginPhone')) {
        e.preventDefault();
        attemptLogin();
    }
});

/* Kick off hydration as soon as the login screen is present */
if (loginScreen && loginScreen.classList.contains('show')) {
    hydrateLoginRoster();
    setInterval(hydrateLoginRoster, 15000);
}

/* ---------- router ---------- */
const SCREEN_META = {
    home:    ['RescueNet · Dispatch', 'On duty'],
    cases:   ['RescueNet · Dispatch', 'Incidents'],
    map:     ['RescueNet · Dispatch', 'Incident map'],
    comms:   ['RescueNet · Dispatch', 'Coordination'],
    profile: ['RescueNet · Dispatch', 'My profile']
};
let currentScreen = 'home';
function navigate(key) {
    currentScreen = key;
    $$('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === key));
    $$('.dock-item').forEach(n => n.classList.toggle('sel', n.dataset.nav === key));
    const meta = SCREEN_META[key] || ['', ''];
    $('#tbEyebrow').textContent = meta[0];
    /* Hide the topbar ("RescueNet · Dispatch" eyebrow + white bar) when the
     * map is active so the incident map fills the entire vertical space. */
    document.body.classList.toggle('map-fullscreen', key === 'map');
    if (key === 'map') setTimeout(() => { ensureMap(); if (MAP.map) { MAP.map.invalidateSize(); paintCases(); drawMine(); } }, 130);
    refresh(key);
}
$('#dock').addEventListener('click', e => {
    const n = e.target.closest('[data-nav]');
    if (n) navigate(n.dataset.nav);
});
document.addEventListener('click', e => {
    const g = e.target.closest('[data-goto]');
    if (g) {
        navigate(g.dataset.goto);
        if (g.dataset.tab && g.dataset.goto === 'cases') selectTab(g.dataset.tab);
    }
});

/* ---------- data joins ---------- */
function allCases() {
    const alerts  = lsGet(LS.alerts, []).map(a => Object.assign({}, a, { kind: 'sos' }));
    const reports = lsGet(LS.reports, []).map(r => Object.assign({}, r, { kind: 'report' }));
    return alerts.concat(reports).concat(activeHouseholds());
}
/* Households flagged Need Assistance / Missing by the resident become
 * map cases so responders see the resident's precise GPS fix. Safe
 * households are filtered out. Household payload uses `lat`/`lng` — we
 * remap to `latitude`/`longitude` to align with the alert/report shape
 * that paintCases and the incident card already understand. */
function activeHouseholds() {
    const assignments = lsGet(LS.assignments, []);
    const claimedIds = new Set(assignments.filter(a => !a.closedAt).map(a => a.caseId));
    return lsGet(LS.households, [])
        .filter(h => h && h.id
                 && (h.status === 'Need Assistance' || h.status === 'Missing')
                 && Number.isFinite(Number(h.lat))
                 && Number.isFinite(Number(h.lng)))
        .map(h => {
            const vulns = Array.isArray(h.vulnerabilities) ? h.vulnerabilities.filter(Boolean) : [];
            return {
                id: h.id,
                kind: 'household',
                householdId: h.id,
                type: (vulns.length ? '⚠ ' : '') + 'Household · ' + h.status,
                householdStatus: h.status,
                latitude: Number(h.lat),
                longitude: Number(h.lng),
                accuracy: (Number.isFinite(Number(h.accuracy)) ? Number(h.accuracy) : null),
                createdAt: h.updatedAt || h.capturedAt || new Date().toISOString(),
                updatedAt: h.updatedAt,
                reporter: { name: h.residentName || 'Resident', phone: h.phone || '', address: h.purok || '', vulnerabilities: vulns },
                reporterName: h.residentName || 'Resident',
                description: h.remarks || ('Household marked ' + h.status),
                purok: h.purok || '',
                phone: h.phone || '',
                vulnerabilities: vulns,
                vulnerable: vulns.length > 0 || h.vulnerable === true,
                assignedResponderId: h.assignedResponderId || null,
                assignedResponderName: h.assignedResponderName || null,
                unassigned: !claimedIds.has(h.id)
            };
        });
}
function myAssignments() {
    const me = getMe(); if (!me) return [];
    return lsGet(LS.assignments, []).filter(a => a.responderId === me.id)
        .map(a => Object.assign({}, a, { status: normStatus(a.status) }));
}
/* A case this responder already resolved lives in History and must never be
 * pulled back into the active list by a late auto / admin dispatch push. The
 * server can re-issue the same case (its alert record stayed open) after the
 * responder turns available again, which used to overwrite the local resolved
 * assignment with a fresh 'assigned' one. */
function isResolvedLocally(caseId) {
    const me = getMe();
    return lsGet(LS.assignments, []).some(a =>
        a.caseId === caseId && (!me || a.responderId === me.id) && normStatus(a.status) === 'resolved');
}
/* Materialise a case straight from an assignment when its alert / report /
 * household is missing from the local case list — e.g. a household the
 * admin dispatched to that is not flagged Need Assistance / Missing, or has
 * no GPS fix, is filtered out of activeHouseholds(). Without this the
 * responder would see a bare "Emergency" placeholder instead of the
 * household they were actually sent to. */
function caseFromAssignment(a) {
    if (!a) return { id: '', kind: 'sos', type: 'Emergency' };
    if (a.kind === 'household' || a.householdId) {
        const hhId = a.householdId || a.caseId;
        const hh = lsGet(LS.households, []).find(h => h.id === hhId) || {};
        const vulns = Array.isArray(hh.vulnerabilities) ? hh.vulnerabilities.filter(Boolean) : [];
        const lat = Number(a.householdLat ?? hh.lat);
        const lng = Number(a.householdLng ?? hh.lng);
        const acc = Number(a.householdAccuracy ?? hh.accuracy);
        const status = a.householdStatus || hh.status || 'Assistance';
        return {
            id: a.caseId,
            kind: 'household',
            householdId: hhId,
            type: (vulns.length ? '⚠ ' : '') + 'Household · ' + status,
            householdStatus: status,
            latitude: Number.isFinite(lat) ? lat : null,
            longitude: Number.isFinite(lng) ? lng : null,
            accuracy: Number.isFinite(acc) ? acc : null,
            createdAt: a.assignedAt || hh.updatedAt || a.updatedAt || new Date().toISOString(),
            updatedAt: a.updatedAt || hh.updatedAt,
            reporter: { name: a.householdName || hh.residentName || 'Resident', phone: a.householdPhone || hh.phone || '', address: a.householdAddress || hh.purok || '', vulnerabilities: vulns },
            reporterName: a.householdName || hh.residentName || 'Resident',
            description: a.householdRemarks || hh.remarks || ('Household dispatch · ' + status),
            purok: a.householdAddress || hh.purok || '',
            phone: a.householdPhone || hh.phone || '',
            vulnerabilities: vulns,
            vulnerable: vulns.length > 0 || hh.vulnerable === true
        };
    }
    return { id: a.caseId, kind: a.kind || 'sos', type: 'Emergency' };
}
function myCases() {
    const cases = allCases();
    const joined = myAssignments().map(a => {
        const c = cases.find(x => x.id === a.caseId) || caseFromAssignment(a);
        return Object.assign({}, c, { assign: a });
    });
    /* Vulnerable-first within my active responses so the Home screen and
     * Cases list always show the highest-priority case on top, even when
     * the responder received a newer ordinary assignment after it. */
    joined.sort((x, y) => {
        const vx = isVulnCase(x) ? 0 : 1;
        const vy = isVulnCase(y) ? 0 : 1;
        if (vx !== vy) return vx - vy;
        return new Date((y.assign && y.assign.assignedAt) || y.createdAt || 0)
             - new Date((x.assign && x.assign.assignedAt) || x.createdAt || 0);
    });
    return joined;
}

/* A case is claimable by me when it is still open in the barangay queue,
 * OR when it was auto-dispatched to me (claimedBy 'auto') and I have not
 * yet acknowledged it — so the assignee can explicitly claim their own SOS
 * even though they are already the nearest responder. */
function canClaim(c) {
    const me = getMe(); if (!me) return false;
    if (!c.assign) return true;
    if (c.assign.status === 'resolved') return false;
    return c.assign.claimedBy === 'auto' && c.assign.responderId === me.id;
}

function unassignedOpen() {
    const claimed = new Set(lsGet(LS.assignments, []).filter(a => !a.closedAt).map(a => a.caseId));
    const openSOS = lsGet(LS.alerts, []).filter(s => !s.resolvedAt && !claimed.has(s.id));
    const openHH  = activeHouseholds().filter(h => !claimed.has(h.id));
    /* Vulnerable-first ordering across the barangay queue so a PWD /
     * senior / pregnant / household-with-children always surfaces before
     * general alerts, even if a newer ordinary case arrived later. */
    return openSOS.concat(openHH).sort((a, b) => {
        const va = isVulnCase(a) ? 0 : 1;
        const vb = isVulnCase(b) ? 0 : 1;
        if (va !== vb) return va - vb;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
}

/* Shared vulnerable check used by the queue sorts and by pin/card
 * rendering. Reads either the embedded reporter.vulnerabilities list
 * (SOS alerts / reports) or the household's own vulnerabilities array. */
function isVulnCase(c) {
    if (!c) return false;
    if (c.vulnerable === true) return true;
    if (Array.isArray(c.vulnerabilities) && c.vulnerabilities.length) return true;
    const rep = c.reporter;
    if (rep && Array.isArray(rep.vulnerabilities) && rep.vulnerabilities.length) return true;
    return false;
}

/* ---------- availability ---------- */
function renderAvail() {
    const me = getMe(); if (!me) return;
    const st = me.status || 'available';
    $$('#availRow .avail-btn').forEach(b => b.classList.toggle('sel', b.dataset.avail === st));
}
$('#availRow').addEventListener('click', e => {
    const b = e.target.closest('[data-avail]'); if (!b) return;
    const me = getMe(); if (!me) return;
    setMe({ id: me.id, status: b.dataset.avail });
    renderAvail();
    postMyLocation(); // tell the server immediately, don't wait for the next GPS fix
    toast('Availability → ' + b.textContent.trim());
});

/* ---------- home ---------- */
function renderHome() {
    const mine = myCases();
    const active = mine.filter(c => c.assign.status !== 'assigned' && c.assign.status !== 'resolved');
    const fresh  = mine.filter(c => c.assign.status === 'assigned');
    const done   = mine.filter(c => c.assign.status === 'resolved');
    $('#kNew').textContent    = fresh.length;
    $('#kActive').textContent = active.length;
    $('#kDone').textContent   = done.length;
    $('#kSOS').textContent    = lsGet(LS.alerts, []).filter(s => !s.resolvedAt).length;
    const dc = $('#dockCases');
    const n = fresh.length + active.length;
    dc.hidden = !n; dc.textContent = n;

    $('#activeHint').textContent = active.length ? active.length + ' in progress' : 'none';
    const nothing = (fresh.length + active.length) ? '' :
        '<div class="empty"><strong>No active responses</strong>New assignments from the Barangay Official will appear here instantly.</div>';
    $('#homeActive').innerHTML = nothing + fresh.concat(active).slice(0, 4).map(c => incCard(c)).join('');
    const pool = unassignedOpen().slice(0, 3);
    $('#homeAlerts').innerHTML = pool.length
        ? pool.map(c => incCard(Object.assign({}, c, { kind: c.kind || 'sos', assign: null }))).join('')
        : '<div class="empty">No open SOS in the barangay right now.</div>';
}

/* ---------- incident card ---------- */
function incCard(c) {
    const rep = c.reporter || {};
    const resolved = c.assign && c.assign.status === 'resolved';
    const assigned = c.assign && c.assign.status === 'assigned';
    const crit = /medical|fire|danger|flood|collapse/i.test(c.type || '');
    const tone = resolved ? 't-done' : (crit ? 't-critical' : assigned ? '' : 't-info');
    const dist = (ME_POS && c.latitude) ? fmtDist(metersBetween(ME_POS, { lat: c.latitude, lng: c.longitude })) : null;
    const statusPill = c.assign
        ? '<span class="tag ' + (resolved ? 'ok' : 'info') + '">' + FLOW_LABEL[c.assign.status] + '</span>'
        : '<span class="tag err">Unassigned</span>';
    return (
    '<article class="inc ' + tone + '" data-case="' + esc(c.id) + '">' +
        '<div class="inc-top">' +
            '<div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">' +
                '<span class="inc-type ' + (crit ? 'crit' : '') + '">' + esc(c.type || 'Incident') + '</span>' +
                (c.kind === 'report' ? '<span class="tag">Report</span>' : '') +
            '</div>' +
            '<span class="inc-time">' + ago(c.createdAt) + '</span>' +
        '</div>' +
        '<div class="inc-title">' + esc(rep.name || c.reporterName || 'Resident') + '</div>' +
        '<div class="inc-sub">' + esc((c.description || c.message || 'No description provided').slice(0, 90)) + '</div>' +
        '<div class="inc-meta">' +
            statusPill +
            (c.latitude ? '<span class="tag mono">' + Number(c.latitude).toFixed(5) + ', ' + Number(c.longitude).toFixed(5) + '</span>' : '<span class="tag">No GPS</span>') +
            (c.accuracy ? '<span class="tag mono">' + c.accuracy + ' m</span>' : '') +
            (dist ? '<span class="tag info">→ ' + dist + '</span>' : '') +
            (rep.vulnerabilities && rep.vulnerabilities.length ? '<span class="tag amber">⚠ ' + esc(rep.vulnerabilities[0]) + '</span>' : '') +
            (c.attachments && c.attachments.length ? '<span class="tag amber">📎 ' + c.attachments.length + ' media</span>' : '') +
        '</div>' +
        (canClaim(c) ? '<div class="btn-row" style="margin-top:10px;"><button class="btn sm amber" data-claim="' + esc(c.id) + '">Claim this SOS</button></div>' : '') +
    '</article>');
}

/* ---------- cases screen ---------- */
let caseTab = 'new';
function selectTab(t) {
    caseTab = t;
    $$('#caseSeg button').forEach(b => b.classList.toggle('sel', b.dataset.tab === t));
    renderCases();
}
$('#caseSeg').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (b) selectTab(b.dataset.tab);
});
function renderCases() {
    const mine = myCases();
    const fresh   = mine.filter(c => c.assign.status === 'assigned');
    const active  = mine.filter(c => c.assign.status !== 'assigned' && c.assign.status !== 'resolved');
    const history = mine.filter(c => c.assign.status === 'resolved');
    $('#snNew').textContent = fresh.length;
    $('#snActive').textContent = active.length;
    $('#snHistory').textContent = history.length;

    let list = [], showPool = false;
    if (caseTab === 'new')     { list = fresh; showPool = true; }
    if (caseTab === 'active')  list = active;
    if (caseTab === 'history') list = history;

    let html = list.map(c => incCard(c)).join('');
    if (!list.length && !showPool) {
        html = '<div class="empty"><strong>Nothing here</strong>No ' + caseTab + ' cases for your account yet.</div>';
    }
    if (showPool) {
        const pool = unassignedOpen();
        if (pool.length) {
            html += '<div class="sec-head" style="margin:18px 0 10px;"><h2>Barangay queue</h2><span class="hint">Not yet assigned — you can self-claim</span></div>' +
                    pool.map(c => incCard(Object.assign({}, c, { kind: c.kind || 'sos', assign: null }))).join('');
        } else if (!list.length) {
            html = '<div class="empty"><strong>No new assignments</strong>Wait for the Barangay Official to dispatch a case to you.</div>';
        }
    }
    $('#caseList').innerHTML = html;
}

/* ---------- claim ---------- */
/* Jump to the map and start third-person guidance for a case that just became
 * the responder's own. Shared by the claim button and by the first
 * acknowledgement of an auto-dispatched case, so a household "Need Assistance"
 * behaves exactly like an SOS. */
function startGuidanceFor(caseId) {
    closeSheets();
    navigate('map');
    setTimeout(() => {
        ensureMap();
        if (!MAP.map) return;
        MAP.focus = caseId;
        paintCases();
        const c = findCase(caseId);
        if (!c) return;
        if (!Number.isFinite(Number(c.latitude)) || !Number.isFinite(Number(c.longitude))) {
            toast('This case has no geotagged location');
            return;
        }
        /* POV recentres on the responder, rotates to the heading and draws the
         * guidance line to the resident's precise pin — no button needed. */
        startPovNavigation();
    }, 380);
}
function claimCase(caseId) {
    const me = getMe(); if (!me) return;
    const list = lsGet(LS.assignments, []);
    const now = new Date().toISOString();
    let asgn = list.find(a => a.caseId === caseId);
    if (asgn) {
        // Already auto-dispatched to me — convert it into a self-claimed case.
        if (asgn.responderId === me.id && asgn.claimedBy === 'auto') {
            asgn.status = 'acknowledged';
            asgn.claimedBy = 'responder';
            asgn.updatedAt = now;
            asgn.history = (asgn.history || []).concat([{ status: 'acknowledged', at: now }]);
        } else {
            toast('Case already assigned'); return;
        }
    } else {
        asgn = { caseId, responderId: me.id, responderName: me.name || me.id, responderPhone: me.phone || '', status: 'acknowledged', assignedAt: now, updatedAt: now, claimedBy: 'responder', history: [{ status: 'acknowledged', at: now }] };
        list.unshift(asgn);
    }
    lsSet(LS.assignments, list);
    setMe({ id: me.id, status: 'busy' });
    pushNotif('📌 Case self-claimed', 'You claimed case ' + caseId + ' from the barangay queue.');
    addMsg(caseId, 'responder', me.name, 'Self-claimed this case from the dispatch queue — heading out.');
    broadcast('rn_response_updated');
    // Push the claim to the server so the resident's tracking screen sees it immediately
    try {
        fetch(API_BASE + '/api/assignment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(asgn) }).catch(() => {});
    } catch(e){}
    toast('✓ Case claimed — starting guidance');
    refreshAll();
    // jump to the map and start guidance to the claimed case location
    startGuidanceFor(caseId);
}

/* =====================================================
   PART 2 — case sheet · comms · notifs · map · profile · realtime
   ===================================================== */
let ME_POS = null;
let openCaseId = null;
let activeThread = 'dispatch';
const fmtDT = d => d ? new Date(d).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const stageIdx = s => FLOW.indexOf(normStatus(s));

/* ---------- case detail sheet ---------- */
function findCase(caseId) {
    return myCases().find(c => c.id === caseId) ||
           allCases().filter(x => x.id === caseId).map(x => Object.assign({}, x, { assign: null }))[0] || null;
}

function openCaseSheet(caseId) {
    const c = findCase(caseId); if (!c) { toast('Case not found — it may have been removed'); return; }
    openCaseId = caseId;
    $('#caseSheetBody').innerHTML = caseSheetHTML(c);
    $('#caseSheetOv').classList.add('show');
    $('#caseSheet').scrollTop = 0;
}
function closeSheets() { $('#caseSheetOv').classList.remove('show'); $('#notifSheetOv').classList.remove('show'); }

function caseSheetHTML(c) {
    const rep = c.reporter || {};
    const crit = /medical|fire|danger|flood|collapse/i.test(c.type || '');
    const title = rep.name || c.reporterName || (c.kind === 'report' ? 'Incident report' : 'Emergency SOS');
    let head =
        '<div class="sheet-head"><div>' +
            '<span class="inc-type ' + (crit ? 'crit' : '') + '">' + esc(c.type || 'Incident') + '</span>' +
            '<div class="inc-title" style="margin-top:7px; font-size:16px;">' + esc(title) + '</div>' +
        '</div><button class="sheet-x" data-x>✕</button></div>';

    let stepper = '';
    let tl = '';
    let advanceBtn = '';
    if (c.assign) {
        const cur = stageIdx(c.assign.status);
        stepper = '<div class="sec"><div class="stepper">' + FLOW.map((s, i) => {
            const cls = i < cur ? 'done' : i === cur ? 'current' : '';
            const tick = i <= cur ? '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>' : '';
            return '<div class="step ' + cls + '"><div class="sdot">' + tick + '</div><div class="slbl">' + FLOW_LABEL[s] + '</div></div>';
        }).join('') + '</div></div>';

        const hist = (c.assign.history && c.assign.history.length)
            ? c.assign.history : [{ status: 'assigned', at: c.assign.assignedAt }];
        tl = '<div class="sec"><div class="sec-head"><h2>Response log</h2></div><div class="tl">' +
            hist.map((h, i) => {
                const cls = i < hist.length - 1 ? 'done' : 'current';
                return '<div class="tl-item ' + cls + '"><div class="tl-dot">' + (i < hist.length - 1 ? '✓' : '●') + '</div>' +
                    '<div class="tl-body"><div class="tl-t">' + FLOW_LABEL[normStatus(h.status)] + '</div>' +
                    '<div class="tl-s">' + fmtDT(h.at) + ' · ' + ago(h.at) + '</div></div></div>';
            }).join('') + '</div></div>';

        if (c.assign.status !== 'resolved') {
            const next = FLOW[Math.min(stageIdx(c.assign.status) + 1, FLOW.length - 1)];
            advanceBtn = (canClaim(c) ? '<button class="btn amber block" data-claim="' + esc(c.id) + '" style="margin-top:12px;">Claim this SOS</button>' : '') +
                '<button class="btn amber block" data-advance="' + esc(c.id) + '" style="margin-top:12px;">' +
                '<svg viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>' +
                'Update status → ' + FLOW_LABEL[next] + '</button>';
        } else {
            advanceBtn = '<div class="card" style="margin-top:12px; text-align:center; color:var(--ok); font-weight:800; font-size:13px; border-color:rgba(47,208,127,0.3); background:rgba(47,208,127,0.07);">✓ Response completed ' + fmtDT(c.assign.updatedAt) + '</div>';
        }
    } else {
        advanceBtn = '<button class="btn amber block" data-claim="' + esc(c.id) + '" style="margin-top:12px;">Claim this case</button>';
    }

    const dist = (ME_POS && c.latitude) ? fmtDist(metersBetween(ME_POS, { lat: c.latitude, lng: c.longitude })) : null;
    const when = c.createdAt ? new Date(c.createdAt) : null;
    const info =
        '<div class="sec"><div class="sec-head"><h2>Case information</h2></div><div class="dgrid">' +
            '<div class="d"><div class="d-k">Incident type</div><div class="d-v">' + esc(c.type || 'Emergency') + '</div></div>' +
            '<div class="d"><div class="d-k">Case ID</div><div class="d-v mono">' + esc(c.id) + '</div></div>' +
            '<div class="d"><div class="d-k">Reporter</div><div class="d-v">' + esc(rep.name || c.reporterName || '—') + '</div></div>' +
            '<div class="d"><div class="d-k">Contact</div><div class="d-v">' + (rep.phone ? '<a href="tel:' + esc(rep.phone) + '">' + esc(rep.phone) + '</a>' : '—') + '</div></div>' +
            '<div class="d"><div class="d-k">Location</div><div class="d-v">' + esc(rep.purok || rep.address || c.address || (c.latitude ? 'Geotagged pin' : 'Not provided')) + '</div></div>' +
            '<div class="d"><div class="d-k">Coordinates</div><div class="d-v mono">' + (c.latitude ? Number(c.latitude).toFixed(6) + ', ' + Number(c.longitude).toFixed(6) + (c.accuracy ? ' ' + c.accuracy + 'm' : '') : '—') + '</div></div>' +
            '<div class="d"><div class="d-k">Date</div><div class="d-v">' + (when ? when.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' }) : '—') + '</div></div>' +
            '<div class="d"><div class="d-k">Time</div><div class="d-v">' + (when ? when.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '—') + (dist ? '</div></div><div class="d"><div class="d-k">Distance from you</div><div class="d-v">→ ' + dist : '—') + '</div></div>' +
            '<div class="d full"><div class="d-k">Reported condition / description</div><div class="d-v">' + esc(c.description || c.message || c.reportedCondition || 'No description provided.') + '</div></div>' +
            (rep.vulnerabilities && rep.vulnerabilities.length ? '<div class="d full"><div class="d-k">Known vulnerabilities</div><div class="d-v"><span class="tag amber">⚠ ' + rep.vulnerabilities.map(esc).join('</span> <span class="tag amber">⚠ ') + '</span></div></div>' : '') +
        '</div></div>';

    const actions = c.assign ? '<div class="btn-row" style="margin-top:12px;">' +
        '<button class="btn info" data-focus="' + esc(c.id) + '"><svg viewBox="0 0 24 24"><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z"/></svg>Map</button>' +
        (rep.phone ? '<a class="btn ok" href="tel:' + esc(rep.phone) + '" style="flex:1; min-width:110px; height:44px; padding:0 18px; border-radius:14px; display:inline-flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; font-size:13px; font-weight:800; letter-spacing:0.03em;">Call</a>' : '') +
        '<button class="btn" data-comms="' + esc(c.id) + '"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Message</button>' +
        '</div>' : '';

    // media captured by the resident (photo / video attachments)
    const media = (c.attachments || []).filter(Boolean);
    CASE_MEDIA = media;
    let mediaSec = '';
    if (media.length) {
        mediaSec = '<div class="sec"><div class="sec-head"><h2>Media from reporter</h2><span class="hint">' + media.length + ' item' + (media.length > 1 ? 's' : '') + ' · tap to open</span></div><div class="mgrid">' +
            media.map((m, i) => m.dataUrl
                ? '<div class="mthumb" data-media="' + i + '">' +
                  (m.kind === 'video'
                      ? '<video src="' + m.dataUrl + '" muted playsinline preload="metadata"></video><span class="mplay">▶</span>'
                      : '<img src="' + m.dataUrl + '" alt="">') +
                  '<span class="mkind">' + (m.kind === 'video' ? 'VIDEO' : 'PHOTO') + '</span></div>'
                : '<div class="mthumb lost">Media unavailable on this device</div>').join('') +
            '</div></div>';
    }

    return head + stepper + info + mediaSec + advanceBtn + actions + '<div class="divider"></div>' + tl;
}

/* ---------- media lightbox (resident attachments) ---------- */
let CASE_MEDIA = [];
function openMediaLightbox(item) {
    if (!item || !item.dataUrl) { toast('Media no longer available on this device'); return; }
    let lb = document.getElementById('mediaLb');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'mediaLb';
        lb.className = 'lb-overlay';
        lb.innerHTML = '<button class="lb-x" data-lb-x aria-label="Close">✕</button><div class="lb-body"></div><div class="lb-cap"></div>';
        lb.addEventListener('click', function (e) {
            if (e.target === lb || e.target.closest('[data-lb-x]')) {
                lb.classList.remove('show');
                lb.querySelector('.lb-body').innerHTML = '';
            }
        });
        document.body.appendChild(lb);
    }
    lb.querySelector('.lb-body').innerHTML = item.kind === 'video'
        ? '<video src="' + item.dataUrl + '" controls autoplay playsinline></video>'
        : '<img src="' + item.dataUrl + '" alt="">';
    lb.querySelector('.lb-cap').textContent = (item.kind === 'video' ? '🎥 Video' : '📷 Photo') +
        (item.name ? ' · ' + item.name : '') +
        (item.at ? ' · ' + new Date(item.at).toLocaleString() : '');
    lb.classList.add('show');
}

/* ---------- status flow ---------- */
function advanceStatus(caseId) {
    const me = getMe(); if (!me) return;
    const list = lsGet(LS.assignments, []);
    const a = list.find(x => x.caseId === caseId && x.responderId === me.id);
    if (!a) return;
    const cur = normStatus(a.status);
    if (cur === 'resolved') return;
    const next = FLOW[Math.min(stageIdx(cur) + 1, FLOW.length - 1)];
    const now = new Date().toISOString();
    a.status = next; a.updatedAt = now;
    a.responderName = a.responderName || me.name || me.id;
    a.responderPhone = a.responderPhone || me.phone || '';
    a.history = (a.history && a.history.length ? a.history : [{ status: cur, at: a.assignedAt || now }]).concat([{ status: next, at: now }]);
    lsSet(LS.assignments, list);
    addMsg(caseId, 'system', '', me.name.split(' ')[0] + ' → ' + FLOW_LABEL[next]);
    if (next === 'resolved') {
        ['alerts', 'reports'].forEach(k => {
            const arr = lsGet(LS[k], []);
            const rec = arr.find(x => x.id === caseId);
            if (rec && !rec.resolvedAt) { rec.resolvedAt = now; lsSet(LS[k], arr); }
        });
        /* Tell the server the incident is closed. Without this its dispatcher
         * still sees the alert as open and re-issues the case to the responder
         * the moment they turn available again, dragging it out of History. */
        try {
            fetch(API_BASE + '/api/alert', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: caseId, resolvedAt: now, status: 'resolved', updatedAt: now,
                    closedBy: me.name || me.id
                })
            }).catch(() => {});
        } catch (e) {}
        const stillActive = lsGet(LS.assignments, []).some(x => x.responderId === me.id && normStatus(x.status) !== 'resolved');
        if (!stillActive) setMe({ id: me.id, status: 'available' });
        pushNotif('✔ Case resolved', 'Case ' + caseId + ' marked resolved. Availability restored.');
    }
    broadcast('rn_response_updated');
    toast('Status → ' + FLOW_LABEL[next]);
    // Sync assignment status to server for admin
    fetch(API_BASE + '/api/assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(a)
    }).catch(() => {});
    refreshAll();
    if (openCaseId === caseId) openCaseSheet(caseId);
    /* Acknowledging an auto-dispatched case (a household "Need Assistance"
     * arrives this way) is what actually takes ownership of it — start the
     * same automatic POV guidance as the claim button. */
    if (cur === 'assigned' && next === 'acknowledged') startGuidanceFor(caseId);
}

/* ---------- delegated clicks ---------- */
document.addEventListener('click', e => {
    const claim = e.target.closest('[data-claim]');
    if (claim) { e.stopPropagation(); closeSheets(); claimCase(claim.dataset.claim); return; }
    const adv = e.target.closest('[data-advance]');
    if (adv) { advanceStatus(adv.dataset.advance); return; }
    const foc = e.target.closest('[data-focus]');
    if (foc) { closeSheets(); navigate('map'); setTimeout(() => focusCase(foc.dataset.focus), 260); return; }
    const comms = e.target.closest('[data-comms]');
    if (comms) { closeSheets(); openThread(comms.dataset.comms); return; }
    const thr = e.target.closest('[data-thread]');
    if (thr) { openThread(thr.dataset.thread); return; }
    const x = e.target.closest('[data-x]');
    if (x) { closeSheets(); return; }
    const md = e.target.closest('[data-media]');
    if (md) { openMediaLightbox(CASE_MEDIA[parseInt(md.dataset.media, 10)]); return; }
    if (e.target.classList && e.target.classList.contains('sheet-ov')) { closeSheets(); return; }
    const card = e.target.closest('[data-case]');
    if (card) { openCaseSheet(card.dataset.case); return; }
});

/* ---------- communications ---------- */
function addMsg(thread, from, name, text) {
    const list = lsGet(LS.messages, []);
    list.push({ id: 'M' + Date.now() + Math.floor(Math.random() * 900 + 100), thread, from, name, text, at: new Date().toISOString() });
    lsSet(LS.messages, list.slice(-300));
    broadcast('rn_msg_new');
}
function seenMsgIds() { return lsGet(LS.seenMsg, []); }
function markSeen(thread) {
    const ids = seenMsgIds();
    lsGet(LS.messages, []).forEach(m => { if (m.thread === thread && !ids.includes(m.id)) ids.push(m.id); });
    lsSet(LS.seenMsg, ids.slice(-500));
}
function unreadAdminMsgs() {
    const ids = new Set(seenMsgIds());
    return lsGet(LS.messages, []).filter(m => (m.from === 'admin' || m.from === 'official') && !ids.has(m.id));
}
function openThread(thread) {
    activeThread = thread;
    markSeen(thread);
    navigate('comms');
    renderComms();
}
function myThreads() {
    return myAssignments().slice(0, 6).map(a => a.caseId);
}
function renderComms() {
    const me = getMe(); if (!me) return;
    const mine = myAssignments().slice(0, 6);
    const unread = new Set(unreadAdminMsgs().map(m => m.thread));
    const chanHTML = (id, label) =>
        '<button class="chan ' + (activeThread === id ? 'sel' : '') + '" data-thread="' + esc(id) + '">' + esc(label) +
        (unread.has(id) && activeThread !== id ? '<span class="unread"></span>' : '') + '</button>';
    $('#chanTabs').innerHTML =
        chanHTML('dispatch', '📡 Dispatch · Barangay') +
        mine.map(a => chanHTML(a.caseId, '🚨 Case ' + String(a.caseId).slice(-4))).join('');
    const msgs = lsGet(LS.messages, []).filter(m => m.thread === activeThread);
    $('#msgList').innerHTML = msgs.length ? msgs.map(m => {
        const cls = m.from === 'system' ? 'msg sys' : m.from === 'responder' ? 'msg out' : 'msg in';
        return '<div class="' + cls + '">' + esc(m.text) +
            (m.from === 'system' ? '' : '<span class="m-meta">' + esc(m.name || m.from) + ' · ' + ago(m.at) + '</span>') + '</div>';
    }).join('') : '<div class="empty"><strong>No messages yet</strong>Coordinate with the Barangay Official here — status updates also post to this thread.</div>';
    $('#msgList').scrollTop = 1e9;
}
function sendMsg() {
    const me = getMe(); if (!me) return;
    const inp = $('#msgInput');
    const text = inp.value.trim(); if (!text) return;
    addMsg(activeThread, 'responder', me.name, text);
    inp.value = '';
    markSeen(activeThread);
    renderComms();
    toast('Sent to ' + (activeThread === 'dispatch' ? 'Barangay dispatch' : 'case thread'));
}
$('#msgSend').addEventListener('click', sendMsg);
$('#msgInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });

/* ---------- notifications ---------- */
function pushNotif(title, text) {
    const prefs = lsGet(LS.prefs, {});
    if (prefs.notif === false) { renderNotifBadge(); return; }
    const list = lsGet(LS.notifs, []);
    list.unshift({ id: 'N' + Date.now() + Math.floor(Math.random() * 900), title, text, at: new Date().toISOString(), read: false });
    lsSet(LS.notifs, list.slice(0, 40));
    renderNotifBadge();
}
function renderNotifBadge() {
    const unread = lsGet(LS.notifs, []).filter(n => !n.read).length;
    const b = $('#notifCount');
    b.hidden = !unread; b.textContent = unread;
    const dc = $('#dockComms');
    const u = unreadAdminMsgs().length;
    dc.hidden = !u; dc.textContent = u;
}
function renderNotifs() {
    const list = lsGet(LS.notifs, []);
    $('#notifList').innerHTML = list.length ? list.map(n =>
        '<div class="notif ' + (n.read ? '' : 'unread') + '">' +
            '<div class="n-ico"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg></div>' +
            '<div class="n-body"><div class="n-t">' + esc(n.title) + '</div><div class="n-s">' + esc(n.text) + '</div></div>' +
            '<div class="n-at">' + ago(n.at) + '</div>' +
        '</div>').join('')
        : '<div class="empty"><strong>All quiet</strong>New assignments and case updates will show up here.</div>';
}
$('#bellBtn').addEventListener('click', () => {
    renderNotifs();
    $('#notifSheetOv').classList.add('show');
});
$('#notifReadAll').addEventListener('click', () => {
    lsSet(LS.notifs, lsGet(LS.notifs, []).map(n => Object.assign(n, { read: true })));
    markSeen(activeThread);
    renderNotifs(); renderNotifBadge();
});

/* ---------- detect new assignments / incoming msgs ---------- */
/* Keep availability in sync with the assignment list — including cases the
 * admin/resident resolved remotely, so the responder never stays stuck busy.
 * This only reacts to an actual change in the responder's active assignments,
 * so a manual Available / On Task pick is never reverted by the 5s poll. */
let AUTO_AVAIL_SIG = null;
function activeAssignmentSig(id) {
    return lsGet(LS.assignments, [])
        .filter(a => a.responderId === id && normStatus(a.status) !== 'resolved')
        .map(a => a.caseId).sort().join(',');
}
function reconcileAvailability() {
    const me = getMe(); if (!me) return;
    if (me.status === 'offline') return; // respect the responder's manual choice
    const sig = activeAssignmentSig(me.id);
    if (sig === AUTO_AVAIL_SIG) return;  // assignments unchanged → keep the manual pick
    AUTO_AVAIL_SIG = sig;
    const want = sig ? 'busy' : 'available';
    if ((me.status || 'available') !== want) {
        setMe({ id: me.id, status: want });
        postMyLocation();
    }
}
function checkNewAssignments() {
    const me = getMe(); if (!me) return;
    const key = 'rn_resp_seen_assign_' + me.id;
    const seen = lsGet(key, []);
    const mine = lsGet(LS.assignments, []).filter(a => a.responderId === me.id && !seen.includes(a.caseId));
    if (mine.length) {
        mine.forEach(a => {
            seen.push(a.caseId);
            pushNotif('🚨 New assignment', 'Case ' + a.caseId + ' (' + FLOW_LABEL[normStatus(a.status)] + '). Open Cases to acknowledge.');
            beep();
        });
        lsSet(key, seen);
        refreshAll();
    }
    reconcileAvailability();
}
function checkIncomingMsgs() {
    const me = getMe(); if (!me) return;
    const notified = lsGet('rn_resp_notified_msgs', []);
    let changed = false;
    lsGet(LS.messages, []).forEach(m => {
        if ((m.from === 'admin' || m.from === 'official') && !notified.includes(m.id)) {
            notified.push(m.id); changed = true;
            pushNotif('💬 ' + (m.name || 'Barangay Official'), m.text.slice(0, 90));
            beep();
        }
    });
    if (changed) lsSet('rn_resp_notified_msgs', notified.slice(-200));
    renderNotifBadge();
}

function ingestIncomingAlert(alert, notify) {
    if (!alert || !alert.id) return;
    const arr = lsGet(LS.alerts, []);
    const index = arr.findIndex(item => item.id === alert.id);
    const isNew = index < 0;
    if (isNew) arr.unshift(alert);
    else arr[index] = Object.assign({}, arr[index], alert);
    lsSet(LS.alerts, arr);

    const me = getMe();
    if (isNew && notify && me && !alert.resolvedAt
        && !['resolved', 'cancelled'].includes(String(alert.status || '').toLowerCase())) {
        const key = 'rn_resp_seen_alert_' + me.id;
        const seen = lsGet(key, []);
        if (!seen.includes(alert.id)) {
            seen.push(alert.id);
            lsSet(key, seen.slice(-300));
            pushNotif('🚨 SOS received', (alert.type || 'Emergency') + ' · ' + (alert.reporter && alert.reporter.name || 'Resident') + ' · Open Cases');
            beep();
        }
    }

    refreshAll();
    if (currentScreen === 'map') paintCases();
}

function ingestIncomingReport(report) {
    if (!report || !report.id) return;
    const reports = lsGet(LS.reports, []);
    const index = reports.findIndex(item => item.id === report.id);
    if (index < 0) reports.unshift(report);
    else reports[index] = Object.assign({}, reports[index], report);
    lsSet(LS.reports, reports);
    refreshAll();
    if (currentScreen === 'map') paintCases();
}

/* ---------- map ---------- */
const MAP = {
    map: null, caseLayer: [], byCase: {}, mine: null, focus: null,
    accLayer: [], accByCase: {},
    pov: false, routeLine: null, routeCaseId: null, bearingFrame: null,
    manualBearing: false, applyingBearing: false, lastFollowAt: 0,
    unitsLayer: [], unitsById: {}, showUnits: true
};

function hasMapRotation() {
    return !!(window.L && L.Map && typeof L.Map.prototype.setBearing === 'function');
}

function mapBearing() {
    return MAP.map && typeof MAP.map.getBearing === 'function' ? MAP.map.getBearing() : 0;
}

function animateMapBearing(target, duration) {
    if (!hasMapRotation() || !MAP.map) return;
    if (MAP.bearingFrame) cancelAnimationFrame(MAP.bearingFrame);
    const start = mapBearing();
    const delta = ((target - start + 540) % 360) - 180;
    const startedAt = performance.now();
    const ms = duration || 360;
    const step = now => {
        const progress = Math.min(1, (now - startedAt) / ms);
        const eased = 1 - Math.pow(1 - progress, 3);
        MAP.applyingBearing = true;
        MAP.map.setBearing(start + delta * eased);
        MAP.applyingBearing = false;
        if (progress < 1) MAP.bearingFrame = requestAnimationFrame(step);
        else MAP.bearingFrame = null;
    };
    MAP.bearingFrame = requestAnimationFrame(step);
}

function bearingBetween(from, to) {
    const rad = value => value * Math.PI / 180;
    const y = Math.sin(rad(to.lng - from.lng)) * Math.cos(rad(to.lat));
    const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat))
        - Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lng - from.lng));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function focusedNavigationCase() {
    const me = getMe();
    const c = MAP.focus ? findCase(MAP.focus) : null;
    if (!me || !c || !c.assign || c.assign.responderId !== me.id
        || normStatus(c.assign.status) === 'resolved' || c.resolvedAt || c.closedAt
        || !Number.isFinite(Number(c.latitude)) || !Number.isFinite(Number(c.longitude))) return null;
    return c;
}

function updatePovControls() {
    const toolbar = $('#povToolbar');
    const distance = $('#povDistance');
    if (!distance) return;
    const c = focusedNavigationCase();
    if (!c && MAP.pov) stopPovNavigation(false);
    if (toolbar) {
        toolbar.hidden = !c;
        toolbar.classList.toggle('navigating', MAP.pov && !!c);
    }
    distance.hidden = !(MAP.pov && c);
    if (MAP.pov && c) updatePovRoute(c);
}

function updatePovRoute(c) {
    if (!MAP.map || !ME_POS || !Number.isFinite(ME_POS.lat) || !Number.isFinite(ME_POS.lng)) return;
    const target = { lat: Number(c.latitude), lng: Number(c.longitude) };
    const points = [[ME_POS.lat, ME_POS.lng], [target.lat, target.lng]];
    if (MAP.routeLine && MAP.routeCaseId === c.id) {
        MAP.routeLine.setLatLngs(points);
    } else {
        if (MAP.routeLine) MAP.map.removeLayer(MAP.routeLine);
        MAP.routeLine = L.polyline(points, {
            className: 'pov-route-line',
            color: '#1677ff',
            weight: 6,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: '12 8',
            interactive: false
        }).addTo(MAP.map);
        MAP.routeCaseId = c.id;
    }
    const distance = metersBetween(ME_POS, target);
    const accuracy = Number(c.accuracy);
    const precision = Number.isFinite(accuracy) && accuracy > 0
        ? ' · resident fix ±' + Math.round(accuracy) + ' m' : '';
    $('#povDistance').textContent = 'Straight-line guidance · ' + fmtDist(distance) + precision;
}

function startPovNavigation() {
    const c = focusedNavigationCase();
    if (!c) { toast('Claim an SOS with a GPS location to start POV'); return; }
    if (!ME_POS || !Number.isFinite(ME_POS.lat) || !Number.isFinite(ME_POS.lng)) {
        toast('Waiting for your GPS location before starting POV');
        return;
    }
    MAP.pov = true;
    MAP.manualBearing = false;
    MAP.routeCaseId = null;
    if (MAP.map && hasMapRotation()) {
        animateMapBearing(bearingBetween(ME_POS, { lat: Number(c.latitude), lng: Number(c.longitude) }), 420);
    }
    updatePovControls();
    drawMine();
    MAP.map.flyTo([ME_POS.lat, ME_POS.lng], 17, { duration: 0.7 });
    updatePovRoute(c);
}

function stopPovNavigation(showMessage) {
    MAP.pov = false;
    MAP.manualBearing = false;
    MAP.lastFollowAt = 0;
    if (MAP.routeLine && MAP.map) MAP.map.removeLayer(MAP.routeLine);
    MAP.routeLine = null;
    MAP.routeCaseId = null;
    const toolbar = $('#povToolbar');
    const distance = $('#povDistance');
    if (toolbar) toolbar.classList.remove('navigating');
    if (distance) distance.hidden = true;
    drawMine();
    if (showMessage) toast('POV navigation ended');
}

/* Google Maps tiles rendered by Leaflet (matches the resident app).
 * Multi-tier fallback: Google → OSM → CARTO → Esri. */
function addTileLayer(map) {
    if (typeof L === 'undefined') return null;
    const primary = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'], maxZoom: 21, minZoom: 3,
        attribution: '&copy; Google Maps',
        crossOrigin: true
    });
    let stage = 1;
    primary.on('tileerror', function () {
        if (stage > 1) return;
        stage = 2;
        try { map.removeLayer(primary); } catch(e){}
        const fb = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            subdomains: 'abc', maxZoom: 19, minZoom: 3,
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);
        fb.on('tileerror', function () {
            if (stage > 2) return;
            stage = 3;
            try { map.removeLayer(fb); } catch(e){}
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
                subdomains: 'abcd', maxZoom: 19, minZoom: 3,
                attribution: '&copy; OSM &copy; CARTO'
            }).addTo(map);
        });
    });
    primary.addTo(map);
    return primary;
}

function ensureMap() {
    if (MAP.map || !window.L) return;
    // Smarter initial view: my GPS → last focused case → PH default
    let center = [13.3525, 123.7495], zoom = 13;
    if (ME_POS && isFinite(ME_POS.lat) && isFinite(ME_POS.lng)) { center = [ME_POS.lat, ME_POS.lng]; zoom = 15; }
    MAP.map = L.map('respMap', {
        zoomControl: false,
        attributionControl: true,
        tap: true,
        preferCanvas: false,
        rotate: hasMapRotation(),
        touchRotate: hasMapRotation()
    }).setView(center, zoom);
    if (hasMapRotation()) {
        MAP.map.on('rotate', () => {
            if (!MAP.applyingBearing && MAP.pov) MAP.manualBearing = true;
        });
    }
    addTileLayer(MAP.map);
    // Ensure tiles render correctly after the map container becomes visible
    setTimeout(() => { try { MAP.map && MAP.map.invalidateSize(); } catch(e){} }, 150);
}

/* Keep Leaflet's internal size in sync on mobile resize / orientation change —
 * the full-screen map container changes with the viewport. */
(function mapResizeSync() {
    let t = null;
    const sync = () => { clearTimeout(t); t = setTimeout(() => { try { MAP.map && MAP.map.invalidateSize(); } catch(e){} }, 140); };
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', () => setTimeout(sync, 220));
})();
function teardrop(color) {
    return L.divIcon({
        className: '', iconSize: [26, 34], iconAnchor: [13, 32], popupAnchor: [0, -30],
        html: '<div style="width:26px;height:34px;filter:drop-shadow(0 5px 8px rgba(0,0,0,.6));">' +
              '<svg viewBox="0 0 26 34"><path d="M13 1C6.8 1 2 5.7 2 11.7 2 19.5 13 33 13 33s11-13.5 11-21.3C24 5.7 19.3 1 13 1z" fill="' + color + '" stroke="#fff" stroke-width="1.6"/><circle cx="13" cy="12" r="4.4" fill="#102d5c"/></svg></div>'
    });
}

/* Precise-location marker used on the responder map.
 * Mirrors the resident app's crosshair + pulsing halo + readout pill so
 * both sides of an SOS see the same visual language for "this is where
 * the resident is standing right now, with ±Nm accuracy". */
function preciseCaseIcon(opts) {
    opts = opts || {};
    const tone = opts.tone || 'orange';               // orange | red | green | amber
    const acc = (typeof opts.accuracy === 'number' && isFinite(opts.accuracy))
              ? Math.max(3, Math.round(opts.accuracy))
              : null;
    const label = String(opts.label || 'SOS').toUpperCase().slice(0, 14);
    const TONE_COLORS = { orange: '#ff6500', red: '#dc2626', green: '#16a34a', amber: '#f59e0b' };
    const color = TONE_COLORS[tone] || TONE_COLORS.orange;
    const readClass  = tone === 'orange' ? '' : (' ' + tone);
    const accTxt = acc != null
        ? ('<span class="sep">·</span><span class="acc">' + acc + ' m</span>')
        : '';
    return L.divIcon({
        className: '',
        html: '<div class="precise-wrap">'
            + '<svg class="precise-pin" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">'
            +   '<ellipse cx="17" cy="42.5" rx="3" ry="1.2" fill="rgba(0,0,0,0.12)"/>'
            +   '<line x1="17" y1="33" x2="17" y2="41" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round"/>'
            +   '<path d="M11.5 23C11.5 28 17 33 17 33s5.5-5 5.5-10" fill="' + color + '" opacity="0.45"/>'
            +   '<circle cx="17" cy="15" r="12.5" fill="' + color + '" stroke="#ffffff" stroke-width="2.2"/>'
            +   '<circle cx="17" cy="15" r="5" fill="rgba(255,255,255,0.25)"/>'
            + '</svg>'
            + '<div class="precise-readout' + readClass + '">' + esc(label) + accTxt + '</div>'
            + '</div>',
        iconSize: [34, 44],
        iconAnchor: [17, 42],
        popupAnchor: [0, -38],
        tooltipAnchor: [0, -30]
    });
}

function paintCases() {
    ensureMap(); if (!MAP.map) return;
    MAP.caseLayer.forEach(m => MAP.map.removeLayer(m));
    MAP.caseLayer = [];
    MAP.byCase = {};
    MAP.accLayer.forEach(c => MAP.map.removeLayer(c));
    MAP.accLayer = [];
    MAP.accByCase = {};
    const spots = [];
    myCases().concat(unassignedOpen().map(a => Object.assign({}, a, { kind: a.kind || 'sos', assign: null }))).forEach(c => {
        if (!c.latitude || !c.longitude) return;
        const crit = /medical|fire|danger|flood|collapse/i.test(c.type || '');
        const resolved = (c.assign && c.assign.status === 'resolved') || !!c.resolvedAt || !!c.closedAt;
        /* Once an incident is resolved its pin is removed from the dispatch
         * map entirely (admin + responder). It still shows in the Cases /
         * history list, just not on the live map. */
        if (resolved) return;
        const unassigned = !c.assign;
        const vuln = isVulnCase(c);
        const vulns = (c.vulnerabilities && c.vulnerabilities.length ? c.vulnerabilities
                    : (c.reporter && c.reporter.vulnerabilities) ? c.reporter.vulnerabilities : []);
        /* Vulnerable-person pin: red ring on the map, elevated zIndex, and
         * a leading ⚠ badge in the readout label so it is obvious at a
         * glance, even when the case is currently Safe / informational. */
        const tone = resolved ? 'green' : (vuln || unassigned || crit) ? 'red' : 'orange';
        const colorHex = resolved ? '#16a34a' : (vuln || unassigned || crit) ? '#dc2626' : '#ff6500';
        const acc = (typeof c.accuracy === 'number' && isFinite(c.accuracy)) ? c.accuracy : null;
        const repName = (c.reporter || {}).name || c.reporterName || c.id;
        const baseLabel = unassigned ? (c.kind === 'household' ? 'HH' : 'SOS') : (resolved ? 'Done' : (c.type || 'SOS'));
        const finalLabel = (vuln ? '⚠ ' : '') + baseLabel;

        // Accuracy circle first, so the pin sits visually on top
        if (acc != null && acc > 0 && acc < 5000) {
            const ring = L.circle([c.latitude, c.longitude], {
                radius: acc,
                color: colorHex,
                weight: 1.5,
                dashArray: '4 3',
                fillColor: colorHex,
                fillOpacity: 0.14,
                opacity: 0.55,
                interactive: false
            }).addTo(MAP.map);
            MAP.accLayer.push(ring);
            MAP.accByCase[c.id] = ring;
        }

        const mk = L.marker([c.latitude, c.longitude], {
            icon: preciseCaseIcon({ tone, accuracy: acc, label: finalLabel }),
            zIndexOffset: vuln ? 1000 : (unassigned ? 900 : (resolved ? 200 : 700)),
            riseOnHover: true,
            title: repName
        }).addTo(MAP.map);
        /* No Leaflet popup — the floating .reporter-card is the single source
         * of reporter details on the map. A popup here duplicated that card
         * (an old design) and rendered between the card and the nav bar. */
        // Tap a marker to focus it — the reporter card below the map updates too
        (function (cid) { mk.on('click', function () { MAP.focus = cid; refreshReporterCard(); }); })(c.id);
        MAP.caseLayer.push(mk);
        MAP.byCase[c.id] = mk;
        spots.push([c.latitude, c.longitude]);
    });
    const _mapCaseCount = $('#mapCaseCount'); if (_mapCaseCount) _mapCaseCount.textContent = spots.length;
    // Auto-pick a sensible focus when none yet so the reporter card has content
    if (!MAP.focus || !findCase(MAP.focus)) MAP.focus = pickDefaultFocus();
    if (!MAP.focus && spots.length) MAP.map.fitBounds(spots, { padding: [40, 40] });
    drawMine();
    paintUnits();
    refreshReporterCard();
}

/* Choose the case most relevant to display in the reporter card */
function pickDefaultFocus() {
    const mine = myCases();
    const ongoing = mine.find(c => c.assign.status !== 'assigned' && c.assign.status !== 'resolved' && c.latitude);
    if (ongoing) return ongoing.id;
    const fresh = mine.find(c => c.assign.status === 'assigned' && c.latitude);
    if (fresh) return fresh.id;
    if (mine[0] && mine[0].latitude) return mine[0].id;
    const pool = unassignedOpen().find(a => a.latitude);
    return pool ? pool.id : null;
}

/* Populate (or hide) the reporter / resident card under the map */
function refreshReporterCard() {
    updatePovControls();
    const card = document.getElementById('reporterCard');
    if (!card) return;
    const caseId = MAP.focus;
    const c = caseId ? findCase(caseId) : null;
    if (!c) {
        /* Overlay layout: hiding the sheet just removes the floating card —
         * the map's rendered size is unchanged (map-box is absolute inset: 0),
         * so no Leaflet.invalidateSize() is needed. Also clear `.entering`
         * so a stale animation doesn't leak into the next show. */
        card.classList.remove('entering');
        card.hidden = true;
        return;
    }

    const rep = c.reporter || {};
    const rawName = rep.name || c.reporterName || 'Resident';
    const name = String(rawName).trim() || 'Resident';
    const phone = String(rep.phone || '').trim();
    const address = rep.address || c.location || '';
    const purok = (rep.purok && rep.purok !== '—') ? rep.purok : '';
    const vulns = Array.isArray(rep.vulnerabilities) ? rep.vulnerabilities : [];
    const ini = (name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('') || 'R').toUpperCase();

    const avatar = document.getElementById('repAvatar');
    if (avatar) avatar.textContent = ini;
    const nameEl = document.getElementById('repName');
    if (nameEl) nameEl.textContent = name;

    const bits = [];
    if (purok) bits.push('Purok ' + purok);
    if (address && address !== '—') bits.push(address);
    if (c.type) bits.push(c.type);
    const subEl = document.getElementById('repSub');
    if (subEl) subEl.textContent = bits.join(' · ') || 'Address pending';

    const tagsEl = document.getElementById('repTags');
    if (tagsEl) {
        const t = [];
        if (c.assign && c.assign.status) t.push('<span class="rep-tag">' + esc(FLOW_LABEL[c.assign.status] || c.assign.status) + '</span>');
        else t.push('<span class="rep-tag">Unassigned</span>');
        vulns.slice(0, 3).forEach(v => t.push('<span class="rep-tag vul">⚠ ' + esc(v) + '</span>'));
        if (c.accuracy) t.push('<span class="rep-tag">' + esc(String(Math.round(c.accuracy))) + ' m</span>');
        tagsEl.innerHTML = t.join('');
    }

    const btn = document.getElementById('callResidentBtn');
    const lbl = document.getElementById('callBtnLbl');
    const sms = document.getElementById('repSms');
    if (btn && lbl) {
        const first = (name.split(/\s+/)[0] || 'Resident');
        if (phone) {
            btn.setAttribute('href', 'tel:' + phone.replace(/[^0-9+]/g, ''));
            btn.classList.remove('no-num');
            lbl.textContent = 'Call ' + first;
            if (sms) sms.hidden = true;
        } else {
            btn.removeAttribute('href');
            btn.classList.add('no-num');
            lbl.textContent = 'No phone on file';
            if (sms) sms.hidden = false;
        }
    }

    /* Overlay layout: the sheet floats above the map (map-box is absolute
     * inset: 0), so toggling the sheet's visibility does NOT change the
     * map's rendered size — no Leaflet.invalidateSize() needed here. The
     * only invalidate triggers left are the topbar-hide on screen entry
     * and window resize / orientation changes, both handled elsewhere. */
    const wasHidden = card.hidden;
    card.hidden = false;
    /* One-shot entry animation ONLY when the sheet transitions hidden →
     * visible. Applying `.entering` here (rather than leaving the keyframe
     * on the base rule) prevents the animation from replaying at drag-end,
     * which was the source of the perceived “bounce” when releasing the
     * handle after a snap. The class self-removes on animationend so a
     * subsequent re-show can start fresh. */
    if (wasHidden) {
        card.classList.remove('entering');
        /* Force a reflow so re-adding `.entering` reliably restarts the
         * keyframe even on rapid hide/show cycles. */
        void card.offsetWidth;
        card.classList.add('entering');
        card.addEventListener('animationend', function onEnd(e) {
            if (e.animationName !== 'respSheetIn') return;
            card.classList.remove('entering');
            card.removeEventListener('animationend', onEnd);
        });
    }
    /* Open the sheet at (at least) the height that keeps the Call / Comms
     * buttons clear of the nav pill — see openSheet() in wireSheetDrag. */
    if (wasHidden) {
        if (window.RNResponderSheetOpen) window.RNResponderSheetOpen();
    } else if (window.RNResponderSheetFloor) {
        window.RNResponderSheetFloor();
    }
}

/* Wire the “open Comms” button once the DOM is ready */
(function wireMsgBtn() {
    const b = document.getElementById('msgResidentBtn');
    if (!b) return;
    b.addEventListener('click', () => {
        if (!MAP.focus) { toast('No case selected on the map'); return; }
        openThread(MAP.focus);
    });
})();

/* Draggable floating overlay sheet — pointer events on .sheet-handle resize
 * the reporter card and snap to three stops (peek / default / expanded).
 *
 * Because the sheet is an overlay (`.reporter-card { position: absolute;
 * bottom: 0 }`) and the map is `.map-box { position: absolute; inset: 0 }`,
 * the map's rendered size is constant no matter where the sheet is. The
 * sheet simply floats higher or lower over the tiles — Leaflet never has
 * to re-project anything during or after the gesture, which is what makes
 * this feel much smoother than the previous stacked layout.
 *
 * Implementation notes:
 *   • Shell + card geometry is cached at pointerdown so pointermove never
 *     calls getBoundingClientRect(). Reading layout mid-gesture forces a
 *     synchronous reflow of the whole document.
 *   • pointermove only updates a `targetH` variable; a rAF loop eases the
 *     actual painted `currentH` toward it (critically-damped exponential),
 *     collapsing 120+ Hz pointer events into one style write per frame and
 *     filtering touch jitter.
 *   • The card is tagged with `.dragging` which enables `will-change: height`
 *     (see CSS) so the compositor promotes it to its own layer instead of
 *     repainting the map / dock / status chrome every frame. */
(function wireSheetDrag() {
    const card = document.getElementById('reporterCard');
    if (!card) return;
    const handle = card.querySelector('.sheet-handle');
    if (!handle) return;
    const shell = card.parentElement;   /* .map-shell */
    const MIN = 0.08, MAX = 0.75;       /* absolute floor / ceiling fractions */
    const EXPANDED = 0.70;              /* fully-expanded snap stop */
    const MIN_GAP = 26;                 /* px kept visible above the dock */
    const dock = document.getElementById('dock');
    const actions = card.querySelector('.rep-actions');  /* Call / Comms row */
    /* Two measured heights drive the sheet:
     *  - minFrac  : the LOWEST the sheet may be dragged. Its TOP edge stops
     *               just above the nav pill, so most of the sheet slides
     *               BEHIND the pill while its top (handle + reporter row)
     *               stays visible just above the nav bar.
     *  - openFrac : the height the sheet OPENS at — tall enough that the
     *               whole "Reported by" header AND the Call / Comms buttons
     *               sit clear of the pill.
     * Both are measured live (never a fixed %) because the dock's height
     * depends on the device's safe-area insets and the header block grows
     * with its content. */
    let minFrac = MIN;
    let openFrac = MIN;
    function measureFloors() {
        if (!dock || !shell) return;
        const shellRect = shell.getBoundingClientRect();
        const dockRect = dock.getBoundingClientRect();
        if (!shellRect.height) return;
        const h = shellRect.height;
        /* Shell bottom → dock top, i.e. how much of the sheet the pill covers. */
        const behindPx = Math.max(0, shellRect.bottom - dockRect.top);
        /* Lowest drag: only the sheet's TOP edge has to clear the pill. */
        minFrac = Math.min(MAX, Math.max(MIN, (behindPx + MIN_GAP) / h));
        /* Opening height: the Call / Comms row clears the pill as well. */
        const openPx = behindPx + (actions ? actions.offsetTop + actions.offsetHeight : 0);
        openFrac = Math.min(MAX, Math.max(minFrac, (openPx + MIN_GAP) / h));
    }
    let dragging = false, startY = 0, startH = 0, cachedShellH = 0;
    /* rAF-driven smoothing: `targetH` is the pixel height the finger wants,
     * `currentH` is the pixel height we're actually painting. Every frame
     * we ease currentH toward targetH by a small fraction (alpha). This
     * gives the sheet a soft, weighted physicality — pointer jitter gets
     * filtered, redundant style writes are collapsed to one per frame,
     * and high-poll-rate mice / 120 Hz touch screens don't overwhelm the
     * compositor. */
    let targetH = 0, currentH = 0, rafId = null;
    const EASE = 0.32;                              /* ~60% of the gap covered in 3 frames at 60fps */
    const EASE_EPS = 0.5;                           /* stop interpolating once within half a pixel */

    function applyPx(px) {
        if (!cachedShellH) return;
        const clamped = Math.max(minFrac * cachedShellH, Math.min(MAX * cachedShellH, px));
        card.style.height = ((clamped / cachedShellH) * 100).toFixed(2) + '%';
    }
    function apply(r) {
        if (!cachedShellH) return;
        const clamped = Math.max(minFrac, Math.min(MAX, r));
        card.style.height = (clamped * 100).toFixed(2) + '%';
    }
    /* Snap targets: the peek (lowest), the comfortable open height, and the
     * fully-expanded height. The first two are measured live, so both the
     * peek stop and the open stop follow the device's real dock geometry. */
    function snapStops() {
        const s = [minFrac, openFrac, EXPANDED];
        s.sort((a, b) => a - b);
        return s;
    }
    function nearest(r) {
        const list = snapStops();
        let best = list[0], bd = Math.abs(list[0] - r);
        for (let i = 1; i < list.length; i++) {
            const d = Math.abs(list[i] - r);
            if (d < bd) { bd = d; best = list[i]; }
        }
        return best;
    }
    /* Open the sheet at its comfortable height. Called only when the card
     * transitions hidden → visible, so a height the user dragged to is never
     * overridden by a periodic refresh. */
    function openSheet() {
        if (card.hidden) return;
        const sh = shell ? shell.getBoundingClientRect().height : 0;
        if (!sh) return;
        cachedShellH = sh;
        measureFloors();
        apply(openFrac);
    }
    /* Keep the sheet from ever resting below the peek stop after a viewport
     * change (rotate / resize). It only ever raises the sheet. */
    function enforceFloor() {
        if (card.hidden) return;
        const sh = shell ? shell.getBoundingClientRect().height : 0;
        if (!sh) return;
        cachedShellH = sh;
        measureFloors();
        if (card.getBoundingClientRect().height / sh < minFrac) apply(minFrac);
    }
    window.addEventListener('resize', enforceFloor);
    window.addEventListener('orientationchange', function () { setTimeout(enforceFloor, 80); });
    window.RNResponderSheetFloor = enforceFloor;
    window.RNResponderSheetOpen = openSheet;
    /* Overlay layout note: no Leaflet.invalidateSize() is needed at drag
     * end because the map's rendered size is unchanged — the sheet just
     * floats higher or lower over a fixed-size tile canvas. */

    function tick() {
        if (!dragging) { rafId = null; return; }
        /* Critically-damped exponential ease: current moves a fixed fraction
         * of the remaining distance each frame, so the sheet accelerates
         * toward the finger and settles softly without overshoot. */
        const delta = targetH - currentH;
        if (Math.abs(delta) < EASE_EPS) {
            currentH = targetH;
        } else {
            currentH += delta * EASE;
        }
        /* One style write per frame, at most. */
        card.style.height = ((currentH / cachedShellH) * 100).toFixed(2) + '%';
        rafId = requestAnimationFrame(tick);
    }

    function beginDrag(e) {
        if (dragging) return;
        dragging = true;
        startY = e.clientY;
        /* Cache geometry ONCE — pointermove never touches layout again. */
        cachedShellH = shell ? shell.getBoundingClientRect().height : 0;
        if (!cachedShellH) { dragging = false; return; }
        measureFloors();
        startH = card.getBoundingClientRect().height;
        currentH = targetH = startH;
        card.classList.add('dragging');
        try { handle.setPointerCapture(e.pointerId); } catch (_) {}
        if (e.cancelable) e.preventDefault();
        /* Start the interpolation loop. */
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tick);
    }
    function moveDrag(e) {
        if (!dragging) return;
        /* Just record the finger's desired height. tick() paints it. */
        const dy = startY - e.clientY;                /* drag up = grow */
        targetH = Math.max(
            minFrac * cachedShellH,
            Math.min(MAX * cachedShellH, startH + dy)
        );
    }
    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        try { if (e && e.pointerId != null) handle.releasePointerCapture(e.pointerId); } catch (_) {}
        const cur = cachedShellH ? currentH / cachedShellH : openFrac;
        const target = nearest(cur);
        /* Order matters for the snap animation: drop the `.dragging` class
         * FIRST so the CSS `transition: height .32s` is re-enabled, then
         * apply the snap target on the very next frame. If we do both in
         * the same task the browser sees one style mutation with the old
         * `transition: none` still effective and the height jumps instantly. */
        card.classList.remove('dragging');
        requestAnimationFrame(function () {
            apply(target);
        });
    }

    handle.addEventListener('pointerdown', beginDrag);
    handle.addEventListener('pointermove', moveDrag);
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
    /* Fallback listeners on document — some Android WebViews drop pointer
     * capture as soon as the pointer leaves the capturing element, so we
     * still track move/up at the document level while a drag is active. */
    document.addEventListener('pointermove', moveDrag, { passive: true });
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) endDrag({ pointerId: null });
    });
    handle.addEventListener('dblclick', function () {
        /* Double-tap cycles through the snap positions (peek → open →
         * expanded). Because `.dragging` is off, the CSS transition on the
         * sheet's height is already active — the target set here animates
         * smoothly. Overlay layout means no Leaflet.invalidateSize(). */
        const sh = shell ? shell.getBoundingClientRect().height : 0;
        if (!sh) return;
        const cur = card.getBoundingClientRect().height / sh;
        cachedShellH = sh;
        measureFloors();
        const list = snapStops();
        let next = list[0];
        for (const s of list) if (s > cur + 0.02) { next = s; break; }
        apply(next);
    });
})();

function focusCase(caseId) {
    ensureMap(); if (!MAP.map) return;
    const c = findCase(caseId);
    if (!c || !c.latitude) { toast('This case has no geotag'); return; }
    MAP.focus = caseId;
    // Zoom close enough to see the ±Nm accuracy ring as a tight target circle
    const acc = (typeof c.accuracy === 'number' && c.accuracy > 0) ? c.accuracy : 20;
    const zoom = acc <= 20 ? 19 : acc <= 50 ? 18 : acc <= 120 ? 17 : 16;
    MAP.map.flyTo([c.latitude, c.longitude], zoom, { duration: 1.1 });
    refreshReporterCard();
}
document.addEventListener('rnfocus', e => { focusCase(e.detail); });
function drawMine() {
    ensureMap(); if (!MAP.map || !ME_POS) return;
    const acc = (typeof ME_POS.acc === 'number' && ME_POS.acc > 0) ? ME_POS.acc : null;
    const icon = MAP.pov
        ? L.divIcon({ className: 'pov-location-marker', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 14] })
        : preciseCaseIcon({ tone: 'amber', accuracy: acc, label: 'Me' });
    if (MAP.mine) {
        // Move the existing marker instead of remove/re-add (keeps animations smooth)
        MAP.mine.setLatLng([ME_POS.lat, ME_POS.lng]);
        try { MAP.mine.setIcon(icon); } catch(e){}
        MAP.mine.setPopupContent('<b>You · responder unit</b><br>'
            + ME_POS.lat.toFixed(6) + ', ' + ME_POS.lng.toFixed(6)
            + (acc != null ? '<br>' + Math.round(acc) + ' m' : ''));
    } else {
        MAP.mine = L.marker([ME_POS.lat, ME_POS.lng], {
            icon, zIndexOffset: 1100, title: 'You'
        }).addTo(MAP.map).bindPopup('<b>You · responder unit</b><br>'
            + ME_POS.lat.toFixed(6) + ', ' + ME_POS.lng.toFixed(6)
            + (acc != null ? '<br>' + Math.round(acc) + ' m' : ''));
    }
    if (MAP.pov) {
        const c = focusedNavigationCase();
        if (c) {
            updatePovRoute(c);
            const now = Date.now();
            if (now - MAP.lastFollowAt > 900) {
                MAP.lastFollowAt = now;
                MAP.map.panTo([ME_POS.lat, ME_POS.lng], { animate: true, duration: 0.45 });
            }
            if (!MAP.manualBearing && hasMapRotation() && Number.isFinite(ME_POS.heading)
                && Number.isFinite(ME_POS.speed) && ME_POS.speed > 0.8) {
                animateMapBearing(-ME_POS.heading, 500);
            }
        }
    }
}

/* ---------- other responder units on the map ----------
 * Every responder that has pushed a live GPS fix to the server is drawn as a
 * unit pin so this responder can see the whole team's positions. Only live
 * fixes are used (a 15-minute staleness cut-off, matching the server's
 * nearest-responder rule) so stale seed coordinates never create fake pins. */
const RESP_LOC_STALE_MS = 15 * 60 * 1000;

function liveResponderLocations() {
    const cache = lsGet(LS.respLoc, {}) || {};
    const now = Date.now();
    const out = [];
    Object.keys(cache).forEach(id => {
        const loc = cache[id];
        if (!loc) return;
        const lat = Number(loc.lat), lng = Number(loc.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const at = Date.parse(loc.updatedAt || '');
        if (!Number.isFinite(at) || now - at > RESP_LOC_STALE_MS || at > now + 60 * 1000) return;
        out.push({
            id: String(id), lat, lng,
            name: loc.name || id, role: loc.role || '',
            status: String(loc.status || 'available').toLowerCase(),
            updatedAt: loc.updatedAt
        });
    });
    return out;
}

function otherUnits() {
    const me = getMe();
    return liveResponderLocations().filter(u => !me || u.id !== me.id);
}

function unitsIcon(u) {
    const tone = u.status === 'busy' ? ' busy' : (u.status && u.status !== 'available' ? ' offline' : '');
    return L.divIcon({
        className: 'unit-marker' + tone,
        html: '<span>' + esc(initials(u.name)) + '</span>',
        iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -15]
    });
}

function unitsPopup(u) {
    const dist = ME_POS ? fmtDist(metersBetween(ME_POS, { lat: u.lat, lng: u.lng })) : null;
    return '<b>' + esc(u.name) + (u.role ? ' · ' + esc(u.role) : '') + '</b>'
        + '<br><span style="color:#6b83a0">' + esc(u.status) + ' · ' + ago(u.updatedAt) + '</span>'
        + (dist ? '<br><span style="color:#6b83a0">' + dist + ' from you</span>' : '');
}

function paintUnits() {
    ensureMap(); if (!MAP.map) return;
    const units = MAP.showUnits ? otherUnits() : [];
    const seen = {};
    units.forEach(u => {
        seen[u.id] = true;
        const icon = unitsIcon(u);
        let mk = MAP.unitsById[u.id];
        if (mk) {
            mk.setLatLng([u.lat, u.lng]);
            try { mk.setIcon(icon); } catch (e) {}
            mk.setPopupContent(unitsPopup(u));
        } else {
            mk = L.marker([u.lat, u.lng], { icon, zIndexOffset: 500, title: u.name })
                .addTo(MAP.map).bindPopup(unitsPopup(u));
            MAP.unitsLayer.push(mk);
            MAP.unitsById[u.id] = mk;
        }
    });
    Object.keys(MAP.unitsById).forEach(id => {
        if (seen[id]) return;
        const mk = MAP.unitsById[id];
        try { MAP.map.removeLayer(mk); } catch (e) {}
        MAP.unitsLayer = MAP.unitsLayer.filter(m => m !== mk);
        delete MAP.unitsById[id];
    });
    const btn = $('#unitsBtn');
    if (btn) btn.classList.toggle('active', MAP.showUnits);
}

/* Pull the live responder position set (same source the resident app uses). */
async function fetchResponderUnits() {
    try {
        const r = await fetch(API_BASE + '/api/responder-locations', { cache: 'no-store' });
        if (!r.ok) return;
        const data = await r.json();
        if (!data || typeof data !== 'object') return;
        const prev = lsGet(LS.respLoc, {});
        if (JSON.stringify(data) === JSON.stringify(prev)) return;
        lsSet(LS.respLoc, data);
        if (typeof currentScreen !== 'undefined' && currentScreen === 'map') paintUnits();
    } catch (e) {}
}

function toggleUnits() {
    MAP.showUnits = !MAP.showUnits;
    paintUnits();
    if (MAP.showUnits && !otherUnits().length) toast('No other responders are sharing a live location yet');
}

/* Bind a click handler only when the control exists. The rotation buttons are
 * only present on the full responder page; the Capacitor index.html does not
 * include them. Guarding keeps this script from throwing here on a page
 * without them, which would otherwise abort the realtime (SSE / long-poll)
 * and polling wiring defined further below. */
function bindClick(id, handler) {
    const el = $('#' + id);
    if (el) el.addEventListener('click', handler);
}
bindClick('recenterBtn', () => {
    ensureMap(); if (!MAP.map) return;
    if (ME_POS) MAP.map.flyTo([ME_POS.lat, ME_POS.lng], 16);
    else toast('Waiting for your GPS fix…');
});
bindClick('unitsBtn', toggleUnits);
bindClick('rotateLeftBtn', () => {
    if (!MAP.map || !hasMapRotation()) { toast('Map rotation is unavailable'); return; }
    MAP.manualBearing = true;
    animateMapBearing(mapBearing() - 20);
});
bindClick('rotateRightBtn', () => {
    if (!MAP.map || !hasMapRotation()) { toast('Map rotation is unavailable'); return; }
    MAP.manualBearing = true;
    animateMapBearing(mapBearing() + 20);
});
bindClick('rotateNorthBtn', () => {
    if (!MAP.map || !hasMapRotation()) { toast('Map rotation is unavailable'); return; }
    MAP.manualBearing = true;
    animateMapBearing(0);
});

/* ---------- own live position ---------- */
function setGpsChip(state, txt) {
    const _gpsChip = $('#myGpsChip'), _gpsLbl = $('#myGpsLbl');
    if (_gpsChip) _gpsChip.className = 'chip ' + state;
    if (_gpsLbl) _gpsLbl.textContent = txt;
}
function setLocationPermissionState(state) {
    const label = $('#permState');
    if (!label) return;
    const text = {
        checking: 'Checking device permission…',
        granted: 'Allowed · live responder location is active',
        prompt: 'Tap to allow live responder location',
        denied: 'Denied · tap to open app settings',
        unsupported: 'Location is not available on this device'
    };
    label.textContent = text[state] || text.prompt;
}
function rosterPos() {
    const me = getMe();
    return me && me.lat ? { lat: me.lat, lng: me.lng, acc: 0 } : null;
}
/* Push the current fix to the server. Shared by the GPS watch callback and
 * the keep-alive heartbeat so admin + resident always see a fresh position. */
function postMyLocation() {
    const me = getMe();
    if (!me || !ME_POS) return;
    fetch(API_BASE + '/api/responder-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responderId: me.id, lat: ME_POS.lat, lng: ME_POS.lng, accuracy: (ME_POS.acc || null), name: me.name || me.id, role: me.role || '', status: me.status || 'available', updatedAt: new Date().toISOString() })
    }).catch(() => {});
}
function startOwnWatch() {
    ME_POS = ME_POS || rosterPos();
    if (ME_POS) { setGpsChip('live', 'Using last known position'); }
    const hasWeb = !!navigator.geolocation;
    if (!(window.RNLocation || hasWeb)) { setGpsChip('searching', 'GPS unavailable on device'); return; }
    const prefs = lsGet(LS.prefs, {});
    if (prefs.loc === false) { setGpsChip('searching', 'Location sharing is off'); return; }

    const onOk = (pos) => {
        ME_POS = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            acc: pos.coords.accuracy,
            heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
            speed: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null
        };
        setGpsChip('live', ME_POS.lat.toFixed(5) + ', ' + ME_POS.lng.toFixed(5) + ' ' + Math.round(pos.coords.accuracy || 0) + 'm');
        lsSet('rn_responder_location', Object.assign({ responderId: (getMe() || {}).id, at: new Date().toISOString() }, ME_POS));
        const me = getMe();
        if (me) {
            setMe({ id: me.id, lat: ME_POS.lat, lng: ME_POS.lng });
            // Push live location to server so admin map updates in real-time
            postMyLocation();
        }
        drawMine();
        broadcast('rn_responder_loc');
    };
    const onErr = () => { setGpsChip('searching', 'GPS weak — using roster position'); ME_POS = ME_POS || rosterPos(); };
    const opts = { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000, minimumUpdateInterval: 3000 };

    if (window.RNLocation) {
        setLocationPermissionState('checking');
        RNLocation.ensurePermission().then(granted => {
            if (!granted) {
                setLocationPermissionState('denied');
                setGpsChip('searching', 'Location permission is needed');
                onErr();
                return;
            }
            setLocationPermissionState('granted');
            startOwnWatch._w = RNLocation.watchPosition(onOk, onErr, opts);
        }).catch(error => {
            console.warn('[RescueNet] Could not request location permission:', error);
            setLocationPermissionState('denied');
            setGpsChip('searching', 'Location permission is needed');
        });
    } else {
        startOwnWatch._w = navigator.geolocation.watchPosition(onOk, onErr, opts);
    }
}

/* ---------- profile & settings ---------- */
function renderProfile() {
    const me = getMe(); if (!me) return;
    $('#pfAvatar').textContent = initials(me.name);
    $('#pfName').textContent = me.name;
    $('#pfRole').textContent = me.role + ' · ' + me.skill;
    $('#pfId').textContent = me.id + ' · Barangay Taculing';
    const mine = myCases();
    const done = mine.filter(c => c.assign.status === 'resolved');
    $('#pfDone').textContent = done.length;
    $('#pfActiveN').textContent = mine.filter(c => c.assign.status !== 'resolved').length;
    let avg = '—';
    if (done.length) {
        const secs = done.map(c => {
            const h = c.assign.history || [];
            const a0 = h[0] ? new Date(h[0].at) : new Date(c.assign.assignedAt);
            const a1 = new Date(c.assign.updatedAt || c.assign.assignedAt);
            return (a1 - a0) / 1000;
        }).filter(s => s > 0);
        if (secs.length) { const m = Math.round(secs.reduce((x, y) => x + y, 0) / secs.length / 60); avg = m < 60 ? m + 'm' : (m / 60).toFixed(1) + 'h'; }
    }
    $('#pfRate').textContent = avg;
    $('#pfAccount').innerHTML =
        dRow('Full name', me.name) + dRow('Responder role', me.role) +
        dRow('Specialization', me.skill) + dRow('Contact', me.phone) +
        dRow('Email', me.email || '—') + dRow('Responder ID', me.id, true) +
        dRow('Availability', me.status) + dRow('On the team since', me.joined || '—') +
        dRow('Open assignments', String(mine.filter(c => c.assign.status !== 'resolved').length)) + dRow('Completed total', String(done.length));
    const prefs = lsGet(LS.prefs, {});
    $('#setNotif').checked = prefs.notif !== false;
    $('#setSound').checked = prefs.sound !== false;
    $('#setLoc').checked = prefs.loc !== false;
}
const dRow = (k, v, mono) => '<div class="d"><div class="d-k">' + esc(k) + '</div><div class="d-v' + (mono ? ' mono' : '') + '">' + esc(v || '—') + '</div></div>';
[['setNotif', 'notif'], ['setSound', 'sound'], ['setLoc', 'loc']].forEach(([id, key]) => {
    $('#' + id).addEventListener('change', e => {
        const prefs = lsGet(LS.prefs, {});
        prefs[key] = e.target.checked;
        lsSet(LS.prefs, prefs);
        toast(e.target.checked ? 'Setting enabled' : 'Setting disabled');
        if (key === 'loc') {
            const id = startOwnWatch._w;
            if (id !== null && id !== undefined) {
                if (window.RNLocation) RNLocation.clearWatch(id);
                else if (navigator.geolocation) navigator.geolocation.clearWatch(id);
            }
            startOwnWatch._w = null;
            startOwnWatch();
        }
    });
});
(function permProbe() {
    async function refreshPermissionState() {
        if (window.RNLocation) {
            setLocationPermissionState(await RNLocation.getPermissionStatus());
            return;
        }
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const permission = await navigator.permissions.query({ name: 'geolocation' });
                setLocationPermissionState(permission.state);
                permission.onchange = () => setLocationPermissionState(permission.state);
                return;
            } catch (error) {
                console.warn('[RescueNet] Could not check location permission:', error);
            }
        }
        setLocationPermissionState(navigator.geolocation ? 'prompt' : 'unsupported');
    }

    refreshPermissionState();
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) refreshPermissionState();
    });
    $('#permRow').addEventListener('click', async () => {
        try {
            if (window.RNLocation) {
                const granted = await RNLocation.ensurePermission();
                if (!granted) {
                    setLocationPermissionState('denied');
                    const openedSettings = await RNLocation.openAppSettings();
                    toast(openedSettings ? 'Enable location permission in app settings' : 'Allow location permission to share your position');
                    return;
                }
                await RNLocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
                setLocationPermissionState('granted');
                if (getMe() && lsGet(LS.prefs, {}).loc !== false) startOwnWatch();
                toast('Location permission granted');
            } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(() => {
                    setLocationPermissionState('granted');
                    toast('Location permission granted');
                }, () => {
                    setLocationPermissionState('denied');
                    toast('Allow location permission to share your position');
                }, { timeout: 8000 });
            } else {
                setLocationPermissionState('unsupported');
                toast('Location is not available on this device');
            }
        } catch (error) {
            console.warn('[RescueNet] Location permission request failed:', error);
            setLocationPermissionState('denied');
            toast('Allow location permission to share your position');
        }
    });
})();
$('#logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem(LS.me);
    toast('Off duty — logging out…', 1200);
    setTimeout(() => location.reload(), 900);
});

/* ---------- refresh orchestration ---------- */
function refresh(key) {
    if (!getMe()) return;
    renderAvail(); renderHome(); renderCases(); renderComms(); renderProfile(); renderNotifBadge();
    if (key === 'map') paintCases();
}
function refreshAll() { refresh(currentScreen); }

/* ---------- remote ingest (other devices via Node API) ---------- */
async function pullRemote() {
    try {
        const r = await fetch(API_BASE + '/api/alerts');
        if (r.ok) {
            const data = await r.json();
            const arr = lsGet(LS.alerts, []);
            let changed = false;
            (Array.isArray(data) ? data : []).forEach(a => {
                if (!a || !a.id) return;
                const index = arr.findIndex(x => x.id === a.id);
                if (index < 0) {
                    arr.unshift(a);
                    changed = true;
                    const createdAt = Date.parse(a.createdAt || '');
                    const isRecent = Number.isFinite(createdAt) && Date.now() - createdAt <= 30 * 60 * 1000;
                    if (isRecent) ingestIncomingAlert(a, true);
                } else {
                    const merged = Object.assign({}, arr[index], a);
                    if (JSON.stringify(merged) !== JSON.stringify(arr[index])) {
                        arr[index] = merged;
                        changed = true;
                    }
                }
            });
            if (changed) { lsSet(LS.alerts, arr); checkNewAssignments(); refreshAll(); }
        }
    } catch (e) {}
    try {
        const rr = await fetch(API_BASE + '/api/reports', { cache: 'no-store' });
        if (rr.ok) {
            const remote = await rr.json();
            if (Array.isArray(remote)) remote.forEach(ingestIncomingReport);
        } else {
            console.warn('[RescueNet] Reports sync failed with HTTP', rr.status);
        }
    } catch (e) {
        console.warn('[RescueNet] Reports sync failed:', e);
    }
    // Also pull assignments from server (admin dispatches on different device)
    try {
        const ar = await fetch(API_BASE + '/api/assignments', { cache: 'no-store' });
        if (ar.ok) {
            const remote = await ar.json();
            const local = lsGet(LS.assignments, []);
            let changed = false;
            (Array.isArray(remote) ? remote : []).forEach(a => {
                if (!a || !a.caseId) return;
                const idx = local.findIndex(x => x.caseId === a.caseId && x.responderId === a.responderId);
                if (idx < 0) { local.unshift(a); changed = true; }
                else {
                    /* Already resolved on this device → keep it in History and
                     * ignore the stale/duplicate remote record. */
                    if (normStatus(local[idx].status) === 'resolved') return;
                    const remoteAt = Date.parse(a.updatedAt || a.assignedAt || '');
                    const localAt = Date.parse(local[idx].updatedAt || local[idx].assignedAt || '');
                    if (!Number.isFinite(localAt) || (Number.isFinite(remoteAt) && remoteAt > localAt)) {
                        local[idx] = a;
                        changed = true;
                    }
                }
            });
            if (changed) { lsSet(LS.assignments, local); checkNewAssignments(); refreshAll(); }
        } else {
            console.warn('[RescueNet] Assignments sync failed with HTTP', ar.status);
        }
    } catch (e) { console.warn('[RescueNet] Assignments sync failed:', e); }
    /* Pull household safety statuses so the resident's Need Assistance /
     * Missing flags (with precise GPS) surface on the responder map even
     * when the admin hasn't dispatched a specific responder yet. */
    try {
        const hr = await fetch(API_BASE + '/api/households');
        if (hr.ok) {
            const remote = await hr.json();
            const local = lsGet(LS.households, []);
            let changed = false;
            (Array.isArray(remote) ? remote : []).forEach(h => {
                if (!h || !h.id) return;
                const idx = local.findIndex(x => x.id === h.id);
                if (idx < 0) { local.unshift(h); changed = true; }
                else if (new Date(h.updatedAt || 0) > new Date(local[idx].updatedAt || 0)) { local[idx] = { ...local[idx], ...h }; changed = true; }
            });
            if (changed) { lsSet(LS.households, local); refreshAll(); if (typeof currentScreen !== 'undefined' && currentScreen === 'map') paintCases(); }
        }
    } catch (e) {}
    // Team positions — draw every other live responder on the map
    fetchResponderUnits();
}

/* ---------- realtime listeners ---------- */
try {
    const bc = new BroadcastChannel('rescuenet');
    bc.onmessage = () => { checkNewAssignments(); checkIncomingMsgs(); refreshAll(); if (currentScreen === 'map') paintCases(); };
} catch (e) {}
window.addEventListener('storage', () => { checkNewAssignments(); checkIncomingMsgs(); refreshAll(); });

/* ---------- Server-Sent Events (real-time push) ---------- */
(function connectResponderSSE() {
    let es;
    try { es = new EventSource(API_BASE + '/api/events'); } catch(e) { return; }

    es.addEventListener('new_alert', function(ev) {
        try {
            const alert = JSON.parse(ev.data);
            ingestIncomingAlert(alert, true);
        } catch(e){}
    });

    es.addEventListener('new_report', function(ev) {
        try { ingestIncomingReport(JSON.parse(ev.data)); }
        catch(e) { console.warn('[RescueNet] Could not process incoming report:', e); }
    });

    es.addEventListener('assignment_updated', function(ev) {
        try {
            const asgn = JSON.parse(ev.data);
            const me = getMe();
            if (me && asgn.responderId === me.id) {
                // Never re-open a case this responder already resolved.
                if (isResolvedLocally(asgn.caseId) && normStatus(asgn.status) !== 'resolved') return;
                const list = lsGet(LS.assignments, []);
                const idx = list.findIndex(a => a.caseId === asgn.caseId && a.responderId === asgn.responderId);
                if (idx >= 0) list[idx] = asgn; else list.unshift(asgn);
                lsSet(LS.assignments, list);
                pushNotif('📻 Dispatch Update', 'Status: ' + (asgn.status || 'assigned'));
                checkNewAssignments();
                refreshAll();
            }
        } catch(e){}
    });

    es.addEventListener('alert_updated', function(ev) {
        try {
            const updated = JSON.parse(ev.data);
            const arr = lsGet(LS.alerts, []);
            const idx = arr.findIndex(a => a.id === updated.id);
            if (idx >= 0) { arr[idx] = { ...arr[idx], ...updated }; lsSet(LS.alerts, arr); }
            refreshAll();
        } catch(e){}
    });

    /* Real-time household safety update — the resident just flipped their
     * Household status. If it is Need Assistance / Missing with a fresh
     * GPS fix we push a notification and repaint the map so the pin for
     * that residence appears immediately. */
    es.addEventListener('household_update', function(ev) {
        try {
            const hh = JSON.parse(ev.data);
            if (!hh || !hh.id) return;
            const arr = lsGet(LS.households, []);
            const idx = arr.findIndex(x => x.id === hh.id);
            if (idx >= 0) arr[idx] = { ...arr[idx], ...hh }; else arr.unshift(hh);
            lsSet(LS.households, arr);
            const isActive = (hh.status === 'Need Assistance' || hh.status === 'Missing')
                          && Number.isFinite(Number(hh.lat)) && Number.isFinite(Number(hh.lng));
            if (isActive && idx < 0) {
                pushNotif('🏠 Household flag', (hh.residentName || 'Resident') + ' — ' + hh.status);
            }
            refreshAll();
            if (currentScreen === 'map') paintCases();
        } catch(e){}
    });

    es.onerror = function() {
        es.close();
        setTimeout(connectResponderSSE, 4000);
    };
})();

/* ---------- Long-poll (Capacitor native — fetch through CapacitorHttp) ---------- */
if (window.RNRealtime) {
    RNRealtime.init(API_BASE, function(evt) {
        try {
            if (evt.type === 'new_alert') {
                ingestIncomingAlert(evt.data, true);
            } else if (evt.type === 'new_report') {
                ingestIncomingReport(evt.data);
            } else if (evt.type === 'assignment_updated') {
                const asgn = evt.data;
                const me = getMe();
                if (me && asgn.responderId === me.id) {
                    // Never re-open a case this responder already resolved.
                    if (isResolvedLocally(asgn.caseId) && normStatus(asgn.status) !== 'resolved') return;
                    const list = lsGet(LS.assignments, []);
                    const idx = list.findIndex(a => a.caseId === asgn.caseId && a.responderId === asgn.responderId);
                    if (idx >= 0) list[idx] = asgn; else list.unshift(asgn);
                    lsSet(LS.assignments, list);
                    pushNotif('📻 Dispatch', 'Status: ' + (asgn.status || 'assigned'));
                    checkNewAssignments();
                    refreshAll();
                }
            } else if (evt.type === 'alert_updated') {
                const updated = evt.data;
                const arr = lsGet(LS.alerts, []);
                const idx = arr.findIndex(a => a.id === updated.id);
                if (idx >= 0) { arr[idx] = { ...arr[idx], ...updated }; lsSet(LS.alerts, arr); }
                refreshAll();
            } else if (evt.type === 'household_update') {
                const hh = evt.data;
                if (hh && hh.id) {
                    const arr = lsGet(LS.households, []);
                    const idx = arr.findIndex(x => x.id === hh.id);
                    if (idx >= 0) arr[idx] = { ...arr[idx], ...hh }; else arr.unshift(hh);
                    lsSet(LS.households, arr);
                    const isActive = (hh.status === 'Need Assistance' || hh.status === 'Missing')
                                  && Number.isFinite(Number(hh.lat)) && Number.isFinite(Number(hh.lng));
                    if (isActive && idx < 0) pushNotif('🏠 Household flag', (hh.residentName || 'Resident') + ' — ' + hh.status);
                    refreshAll();
                    if (currentScreen === 'map') paintCases();
                }
            } else if (evt.type === 'responder_location') {
                const loc = evt.data;
                if (loc && loc.responderId) {
                    const cache = lsGet(LS.respLoc, {}) || {};
                    cache[loc.responderId] = {
                        lat: loc.lat, lng: loc.lng, name: loc.name, role: loc.role,
                        status: loc.status, updatedAt: loc.updatedAt
                    };
                    lsSet(LS.respLoc, cache);
                    if (currentScreen === 'map') paintUnits();
                }
            }
        } catch(e){}
    });
}

/* ---------- boot ---------- */
let BOOTED = false;
function boot() {
    const me = getMe(); if (!me || BOOTED) return;
    BOOTED = true;
    renderNotifBadge();
    navigate('home');
    startOwnWatch();
    checkNewAssignments();
    checkIncomingMsgs();
    pullRemote();
    refreshAll();
}
/* Session id survives relaunch but the local roster can be missing/stale —
 * re-hydrate from the server before giving up, otherwise GPS posting and
 * assignment intake stay dead for the whole session. */
async function bootOrRecover() {
    if (getMe()) { loginScreen.classList.remove('show'); boot(); return; }
    if (!sessionStorage.getItem(LS.me)) return;
    await hydrateLoginRoster();
    if (getMe()) { loginScreen.classList.remove('show'); boot(); }
}
bootOrRecover();
setInterval(() => { if (getMe()) { checkNewAssignments(); checkIncomingMsgs(); } }, 5000);
setInterval(() => { if (getMe()) pullRemote(); }, 8000);
setInterval(() => { if (getMe() && currentScreen === 'map') paintCases(); }, 15000);
/* Heartbeat: re-post the last known fix so a stationary responder stays
 * visible on the resident's nearest-responder panel between GPS callbacks. */
setInterval(() => {
    if (!getMe() || !ME_POS) return;
    if (lsGet(LS.prefs, {}).loc === false) return;
    postMyLocation();
}, 20000);

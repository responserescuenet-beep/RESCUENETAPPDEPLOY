-- ============================================================================
--  RescueNet — shared database schema
--  ONE database ("rescuenetdb") shared by the Admin, Responder and Resident apps.
--  Target: MySQL / MariaDB (InfinityFree). Import via phpMyAdmin.
--
--  Design notes:
--   * Every record keeps its full JSON payload in a `data` column, ENCRYPTED
--     at rest with AES-256-GCM (see api/lib/crypto.php). The plaintext columns
--     next to it (id, status, *_hash, lat/lng, timestamps) exist only so the
--     server can index / query without decrypting the whole table.
--   * Lookups on PII (email / phone) use an HMAC-SHA256 column (`*_hash`) so we
--     can match without storing the value in the clear and without decrypting.
--   * Passwords are NEVER stored here; only bcrypt hashes live in `credentials`.
-- ============================================================================

SET NAMES utf8mb4;

-- ---- SOS alerts -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id           VARCHAR(64)  NOT NULL,
  data         LONGTEXT     NOT NULL,
  status       VARCHAR(32)  NULL,
  resolved_at  VARCHAR(40)  NULL,
  created_at   VARCHAR(40)  NULL,
  updated_at   VARCHAR(40)  NULL,
  latitude     DOUBLE       NULL,
  longitude    DOUBLE       NULL,
  PRIMARY KEY (id),
  KEY idx_alerts_status  (status),
  KEY idx_alerts_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Incident reports -----------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id           VARCHAR(64)  NOT NULL,
  data         LONGTEXT     NOT NULL,
  status       VARCHAR(32)  NULL,
  resolved_at  VARCHAR(40)  NULL,
  created_at   VARCHAR(40)  NULL,
  PRIMARY KEY (id),
  KEY idx_reports_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Residents ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS residents (
  id          VARCHAR(64)  NOT NULL,
  data        LONGTEXT     NOT NULL,
  status      VARCHAR(32)  NULL,        -- pending | approved | rejected
  name        VARCHAR(190) NULL,
  email_hash  CHAR(64)     NULL,
  phone_hash  CHAR(64)     NULL,
  created_at  VARCHAR(40)  NULL,
  PRIMARY KEY (id),
  KEY idx_res_status (status),
  KEY idx_res_email  (email_hash),
  KEY idx_res_phone  (phone_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Response assignments (admin dispatch -> responder) -------------------
CREATE TABLE IF NOT EXISTS assignments (
  id            VARCHAR(160) NOT NULL,   -- caseId|responderId
  case_id       VARCHAR(64)  NULL,
  responder_id  VARCHAR(64)  NULL,
  status        VARCHAR(32)  NULL,
  closed_at     VARCHAR(40)  NULL,
  data          LONGTEXT     NOT NULL,
  updated_at    VARCHAR(40)  NULL,
  PRIMARY KEY (id),
  KEY idx_asg_case   (case_id),
  KEY idx_asg_resp   (responder_id),
  KEY idx_asg_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Household safety status ---------------------------------------------
CREATE TABLE IF NOT EXISTS households (
  id         VARCHAR(64)  NOT NULL,
  data       LONGTEXT     NOT NULL,
  status     VARCHAR(32)  NULL,
  kind       VARCHAR(32)  NULL,
  latitude   DOUBLE       NULL,
  longitude  DOUBLE       NULL,
  updated_at VARCHAR(40)  NULL,
  PRIMARY KEY (id),
  KEY idx_hh_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Announcements --------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id         VARCHAR(64)  NOT NULL,
  data       LONGTEXT     NOT NULL,
  created_at VARCHAR(40)  NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Emergency resources (guides / hotlines / checklists) -----------------
CREATE TABLE IF NOT EXISTS resources (
  id         VARCHAR(64)  NOT NULL,
  data       LONGTEXT     NOT NULL,
  updated_at VARCHAR(40)  NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Responder directory (admin-registered accounts) ----------------------
CREATE TABLE IF NOT EXISTS responders (
  id         VARCHAR(64)  NOT NULL,
  data       LONGTEXT     NOT NULL,
  name       VARCHAR(190) NULL,
  name_norm  VARCHAR(190) NULL,        -- lowercased, single-spaced, for login match
  phone_hash CHAR(64)     NULL,
  status     VARCHAR(32)  NULL,
  latitude   DOUBLE       NULL,
  longitude  DOUBLE       NULL,
  created_at VARCHAR(40)  NULL,
  PRIMARY KEY (id),
  KEY idx_resp_phone (phone_hash),
  KEY idx_resp_name  (name_norm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Live responder GPS ---------------------------------------------------
CREATE TABLE IF NOT EXISTS responder_locations (
  responder_id VARCHAR(64)  NOT NULL,
  data         LONGTEXT     NOT NULL,
  latitude     DOUBLE       NULL,
  longitude    DOUBLE       NULL,
  status       VARCHAR(32)  NULL,
  updated_at   VARCHAR(40)  NULL,
  PRIMARY KEY (responder_id),
  KEY idx_loc_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Realtime event log (drives /api/longpoll + /api/events) --------------
CREATE TABLE IF NOT EXISTS events (
  id   BIGINT       NOT NULL AUTO_INCREMENT,
  type VARCHAR(64)  NOT NULL,
  data LONGTEXT     NOT NULL,
  ts   BIGINT       NOT NULL,
  PRIMARY KEY (id),
  KEY idx_events_ts (ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- OTP store (codes are stored hashed, never in the clear) --------------
CREATE TABLE IF NOT EXISTS otp_store (
  otp_key      VARCHAR(190) NOT NULL,
  code_hash    CHAR(64)     NOT NULL,
  expires_at   BIGINT       NOT NULL,
  attempts     INT          NOT NULL DEFAULT 0,
  last_sent_at BIGINT       NOT NULL,
  phone        VARCHAR(32)  NULL,
  PRIMARY KEY (otp_key),
  KEY idx_otp_exp (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Credentials (bcrypt password hashes). Separate from the profiles. ----
CREATE TABLE IF NOT EXISTS credentials (
  principal_type VARCHAR(16)  NOT NULL,   -- admin | resident | responder
  principal_id   VARCHAR(64)  NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  created_at     VARCHAR(40)  NOT NULL,
  updated_at     VARCHAR(40)  NULL,
  PRIMARY KEY (principal_type, principal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Login sessions (opaque tokens, used after password auth) -------------
CREATE TABLE IF NOT EXISTS sessions (
  token          CHAR(64)     NOT NULL,
  principal_type VARCHAR(16)  NOT NULL,
  principal_id   VARCHAR(64)  NOT NULL,
  created_at     BIGINT       NOT NULL,
  expires_at     BIGINT       NOT NULL,
  PRIMARY KEY (token),
  KEY idx_sess_exp (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

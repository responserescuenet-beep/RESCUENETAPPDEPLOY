<?php
/**
 * RescueNet — outbound email + SMS.
 *
 * Email: sent over SMTP with PHPMailer when SMTP_USER/SMTP_PASS are configured
 *        (works with Gmail app passwords and on hosts that block PHP mail()).
 *        Falls back to PHP mail() when no SMTP credentials are set.
 * SMS  : Vonage / Nexmo REST via cURL when SMS_API_KEY/SECRET are set,
 *        otherwise dev-log mode (message written to the error log).
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

const RN_EMAIL_RE = '/^[^\s@]+@[^\s@]+\.[^\s@]+$/';

/** True when SMTP credentials are configured (the preferred delivery path). */
function rn_mail_configured() {
    return defined('SMTP_USER') && SMTP_USER !== ''
        && defined('SMTP_PASS') && SMTP_PASS !== ''
        && strpos(SMTP_USER . SMTP_PASS, 'REPLACE_WITH') === false;
}

/** Send an HTML email. Returns true on success. */
function rn_send_email($to, $subject, $text, $html) {
    if (rn_mail_configured()) {
        return rn_send_email_smtp($to, $subject, $text, $html);
    }
    return rn_send_email_mail($to, $subject, $html);
}

/** SMTP delivery via PHPMailer (Gmail / any provider). */
function rn_send_email_smtp($to, $subject, $text, $html) {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = (defined('SMTP_SECURE') && SMTP_SECURE === 'ssl')
            ? PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int)SMTP_PORT;
        $mail->Timeout    = 15;
        $mail->CharSet    = 'UTF-8';

        $fromName = defined('EMAIL_FROM_NAME') ? EMAIL_FROM_NAME : 'RescueNet';
        $mail->setFrom(EMAIL_FROM, $fromName);
        $mail->addReplyTo(EMAIL_FROM, $fromName);
        $mail->addAddress($to);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $html;
        $mail->AltBody = $text;

        $mail->send();
        return true;
    } catch (PHPMailerException $e) {
        error_log('[RescueNet mail] SMTP failed for ' . $to . ' — ' . $mail->ErrorInfo);
        return false;
    } catch (Throwable $e) {
        error_log('[RescueNet mail] SMTP error for ' . $to . ' — ' . $e->getMessage());
        return false;
    }
}

/** Legacy fallback: PHP mail() (only on hosts that permit it). */
function rn_send_email_mail($to, $subject, $html) {
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: RescueNet <' . EMAIL_FROM . '>',
        'Reply-To: ' . EMAIL_FROM,
    ];
    $ok = @mail($to, $subject, $html, implode("\r\n", $headers));
    if (!$ok) {
        error_log('[RescueNet mail] mail() failed for ' . $to . ' — subject: ' . $subject);
    }
    return $ok;
}

/** Normalise a PH mobile number to Vonage's country-code form (639XXXXXXXXX). */
function rn_normalize_phone($raw) {
    $d = preg_replace('/\D+/', '', (string)$raw);
    if ($d === '') return null;
    if (strlen($d) === 11 && strpos($d, '09') === 0) return '63' . substr($d, 1);
    if (strpos(ltrim((string)$raw), '+') === 0) return $d;
    if (strlen($d) === 10 && $d[0] === '9') return '63' . $d;
    return $d;
}

/** Send an SMS. Returns ['dev'=>bool, 'to'=>..] or throws on provider error. */
function rn_send_sms($toPhone, $message) {
    $apiKey    = SMS_API_KEY;
    $apiSecret = SMS_API_SECRET;
    $from      = SMS_FROM ?: 'RescueNet';

    if ($apiKey === '' || $apiSecret === '' || strpos($apiKey . $apiSecret, 'REPLACE_WITH') !== false) {
        error_log('[RescueNet DEV SMS → ' . $toPhone . '] ' . $message);
        return ['dev' => true, 'to' => $toPhone];
    }

    $ch = curl_init('https://rest.nexmo.com/sms/json');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_POSTFIELDS     => http_build_query([
            'api_key'    => $apiKey,
            'api_secret' => $apiSecret,
            'to'         => $toPhone,
            'from'       => $from,
            'text'       => $message,
        ]),
    ]);
    $raw  = curl_exec($ch);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($raw === false) throw new RuntimeException('SMS transport error: ' . $err);

    $data = json_decode($raw, true);
    $msg  = $data['messages'][0] ?? [];
    if (($msg['status'] ?? '1') !== '0') {
        throw new RuntimeException('Vonage ' . ($msg['status'] ?? '?') . ': ' . ($msg['error-text'] ?? 'unknown'));
    }
    return ['dev' => false, 'to' => $toPhone, 'messageId' => $msg['message-id'] ?? null];
}

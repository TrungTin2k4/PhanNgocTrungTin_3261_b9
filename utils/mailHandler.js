const nodemailer = require("nodemailer");


const appName = process.env.APP_NAME || "NNPTUD";
const mailFrom = process.env.MAIL_FROM || "admin@heha.com";
const loginUrl = process.env.APP_LOGIN_URL || "http://localhost:3000";
const supportEmail = process.env.SUPPORT_EMAIL || mailFrom;
const welcomeBannerSvg = `
<svg width="640" height="240" viewBox="0 0 640 240" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="240" rx="24" fill="#0F172A"/>
  <circle cx="88" cy="76" r="44" fill="#22C55E" fill-opacity="0.18"/>
  <circle cx="548" cy="170" r="58" fill="#38BDF8" fill-opacity="0.18"/>
  <rect x="48" y="48" width="160" height="52" rx="26" fill="#22C55E"/>
  <text x="80" y="81" fill="#0F172A" font-family="Arial, sans-serif" font-size="22" font-weight="700">NNPTUD</text>
  <text x="48" y="146" fill="#F8FAFC" font-family="Arial, sans-serif" font-size="42" font-weight="700">Welcome aboard</text>
  <text x="48" y="184" fill="#CBD5E1" font-family="Arial, sans-serif" font-size="20">Your new account is ready to sign in.</text>
</svg>`;

const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST || "sandbox.smtp.mailtrap.io",
    port: Number(process.env.MAILTRAP_PORT || 25),
    secure: process.env.MAILTRAP_SECURE === "true",
    auth: {
        user: process.env.MAILTRAP_USER || "afb860a426d68e",
        pass: process.env.MAILTRAP_PASS || "d3964b7baf52ff",
    },
});

async function sendEmail(options) {
    return transporter.sendMail({
        from: mailFrom,
        ...options,
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildWelcomeEmailText({ username, password }) {
    return [
        "Chao " + username + ",",
        "",
        "Tai khoan cua ban tren he thong " + appName + " da duoc tao thanh cong.",
        "",
        "Thong tin dang nhap:",
        "- Username: " + username,
        "- Password tam thoi: " + password,
        "",
        "Huong dan:",
        "1. Dang nhap vao he thong.",
        "2. Doi mat khau ngay sau lan dang nhap dau tien.",
        "3. Khong chia se mat khau nay cho nguoi khac.",
        "",
        "Trang dang nhap: " + loginUrl,
        "Ho tro: " + supportEmail,
    ].join("\n");
}

function buildWelcomeEmailHtml({ username, password }) {
    let safeUsername = escapeHtml(username);
    let safePassword = escapeHtml(password);
    let safeLoginUrl = escapeHtml(loginUrl);
    let safeSupportEmail = escapeHtml(supportEmail);
    let safeAppName = escapeHtml(appName);

    return '<!DOCTYPE html>' +
        '<html lang="en">' +
        '<head>' +
        '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
        '<title>Thong tin tai khoan moi</title>' +
        '</head>' +
        '<body style="margin:0;padding:0;background-color:#eef2ff;">' +
        '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Tai khoan moi cua ban da san sang. Xem username, password tam thoi va huong dan dang nhap.</div>' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(180deg,#e0f2fe 0%,#eef2ff 55%,#f8fafc 100%);margin:0;padding:24px 12px;font-family:Arial,sans-serif;">' +
        '<tr>' +
        '<td align="center">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;background:#ffffff;border:1px solid #dbe4ff;border-radius:28px;overflow:hidden;box-shadow:0 14px 40px rgba(15,23,42,0.08);">' +
        '<tr>' +
        '<td style="padding:0;">' +
        '<img src="cid:user-import-banner" alt="Welcome banner" width="680" style="display:block;width:100%;max-width:680px;height:auto;border:0;" />' +
        '</td>' +
        '</tr>' +
        '<tr>' +
        '<td style="padding:36px 36px 14px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' +
        '<tr>' +
        '<td align="left">' +
        '<div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">Account created</div>' +
        '<h1 style="margin:18px 0 12px;font-size:34px;line-height:1.15;color:#0f172a;">Xin chao ' + safeUsername + '</h1>' +
        '<p style="margin:0;font-size:16px;line-height:1.8;color:#475569;">Tai khoan cua ban tren he thong <strong>' + safeAppName + '</strong> da duoc tao thanh cong tu chuc nang import user. Ben duoi la thong tin dang nhap tam thoi va huong dan bao mat.</p>' +
        '</td>' +
        '</tr>' +
        '</table>' +
        '</td>' +
        '</tr>' +
        '<tr>' +
        '<td style="padding:0 36px 14px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;">' +
        '<tr>' +
        '<td style="padding:22px 22px 12px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">Thong tin dang nhap</td>' +
        '</tr>' +
        '<tr>' +
        '<td style="padding:0 22px 22px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' +
        '<tr>' +
        '<td valign="top" width="50%" style="padding:0 8px 12px 0;">' +
        '<div style="padding:16px;border-radius:16px;background:#ffffff;border:1px solid #dbeafe;">' +
        '<div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;">Username</div>' +
        '<div style="padding-top:10px;font-size:20px;font-weight:700;color:#0f172a;line-height:1.4;">' + safeUsername + '</div>' +
        '</div>' +
        '</td>' +
        '<td valign="top" width="50%" style="padding:0 0 12px 8px;">' +
        '<div style="padding:16px;border-radius:16px;background:#0f172a;border:1px solid #1e293b;">' +
        '<div style="font-size:12px;font-weight:700;color:#93c5fd;text-transform:uppercase;letter-spacing:0.6px;">Password tam thoi</div>' +
        '<div style="padding-top:10px;font-size:22px;font-weight:700;color:#f8fafc;letter-spacing:1px;line-height:1.4;word-break:break-word;">' + safePassword + '</div>' +
        '</div>' +
        '</td>' +
        '</tr>' +
        '</table>' +
        '</td>' +
        '</tr>' +
        '</table>' +
        '</td>' +
        '</tr>' +
        '<tr>' +
        '<td style="padding:0 36px 10px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' +
        '<tr>' +
        '<td valign="top" width="50%" style="padding:0 8px 12px 0;">' +
        '<div style="height:100%;padding:20px;border-radius:18px;background:#eff6ff;border:1px solid #bfdbfe;">' +
        '<div style="margin:0 0 12px;font-size:17px;font-weight:700;color:#1d4ed8;">Can lam ngay</div>' +
        '<div style="font-size:14px;line-height:1.8;color:#1e3a8a;">1. Dang nhap vao he thong bang thong tin tren.<br />2. Doi mat khau ngay sau lan dau su dung.<br />3. Luu tru mat khau moi o noi an toan.</div>' +
        '</div>' +
        '</td>' +
        '<td valign="top" width="50%" style="padding:0 0 12px 8px;">' +
        '<div style="height:100%;padding:20px;border-radius:18px;background:#f0fdf4;border:1px solid #bbf7d0;">' +
        '<div style="margin:0 0 12px;font-size:17px;font-weight:700;color:#166534;">Luu y bao mat</div>' +
        '<div style="font-size:14px;line-height:1.8;color:#166534;">Khong chia se password qua chat cong khai.<br />Khong forward email nay cho nguoi khac.<br />Neu co bat thuong, lien he ' + safeSupportEmail + '.</div>' +
        '</div>' +
        '</td>' +
        '</tr>' +
        '</table>' +
        '</td>' +
        '</tr>' +
        '<tr>' +
        '<td style="padding:0 36px 18px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' +
        '<tr>' +
        '<td align="center" style="padding:6px 0 18px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0">' +
        '<tr>' +
        '<td align="center" bgcolor="#2563eb" style="border-radius:14px;">' +
        '<a href="' + safeLoginUrl + '" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;">Mo he thong va dang nhap</a>' +
        '</td>' +
        '</tr>' +
        '</table>' +
        '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;">' +
        '<tr>' +
        '<td style="padding:20px;">' +
        '<div style="font-size:13px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:0.7px;">Trang dang nhap</div>' +
        '<div style="padding-top:10px;font-size:15px;line-height:1.8;color:#7c2d12;word-break:break-all;"><a href="' + safeLoginUrl + '" style="color:#c2410c;text-decoration:none;">' + safeLoginUrl + '</a></div>' +
        '</td>' +
        '</tr>' +
        '</table>' +
        '</td>' +
        '</tr>' +
        '</table>' +
        '</td>' +
        '</tr>' +
        '<tr>' +
        '<td style="padding:0 36px 36px;">' +
        '<div style="padding-top:18px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.8;color:#64748b;">Email nay duoc gui tu he thong ' + safeAppName + '. Neu ban khong mong cho viec tao tai khoan nay, vui long lien he quan tri vien qua ' + safeSupportEmail + '.</div>' +
        '</td>' +
        '</tr>' +
        '</table>' +
        '</td>' +
        '</tr>' +
        '</table>' +
        '</body>' +
        '</html>';
}

module.exports = {
    sendMail: async function (to, url) {
        return sendEmail({
            to: to,
            subject: "Reset Password email",
            text: "click vao day de reset password", // Plain-text version of the message
            html: "click vao <a href=" + url + ">day</a> de reset password", // HTML version of the message
        });
    },
    sendWelcomePasswordMail: async function ({ to, username, password }) {
        return sendEmail({
            to: to,
            subject: "Thong tin tai khoan moi",
            replyTo: supportEmail,
            text: buildWelcomeEmailText({ username, password }),
            html: buildWelcomeEmailHtml({ username, password }),
            attachments: [
                {
                    filename: "user-import-banner.svg",
                    content: welcomeBannerSvg,
                    contentType: "image/svg+xml",
                    cid: "user-import-banner",
                },
            ],
        });
    }
}

# Yêu cầu kỹ thuật cho hệ thống xác thực tập trung `auth.leminhtriet.com`

**Bên yêu cầu:** Invity  
**Hệ thống cung cấp:** `auth.leminhtriet.com`  
**Mục tiêu:** dùng một tài khoản leminhtriet.com để đăng nhập Invity và các sản phẩm khác trong tương lai  
**Giai đoạn áp dụng:** đã triển khai sớm ngày 14/09/2026; tài liệu này tiếp tục là hợp đồng cho các phần vận hành nâng cao

> **Trạng thái thực tế:** Invity đã đăng nhập production qua OIDC native Supabase. Issuer đang dùng `https://jebsmjfrbdxdtdeikkus.supabase.co/auth/v1`; custom domain `auth.leminhtriet.com` được hoãn do yêu cầu Supabase Pro. Client Invity được đăng ký thủ công với callback `https://unauvoujwjomloveveij.supabase.co/auth/v1/callback`; Dynamic OAuth App Registration được giữ tắt. Discovery, JWKS, PKCE S256, UserInfo bearer protection, consent, callback, session và binding `(iss, sub)` đã kiểm tra đạt. Không ghi client secret trong tài liệu hoặc log. Xem `G12_IMPLEMENTATION_REPORT.md`.

## 1. Kết quả cần bàn giao

`auth.leminhtriet.com` phải hoạt động như một **OpenID Connect Identity Provider (OIDC IdP)** tương thích OAuth 2.0 Authorization Code Flow và PKCE. Invity là một OIDC client/Relying Party.

Người dùng đăng nhập Google tại trang Auth tập trung. Sau khi xác thực thành công, Auth trả authorization code về callback đã đăng ký của Invity. Invity trao đổi code qua back-channel, kiểm tra ID token và tạo session riêng của Invity.

Đội Auth cần bàn giao:

1. Issuer production `https://auth.leminhtriet.com` và một issuer staging tách biệt.
2. Discovery document, Authorization endpoint, Token endpoint, JWKS endpoint, UserInfo endpoint, Revocation endpoint và logout endpoint.
3. OIDC client riêng cho Invity ở staging và production.
4. Client ID; client secret production qua secret manager, không gửi trong chat/email/tài liệu.
5. Danh sách claim, vòng đời token, quy trình xoay khóa, logout, khóa tài khoản và xử lý sự cố.
6. Bộ test account staging và biên bản nghiệm thu theo mục 15.

## 2. Ranh giới trách nhiệm

### Hệ thống Auth chịu trách nhiệm

- Xác thực người dùng với Google và chỉ yêu cầu `openid email profile` ở giai đoạn đầu.
- Quản lý phiên đăng nhập tập trung, trạng thái tài khoản, khóa tài khoản và logout ở IdP.
- Phát hành authorization code, ID token, access token và refresh token đúng hợp đồng này.
- Duy trì định danh `sub` bất biến và công bố public key qua JWKS.
- Cung cấp sự kiện back-channel khi tài khoản bị khóa/xóa hoặc phiên cần thu hồi.

### Invity chịu trách nhiệm

- Kiểm tra `state`, `nonce`, PKCE, issuer, audience, chữ ký và thời hạn token.
- Ánh xạ `(iss, sub)` vào `auth_bindings` và giữ `app_user_id` làm khóa sở hữu dữ liệu.
- Quản lý session ứng dụng, authorization, quota, event, guest, RSVP và dữ liệu Invity.
- Không lưu Google access token hoặc refresh token nếu không có nghiệp vụ được phê duyệt riêng.

Email, họ tên và avatar là thuộc tính hồ sơ. **Email không được dùng làm khóa liên kết tài khoản hoặc khóa ownership.**

## 3. Luồng đăng nhập bắt buộc

```mermaid
sequenceDiagram
    participant U as Trình duyệt người dùng
    participant I as Invity
    participant A as auth.leminhtriet.com
    participant G as Google

    U->>I: Chọn Đăng nhập
    I->>I: Sinh state, nonce, code_verifier
    I-->>U: Redirect /authorize + PKCE challenge
    U->>A: Authorization request
    A-->>U: Chuyển đến Google nếu chưa có phiên SSO
    U->>G: Xác thực và consent
    G-->>A: Kết quả xác thực
    A-->>U: Redirect callback Invity với code + state
    U->>I: GET callback
    I->>I: Kiểm tra state
    I->>A: POST /token + code_verifier
    A-->>I: ID token + access token + refresh token
    I->>I: Kiểm tra token; bind iss/sub; tạo session Invity
    I-->>U: Redirect về returnTo nội bộ
```

Yêu cầu đối với flow:

- Chỉ hỗ trợ Authorization Code Flow; không dùng Implicit Flow hoặc trả token trên query/fragment.
- PKCE bắt buộc với `code_challenge_method=S256`, kể cả confidential client.
- `state` và `nonce` bắt buộc; request thiếu hoặc sai phải bị từ chối.
- Authorization code dùng một lần, TTL tối đa 60 giây và ràng buộc với client, redirect URI, PKCE challenge và user session đã xác thực.
- Token endpoint chỉ được gọi qua HTTPS. Với confidential client, hỗ trợ `client_secret_basic`; không nhận secret trên URL.
- `returnTo` thuộc Invity, không truyền thành redirect URI tùy ý cho IdP. Callback Invity chỉ redirect tới path nội bộ đã allowlist.
- Nếu đăng nhập Google bị chặn trong webview Zalo/Messenger, trang Auth phải hướng dẫn người dùng mở Safari/Chrome và không làm mất transaction đăng nhập.

## 4. Discovery và endpoint

Production phải công bố:

```text
GET https://auth.leminhtriet.com/.well-known/openid-configuration
```

Discovery document tối thiểu phải có:

- `issuer`
- `authorization_endpoint`
- `token_endpoint`
- `userinfo_endpoint`
- `jwks_uri`
- `revocation_endpoint`
- `end_session_endpoint`
- `scopes_supported`
- `response_types_supported` chứa `code`
- `grant_types_supported` chứa `authorization_code` và `refresh_token`
- `code_challenge_methods_supported` chỉ rõ `S256`
- `id_token_signing_alg_values_supported`
- `token_endpoint_auth_methods_supported`
- `claims_supported`

Đường dẫn endpoint cụ thể có thể do đội Auth chọn, nhưng phải được discovery công bố và ổn định. Issuer staging và production không được dùng chung key, client, cookie hoặc dữ liệu người dùng thật.

## 5. OIDC client cho Invity

Tạo hai client độc lập:

| Môi trường | Loại client | Redirect URI |
|---|---|---|
| Staging | Confidential web client | URI staging chính xác do đội Invity cung cấp khi tích hợp |
| Production hiện tại | Confidential web client | `https://invity-ten.vercel.app/auth/sso/callback` |
| Production custom domain | Bổ sung sau khi chốt domain | URI HTTPS chính xác, không wildcard |

Quy định client:

- Redirect URI phải exact match cả scheme, host, path và port; không hỗ trợ wildcard hoặc pattern theo Vercel preview.
- Preview deployment dùng client staging hoặc không bật SSO; không thêm hàng loạt preview URL vào client production.
- Allowed post-logout redirect URI phải được đăng ký riêng và exact match.
- Client secret có thể thu hồi/xoay mà không đổi Client ID.
- Auth phải hỗ trợ tối thiểu hai secret cùng hiệu lực trong cửa sổ rotation để triển khai không downtime.

## 6. Scope và claim

Invity chỉ yêu cầu các scope:

```text
openid profile email offline_access
```

`offline_access` chỉ dùng nếu session Invity cần refresh; có thể tắt ở MVP nếu session không cần refresh token.

ID token bắt buộc có:

| Claim | Yêu cầu |
|---|---|
| `iss` | Đúng tuyệt đối issuer của môi trường |
| `sub` | Chuỗi bất biến, không tái sử dụng, không chứa email/phone |
| `aud` | Chứa đúng Client ID Invity |
| `exp`, `iat` | Unix time hợp lệ |
| `nonce` | Khớp authorization transaction |
| `auth_time` | Thời điểm user được xác thực |
| `email` | Email hiện tại |
| `email_verified` | Boolean; phải là `true` để Invity tạo binding |
| `name` | Họ tên hiển thị; có thể rỗng |
| `picture` | HTTPS URL avatar; có thể rỗng |
| `sid` | ID phiên tại IdP để hỗ trợ logout/thu hồi phiên |

Claim khuyến nghị:

- `amr`: phương thức xác thực, ví dụ `google`.
- `azp`: bắt buộc khi ID token có nhiều audience.
- `updated_at`: thời điểm hồ sơ thay đổi.
- `account_status`: `active`, `blocked` hoặc `deletion_requested`; chỉ dùng hỗ trợ UX, Invity vẫn xử lý webhook/thu hồi ở server.

Không đưa Google token, quyền Gmail/Drive/Contacts, role quản trị Invity hoặc dữ liệu sản phẩm khác vào token.

## 7. Quy tắc định danh và liên kết tài khoản

- Cặp `(iss, sub)` là định danh ngoài duy nhất mà Invity tin cậy.
- `sub` không đổi khi người dùng đổi email, tên, avatar hoặc tài khoản Google được cập nhật.
- `sub` đã xóa không được cấp lại cho người khác.
- Invity sẽ lưu provider `leminhtriet_oidc` và provider subject được suy ra từ issuer + `sub`; ownership sự kiện tiếp tục dùng `app_user_id` hiện tại.
- Không tự hợp nhất hai tài khoản chỉ vì trùng email. Liên kết hoặc migration tài khoản phải yêu cầu người dùng chứng minh cả phiên cũ và phiên mới, hoặc chạy quy trình hỗ trợ có audit.
- Nếu chưa có user production trước ngày chuyển đổi, đội Invity có thể bật SSO làm provider duy nhất mà không cần migration legacy.

## 8. Token và session

Giá trị đề xuất:

| Thành phần | Yêu cầu |
|---|---|
| ID token | JWT ký bất đối xứng; TTL tối đa 5 phút |
| Access token | TTL 5–15 phút; audience/resource rõ ràng |
| Refresh token | Opaque hoặc JWT; tối đa 30 ngày; rotation mỗi lần sử dụng |
| Authorization code | Opaque; một lần; tối đa 60 giây |
| Clock skew kiểm tra | Tối đa ±60 giây |

- Refresh token rotation phải phát hiện reuse và thu hồi cả token family khi token cũ bị dùng lại.
- Token không được ghi vào application log, analytics, URL, referrer hoặc error message.
- Không dùng symmetric signing secret dùng chung giữa Auth và các ứng dụng.
- Invity không yêu cầu cookie dùng chung giữa các subdomain. SSO phải hoạt động qua redirect OIDC dựa trên session tại IdP.
- Cookie IdP phải có `Secure`, `HttpOnly`, `SameSite=Lax` hoặc chặt hơn, path/domain tối thiểu cần thiết. Không đặt session cookie cho toàn bộ `.leminhtriet.com`.

## 9. Ký token và xoay khóa

- Dùng RS256 hoặc ES256; khuyến nghị ES256 hoặc RS256 với khóa tối thiểu RSA 2048 bit.
- Mỗi JWT có `kid`; public key tương ứng phải có trong JWKS.
- JWKS trả cache headers phù hợp và hỗ trợ nhiều key trong thời gian rotation.
- Công bố key mới ít nhất 24 giờ trước khi ký token bằng key đó. Giữ key cũ tối thiểu bằng tuổi thọ token dài nhất cộng clock skew.
- Có quy trình emergency rotation khi private key bị nghi lộ; thông báo ngay cho đội Invity qua kênh vận hành đã thống nhất.
- Private key nằm trong KMS/secret manager, không nằm trong repository, image, environment dump hoặc log CI.

## 10. Logout, khóa và xóa tài khoản

Phải hỗ trợ ba mức:

1. **Logout Invity:** Invity xóa session ứng dụng; phiên IdP có thể còn để SSO lần sau.
2. **Logout toàn hệ thống:** redirect tới `end_session_endpoint`, kiểm tra `id_token_hint` và allowlist `post_logout_redirect_uri`.
3. **Thu hồi cưỡng chế:** tài khoản bị khóa/xóa hoặc phiên bị đánh cắp phải làm refresh token không dùng lại được và gửi sự kiện back-channel cho Invity.

Auth cần phát webhook đã ký cho các event:

- `user.blocked`
- `user.unblocked`
- `user.deletion_requested`
- `user.deleted`
- `session.revoked`
- `profile.updated`

Payload tối thiểu:

```json
{
  "id": "evt_immutable_unique_id",
  "type": "user.blocked",
  "occurred_at": "2026-09-13T10:00:00Z",
  "issuer": "https://auth.leminhtriet.com",
  "subject": "immutable-user-subject",
  "session_id": "optional-sid"
}
```

Webhook phải có timestamp, signature bất đối xứng hoặc HMAC secret riêng, chống replay, retry exponential backoff và ID bất biến để Invity xử lý idempotent. Không gửi email hoặc Google token nếu event không cần chúng.

## 11. API UserInfo và cập nhật hồ sơ

`userinfo_endpoint` chỉ nhận access token trong `Authorization: Bearer`, không nhận token trên query string. Response chỉ gồm claim thuộc scope đã cấp. Với Invity, dữ liệu tối đa là `sub`, `email`, `email_verified`, `name`, `picture`, `updated_at`.

Invity có thể cập nhật bản sao tên/avatar/email sau mỗi lần đăng nhập hoặc khi nhận `profile.updated`. Thay đổi hồ sơ không làm đổi `sub` hoặc ownership.

## 12. Bảo mật bắt buộc

- TLS 1.2 trở lên; bật HSTS trên production.
- Chống login CSRF, authorization response mix-up, open redirect, code injection, token replay và brute force.
- Rate limit theo IP, transaction, client và account với phản hồi `429`; không để một client làm nghẽn toàn bộ IdP.
- Không cho phép redirect URI chứa userinfo, fragment, wildcard, HTTP production hoặc host tương tự dễ nhầm.
- Trang consent/login phải hiển thị rõ ứng dụng yêu cầu là Invity và dữ liệu được chia sẻ.
- Chỉ allowlist domain Google OAuth thuộc hệ thống Auth; callback Google kết thúc tại Auth, không đi trực tiếp về Invity.
- Mọi mutation quản trị client/key/user cần MFA, audit log và nguyên tắc quyền tối thiểu.
- Audit log có request ID, client ID, event, kết quả và subject đã pseudonymize; không ghi authorization code, token, cookie, client secret hoặc dữ liệu nhạy cảm.
- Kiểm tra dependency và image định kỳ; có quy trình vá lỗ hổng nghiêm trọng và thông báo incident.

## 13. Khả dụng và vận hành

Mức tối thiểu trước khi Invity phụ thuộc production:

- Availability mục tiêu 99,9% theo tháng cho discovery, authorize, token và JWKS.
- p95 token endpoint dưới 500 ms trong điều kiện bình thường, không tính thời gian người dùng thao tác Google.
- Monitoring cho tỷ lệ authorize/token lỗi, callback mismatch, refresh reuse, JWKS failure, webhook backlog và latency.
- Cảnh báo cho on-call khi tỷ lệ lỗi đăng nhập vượt ngưỡng hoặc key/token endpoint không khả dụng.
- Backup cấu hình client, binding Google, key metadata và dữ liệu account; có restore drill và RPO/RTO được ghi nhận.
- Runbook rollback không được tái sử dụng key đã lộ hoặc làm đổi `sub`.

## 14. Môi trường và cấu hình cần cung cấp cho Invity

Đội Auth bàn giao qua secret manager:

```text
AUTH_ISSUER_URL=
AUTH_CLIENT_ID=
AUTH_CLIENT_SECRET=
AUTH_WEBHOOK_PUBLIC_KEY= hoặc AUTH_WEBHOOK_SECRET=
```

Không yêu cầu Invity cấu hình Google Client ID/Secret. Credential Google thuộc hệ thống Auth tập trung. Staging và production phải có credential, issuer, client và secret riêng.

Đội Auth cũng cung cấp:

- Danh sách redirect URI và post-logout URI đã đăng ký.
- TTL chính xác của code/token/session.
- Thuật toán ký và quy trình rotation.
- Contact on-call và quy trình báo incident.
- Cách tạo/khóa/xóa test account staging.
- Bộ Postman/cURL hoặc automated conformance test không chứa secret thật.

## 15. Tiêu chí nghiệm thu

### Luồng chức năng

- User chưa có phiên Auth: Invity → Auth → Google → callback → dashboard thành công.
- User đã có phiên Auth: đăng nhập Invity qua redirect mà không phải nhập lại Google.
- Giữ đúng `returnTo` nội bộ sau đăng nhập; return URL ngoài hệ thống bị từ chối.
- Đổi tên/avatar/email không tạo `app_user_id` mới và không mất event.
- Hai user khác nhau không bao giờ nhận cùng `sub`; không đọc/sửa chéo dữ liệu Invity.
- Logout Invity, logout toàn hệ thống, hết session và refresh rotation hoạt động đúng.

### Luồng lỗi và tấn công

- Từ chối state sai/thiếu, nonce sai/thiếu, code dùng lại, code hết hạn và PKCE verifier sai.
- Từ chối token sai issuer, audience, signature, `kid`, `exp`, `iat` hoặc `email_verified=false`.
- Từ chối redirect URI không exact match và post-logout URI ngoài allowlist.
- Refresh token reuse thu hồi token family và tạo security event.
- User bị khóa/xóa không tạo session mới; webhook thu hồi làm Invity chặn phiên hiện có theo SLA thống nhất.
- Log và browser history không chứa code sau khi callback hoàn tất, token, cookie hoặc client secret.

### Tương thích

- Safari iOS, Chrome Android, Chrome/Edge/Safari desktop.
- Luồng mở từ Zalo, Messenger và Telegram có hướng dẫn chuyển sang browser hệ thống khi provider chặn webview.
- Discovery/JWKS cache và key rotation không gây downtime cho phiên đăng nhập mới.

### Điều kiện đóng tích hợp

- Toàn bộ test trên đạt ở staging và được ghi bằng test run có timestamp.
- Security review không còn lỗi P0/P1.
- Secret được chuyển qua secret manager; không xuất hiện trong Git, ticket, chat hoặc log.
- Đội Invity xác nhận binding theo `(iss, sub)`, session, RLS và logout bằng ít nhất hai tài khoản thật độc lập.
- Có rollback plan về provider trước đó hoặc chế độ bảo trì đăng nhập trong lần phát hành đầu.

## 16. Ngoài phạm vi phiên bản đầu

- Tạo tài khoản email/password công khai; Invity hiện chỉ cho phép đăng nhập tài khoản đã được cấp.
- Quyền Gmail, Drive, Contacts hoặc API Google khác.
- Đồng bộ role quản trị sản phẩm qua token Auth.
- SCIM, tổ chức/doanh nghiệp, SAML, MFA bắt buộc cho toàn bộ end user và social provider ngoài Google.
- Chia sẻ cookie session trực tiếp giữa `auth.leminhtriet.com`, `leminhtriet.com` và Invity.

Các mục này chỉ được bổ sung bằng phiên bản hợp đồng mới, có threat model và kế hoạch migration tương ứng.

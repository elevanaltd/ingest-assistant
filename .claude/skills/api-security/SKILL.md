---
name: api-security
description: API security best practices and common vulnerability prevention. Enforces security checks for authentication, input validation, SQL injection, XSS, and OWASP Top 10 vulnerabilities. Use when building or modifying APIs.
---

# API Security

API_SECURITY_MASTERY::[OWASP_TOP10+AUTH_PATTERNS+INPUT_VALIDATION+INJECTION_PREVENTION]→SECURE_BY_DESIGN

---

## AUTHENTICATION & AUTHORIZATION

```octave
AUTH_MANDATE::[
  ALWAYS::explicit_authentication_required[no_endpoints_without_auth],
  PATTERN::decorator_or_middleware[enforce_before_handler],
  TOKENS::JWT_with_expiration[industry_standard],
  AUTHORIZATION::check_permissions_not_just_identity[who≠what_can_do]
]

EXAMPLE_AUTH_CHECK::
  # Good: Authentication + Authorization
  @app.delete("/api/users/{user_id}")
  @require_auth
  async def delete_user(user_id: str, request: Request):
      current_user = get_current_user(request)

      # Authorization check
      if not current_user.is_admin and current_user.id != user_id:
          raise HTTPException(status_code=403, detail="Forbidden")

      await delete_user_by_id(user_id)

JWT_PATTERN::[
  create::payload[sub, exp, iat]+jwt.encode(SECRET_KEY, algorithm="HS256"),
  verify::jwt.decode→catch[ExpiredSignatureError, InvalidTokenError]→401,
  expiration::short_lived[1hour_access, 7day_refresh]
]
```

---

## INPUT VALIDATION

```octave
VALIDATION_MANDATE::[
  NEVER::trust_user_input,
  ALWAYS::validate_with_schema[Pydantic, Zod, Joi],
  TYPES::enforce_strict[string_length, numeric_range, email_format, regex_patterns],
  SANITIZE::remove_dangerous_chars[<script>, SQL_keywords, path_traversal]
]

EXAMPLE_VALIDATION::
  from pydantic import BaseModel, Field, validator

  class CreateUserRequest(BaseModel):
      username: str = Field(..., min_length=3, max_length=50, regex="^[a-zA-Z0-9_]+$")
      email: str = Field(..., regex=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
      age: int = Field(..., ge=0, le=150)

      @validator("username")
      def no_admin_keyword(cls, v):
          if "admin" in v.lower():
              raise ValueError("Username cannot contain 'admin'")
          return v
```

---

## SQL INJECTION PREVENTION

```octave
SQL_INJECTION_DEFENSE::[
  ALWAYS::parameterized_queries[NEVER_string_concatenation],
  ORM::use_query_builders[SQLAlchemy, Prisma, TypeORM],
  ESCAPE::parameters_automatically_escaped,
  VALIDATE::input_before_query[whitelist_allowed_values]
]

GOOD_VS_BAD::[
  BAD::"SELECT * FROM users WHERE id = '" + user_id + "'",  # VULNERABLE
  GOOD::"SELECT * FROM users WHERE id = ?",  # Parameterized
  GOOD::db.query("SELECT * FROM users WHERE id = :id", {id: user_id})  # Named params
]
```

---

## XSS PREVENTION

```octave
XSS_DEFENSE::[
  OUTPUT_ENCODING::escape_html_entities[<, >, &, ", '],
  CSP::Content_Security_Policy_headers[restrict_script_sources],
  SANITIZE::user_generated_content[DOMPurify, bleach],
  FRAMEWORK_AUTO_ESCAPE::React_Angular_Vue[default_protection]
]

CSP_HEADER::
  Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com; object-src 'none'
```

---

## OWASP TOP 10 CHECKLIST

```octave
TOP_10_VULNERABILITIES::[
  A01_Broken_Access_Control::[verify_permissions, enforce_least_privilege, deny_by_default],
  A02_Cryptographic_Failures::[encrypt_sensitive_data, HTTPS_only, strong_algorithms],
  A03_Injection::[parameterized_queries, input_validation, escape_output],
  A04_Insecure_Design::[threat_modeling, security_by_design, principle_of_least_privilege],
  A05_Security_Misconfiguration::[secure_defaults, disable_debug_in_prod, update_dependencies],
  A06_Vulnerable_Components::[npm_audit, dependency_scanning, keep_updated],
  A07_Auth_Failures::[multi_factor_auth, rate_limiting, secure_session_management],
  A08_Data_Integrity::[verify_signatures, integrity_checks, secure_CI/CD],
  A09_Logging_Failures::[log_security_events, protect_logs, alert_on_anomalies],
  A10_SSRF::[validate_URLs, whitelist_destinations, network_segmentation]
]
```

---

## RATE LIMITING

```octave
RATE_LIMIT_PATTERN::[
  AUTH_ENDPOINTS::5_requests_per_minute[login, register, reset_password],
  API_ENDPOINTS::100_requests_per_minute_per_user,
  IMPLEMENTATION::[Redis, express-rate-limit, Django_ratelimit],
  RESPONSE::429_Too_Many_Requests[Retry-After_header]
]
```

---

## SECRETS MANAGEMENT

```octave
SECRETS_RULES::[
  NEVER::hardcode[API_keys, passwords, tokens, certificates],
  USE::environment_variables[.env+dotenv, secrets_managers],
  ROTATE::regularly[90_days_max],
  ACCESS::least_privilege[only_services_that_need_them]
]

EXAMPLE_ENV::
  # .env (gitignored)
  DATABASE_URL=postgresql://user:pass@localhost/db
  JWT_SECRET=random_256_bit_key
  API_KEY=sk_live_...

  # .env.example (committed)
  DATABASE_URL=postgresql://user:pass@localhost/dbname
  JWT_SECRET=your_secret_key_here
  API_KEY=your_api_key_here
```

---

## CORS CONFIGURATION

```octave
CORS_SECURITY::[
  SPECIFIC_ORIGINS::whitelist_only["https://app.example.com"]≠wildcard["*"],
  CREDENTIALS::Access-Control-Allow-Credentials:_true→specific_origin_required,
  METHODS::limit_to_needed[GET,_POST,_PUT,_DELETE],
  HEADERS::whitelist_allowed[Content-Type,_Authorization]
]
```

---

## HTTPS ENFORCEMENT

```octave
HTTPS_MANDATE::[
  PROD::ALWAYS_HTTPS[redirect_HTTP→HTTPS],
  HSTS::Strict-Transport-Security_header[max-age=31536000],
  CERTIFICATES::Let's_Encrypt_or_trusted_CA,
  MIXED_CONTENT::NO_HTTP_resources_on_HTTPS_pages
]
```

---

## ERROR HANDLING

```octave
SECURE_ERRORS::[
  PROD::generic_messages["An error occurred"]≠detailed_stack_traces,
  LOG::full_details_server_side[for_debugging],
  CODES::use_standard_HTTP_status[400,_401,_403,_404,_500],
  NEVER::expose[database_schema, file_paths, internal_IPs, tech_stack_versions]
]
```

---

## SECURITY HEADERS

```octave
REQUIRED_HEADERS::[
  Strict-Transport-Security::"max-age=31536000; includeSubDomains",
  X-Content-Type-Options::"nosniff",
  X-Frame-Options::"DENY",
  X-XSS-Protection::"1; mode=block",
  Content-Security-Policy::"default-src 'self'; script-src 'self' https://trusted.cdn.com",
  Referrer-Policy::"strict-origin-when-cross-origin"
]
```

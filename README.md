- root_url
either
  - login_html_file
  or
  - defer_login_url
- on_login
- shared_key_header (defaults to `x-keyless-sso`)
- shared_key (defaults to `59b325af9e266d0285bc1f0840a5e89915a3105c36f19bae58f5176b15476d05`)
- session_key (defaults to `keyless.sid`)
- session_secret (defaults to `b3dbc47c1cd6b210ab3312aa3804f47d07f15dd5ba50907b0bf5b49da8a02483`)
- ticket_store (defaults to `Keyless.TicketStore.memory()`)
- token_store (defaults to `Keyless.TokenStore.memory()`)
- force_ssl (defaults to `true` when NODE_ENV is `production`)
- session_store (optional)
- authorized_callback_domains (optional)


keyless_error

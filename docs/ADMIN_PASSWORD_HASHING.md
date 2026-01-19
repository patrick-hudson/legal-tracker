# Admin Portal - Password Hashing System

## Overview

The Legal Matters admin portal uses **client-side password hashing** to ensure plaintext passwords NEVER leave your browser or appear anywhere in the system.

## How It Works

### 1. Configuration
The system uses a configurable salt stored in the `.env` file:

```env
PASSWORD_SALT=your-unique-salt-here
```

**Important:** Generate a unique salt using:
```bash
openssl rand -hex 32
```

### 2. Login Flow

1. **Browser fetches config:**
   ```javascript
   GET /api/config
   Response: { "passwordSalt": "abc123..." }
   ```

2. **Browser hashes password:**
   ```javascript
   message = username + ':' + password + ':' + passwordSalt
   hashedPassword = SHA256(message)
   ```

3. **Browser sends hash to server:**
   ```javascript
   POST /admin/api/auth/login
   Body: { "username": "admin", "hashedPassword": "71133b2b..." }
   ```

4. **Server verifies:**
   ```javascript
   // Server stores: bcrypt(hashedPassword)
   validPassword = await bcrypt.compare(hashedPassword, stored_hash)
   ```

## Security Benefits

✅ **Plaintext password never transmitted** - Not even over HTTPS
✅ **Server logs safe** - Only hashed passwords in logs
✅ **Network traces safe** - No plaintext in packet captures
✅ **Double protection** - SHA-256 + bcrypt
✅ **Salt prevents rainbow tables** - Username included in hash

## Creating Admin Users

When you create an admin user via CLI, the same hashing is applied:

```bash
cd backend
node create-admin-simple.js admin SecureP@ss123 admin@example.com
```

The CLI tool:
1. Reads `PASSWORD_SALT` from `.env`
2. Computes `SHA256(username:password:PASSWORD_SALT)`
3. Computes `bcrypt(hashedPassword)` with 12 rounds
4. Stores bcrypt hash in database

## API Usage (curl example)

If you need to script admin login:

```bash
#!/bin/bash

USERNAME="admin"
PASSWORD="admin123"

# Step 1: Get the password salt
SALT=$(curl -s http://localhost:3000/api/config | jq -r '.passwordSalt')

# Step 2: Hash the password
HASHED_PASSWORD=$(echo -n "${USERNAME}:${PASSWORD}:${SALT}" | sha256sum | cut -d' ' -f1)

# Step 3: Login
curl -X POST http://localhost:3000/admin/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"hashedPassword\":\"$HASHED_PASSWORD\"}" \
  -c cookies.txt

# Use cookies.txt for authenticated requests
curl http://localhost:3000/admin/api/dashboard -b cookies.txt
```

## Changing the Password Salt

⚠️ **WARNING:** Changing `PASSWORD_SALT` will invalidate all existing admin users.

If you need to rotate the salt:

1. Generate new salt: `openssl rand -hex 32`
2. Update `PASSWORD_SALT` in `.env`
3. Restart the server
4. Recreate all admin users with new CLI tool

## Comparison with Other Methods

| Method | Plaintext Transmitted | Complexity | Security |
|--------|----------------------|------------|----------|
| **This system (SHA-256 + bcrypt)** | ❌ Never | Low | ⭐⭐⭐⭐ |
| Plain password over HTTPS | ⚠️ Yes (TLS encrypted) | Lowest | ⭐⭐⭐ |
| WebAuthn/Passkeys | ❌ Never | High | ⭐⭐⭐⭐⭐ |
| OAuth 2.0 | ⚠️ Depends | Medium | ⭐⭐⭐⭐ |

## FAQs

**Q: Why not just use HTTPS?**
A: HTTPS encrypts in transit, but plaintext passwords still appear in:
- Browser dev tools
- Server logs
- Debugging tools
- Error messages

**Q: Is this as secure as WebAuthn?**
A: No, WebAuthn is more secure (phishing-resistant, hardware-backed). This is a practical middle ground between simple passwords and full WebAuthn implementation.

**Q: Can I use this for API authentication?**
A: No, this is specifically for the admin portal web login. For API access, use the separate API key system.

**Q: What if someone intercepts the hashed password?**
A: They could replay it to login (replay attack). Use HTTPS in production to prevent this. The hash itself doesn't reveal the plaintext password due to bcrypt protection on the server.

## Best Practices

1. ✅ Always use HTTPS in production
2. ✅ Generate strong, unique `PASSWORD_SALT`
3. ✅ Use strong passwords (8+ characters)
4. ✅ Rotate salt periodically and recreate users
5. ✅ Keep `.env` file secure (not in git)
6. ✅ Monitor login attempts in server logs

## Technical Details

**Hashing Algorithm:**
```
Client: SHA-256(username + ':' + password + ':' + PASSWORD_SALT)
Server: bcrypt(clientHash, rounds=12)
```

**Why SHA-256 then bcrypt?**
- SHA-256: Fast, deterministic, client-side friendly
- bcrypt: Slow (prevents brute force), salted automatically, server-optimized

**Salt Format:**
- 64 hex characters (32 bytes of entropy)
- Unique per installation
- Not per-user (username provides uniqueness)

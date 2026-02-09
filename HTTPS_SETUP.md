# HTTPS Setup Guide

This app supports HTTPS using locally-trusted certificates generated with `mkcert`.

## Prerequisites

- `mkcert` installed (via Homebrew: `brew install mkcert`)
- Node.js and pnpm

## Setup

### 1. Install mkcert local CA (Optional but Recommended)

This step makes browsers trust your local certificates without security warnings:

```bash
mkcert -install
```

**Note:** This requires sudo password and installs a local certificate authority on your system.

### 2. Certificates Are Already Generated

The repository includes `.pem` files in `.gitignore`, so they won't be committed. The following certificates are already generated:

- `localhost+3.pem` - Certificate (valid for localhost, 127.0.0.1, ::1, and 192.168.1.238)
- `localhost+3-key.pem` - Private key

If your local IP changes or you need to add more hostnames:

```bash
# Find your current IP
ipconfig getifaddr en0

# Regenerate certificate with new IP
mkcert localhost 127.0.0.1 ::1 YOUR_LOCAL_IP

# Update server.js to use the new certificate files
# (Update the filename in server.js to match the new localhost+X.pem files)
```

## Running the App

### Development (HTTP)

```bash
pnpm dev
```

Runs on `http://localhost:5173` (Vite dev server with hot reload)

### Production with HTTPS

```bash
# Build the app
pnpm build

# Start HTTPS server
pnpm start
```

The app will be available at:
- `https://localhost:3000` (on the laptop)
- `https://192.168.1.238:3000` (from other devices on your network)

### Production with HTTP (fallback)

If you need to run without HTTPS:

```bash
pnpm build
pnpm start:http
```

## Environment Variables

You can customize the server with environment variables:

```bash
PORT=4000 pnpm start          # Run on port 4000
HOST=192.168.1.x pnpm start   # Bind to specific IP
```

## Wake Lock API

The "Keep Awake" toggle in the schedule sidebar requires HTTPS to work. When running over HTTP, the toggle will not appear.

## Security Notes

- The certificate files (`*.pem`) are excluded from git via `.gitignore`
- Certificates expire in 2 years (check expiry date when regenerated)
- mkcert certificates are only trusted on your local machine
- For production deployment with a real domain, use Let's Encrypt instead

## Troubleshooting

### "Certificate is not trusted" warning

If you see browser warnings about untrusted certificates:

1. Run `mkcert -install` to trust the local CA
2. Restart your browser
3. Visit `https://localhost:3000` again

### Port already in use

If port 3000 is busy:

```bash
PORT=4000 pnpm start
```

### Accessing from iPad or other devices

The certificate includes `192.168.1.238`, so you can access from other devices on your network:

1. On your iPad, navigate to `https://192.168.1.238:3000`
2. You'll see a security warning (expected - certificate is self-signed)
3. Tap "Show Details" → "visit this website" to proceed
4. The Wake Lock API will work once you accept the certificate

**Note:** The warning appears because the iPad doesn't have the mkcert CA certificate installed. For a home dashboard, accepting the warning once is fine. The certificate is valid and provides encryption.

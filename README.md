# Blair Board

A family kitchen dashboard that displays multiple calendars from iCal feeds in a clean, glanceable interface. Designed to run on a wall-mounted screen, tablet, or any browser.

## Features

- **Four calendar views**:
  - **Week** — time-grid with events positioned proportionally (configurable hours)
  - **Week+Next** — current week time-grid plus simplified next week preview
  - **4 Week** — four-week overview grid
  - **Month** — traditional monthly grid
- **Spanning multi-day events** — multi-day and all-day events render as horizontal bars across day columns
- **Agenda sidebar** — today + tomorrow events (collapsible, resizable)
- **Multiple calendars** with colour coding (Google Calendar, Apple/iCloud, Outlook, etc.)
- **Calendar visibility toggle** — click legend items to show/hide individual calendars
- **Wake Lock support** — "Keep Awake" toggle prevents screen dimming (requires HTTPS)
- **Auto-refresh** via configurable polling interval
- **Server-side rendering** for instant first paint
- **View persistence** — remembers your last selected view
- **Self-hosted** via Node.js — no cloud account needed

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)

### Setup

```sh
# Install dependencies
pnpm install

# If esbuild fails, approve its build script
pnpm rebuild esbuild

# Create your config from the template
cp config.example.json config.json
```

Edit `config.json` with your calendar iCal URLs. To get an iCal URL:

- **Google Calendar**: Calendar settings > Integrate calendar > "Secret address in iCal format"
- **Apple/iCloud**: Calendar app > Right-click calendar > Share > Public Calendar > copy URL
- **Outlook**: Calendar settings > Shared calendars > Publish > ICS link

### Running the App

#### Development Mode (with hot reload)

For local development with automatic code reloading:

```sh
pnpm dev
```

Open http://localhost:5173 in a browser.

To access from other devices on your network (e.g., iPad):

```sh
pnpm dev --host
```

Then access via `http://YOUR_LOCAL_IP:5173` from other devices.

**Note:** Wake Lock API requires HTTPS, so the "Keep Awake" toggle won't appear in dev mode.

#### Production Mode with HTTPS

For full testing with Wake Lock API support over your local network:

```sh
pnpm build
pnpm start
```

The server will be available at:
- **Local**: `https://localhost:3000`
- **Network**: `https://YOUR_LOCAL_IP:3000` (e.g., from iPad)

**First-time setup:** You'll need to generate SSL certificates with `mkcert`. See [HTTPS_SETUP.md](HTTPS_SETUP.md) for details.

#### Production Mode (HTTP fallback)

If you don't need HTTPS:

```sh
pnpm build
pnpm start:http
```

The server listens on port 3000 by default. Set the `PORT` environment variable to change it.

## Configuration

All settings are in `config.json` (gitignored). See `config.example.json` for the full schema.

```json
{
  "calendars": [
    {
      "id": "family",
      "name": "Family",
      "url": "https://calendar.google.com/calendar/ical/.../basic.ics",
      "colour": "#4285F4",
      "enabled": true
    }
  ],
  "display": {
    "defaultView": "week",
    "agendaDays": 2,
    "weekStartsOn": 1,
    "timeFormat": "24h",
    "gridStartHour": 6,
    "gridEndHour": 22
  },
  "refresh": {
    "clientPollIntervalMinutes": 5,
    "serverCacheTTLMinutes": 15
  },
  "timezone": "Europe/London"
}
```

### Config Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `calendars[].id` | string | required | Unique identifier for the calendar |
| `calendars[].name` | string | required | Display name |
| `calendars[].url` | string | required | iCal feed URL (.ics) |
| `calendars[].colour` | string | required | Hex colour for events (e.g. `#4285F4`) |
| `calendars[].enabled` | boolean | required | Show/hide this calendar |
| `display.defaultView` | `"week"` \| `"weeknext"` \| `"4week"` \| `"month"` | `"week"` | View shown on load |
| `display.agendaDays` | 1-14 | `2` | Number of days in the agenda sidebar |
| `display.weekStartsOn` | `0` \| `1` | `1` | 0 = Sunday, 1 = Monday |
| `display.timeFormat` | `"12h"` \| `"24h"` | `"24h"` | Clock format |
| `display.gridStartHour` | 0-23 | `6` | Time grid start hour (Week views) |
| `display.gridEndHour` | 1-24 | `22` | Time grid end hour (Week views) |
| `refresh.clientPollIntervalMinutes` | number | `5` | How often the browser fetches fresh data |
| `refresh.serverCacheTTLMinutes` | number | `15` | How long the server caches iCal data |
| `timezone` | string | `"Europe/London"` | IANA timezone for display |

## Tech Stack

- [SvelteKit](https://svelte.dev/docs/kit) + [Svelte 5](https://svelte.dev/docs/svelte) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [ical.js](https://github.com/kewisch/ical.js) for iCal parsing and recurring event expansion
- [date-fns](https://date-fns.org/) + [date-fns-tz](https://github.com/marnusw/date-fns-tz) for dates and timezone handling
- [Inter](https://rsms.me/inter/) typeface

## Project Structure

```
src/
├── routes/
│   ├── +layout.svelte            # Root layout
│   ├── +page.svelte              # Main dashboard
│   ├── +page.server.ts           # SSR data loader
│   └── api/events/+server.ts     # Calendar data API
└── lib/
    ├── components/               # Svelte UI components
    ├── server/                   # Server-only: config, cache, iCal fetcher
    ├── stores/                   # Reactive state (Svelte 5 runes)
    ├── types/                    # TypeScript interfaces and zod schemas
    └── utils/                    # Date helpers, spanning event logic
```

## Documentation

- **[Technical Reference](docs/TECHNICAL_REFERENCE.md)** — Complete technical documentation covering architecture, implementation, and design decisions
- **[Development Guide](docs/CLAUDE.md)** — Code conventions and development workflow
- **[Refactoring Plan](docs/REFACTORING_PLAN.md)** — Identified opportunities for code improvements

See [docs/](docs/) for all project documentation.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (HTTP, hot reload) |
| `pnpm dev --host` | Dev server accessible on local network |
| `pnpm build` | Production build |
| `pnpm start` | Start production server (HTTPS) |
| `pnpm start:http` | Start production server (HTTP fallback) |
| `pnpm check` | TypeScript and Svelte type checking |

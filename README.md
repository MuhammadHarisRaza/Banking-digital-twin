# Alara Banking Operations

A demo connected view of UBL's branches, people, applications, AI agents and operations across Pakistan.
This is an independent demo, not an official UBL product. See Sources for what is published data and what is illustrative.

## Run

```bash
npm install
npm run dev
```

The app runs at http://localhost:5183. `npm run build` type-checks and creates a production build in `dist/`.
Node 20 or later is required.

## Connect the deployed applications

Digital Eye and Customer 360 already point to their deployed URLs. Application links live in `src/config/appLinks.ts`. Change a `url` there, or copy `.env.example` to `.env.local` and fill in:

| Variable | Application |
|---|---|
| `VITE_DIGITAL_EYE_URL` | Digital Eye |
| `VITE_CUSTOMER_360_URL` | Customer 360 |
| `VITE_KNOWLEDGE_RAG_URL` | Knowledge RAG |
| `VITE_LOANS_ORIGINATION_URL` | Loans Origination |
| `VITE_BRANCH_OPERATIONS_URL` | Branch Operations |
| `VITE_TRADE_FINANCE_URL` | Trade Finance |
| `VITE_AML_MONITOR_URL` | AML Monitor |
| `VITE_CARDS_MANAGEMENT_URL` | Cards Management |
| `VITE_CASH_MANAGEMENT_URL` | Cash Management |
| `VITE_COMPLAINT_DESK_URL` | Complaint Desk |
| `VITE_SHARIAH_DESK_URL` | Shariah Desk |
| `VITE_CALL_CENTER_URL` | Customer Experience (Call Center) |
| `VITE_MOBILE_APP_URL` | Mobile App |

With a URL set, the app opens in a new tab with `?branch=<id>` appended. Without one, it opens a local placeholder route.
Links can also be overridden at runtime in **Settings → Integrations**.

## 3D branch twins

Every branch has an illustrative 3D twin at `/branches/<id>/twin`. Open it from the **3D Twin** button in the branch panel,
the Branches page, the menu, or by double-clicking a branch on the map.

- **How it's built.** The building is generated in code (three.js through React Three Fiber and drei), because every one of the
  1,381 branches gets its own layout. Realism comes from:
  - **A furniture and equipment kit** (`src/twin/scene/kit/`) modelled at real sizes with bevelled edges:
    - teller counters with glass security screens, deal trays and counter numbers;
    - ATMs, cash and cheque deposit machines, a token kiosk and reception with a welcome screen;
    - service and RM desks with frosted privacy screens, the manager's office, meeting room and beam seating;
    - the round vault door, lockers, back office, electrical room, staff room with kitchenette, washrooms and records.
  - **Photo-scanned materials** (terrazzo, granite, wood veneers, plaster, concrete, fabric, leather, ceiling and wall tiles) with
    texture coordinates in metres, so every surface keeps its real scale (`src/twin/scene/pbr.ts`, `kit/geometry.ts`).
  - **A few scanned models** (plants, sofa, armchair, coffee table) and a street HDRI for reflections in glass and metal.
  - **Lighting:** sun and sky, interior area lights, emissive ceiling panels, cached soft shadows, ambient occlusion and bloom,
    a reflective hall floor on High quality, and a day/night switch.
  - Assets are CC0 from Poly Haven, listed in `public/twin/CREDITS.md`; `node scripts/fetch-twin-assets.mjs` re-creates them.
    Low quality skips them and uses canvas textures.
  - Static meshes are merged per material once the scene settles (`StaticBatcher.tsx`), which keeps a flagship branch at
    about 200 draw calls.
- **Street life** (`src/twin/scene/Traffic.tsx`). Cars pass in both lanes and keep their distance. Some pull in at the kerb to
  drop a customer, who walks into the branch and joins the simulation (`arriveFrom` in the engine). Others turn in through the car-park
  driveway (a dropped kerb across the pavement, with lane markings, a give-way line and a P sign) and park in a free bay; the driver walks round to the front door. Parked cars later reverse out and leave. Cars
  move in real time, stop when the simulation is paused, and have head- and tail-lights at night. Drop-offs and parking
  only bring customers during banking hours.
- **Architecture.** A raised plinth with steps and an accessible ramp, stone-clad piers, a curtain wall with mullions, a brand
  band, an entrance canopy, street lamps and bollards. Behind the back offices, a service band holds a staff corridor,
  washrooms, the staff room, records and the electrical/network room.
- **Layout generator** (`src/twin/layout/buildBranchLayout.ts`). Size comes from staff count (compact, standard or flagship),
  the archetype from the branch type, and the ATM vestibule and locker room from the published ATM and locker flags:
  - Retail: tellers, service desks and a waiting hall.
  - Islamic: brand-accent signage, a Shariah advisory desk and a prayer room.
  - Corporate: cash counters, relationship managers, a meeting room and a client lounge.
  - The same branch always produces the same building.
- **Simulation** (`src/twin/sim/engine.ts`). A deterministic engine runs the branch:
  - Customers arrive by hour of day (busiest over lunch), take a token, wait, and are called to a counter.
  - Tellers take breaks, ATM cash runs down and is replenished, and the vault opens under dual control.
  - Alerts are raised for long queues, long waits, unstaffed counters and ATM faults.
  - Speeds are 1×, 10× and 60×. The **What-if** menu adds a lunch rush, an ATM failure or an absent teller.
- **Interaction:**
  - Click any counter, ATM, desk, vault, server room or camera to fly to it and see its live figures.
  - **Camera modes:** **Exterior**, **Interior** (a cutaway of the whole floor) and **Walkthrough** (keys `E`, `I`, `W`).
  - **Walkthrough:** first person at eye height. Click the view for mouse look (`Esc` frees the mouse) or drag to look; `WASD` or
    the arrow keys to walk, `Shift` to run. Walls, glass and furniture block the way; doors, steps and the ramp don't. Clicking a
    zone in the list walks you there; **Guided tour** walks through every zone (touch screens start it automatically). Click
    while looking to select what's under the crosshair. A mini-map shows where you are.
  - Zoom, reset and fullscreen buttons on the right; `N` toggles night, `F` fullscreen.
  - Keys `1`–`5` switch views, `Esc` clears the selection, and space pauses.
  - **Camera views:** selecting an ATM or a CCTV camera plays footage matched to what it watches (ATM, teller line, vault,
    lobby), with a security-camera grade, and can be enlarged. The clips are in `public/videos` and are listed in
    `src/twin/ui/cameraClips.ts`. They are royalty-free Mixkit stock clips (Mixkit License), downloaded at 360p.
    - A **Twin view** tab renders the same camera's view live from the 3D scene instead (`src/twin/scene/CameraFeedRenderer.tsx`).
    - **Settings → 3D Twin → Camera clip** puts your own MP4 or WebM first on every camera.
- **Signage** is drawn from Settings, so renaming the bank or changing its logo or colour re-brands the buildings immediately.

## Settings and white-labelling

**Settings** (`/settings`) makes the platform configurable without code. Edits are a draft until **Save changes** (or **Discard**); saved settings are kept in the browser's
localStorage; **Presets & backup** exports and imports them as JSON.

- **Brand:** bank name, short name, logo and brand colour (uploaded or generated from the name). Tagline, product name, dashboard title
  and browser icon are under **Advanced**.
- **Theme:** the full palette derived from the brand colour, including the charts, map tint and twin. Every colour can also be edited
  individually, with a contrast check.
- **Organisation:**
  - Headquarters name, location and photos; country, currency and Islamic-banking label.
  - **Network figures are calculated, not typed:** branches, Islamic branches, staff and cities come from the loaded branch list
    (`computeNetwork` in `src/data/bankData.ts`), applications and AI agents from the platform's catalogue, head-office staff as
    14% of branch staff. Only deposits and digital customers are optional fields (hidden when empty).
  - **Advanced:** milestones (which also feed the notifications), footnotes, figure sources, head-office map position, number
    format and the branch-photo setting.
- **Branches:** import a CSV or JSON branch list (CSV and JSON templates can be downloaded) to replace the bundled list on the map,
  the Branches page and the twins. JSON can be a bare array or an object holding one (`{"branches": [...]}`); column names are
  matched loosely ("Branch Name", "Latitude"…). Rows are validated and every skipped row is reported with its reason (missing name,
  city or coordinates, duplicate code, or a location outside Pakistan, checked against the country outline, not just a rectangle).
- **Which branch list is used:** an imported list first; otherwise the active preset's own list. UBL uses its published list, and
  each fictional preset bank has a sample list in `src/data/presets/` (generated by `node scripts/build-preset-branches.mjs`), so a
  preset never shows UBL's branches.
- **Dashboard & menu:** show, hide or rename each dashboard card and menu item.
- **3D Twin:** rendering quality, default simulation speed, people, signage and roof.
- **Presets:** UBL (the original demo) plus four fictional banks with generated logos.

The defaults reproduce the original UBL dashboard. The config model is in `src/config/bankConfig.ts`, and the store is in
`src/store/settingsStore.ts`. `src/config/ThemeSync.tsx` writes the theme onto the CSS variables that the Tailwind utilities read.

## Customer 360 (C360) integration

Real customer data comes from the Customer 360 / RM Buddy read-only API (see `RM Buddy — Read-Only API Reference` in the poc folder).

- **Where it shows:**
  - a **Customers** page (`/customers`) with search, churn/KYC/city filters and server-side paging;
  - a **Customer 360 drawer** (identity, scores, insights, AI RM brief, accounts, alerts, recent activity) that opens from anywhere;
  - a **customer-book strip** on the dashboard (customers, needing attention, growth opportunities, KYC, churn mix), each figure linking to the filtered list;
  - a **Customers** tab in each branch panel and a Customer 360 section in the twin inspector;
  - in the **3D twins**, most visitors to a linked branch are that branch's real customers; selecting a counter shows who is being served.
- **Connection:** the app calls `/c360-api/api/v1/...`, which the Vite dev server and `vercel.json` forward to
  `https://c360-demo-api.waiindustries.org`, so there is no CORS problem. Settings → Integrations can switch it off, change the
  address and test the connection. Code is in `src/c360/` (client, cache, endpoint hooks, branch linking) and `src/components/c360/`.
- **Branches:** C360 branch codes (BR001…) don't match this platform's (BR-0007…). Each C360 branch is linked to a branch here:
  your choice in Settings → Integrations, else the main branch in the same city, else a main branch of a major city.
- **Limits of the demo data:** 51 sample customers, mostly in Nigerian cities. The customer list has no branch, so each customer's
  360 record is read once (cached 30 minutes) to find it; adding `branch_id` to `GET /customers` would remove those calls.

### Importing the bank's own customers

**Where:** Settings → Integrations → Customer 360 → **Import bank data**. It sends a C360 bank bundle (the format is in
`IMPORT_GUIDE.md`) through our banking-twin-api, which adds C360's admin service token. The app only needs the admin key
(`TWIN_ADMIN_KEY`).

**Files:**
- relationship_managers, customers, accounts, transactions, interactions and propensity_scores CSVs, or one .zip/.xlsx with all
  of them;
- files are matched by name (`customers.csv`, `accounts (1).csv`…);
- templates with a sample row are one click away.

**Steps:**
1. **Check files** runs a dry run: per-file totals and every rejected row with its reason.
2. **Import** loads the files.
3. The screen follows C360's scoring job (scores, business rules, AI briefs, RM performance) until it's done.

**Bank code:** each bank has its own code in C360 (Settings → Integrations → Customer 360 → Bank code in C360).
- By default it comes from the bank's short name: `northstar`, `ubl`, `crescent`, `indusbank`, `demobank`.
- Switching to another bank preset uses that bank's code.
- Imported customers become `<code>_<customer_id>`. Keep the code once you've imported: a new code means new customers, not updates.

**Only imported customers** (on by default):
- Imported customers' ids start with this bank's code (e.g. `northstar_…`).
- The Customers page, the dashboard strip, branch Customers tabs and the twins then show only those, and C360's demo customers
  are hidden.
- The dashboard figures are counted from filtered lists, because C360's dashboard endpoints count everyone.
- Switch it off in the same card to see everything.

**Branches:** a customer whose `branch_id` is one of our branch codes (e.g. `BR-0002`) lands on that branch with no mapping.

**Code:** `src/c360/importBundle.ts`, `src/components/c360/ImportBundle.tsx`, `src/twinApi/client.ts`.

**Address:** the Digital Twin API address and admin key are set once, in the **Digital Twin API** card at the top of
Settings → Integrations. Digital Eye uses them too.

## Digital Eye integration

Digital Eye sends edge-box health and camera tamper events to our own backend, **banking-twin-api** (separate repo in the poc
folder, built to `digital-twin-integration-v1.md`). This app only reads `GET /api/twin/v1/state` from it, every 30 seconds.

- **Settings → Integrations → Digital Eye:** switch on (the API address, default `VITE_DE_API_URL` else
  `http://localhost:8080`, is set in the Digital Twin API card), see the connection status (last call, last health check, latest connection check, last refused call,
  and events that differed from the guide), and map Digital Eye **sites** to branches. Boxes and cameras follow their site; a box
  can be moved to another branch, and each camera is linked to one of its branch's twin cameras (`cctv-N` or `atm-N`).
- **The mapping is shared:** it is stored in banking-twin-api, not in the browser, so everyone sees the same one. Save it with
  **Save mapping for everyone** and the API's `TWIN_ADMIN_KEY` (entered in the Digital Twin API card, kept in this browser only).
  The on/off switch and the API address are still per browser, saved with Save changes.
- **In the twin:** the Electrical & Network room shows each mapped box (CPU, network, memory, storage, GPU, last report). A tampered
  camera turns red in 3D, shows a red banner over its video, and raises a "Camera obstruction (Digital Eye)" alert. A tamper counts
  as active for 30 minutes (the API's `TAMPER_ACTIVE_MINUTES`). A box silent for over 30 minutes raises a warning.
- **Video:** Digital Eye has factory video only, so camera pictures stay the stock bank clips.
- Code is in `src/digitalEye/api.ts`, `src/twin/ui/Inspector.tsx`, `src/twin/ui/CameraFeed.tsx` and `src/twin/scene/kit/Secure.tsx`.
- **Local demo:** in banking-twin-api run `npm run dev`, then `npm run de:simulate -- --live` to act like Digital Eye.

## Project layout

- `src/pages` route screens (dashboard, Branches, branch twin, Settings, Applications)
- `src/components` UI, grouped into `layout` (header, sidebar), `dashboard`, `branch`, `headquarters` and `common`
- `src/config` bank configuration, presets, colour helpers, theme sync and application URLs
- `src/store` settings, imported branch list and UI state (zustand)
- `src/twin` the 3D branch twin: `layout`, `sim`, `scene` and `ui`
- `src/data` demo datasets, generated deterministically so they stay stable between reloads
- `src/hooks` branch selection (kept in the URL), app launching, dropdown dismissal
- `src/assets/geo` map boundaries and terrain
- `scripts/build-map-assets.py` regenerates the map assets

The Tailwind theme defaults are in the `@theme` block of `src/index.css`. At runtime, `ThemeSync` overrides them from Settings.

## Sources

Published data:

- Branch list: UBL's branch list (July 2024) and Saturday branches annexure (31 Oct 2026), from ubldigital.com. `scripts/build-ubl-data.py` turns them into `src/data/ubl-branches.json`.
- Bank totals: UBL investor presentation, December 2025 (2,017 branches, 752 Islamic, 596 windows, PKR 5.2 Tn deposits).
- Head office: I.I. Chundrigar Road, Karachi. Registered office: Jinnah Avenue, Blue Area, Islamabad.

Illustrative data:

- Staff, staff names, transactions, customers, connected applications, AI agents, knowledge bases, branch activity, headquarters departments, operational trends, and Call Center and Mobile App figures.
- Map positions are approximate: branches sit at city level from GeoNames, spread out so they stay clickable.

Map and type:

- Boundaries: [geoBoundaries](https://www.geoboundaries.org/) gbOpen PAK ADM1. Disputed areas are drawn as the source draws them; review before any external use.
- Terrain: Mapzen Terrarium elevation tiles from the [AWS Open Data registry](https://registry.opendata.aws/terrain-tiles/).
- Place names: [GeoNames](https://www.geonames.org/), CC BY 4.0.
- Type: Source Sans 3 via Fontsource.

The UBL logo and icon are UBL trademarks. The logo comes from UBL's published artwork and the icon from ubldigital.com.

Images (copyright remains with UBL and the original publishers; get permission before public use):

- `ubl-head-office-aerial.jpg`: UBL Sustainability Report 2020.
- `ubl-head-office.jpg`: UBL head office exterior, as published by ARY News.
- `ubl-branch-01.jpg`: Dunya News. `ubl-branch-02.jpg`: Coroflot portfolio. `ubl-branch-03.jpg`: 24 News HD. `ubl-branch-04.jpg`: Blogger. `ubl-branch-05.jpg`: Customs Today.
- `ubl-ameen-01.jpg`: Behance portfolio. `ubl-ameen-02.jpg`: LinkedIn post, cropped.

# Alara Banking Operations

A connected view of a bank's branches, people, applications, AI agents and operations across Pakistan.
All branches, names and figures are illustrative demo data.

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

With a URL set, the app opens in a new tab with `?branch=<id>` appended. Without one, it opens a local placeholder route.

## Project layout

- `src/pages` route screens
- `src/components` UI, grouped into `layout`, `dashboard`, `branch`, `headquarters` and `common`
- `src/data` demo datasets, generated deterministically so they stay stable between reloads
- `src/config/appLinks.ts` application URLs
- `src/hooks` branch selection (kept in the URL), app launching, dropdown dismissal
- `src/assets/geo` map boundaries and terrain
- `scripts/build-map-assets.py` regenerates the map assets

The Tailwind theme is defined in the `@theme` block of `src/index.css`.

## Sources

- Boundaries: [geoBoundaries](https://www.geoboundaries.org/) gbOpen PAK ADM1 (public domain, as listed by the source). Disputed areas are drawn as the source draws them; review before any external use.
- Terrain: Mapzen Terrarium elevation tiles from the [AWS Open Data registry](https://registry.opendata.aws/terrain-tiles/).
- Network scale: modelled on Bank Alfalah's public disclosures (branch, Islamic, ATM, customer and deposit figures), scaled to 1,247 branches. Branch records, staff and the provincial split are not the bank's data.
- Photography: [Unsplash](https://unsplash.com/license).
- Type: Source Sans 3 via Fontsource.

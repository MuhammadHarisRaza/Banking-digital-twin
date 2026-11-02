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

# KongMoney

KongMoney is an Expo React Native budgeting app for tracking bucket-based spending, recurring deductions, transfers, shared buckets, and monthly resets. The app uses local state persistence with Zustand and AsyncStorage, so it works as a self-contained personal finance tool without a backend.

## Features

- Bucket dashboard with balance tracking and budget progress
- Manual expense entry and internal transfers between buckets
- Slip scanner flow for mock OCR-style receipt parsing
- Recurring deduction management with scheduled processing
- Shared bucket support for multiple users and role-based access
- Monthly reset flow that rolls leftover balances into a savings bucket
- Analytics panel with a simple bucket distribution chart
- Dark/light theme support using the device color scheme

## Tech Stack

- React Native + Expo
- TypeScript
- Zustand for state management
- AsyncStorage for persistence
- react-native-chart-kit for analytics visuals

## Project Structure

```text
KongMoney/
├── App.tsx
├── app.json
├── babel.config.js
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── components/
│   │   ├── AnalyticsPanel.tsx
│   │   └── BucketDashboard.tsx
│   ├── services/
│   │   ├── ocrParser.ts
│   │   └── rollover.ts
│   ├── store/
│   │   └── useKongMoneyStore.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
└── ...
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator, or Expo Go on a device

### Install dependencies

```bash
npm install
```

### Start the app

```bash
npm start
```

Then run one of the following:

```bash
npm run android
npm run ios
npm run web
```

## Available Scripts

```bash
npm start        # Start Expo development server
npm run android  # Run Android app
npm run ios      # Run iOS app
npm run web      # Run web version
npm run typecheck # Run TypeScript checking
```

## App Overview

### Dashboard

The main dashboard shows all buckets, their current balances, progress toward allocated budgets, and the latest transactions. Each bucket can be locked or unlocked from the UI.

### Transfer and Manual Entry

Users can move money between buckets, add manual expenses, and update bucket balances while respecting locked bucket rules and insufficient-funds checks.

### Scanner

The scanner tab currently uses a mock receipt parser in `src/services/ocrParser.ts`. It simulates OCR text extraction and infers a likely bucket from merchant keywords such as `Lotus`, `Netflix`, or `Shell`.

### Recurring Deductions

Recurring bills can be added with a name, amount, next run date, and cadence. The app stores these and can run scheduled deductions through the `applyRecurringDeductions` logic in the store.

### Shared Buckets

Shared buckets allow a bucket owner to invite other users and assign member roles. Access is tracked in the Zustand store and can be read via `getBucketAccessForUser`.

### Monthly Reset

The reset flow applies the rollover logic from `src/services/rollover.ts`. Non-rollover buckets transfer unused balances into the configured savings bucket, and the resulting transfer transactions are added to the transaction history.

## Notes

- The project is intentionally frontend-only and stores data locally in AsyncStorage.
- The OCR implementation is mock-ready and can be replaced with real OCR services such as Tesseract.js or Google Vision later.
- Default sample buckets, transactions, and recurring deductions are initialized in `src/store/useKongMoneyStore.ts`.

## Development Tips

- Use `npm run typecheck` after editing TypeScript files to catch issues early.
- If you want to replace the mock scanner, update `src/services/ocrParser.ts` and keep the existing `ScanResult` contract.
- The main application logic lives in `App.tsx` and `src/store/useKongMoneyStore.ts`.

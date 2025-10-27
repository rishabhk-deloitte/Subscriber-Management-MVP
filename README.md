# Converge Subscriber by Deloitte

A synthetic MVP experience built with Next.js (App Router), TypeScript, Tailwind CSS, and supporting visualization tools. The app showcases contextual planning, opportunity radar, segmentation, offer design, execution, and monitoring for Liberty Puerto Rico without relying on external services.

## Prerequisites
- Node.js 18+
- npm 9+

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production
```bash
npm run build
```

Start the production server locally with:
```bash
npm run start
```

## Deployment
The project is Vercel-ready:
1. Push this repository to your own Git provider.
2. From the Vercel dashboard click **New Project → Import Git Repository** and choose this repo.
3. On the configuration screen confirm the following settings:
   - **Framework preset:** `Next.js`
   - **Install Command:** `npm install`
   - **Build Command:** `npm run build`
   - **Output Directory:** leave blank (managed by Next.js)
4. No environment variables or external integrations are required.
5. Deploy. Vercel will run the build and provision a preview URL; promote to production when ready.

## Tech Stack
- Next.js App Router
- TypeScript & Tailwind CSS
- Zustand for global state
- react-hook-form + zod for forms
- Recharts & react-simple-maps (lazy-loaded)
- LocalStorage for audit logging and persistence stubs

## License
Provided as-is for demonstration purposes.

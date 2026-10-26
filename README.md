# Menu Frontend

React + Vite + TypeScript (strict) + Tailwind CSS + React Router for the Menu SaaS.

The API lives in the sibling repository `../Backend` (Menu-Backend); its `docker-compose.yml`
runs the whole stack, including this app on http://localhost:5173.

## Scripts

```sh
npm ci
npm run dev        # dev server; /api is proxied to API_PROXY_TARGET (default http://localhost:8020)
npm run typecheck  # tsc -b --noEmit
npm run lint
npm run build
```

The production image (`docker build .`) serves the bundle with nginx and forwards `/api` to `backend:8000`.

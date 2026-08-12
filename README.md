# Deployment Guide

## Frontend on Vercel

1. Push this repository to GitHub.
2. Create a new Vercel project and connect the repo.
3. Set the project root to `client`.
4. Build command: `npm install && npm run build`
5. Output directory: `dist`
6. Add environment variables in Vercel:
   - `VITE_API_URL=https://YOUR_BACKEND_URL/api`
7. Deploy.

## Backend on Google Cloud Run

1. Push the repo to GitHub.
2. In Google Cloud Console, open Cloud Run.
3. Create a new service using the `server` directory as the source.
4. Use `server/Dockerfile` or Cloud Build.
5. Set the container port to `5001`.
6. Add environment variables:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN=30d`
   - `FRONTEND_URL=https://YOUR_FRONTEND_URL`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
7. Deploy.

## Configure Frontend to Reach Backend

In Vercel, set:
- `VITE_API_URL=https://YOUR_CLOUD_RUN_URL/api`

In `client/src/services/api.js`, the API base URL now uses `import.meta.env.VITE_API_URL`.

## Notes

- Do not commit `.env` files.
- Backend and frontend are separate apps.
- Frontend will call the backend via `VITE_API_URL`.

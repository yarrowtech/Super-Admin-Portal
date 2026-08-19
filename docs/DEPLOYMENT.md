# Super Admin Portal Deployment

This project is a split deployment:

- `backend`: Node/Express API with MongoDB and Socket.IO.
- `frontend`: Vite/React static app.

Use a hosted backend first, then deploy the frontend with that backend URL in `VITE_API_URL`.

## 1. Backend

Recommended target: Render web service from the `backend` folder.

Build command:

```sh
npm install
```

Start command:

```sh
npm start
```

Health check path:

```text
/health
```

Required backend environment variables:

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://...
CORS_ORIGIN=https://your-frontend-domain.vercel.app
JWT_SECRET=<32+ character secret>
JWT_REFRESH_SECRET=<32+ character secret>
EFNBMMS_ADMIN_MANAGEMENT_API_URL=https://...
EFNBMMS_API_TOKEN=...
EEC_PORTAL_URL=https://edifyeight.com
EDIFYEIGHT_API_URL=https://...
EDIFYEIGHT_TEACHER_API_URL=https://.../api/internal/teachers
EDIFYEIGHT_STUDY_MATERIAL_API_URL=https://.../api/internal/study-materials
EDIFYEIGHT_API_TOKEN=...
```

Optional but needed for real uploads:

```env
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Optional Redis cache:

```env
REDIS_URL=redis://...
CACHE_ENABLED=true
```

If Redis is not configured, the app falls back to in-memory cache.

## 2. Database

The deployed backend cannot read a MongoDB running only on your laptop. Use MongoDB Atlas or another hosted MongoDB and set `MONGO_URI` to that hosted connection string.

To copy local MongoDB data to Atlas:

```sh
mongodump --uri="mongodb://127.0.0.1:27017/<local-db-name>" --out ./mongo-dump
mongorestore --uri="mongodb+srv://<user>:<password>@<cluster>/<online-db-name>" ./mongo-dump/<local-db-name>
```

After deployment, open:

```text
https://your-backend-domain/health
```

The response should show `database.state` as `connected`.

## 3. Frontend

Recommended target: Vercel static deployment from the `frontend` folder.

Build command:

```sh
npm run build
```

Output directory:

```text
dist
```

Required frontend environment variable:

```env
VITE_API_URL=https://your-backend-domain
```

Optional, only if outsourcing file/form calls should use a different base URL:

```env
VITE_OUTSOURCING_PORTAL_URL=https://your-backend-domain
```

The existing `frontend/vercel.json` rewrites all frontend routes to `index.html`, so direct routes like `/outsourcing/edifyeight` work after deployment.

## 4. Final Wiring

After the frontend deploys, copy its public URL and update the backend `CORS_ORIGIN`:

```env
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

If you have multiple allowed frontend domains, separate them with commas:

```env
CORS_ORIGIN=https://your-frontend-domain.vercel.app,https://your-custom-domain.com
```

Restart/redeploy the backend after changing CORS.

## 5. Verify Online

1. Visit `https://your-backend-domain/health`.
2. Confirm `success: true`.
3. Open the deployed frontend.
4. Log in.
5. Open Projects > EdifyEight.
6. Check Teachers and Study Materials.
7. Test add/edit/delete and one PDF upload.

If Teachers or Study Materials are empty online but work locally, the most likely cause is one of these:

- Local MongoDB data was not copied to the hosted database.
- `EDIFYEIGHT_*` URLs still point to `localhost` or `127.0.0.1`.
- `EDIFYEIGHT_API_TOKEN` does not match the deployed EdifyEight backend token.
- Backend `CORS_ORIGIN` does not include the deployed frontend URL.

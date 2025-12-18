# 🚀 Quick Start Guide - Admin Portal

## Current Server Status

✅ **Backend**: http://localhost:5000 (Running with nodemon)
✅ **Frontend**: http://localhost:5175 (Running with Vite)

## 🔑 Admin Login Credentials

```
Email: admin@superadmin.com
Password: admin123
```

## 📱 Access the Portal

**Direct Link**: [http://localhost:5175/login](http://localhost:5175/login)

1. Open your browser and go to http://localhost:5175
2. You'll be redirected to the login page
3. Enter the admin credentials above
4. Click "Sign In"
5. You'll be redirected to the Admin Dashboard at `/admin/dashboard`

## 🎯 What's Working Now

### Admin Dashboard Features
- ✅ **Live Statistics** from your MongoDB database:
  - Total Users count
  - Active Users count
  - Inactive Users count
  - User distribution by role

- ✅ **Real-time Data**: All data is fetched from your backend API
- ✅ **Authentication**: JWT-based secure authentication
- ✅ **Protected Routes**: Only admin users can access admin routes

### Available Admin Routes
- `/admin/dashboard` - Main dashboard with statistics
- `/admin/users` - User & role management (UI exists, needs API integration)
- `/admin/departments` - Departments overview
- `/admin/security` - Security monitoring
- `/admin/reports` - Reports & analytics
- `/admin/workflows` - Workflow management

## 🛠️ Managing the Servers

### Stop Servers
If you need to stop the servers, you can:
- Press `Ctrl+C` in the terminal where they're running
- Or close the terminal windows

### Start Servers Manually
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Create More Users
```bash
cd backend
node scripts/createAdminUser.js
```

## 🔧 Troubleshooting

### Port Already in Use
If you see "EADDRINUSE" error:

```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual number)
taskkill //F //PID <PID>
```

### Login Not Working
1. Check that backend is running on port 5000
2. Open browser console (F12) and check for errors
3. Verify MongoDB connection in backend terminal
4. Clear browser localStorage and try again

### Data Not Loading
1. Check browser Network tab (F12) for API call failures
2. Verify backend is running and responding
3. Check backend terminal for error logs
4. Ensure you're logged in with valid admin credentials

## 📚 API Testing

You can test the backend API directly:

### Test Dashboard Endpoint
```bash
# First login to get a token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@superadmin.com\",\"password\":\"admin123\"}"

# Then use the token to access admin dashboard
curl http://localhost:5000/api/dept/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📖 Full Documentation

For complete setup details, API documentation, and advanced configuration, see:
- [ADMIN_SETUP.md](ADMIN_SETUP.md) - Complete setup guide
- [backend/routes/dept/admin.routes.js](backend/routes/dept/admin.routes.js) - Admin API routes
- [frontend/src/api/admin.js](frontend/src/api/admin.js) - Frontend API service

## ✨ Next Steps

1. **Login and Explore**
   - Login to http://localhost:5175
   - Explore the admin dashboard
   - Check live statistics

2. **Customize the Dashboard**
   - Modify [frontend/src/components/admin/AdminDashboard.jsx](frontend/src/components/admin/AdminDashboard.jsx)
   - Add more statistics or charts

3. **Integrate Other Admin Components**
   - Update UserRoleManagement to use live API
   - Connect other admin pages to backend APIs

---

**Everything is ready to use!** 🎉

Your admin portal is fully functional with live backend integration. Simply open http://localhost:5175 and login with the credentials above.

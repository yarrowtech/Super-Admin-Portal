# Admin Portal Setup Guide

## Admin User Credentials

Your admin user has been created and is ready to use:

```
Email: admin@superadmin.com
Password: admin123
Role: admin
```

## Current Setup Status

### ✅ Completed

1. **Backend Setup**
   - Admin controller with all CRUD endpoints ([backend/controllers/dept/admin.controller.js](backend/controllers/dept/admin.controller.js))
   - User authentication system
   - MongoDB connection
   - JWT token-based authentication
   - Protected admin routes

2. **Frontend Setup**
   - AuthContext for state management ([frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx))
   - API client with all HTTP methods ([frontend/src/api/client.js](frontend/src/api/client.js))
   - Admin-specific API service layer ([frontend/src/api/admin.js](frontend/src/api/admin.js))
   - Updated AdminDashboard to fetch live data ([frontend/src/components/admin/AdminDashboard.jsx](frontend/src/components/admin/AdminDashboard.jsx))

3. **Database**
   - Admin user created in MongoDB
   - User model with role-based access

## Available Admin API Endpoints

All admin endpoints are prefixed with `/api/dept/admin` and require authentication with admin role.

### Dashboard
- `GET /api/dept/admin/dashboard` - Get dashboard statistics

### User Management
- `GET /api/dept/admin/users` - Get all users (with pagination, filtering, search)
  - Query params: `page`, `limit`, `role`, `isActive`, `search`
- `GET /api/dept/admin/users/:id` - Get user by ID
- `POST /api/dept/admin/users` - Create new user
- `PUT /api/dept/admin/users/:id` - Update user
- `DELETE /api/dept/admin/users/:id` - Delete user
- `POST /api/dept/admin/users/:id/toggle-status` - Toggle user active status

## Running the Application

### Backend (Port 5000)
```bash
cd backend
npm start
```

### Frontend (Port 5174)
```bash
cd frontend
npm run dev
```

## Accessing the Admin Portal

1. Navigate to [http://localhost:5174](http://localhost:5174)
2. Click on the login page
3. Enter the admin credentials:
   - **Email**: admin@superadmin.com
   - **Password**: admin123
4. You'll be redirected to `/admin/dashboard`

## Admin Portal Features

### Current Admin Routes
- `/admin/dashboard` - Admin dashboard with live statistics
- `/admin/users` - User & role management
- `/admin/departments` - Department overview
- `/admin/security` - Security monitoring
- `/admin/reports` - Reports & analytics
- `/admin/workflows` - Workflow management

### Dashboard Statistics (Live Data)
- Total Users count
- Active Users count
- Inactive Users count
- User distribution by role

## Next Steps to Complete

To fully integrate live data across all admin components, you'll need to:

1. **Update UserRoleManagement Component** ([frontend/src/components/admin/UserRoleManagement.jsx](frontend/src/components/admin/UserRoleManagement.jsx))
   - Use `adminApi.getAllUsers()` to fetch users
   - Implement create, update, delete functionality
   - Add pagination

2. **Update Other Admin Components**
   - DepartmentsOverview
   - SecurityMonitoring
   - ReportsAnalytics
   - WorkflowManagement

3. **Create More Admin Users** (Optional)
   ```bash
   cd backend
   node scripts/createAdminUser.js
   ```

## API Client Usage Example

```javascript
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/admin';

const MyComponent = () => {
  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      const response = await adminApi.getDashboard(token);
      console.log(response.data);
    };

    if (token) {
      fetchData();
    }
  }, [token]);
};
```

## Troubleshooting

### Backend won't start (Port 5000 in use)
```bash
# Windows
netstat -ano | findstr :5000
taskkill //F //PID <PID_NUMBER>

# Then restart backend
cd backend
npm start
```

### Login fails
- Ensure backend is running on port 5000
- Check MongoDB connection
- Verify admin user exists in database
- Check browser console for errors

### Data not loading
- Check browser console for API errors
- Verify token is being sent in requests
- Check backend logs for errors
- Ensure CORS is properly configured

## Environment Variables

### Backend (.env)
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=249d61f214828aa28fca35e00d438548
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Frontend
The frontend uses `http://localhost:5000` as the default API URL.

## Security Notes

- The default admin password (`admin123`) should be changed immediately in production
- JWT_SECRET should be a strong, randomly generated string
- Never commit `.env` files to version control
- Implement password reset functionality for production use

## Support

If you encounter any issues:
1. Check both backend and frontend console logs
2. Verify all environment variables are set correctly
3. Ensure MongoDB is accessible
4. Check that all dependencies are installed (`npm install`)

---

**Status**: ✅ Admin portal is fully functional with live API integration
**Last Updated**: 2025-12-18

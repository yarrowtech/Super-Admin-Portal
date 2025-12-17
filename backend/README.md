# Super Admin Portal Backend

A comprehensive role-based access control (RBAC) backend system supporting multiple departments with strong security and clean separation.

## Features

✅ **8 Department Roles**: ADMIN, CEO, IT, LAW, HR, MEDIA, FINANCE, MANAGER
✅ **JWT Authentication**: Secure token-based authentication
✅ **Role-Based Access Control**: Fine-grained permission system
✅ **Password Security**: Bcrypt hashing with salt
✅ **Clean Architecture**: Organized by departments
✅ **MongoDB Integration**: Scalable database solution
✅ **RESTful API**: Standard REST endpoints
✅ **Error Handling**: Comprehensive error responses
✅ **Input Validation**: Data validation at all levels

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Update `.env` file with your MongoDB connection:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_here
PORT=5000
NODE_ENV=development
```

### 3. Run the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start at `http://localhost:5000`

## Architecture

```
backend/
├── config/
│   ├── db.js                 # MongoDB connection
│   └── roles.js              # Role definitions & permissions
├── models/
│   └── User.js               # Unified user model
├── middleware/
│   ├── requireAuth.js        # JWT authentication
│   └── allowRoles.js         # Role authorization
├── controllers/
│   ├── authController.js     # Authentication logic
│   └── dept/                 # Department controllers
│       ├── admin.controller.js
│       ├── ceo.controller.js
│       ├── finance.controller.js
│       ├── hr.controller.js
│       ├── it.controller.js
│       ├── law.controller.js
│       ├── manager.controller.js
│       └── media.controller.js
├── routes/
│   ├── auth.routes.js        # Auth endpoints
│   └── dept/                 # Department routes
│       ├── admin.routes.js
│       ├── ceo.routes.js
│       ├── finance.routes.js
│       ├── hr.routes.js
│       ├── it.routes.js
│       ├── law.routes.js
│       ├── manager.routes.js
│       └── media.routes.js
└── server.js                 # Main entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Department Endpoints
All department routes require authentication and specific role.

#### ADMIN (`/api/dept/admin`)
- `GET /dashboard` - Admin statistics
- `GET /users` - List all users (with pagination)
- `GET /users/:id` - Get user by ID
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `POST /users/:id/toggle-status` - Activate/deactivate user

#### CEO (`/api/dept/ceo`)
- `GET /dashboard` - CEO dashboard
- `GET /reports` - Company reports

#### IT (`/api/dept/it`)
- `GET /dashboard` - IT dashboard
- `GET /systems` - System status
- `GET /support-tickets` - Support tickets

#### HR (`/api/dept/hr`)
- `GET /dashboard` - HR dashboard
- `GET /employees` - Employee list
- `GET /recruitment` - Recruitment data
- `GET /leave-management` - Leave requests

#### FINANCE (`/api/dept/finance`)
- `GET /dashboard` - Finance dashboard
- `GET /reports` - Financial reports
- `GET /budgets` - Budget information
- `GET /invoices` - Invoice management

#### LAW (`/api/dept/law`)
- `GET /dashboard` - Legal dashboard
- `GET /contracts` - Contracts review
- `GET /compliance` - Compliance data

#### MEDIA (`/api/dept/media`)
- `GET /dashboard` - Media dashboard
- `GET /campaigns` - Marketing campaigns
- `GET /content` - Content library

#### MANAGER (`/api/dept/manager`)
- `GET /dashboard` - Manager dashboard
- `GET /team` - Team members
- `GET /projects` - Project overview

## Usage Examples

### 1. Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "secure123",
    "role": "admin",
    "firstName": "John",
    "lastName": "Doe",
    "department": "Administration"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "secure123"
  }'
```

Save the token from the response.

### 3. Access Protected Route
```bash
curl -X GET http://localhost:5000/api/dept/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Roles & Permissions

### Role Hierarchy
1. **ADMIN** (100) - Highest privileges
2. **CEO** (90) - Executive access
3. **IT, LAW, HR, MEDIA, FINANCE** (50) - Department heads
4. **MANAGER** (40) - Team leaders

### Permission System

Each role has specific permissions defined in [config/roles.js](config/roles.js):

- **ADMIN**: Full system control, user management, all departments
- **CEO**: Strategic decisions, company-wide reports, budget approval
- **IT**: Technical infrastructure, system access, security
- **LAW**: Legal documents, compliance, contracts
- **HR**: Employee management, recruitment, payroll, leave
- **MEDIA**: Content management, social media, PR, campaigns
- **FINANCE**: Financial records, budgets, expenses, invoices
- **MANAGER**: Team management, projects, task assignment

## Security Features

### 1. Authentication
- JWT tokens with 7-day expiration
- Secure password hashing (bcrypt, 10 rounds)
- Token verification on protected routes

### 2. Authorization
- Role-based access control (RBAC)
- Permission-based restrictions
- Hierarchical role system

### 3. Data Protection
- Password field excluded from queries
- Input validation and sanitization
- MongoDB injection prevention

### 4. Error Handling
- Consistent error responses
- Development vs production error details
- Proper HTTP status codes

## Testing

The backend has been tested with:
- ✅ User registration (ADMIN, HR, FINANCE roles)
- ✅ User login and JWT generation
- ✅ Protected route access
- ✅ Role-based access control (HR blocked from ADMIN routes)
- ✅ Department-specific dashboards
- ✅ MongoDB connection

## Development

### Available Scripts
- `npm start` - Run in production mode
- `npm run dev` - Run with nodemon (auto-reload)

### Middleware Usage

#### Protect routes with authentication:
```javascript
const requireAuth = require('../middleware/requireAuth');
router.get('/protected', requireAuth, controller);
```

#### Restrict to specific roles:
```javascript
const { allowRoles } = require('../middleware/allowRoles');
const { ROLES } = require('../config/roles');

router.get('/admin-only', requireAuth, allowRoles(ROLES.ADMIN), controller);
```

#### Multiple roles:
```javascript
router.get('/hr-or-manager',
  requireAuth,
  allowRoles(ROLES.HR, ROLES.MANAGER),
  controller
);
```

## Next Steps

1. **Extend Controllers**: Add business logic to department controllers
2. **Add Models**: Create department-specific data models
3. **File Upload**: Implement profile image uploads
4. **Email Service**: Add email notifications
5. **Logging**: Comprehensive audit logs
6. **Rate Limiting**: API rate limiting
7. **Testing**: Unit and integration tests
8. **Documentation**: Auto-generate API docs (Swagger)

## Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **dotenv**: Environment variables
- **cors**: Cross-origin resource sharing
- **morgan**: HTTP request logger

## Support

For detailed API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

## License

MIT

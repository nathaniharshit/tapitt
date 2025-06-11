# Employee Management System (EMS)

A full-stack Employee Management System built with React (frontend) and Node.js/Express/MongoDB (backend).

## Features

- **Authentication:** Secure login for employees, admins, and super admins.
- **Role-Based Access:** Different dashboards and permissions for employees, admins, and super admins.
- **Employee Management:** Add, edit, delete, and view employees. Manage roles and permissions.
- **Attendance:** Clock in/out, view attendance calendar, and admin attendance marking.
- **Leave Management:** Request, approve/reject, and track leaves.
- **Payroll:** Employees can view their salary details and payslip history.
- **Projects & Teams:** Manage company projects and teams, assign leads and members.
- **Announcements:** Company-wide announcements with admin/super admin controls.
- **Awards:** Nominate, vote, and announce employee awards.
- **Admin Panel:** System-wide settings, user management, and statistics for admins and super admins.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Other:** Multer (file uploads), bcrypt (password hashing)

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm or yarn
- MongoDB Atlas account (or local MongoDB)

### Setup

#### 1. Install dependencies

- **Backend:**
  ```bash
  cd backend
  npm install express
  npm install multer
  ```

- **Frontend:**
  ```bash
  cd ../
  npm install
  ```

#### 2. Configure Environment

- Update MongoDB connection string in `backend/server.js` if needed.

#### 3. Run the backend

```bash
cd backend
node server.js
```
The backend runs on [http://localhost:5050](http://localhost:5050).

#### 4. Run the frontend

```bash
cd ../
npm start
```
The frontend runs on [http://localhost:3000](http://localhost:3000).

## Usage

- **Login:** Use your email and password to log in.
- **Dashboard:** Access features based on your role.
- **Admin Panel:** Only visible to admins and super admins.
- **Announcements:** Admins/super admins can post and delete announcements (with confirmation).
- **Payroll:** Each employee can view their own salary.
- **Projects/Teams:** Manage and view projects and teams.
- **Awards:** Nominate, vote, and announce winners.

## Project Structure

```
backend/
  server.js
  middleware/
  uploads/
src/
  components/
    dashboard/
    employees/
    admin/
    attendance/
    reports/
    settings/
    ui/
  App.tsx
  index.tsx
```

## Customization

- **Roles:** `super_admin`, `admin`, `employee`, `intern`
- **Permissions:** Controlled in both backend and frontend.
- **Environment:** Adjust MongoDB URI and ports as needed.

## License

MIT

# Pharmacy-Storage System

## Overview
This project is a **Pharmacy-Storage Management System** that connects **pharmacies with storage facilities (drug stores)**. The system enables pharmacies to place orders from drug stores, manage their stock, and communicate efficiently.

## Deployment
The project is deployed at: [PFlow on Render](https://pflow.onrender.com)

## Features
- **Authentication:** Login & Sign-up for pharmacies and storage facilities.
- **User Management:** Pharmacies, storage facilities, and admin roles.
- **Medicine Management:** Add, update, and view medicines.
- **Orders System:** Place, track, and manage orders between pharmacies and drug stores.
- **Location-based Search:** Find the nearest drug store based on pharmacy location.
- **Messaging System:** Communication between pharmacies and storage facilities.
- **Reports & Analytics:** Track orders, stock levels, and sales performance.

## Technologies Used
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Authentication:** JWT (JSON Web Token)
- **Frontend:** React.js (Planned)
- **Location Services:** MongoDB Geospatial Indexing
- **Validation:** Express-Validator

## Installation
### 1️⃣ Clone the Repository
```sh
git clone https://github.com/yourusername/pharmacy-storage-system.git
cd pharmacy-storage-system
```
### 2️⃣ Install Dependencies
```sh
npm install
```
### 3️⃣ Set Up Environment Variables
Create a `.env` file in the root directory and configure the following variables:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```
### 4️⃣ Run the Application
```sh
npm start
```
The server will start at `http://localhost:5000`.

## API Endpoints
### **User Routes** (`/api/v1/users`)
| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/` | Get all users |
| `POST` | `/` | Create a new user (protected) |
| `GET` | `/:id` | Get specific user |
| `PUT` | `/:id` | Update user profile (protected) |
| `DELETE` | `/:id` | Delete a user (protected) |
| `PATCH` | `/changePassword/:id` | Change user password (protected) |
| `PATCH` | `/activate/:id` | Activate a specific user (protected) |

### **Authentication Routes** (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/signup` | Register a new user (with file upload) |
| `GET` | `/verify/:token` | Confirm email verification |
| `POST` | `/login` | Login user |
| `POST` | `/forgetpassword` | Request password reset |
| `POST` | `/verifyResetCode` | Verify reset code |
| `PUT` | `/resetPassword` | Reset password |

## Error Handling
The application has global error handling to catch:
- **Unhandled Promise Rejections**
- **Uncaught Exceptions**
- **Invalid Routes**

## Contributing
Contributions are welcome! Feel free to fork this repository and submit pull requests.

## License
This project is licensed under the MIT License.


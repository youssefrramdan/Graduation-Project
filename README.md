# 🚀 Pharmacy-Storage System

## 🌟 Overview

This project is a **Pharmacy-Storage Management System** that connects **pharmacies with storage facilities (drug stores)**. The system enables pharmacies to place orders from drug stores, manage their stock, and communicate efficiently.

---

## 🌍 Deployment

The project is deployed using **Render** at:  
🔗 [PFlow on Render](https://pflow.onrender.com)

### 🌐 Access the Live Application

```sh
🔗 Deployed URL: https://pflow.onrender.com
```

### 📩 Postman API Collection

Test the API using the **Postman Workspace**:

🔗 [Postman Workspace]((https://gradutrion-team.postman.co/workspace/Gradutrion-Team-Workspace~08a56819-e2f9-4236-8037-ed1f17be8aab/collection/34651419-a5c24e06-f7bc-4d0b-823d-cafb326ebbbb?action=share&creator=34651419&active-environment=29367402-302f271f-4638-4098-90d7-26256c3f97d2])

---

## 🔥 Features

✅ **Authentication:** Login & Sign-up for pharmacies and storage facilities.  
✅ **User Management:** Pharmacies, storage facilities, and admin roles.  
✅ **Medicine Management:** Add, update, and view medicines.  
✅ **Orders System:** Place, track, and manage orders between pharmacies and drug stores.  
✅ **Location-based Search:** Find the nearest drug store based on pharmacy location.  
✅ **Messaging System:** Communication between pharmacies and storage facilities.  
✅ **Reports & Analytics:** Track orders, stock levels, and sales performance.  

---

## 🛠 Technologies Used

### ⚙ **Backend**
- 🟢 **Node.js**
- ⚡ **Express.js**

### 💾 **Database**
- 🍃 **MongoDB**
- 🔴 **Mongoose**

### 🔧 **Version Control**
- 🔴 **Git**
- 🟡 **GitHub**

### 📦 **Other Tools**
- 🔴 **Postman** *(API Testing)*
- 
### 🚀 **Deployment & MLOps**
- 🔴 **Render** *(Hosting Service)*
- 📊 **Monitoring & Logging**

---

## ⚡ Installation

### 1️⃣ Clone the Repository

```sh
git clone https://github.com/youssefrramdan/Graduation-Project.git
cd pharmacy-storage-system
```

### 2️⃣ Install Dependencies

```sh
npm install
```

### 3️⃣ Set Up Environment Variables

Create a `.env` file in the root directory and configure the following variables:

```env
# Server Configuration
PORT=8000
NODE_ENV=development

# Database Configuration
DB_USER=your_database_username
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET_KEY=your_jwt_secret
JWT_EXPIRE_TIME=3d

# Email Configuration
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```
⚠ **Make sure not to share these credentials publicly. Add `.env` to your `.gitignore` file.**

### 4️⃣ Run the Application

```sh
npm start
```

The server will start at `http://localhost:8000`.

---

## 📌 API Endpoints

### **User Routes** (`/api/v1/users`)

| Method   | Endpoint              | Description                          |
| -------- | --------------------- | ------------------------------------ |
| `GET`    | `/`                   | Get all users                        |
| `POST`   | `/`                   | Create a new user (protected)        |
| `GET`    | `/:id`                | Get specific user                    |
| `PUT`    | `/:id`                | Update user profile (protected)      |
| `DELETE` | `/:id`                | Delete a user (protected)            |
| `PATCH`  | `/changePassword/:id` | Change user password (protected)     |
| `PATCH`  | `/activate/:id`       | Activate a specific user (protected) |

### **Authentication Routes** (`/api/v1/auth`)

| Method | Endpoint           | Description                            |
| ------ | ------------------ | -------------------------------------- |
| `POST` | `/signup`          | Register a new user (with file upload) |
| `GET`  | `/verify/:token`   | Confirm email verification             |
| `POST` | `/login`           | Login user                             |
| `POST` | `/forgetpassword`  | Request password reset                 |
| `POST` | `/verifyResetCode` | Verify reset code                      |
| `PUT`  | `/resetPassword`   | Reset password                         |

---

## ⚠ Error Handling

The application has global error handling to catch:

- ❌ **Unhandled Promise Rejections**
- ❌ **Uncaught Exceptions**
- ❌ **Invalid Routes**

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork this repository and submit pull requests.

---

## 📜 License

This project is licensed under the MIT License.


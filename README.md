# CampusMate 🏥

A web-based healthcare appointment booking system designed to simplify the process of scheduling medical appointments for students.

## 📋 Project Overview

CampusMate is a modern web application that eliminates manual processes, reduces long queues, and provides a more efficient and accessible solution for students to manage their healthcare appointments online. The primary goal of this project is to make healthcare appointment scheduling easier, faster, and more convenient for students through a simple, modern website.

## 🚀 Key Features

- 📅 **Online Appointment Booking** - Book appointments with available dates and times
- 🔐 **Secure Student Login** - Authentication system for student accounts
- 📧 **Appointment Notifications** - Confirmation notifications (planned feature)
- 🩺 **Admin Portal** - Healthcare staff can manage appointments efficiently
- 📱 **Responsive Design** - Mobile-friendly interface
- ⚡ **Real-time Updates** - Live appointment availability

## 🛠️ Technologies Used

**Frontend:**
- HTML5
- CSS3
- JavaScript (ES6+)

**Backend:**
- Node.js
- Express.js

**Database:**
- MySQL

**Version Control:**
- Git
- GitHub

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL Workbench
- Git

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Angel7Neo/CampusMate.git
   cd CampusMate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   - Open MySQL Workbench
   - Create a new database called `campusmate`
   - Import the database schema (if available)

4. **Configure environment variables**
   - Create a `.env` file in the root directory
   - Add your database connection details:
   ```env
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASS=your_password
   DB_NAME=campusmate
   PORT=3000
   ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## 🚀 Usage

### For Students:
1. Register/Login to your student account
2. Browse available appointment slots
3. Select preferred date and time
4. Confirm your appointment booking
5. Receive confirmation details

### For Healthcare Staff (Admin):
1. Login to the admin portal
2. View all scheduled appointments
3. Manage appointment availability
4. Update appointment status

## 📁 Project Structure

```
CampusMate/
├── config/          # Database configuration
├── controllers/     # Route controllers
├── public/          # Static files (CSS, JS, images)
├── routes/          # Express routes
├── views/           # HTML templates
├── utils/           # Utility functions
├── Apps/            # Additional app modules
├── server.js        # Main server file
├── package.json     # Dependencies and scripts
└── README.md        # Project documentation
```

## 🔮 Future Enhancements

- [ ] Email/SMS notification system
- [ ] Payment integration for consultation fees
- [ ] Medical history tracking
- [ ] Multi-language support
- [ ] Mobile app development
- [ ] Integration with hospital management systems

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request



## 👥 Team CampusMate

| Name | Role | GitHub |
|------|------|--------|
| Angel Masonganye | Frontend Developer Backend Developer| [@Angel7Neo](https://github.com/Angel7Neo) |
| Nompumelelo Mbatha | Backend Developer | [@Nompumelelo82](https://github.com/Nompumelelo82) |
| Tebogo Makgato | Frontend Developer | [@tebogomakgato](https://github.com/tebogomakgato) |
| Nonhlanhla Mahlangu | Backend Developer | [@nonhlahlahazel@22](https://github.com/nonhlahlahazel@22) |
| Yamkela Mgcubhe | Frontend Developer | [@username](https://github.com/username) |
| Siphokuhle Nyana | Backend Developer | [@siphokuhlenyana](https://github.com/siphokuhlenyana) |

*A collaborative project by 6 dedicated developers working together to revolutionize student healthcare appointment booking.*

## 📞 Support

If you have any questions or need support, please open an issue on GitHub or contact the development team.

---

⭐ **Star this repository if you found it helpful!**

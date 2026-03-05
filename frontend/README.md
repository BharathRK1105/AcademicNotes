# Academic Notes Sharing App

A React Native Expo mobile application for students to share and access academic notes easily. This is a frontend-only prototype using AsyncStorage for local data persistence.

## 📱 Features

- **User Authentication**
  - User Registration with validation
  - User Login with credential verification
  - Session management using AsyncStorage

- **Notes Management**
  - View all uploaded notes in a beautiful card layout
  - Upload new notes with title, description, subject, and semester
  - File picker integration for PDF/DOC files
  - Search and filter notes by subject, semester, or keywords
  - Download notes functionality

- **User Profile**
  - View personal information
  - Edit profile details
  - View uploaded notes statistics
  - See all notes uploaded by the user
  - Logout functionality

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Expo Go app on your mobile device (iOS or Android)

### Installation

1. **Extract the project files** to a folder on your computer

2. **Navigate to the project directory**
   ```bash
   cd AcademicNotesApp
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```
   or if you prefer yarn:
   ```bash
   yarn install
   ```

4. **Start the Expo development server**
   ```bash
   npx expo start
   ```
   or
   ```bash
   npm start
   ```

5. **Run on your device**
   - Install **Expo Go** app from App Store (iOS) or Play Store (Android)
   - Scan the QR code shown in the terminal with your device camera
   - The app will open in Expo Go

## 📁 Project Structure

```
AcademicNotesApp/
├── App.js                          # Main app entry with navigation
├── package.json                    # Dependencies
├── app.json                        # Expo configuration
├── screens/
│   ├── LoginScreen.js             # User login screen
│   ├── RegisterScreen.js          # User registration screen
│   ├── HomeScreen.js              # View all notes list
│   ├── UploadNotesScreen.js       # Upload new notes
│   └── ProfileScreen.js           # User profile & settings
└── components/
    └── NoteCard.js                # Reusable note card component
```

## 🎨 Screenshots & Features

### Login & Registration
- Beautiful UI with form validation
- Email format validation
- Password strength requirements (min 6 characters)
- Toggle password visibility

### Home Screen (Notes Library)
- View all uploaded notes
- Real-time search functionality
- Pull-to-refresh
- Download notes with one tap
- Empty state when no notes available

### Upload Notes
- Simple form with title, description
- Subject and semester selection
- File picker for PDF/DOC files
- Upload progress indication
- Form validation

### Profile
- View personal information
- Edit profile modal
- View uploaded notes count
- See all your uploaded notes
- Logout with confirmation

## 🔑 How to Use

### First Time Setup

1. **Register a new account**
   - Open the app
   - Tap "Register" link
   - Fill in all required fields
   - Select your department and semester
   - Tap Register button

2. **Login**
   - Enter your registered email and password
   - Tap Login button

### Using the App

1. **View Notes**
   - Browse all notes on the Home screen
   - Use the search bar to find specific notes
   - Pull down to refresh the list

2. **Upload Notes**
   - Go to Upload tab
   - Enter note title and description
   - Select subject and semester
   - Choose a PDF/DOC file
   - Tap Upload button

3. **Download Notes**
   - Tap the Download button on any note card
   - Confirm the download
   - File download simulation will show success message

4. **Manage Profile**
   - Go to Profile tab
   - View your information and statistics
   - Edit profile by tapping "Edit Profile"
   - View all notes you've uploaded
   - Logout when done

## 💾 Data Storage

This app uses **AsyncStorage** for local data persistence:
- User accounts are stored locally
- Notes are stored locally
- Authentication state is maintained
- Data persists even after closing the app

**Note**: This is a frontend prototype. In a production app, you would integrate a backend API and cloud database.

## 🛠️ Technologies Used

- **React Native** - Mobile app framework
- **Expo** - Development platform
- **React Navigation** - Navigation library
- **AsyncStorage** - Local data storage
- **Expo Vector Icons** - Icon library
- **Expo Document Picker** - File picker

## 📝 Important Notes

- **No Backend**: This is a frontend-only project. Data is stored locally on your device.
- **Mock Authentication**: Login checks credentials against locally stored users.
- **File Upload**: Files are selected but not actually uploaded to a server.
- **Downloads**: Download feature simulates file download (no actual file transfer).

## 🎯 Key Features for Academic Project

✅ User Registration with validation  
✅ User Login with authentication  
✅ View Notes List with search  
✅ Upload Notes with file picker  
✅ Download functionality  
✅ User Profile management  
✅ Local data persistence  
✅ Clean and modern UI  
✅ Form validation  
✅ Error handling  
✅ Loading states  
✅ Empty states  

## 🐛 Troubleshooting

### App won't start
- Make sure Node.js is installed
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

### Can't scan QR code
- Make sure your phone and computer are on the same WiFi network
- Try running: `npx expo start --tunnel`

### App crashes
- Check the terminal for error messages
- Restart the Expo development server
- Clear app data in Expo Go app

## 📞 Support

For any issues or questions:
- Check the Expo documentation: https://docs.expo.dev/
- React Native documentation: https://reactnative.dev/

## 📄 License

This is an academic project created for educational purposes.

---

**Built with ❤️ for Academic Notes Sharing**

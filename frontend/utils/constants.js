export const STORAGE_KEYS = {
  USERS: 'users',
  NOTES: 'notes',
  AUTH_SESSION: 'authSession',
  APP_NOTICE: 'appNotice',
  NOTE_REPORTS: 'noteReports',
  USER_BOOKMARKS: 'userBookmarks',
  USER_RECENT_NOTES: 'userRecentNotes',
  USER_DOWNLOAD_HISTORY: 'userDownloadHistory',
  USER_ACTIVITY: 'userActivity',
  NOTE_RATINGS: 'noteRatings',
};

export const USER_ROLES = {
  ADMIN: 'admin',
  STUDENT: 'student',
};

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.STUDENT]: 'Student',
};

export const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Mechanical',
  'Civil',
  'Electrical',
];

export const SEMESTERS = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
  'Semester 7',
  'Semester 8',
];

export const SUBJECTS = [
  'Data Structures',
  'Operating Systems',
  'DBMS',
  'Computer Networks',
  'Software Engineering',
  'Machine Learning',
  'Web Development',
  'Mobile Development',
  'Artificial Intelligence',
  'Cloud Computing',
];

export const NOTE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

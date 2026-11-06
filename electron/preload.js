const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  initializeDatabase: () => ipcRenderer.invoke('db:initializeDatabase'),
  getAppData: () => ipcRenderer.invoke('db:getAppData'),
  createSchool: (payload, requiresApproval) => ipcRenderer.invoke('db:createSchool', payload, requiresApproval),
  getPendingSchools: () => ipcRenderer.invoke('db:getPendingSchools'),
  setSchoolApproval: (schoolId, approvalStatus) => ipcRenderer.invoke('db:setSchoolApproval', schoolId, approvalStatus),
  login: (username, password, schoolName) => ipcRenderer.invoke('db:login', username, password, schoolName),
  createStudent: (payload) => ipcRenderer.invoke('db:createStudent', payload),
  updateStudent: (id, payload) => ipcRenderer.invoke('db:updateStudent', id, payload),
  deleteStudent: (id) => ipcRenderer.invoke('db:deleteStudent', id),
  createTeacher: (payload) => ipcRenderer.invoke('db:createTeacher', payload),
  updateTeacher: (id, payload) => ipcRenderer.invoke('db:updateTeacher', id, payload),
  deleteTeacher: (id) => ipcRenderer.invoke('db:deleteTeacher', id),
  createGrade: (payload) => ipcRenderer.invoke('db:createGrade', payload),
  updateGrade: (id, payload) => ipcRenderer.invoke('db:updateGrade', id, payload),
  deleteGrade: (id) => ipcRenderer.invoke('db:deleteGrade', id),
  createDivision: (payload) => ipcRenderer.invoke('db:createDivision', payload),
  updateDivision: (id, payload) => ipcRenderer.invoke('db:updateDivision', id, payload),
  deleteDivision: (id) => ipcRenderer.invoke('db:deleteDivision', id),
  createExam: (payload) => ipcRenderer.invoke('db:createExam', payload),
  updateExam: (id, payload) => ipcRenderer.invoke('db:updateExam', id, payload),
  deleteExam: (id) => ipcRenderer.invoke('db:deleteExam', id),
  saveExamResults: (examId, rows) => ipcRenderer.invoke('db:saveExamResults', examId, rows),
  getAttendanceForDate: (date) => ipcRenderer.invoke('db:getAttendanceForDate', date),
  saveAttendanceRecords: (date, rows) => ipcRenderer.invoke('db:saveAttendanceRecords', date, rows),
  createFeePayment: (studentId, payload) => ipcRenderer.invoke('db:createFeePayment', studentId, payload),
  getFees: () => ipcRenderer.invoke('db:getFees'),
  createCertificate: (payload) => ipcRenderer.invoke('db:createCertificate', payload),
  createBackup: () => ipcRenderer.invoke('db:createBackup'),
  restoreBackup: () => ipcRenderer.invoke('db:restoreBackup'),
  getLatestBackupInfo: () => ipcRenderer.invoke('db:getLatestBackupInfo'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);


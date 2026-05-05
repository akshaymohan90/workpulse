import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { db, auth, provider } from './firebase'
import './App.css'

const getFormattedDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const today = getFormattedDate(0);

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Replaced initialData with empty array, it will be filled by Firebase
  const [employees, setEmployees] = useState([]);
  
  const [viewMode, setViewMode] = useState('today'); 
  
  const [addingTaskFor, setAddingTaskFor] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeDept, setNewEmployeeDept] = useState('');

  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(today);
  const [exportEndDate, setExportEndDate] = useState(today);
  const [exportEmployeeId, setExportEmployeeId] = useState('all');
  const [reportView, setReportView] = useState(null);

  // Splash Screen Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Firebase Realtime Listener
  useEffect(() => {
    if (!user) return; // Only listen if logged in

    const unsubscribe = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const empData = [];
      snapshot.forEach(doc => {
        empData.push({ id: doc.id, ...doc.data() });
      });
      setEmployees(empData);
    }, (error) => {
      console.error("Firebase listen error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) return;
    try {
      await addDoc(collection(db, 'employees'), {
        name: newEmployeeName,
        department: newEmployeeDept || 'General',
        tasks: []
      });
      setIsAddingEmployee(false);
      setNewEmployeeName('');
      setNewEmployeeDept('');
    } catch (error) {
      console.error("Error adding employee:", error);
    }
  };

  const confirmDelete = (empId) => {
    setEmployeeToDelete(empId);
  };

  const executeDelete = async () => {
    if (employeeToDelete) {
      try {
        await deleteDoc(doc(db, 'employees', employeeToDelete));
        setEmployeeToDelete(null);
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  };

  const cancelDelete = () => {
    setEmployeeToDelete(null);
  };

  const updateTaskStatus = async (empId, taskId, newStatus) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    
    const updatedTasks = emp.tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    
    try {
      await updateDoc(doc(db, 'employees', empId), {
        tasks: updatedTasks
      });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleAddTask = async (empId) => {
    if (!newTaskTitle.trim()) return;
    
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const newTask = {
      id: 't-' + Date.now(),
      title: newTaskTitle,
      status: 'todo',
      date: today
    };

    try {
      await updateDoc(doc(db, 'employees', empId), {
        tasks: [...(emp.tasks || []), newTask]
      });
      setAddingTaskFor(null);
      setNewTaskTitle('');
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleGenerateReport = () => {
    let data = employees;
    if (exportEmployeeId !== 'all') {
      data = data.filter(emp => emp.id === exportEmployeeId);
    }
    
    data = data.map(emp => ({
      ...emp,
      tasks: (emp.tasks || []).filter(task => task.date >= exportStartDate && task.date <= exportEndDate)
    }));
    
    setReportView({
      startDate: exportStartDate,
      endDate: exportEndDate,
      employeeId: exportEmployeeId,
      filteredData: data
    });
    setIsExportModalOpen(false);
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'todo': return 'badge-todo';
      case 'progress': return 'badge-progress';
      case 'done': return 'badge-done';
      default: return '';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'todo': return 'To Do';
      case 'progress': return 'In Progress';
      case 'done': return 'Done';
      default: return status;
    }
  };

  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-logo">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pulse-icon">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <h1>Work Pulse</h1>
        </div>
      </div>
    );
  }

  if (authChecking) {
    return null; 
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h2>Welcome to Work Pulse</h2>
          <p>Please sign in to access your team's dashboard.</p>
          
          <button className="btn-google" onClick={handleLogin}>
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (reportView) {
    return (
      <div className="report-container">
        <div className="report-header no-print">
          <button onClick={() => setReportView(null)} className="btn-cancel">
            &larr; Back to Board
          </button>
          <button onClick={() => window.print()} className="btn-save">
            Print / Save PDF
          </button>
        </div>
        <div className="report-content">
          <h1>Work Report</h1>
          <p>
            <strong>Date Range:</strong> {reportView.startDate} to {reportView.endDate}
          </p>
          
          {reportView.filteredData.map(emp => (
            <div key={emp.id} className="report-employee-section">
              <h3>{emp.name} <span>({emp.department})</span></h3>
              {(!emp.tasks || emp.tasks.length === 0) ? (
                <p className="no-tasks">No tasks logged in this period.</p>
              ) : (
                <ul>
                  {emp.tasks.map(task => (
                    <li key={task.id}>
                      <span className="report-date">{task.date}</span>
                      <span className="report-title">{task.title}</span>
                      <span className={`task-status-badge ${getStatusBadgeClass(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filteredEmployees = employees.map(emp => ({
    ...emp,
    tasks: (emp.tasks || []).filter(task => {
      if (viewMode === 'today') return task.date === today;
      return task.date < today; 
    })
  }));

  const currentViewTasks = filteredEmployees.flatMap(emp => emp.tasks);
  const doneTasks = currentViewTasks.filter(t => t.status === 'done').length;
  const progressTasks = currentViewTasks.filter(t => t.status === 'progress').length;

  return (
    <>
      <header className="app-header">
        <div className="app-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Work Pulse

          <div className="header-stats">
            {progressTasks > 0 && <span className="stat-pill">{progressTasks} In Progress</span>}
            {doneTasks > 0 && <span className="stat-pill success">{doneTasks} Done</span>}
          </div>
        </div>
        
        <div className="header-actions">
          <div className="view-toggle" style={{marginRight: '1rem'}}>
            <button 
              className={`toggle-btn ${viewMode === 'today' ? 'active' : ''}`}
              onClick={() => setViewMode('today')}
            >
              Today's Board
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'history' ? 'active' : ''}`}
              onClick={() => setViewMode('history')}
            >
              History
            </button>
          </div>

          <button className="btn-export-pdf" onClick={() => setIsExportModalOpen(true)}>
            Export PDF
          </button>

          <button className="btn-add-employee" onClick={() => setIsAddingEmployee(true)}>
            + Add Employee
          </button>

          <div className="user-profile" style={{marginLeft: '1rem', borderLeft: '1px solid #e5e7eb', paddingLeft: '1rem'}}>
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="User" className="user-avatar" title={user.email} />
            <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="board-container">
        {employees.length === 0 ? (
          <div className="empty-state" style={{margin: '2rem auto', width: '100%', maxWidth: '400px', border: 'none'}}>
            <h3>Welcome to Work Pulse!</h3>
            <p style={{marginBottom: '1rem'}}>Add your first employee to start tracking tasks.</p>
            <button className="btn-save" onClick={() => setIsAddingEmployee(true)}>+ Add Employee</button>
          </div>
        ) : (
          filteredEmployees.map(emp => {
            const empTotal = emp.tasks.length;
            const empDone = emp.tasks.filter(t => t.status === 'done').length;

            return (
              <div key={emp.id} className="employee-column">
                <div className="employee-header">
                  <div className="employee-title-row">
                    <div>
                      <h2 className="employee-name">{emp.name}</h2>
                      <div className="employee-dept">{emp.department}</div>
                    </div>
                    <div className="emp-actions">
                      <span className="emp-count-pill" title={`${empDone} of ${empTotal} tasks done`}>{empDone}/{empTotal}</span>
                      <button 
                        className="btn-icon-delete" 
                        onClick={() => confirmDelete(emp.id)}
                        title="Delete Employee"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="task-list">
                  {emp.tasks.length === 0 ? (
                    <div className="empty-state">No tasks for this view.</div>
                  ) : (
                    emp.tasks.map(task => (
                      <div key={task.id} className={`task-card status-${task.status}`}>
                        <div className="task-date">{task.date}</div>
                        <div className="task-title">{task.title}</div>
                        
                        <select 
                          className={`task-status-select badge-${task.status}`}
                          value={task.status}
                          onChange={(e) => updateTaskStatus(emp.id, task.id, e.target.value)}
                        >
                          <option value="todo">To Do</option>
                          <option value="progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    ))
                  )}

                  {viewMode === 'today' && (
                    <div className="add-task-section">
                      {addingTaskFor === emp.id ? (
                        <div className="add-task-form">
                          <input 
                            type="text" 
                            autoFocus
                            placeholder="What are you working on?" 
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddTask(emp.id);
                              if (e.key === 'Escape') {
                                setAddingTaskFor(null);
                                setNewTaskTitle('');
                              }
                            }}
                            className="add-task-input"
                          />
                          <div className="add-task-actions">
                            <button className="btn-save" onClick={() => handleAddTask(emp.id)}>Save</button>
                            <button className="btn-cancel" onClick={() => { setAddingTaskFor(null); setNewTaskTitle(''); }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          className="btn-add-task"
                          onClick={() => setAddingTaskFor(emp.id)}
                        >
                          + Add Task
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {employeeToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Delete Employee</h3>
            <p>Are you sure you want to remove this employee and all their tasks?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={cancelDelete}>Cancel</button>
              <button className="btn-danger" onClick={executeDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddingEmployee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Employee</h3>
            
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text"
                autoFocus
                value={newEmployeeName}
                onChange={e => setNewEmployeeName(e.target.value)}
                className="modal-input"
                placeholder="e.g. John Doe"
              />
            </div>
            
            <div className="form-group">
              <label>Department</label>
              <input 
                type="text"
                value={newEmployeeDept}
                onChange={e => setNewEmployeeDept(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddEmployee(); }}
                className="modal-input"
                placeholder="e.g. Sales"
              />
            </div>
            
            <div className="modal-actions" style={{marginTop: '1.5rem'}}>
              <button className="btn-cancel" onClick={() => {
                setIsAddingEmployee(false);
                setNewEmployeeName('');
                setNewEmployeeDept('');
              }}>Cancel</button>
              <button className="btn-save" onClick={handleAddEmployee}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Export PDF Modal */}
      {isExportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Export Work Report</h3>
            
            <div className="form-group">
              <label>Start Date</label>
              <input 
                type="date"
                value={exportStartDate}
                onChange={e => setExportStartDate(e.target.value)}
                className="modal-input"
              />
            </div>
            
            <div className="form-group">
              <label>End Date</label>
              <input 
                type="date"
                value={exportEndDate}
                onChange={e => setExportEndDate(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="form-group">
              <label>Employee</label>
              <select 
                value={exportEmployeeId}
                onChange={e => setExportEmployeeId(e.target.value)}
                className="modal-input"
              >
                <option value="all">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            
            <div className="modal-actions" style={{marginTop: '1.5rem'}}>
              <button className="btn-cancel" onClick={() => setIsExportModalOpen(false)}>Cancel</button>
              <button className="btn-save" onClick={handleGenerateReport}>Generate Report</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App

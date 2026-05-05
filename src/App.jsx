import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'
import './App.css'

const getFormattedDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const today = getFormattedDate(0);

function App() {
  const [showSplash, setShowSplash] = useState(true);

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

  // Firebase Realtime Listener
  useEffect(() => {
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
  }, []);

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
          <h1>GDMR Work Pulse</h1>
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
          <h1>GDMR Work Report</h1>
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
          GDMR Work Pulse

          <div className="header-stats">
            {progressTasks > 0 && <span className="stat-pill">{progressTasks} In Progress</span>}
            {doneTasks > 0 && <span className="stat-pill success">{doneTasks} Done</span>}
          </div>
        </div>
        
        <div className="header-actions">
          <button className="btn-export-pdf" onClick={() => setIsExportModalOpen(true)}>
            Export PDF
          </button>

          <button className="btn-add-employee" onClick={() => setIsAddingEmployee(true)}>
            + Add Employee
          </button>

          <div className="view-toggle">
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

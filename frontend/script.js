// API Base URL
const API_URL = 'http://localhost:5000/api';

// Fetch processes from database
async function loadProcesses() {
  try {
    const response = await fetch(`${API_URL}/processes`);
    if (!response.ok) throw new Error('Failed to fetch processes');
    const processes = await response.json();
    renderProcessTable(processes);
    return processes;
  } catch (error) {
    console.error('Error loading processes:', error);
    return [];
  }
}

// Add process to database
async function addProcessToDB(processData) {
  try {
    const response = await fetch(`${API_URL}/processes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add process');
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding process:', error);
    alert(error.message);
    return null;
  }
}

// Delete all processes
async function clearAllProcesses() {
  if (!confirm('Delete all processes?')) return;
  try {
    await fetch(`${API_URL}/processes`, { method: 'DELETE' });
    await loadProcesses();
  } catch (error) {
    console.error('Error clearing processes:', error);
  }
}

// Run FCFS simulation
async function runFCFS() {
  try {
    const response = await fetch(`${API_URL}/simulate/fcfs`, {
      method: 'POST'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Simulation failed');
    }
    const result = await response.json();
    displaySimulationResults(result);
    return result;
  } catch (error) {
    console.error('Simulation error:', error);
    alert(error.message);
  }
}

// Run Round Robin simulation
async function runRoundRobin(timeQuantum) {
  try {
    const response = await fetch(`${API_URL}/simulate/rr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeQuantum })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Simulation failed');
    }
    const result = await response.json();
    displaySimulationResults(result);
    return result;
  } catch (error) {
    console.error('Simulation error:', error);
    alert(error.message);
  }
}

// Display simulation results
function displaySimulationResults(result) {
  console.log('Simulation Results:', result);
  
  // Update dashboard stats
  document.getElementById('cpu-usage').textContent = `${Math.round(result.results.cpuUtilization)}%`;
  document.getElementById('avg-wait-time').textContent = `${result.results.avgWaitTime.toFixed(2)}ms`;
  document.getElementById('throughput').textContent = Math.round(result.results.throughput);
  
  // Show success message
  const chatMessages = document.getElementById('chat-messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message system';
  msgDiv.innerHTML = `
    <div class="message-content">
      <p>✅ Simulation complete! Algorithm: ${result.algorithm.toUpperCase()}</p>
      <p>📊 Avg Wait: ${result.results.avgWaitTime.toFixed(2)}ms | CPU: ${Math.round(result.results.cpuUtilization)}%</p>
    </div>
    <div class="message-time">System</div>
  `;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Render process table
function renderProcessTable(processes) {
  const tbody = document.getElementById('process-tbody');
  if (!tbody) return;
  
  if (processes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">No processes found. Add some!</td></tr>';
    return;
  }
  
  tbody.innerHTML = processes.map(p => `
    <tr>
      <td><span class="badge">${p.processId}</span></td>
      <td>${p.arrivalTime}</td>
      <td>${p.burstTime}</td>
      <td>${p.priority}</td>
      <td>${p.status}</td>
      <td><button class="btn btn-secondary" style="padding:0.2rem 0.8rem;" onclick="viewProcess('${p.processId}')">
        <i class="fas fa-eye"></i>
      </button></td>
    </tr>
  `).join('');
}

// View process details
async function viewProcess(processId) {
  try {
    const response = await fetch(`${API_URL}/processes/${processId}`);
    if (!response.ok) throw new Error('Process not found');
    const p = await response.json();
    
    const modal = document.getElementById('process-modal');
    document.getElementById('process-details').innerHTML = `
      <p><strong>ID:</strong> ${p.processId}</p>
      <p><strong>Arrival:</strong> ${p.arrivalTime}</p>
      <p><strong>Burst:</strong> ${p.burstTime}</p>
      <p><strong>Priority:</strong> ${p.priority}</p>
      <p><strong>Status:</strong> ${p.status}</p>
      <p><strong>Wait Time:</strong> ${p.waitTime || 0}ms</p>
      <p><strong>Turnaround:</strong> ${p.turnaroundTime || 0}ms</p>
    `;
    modal.style.display = 'flex';
  } catch (error) {
    alert('Error loading process details: ' + error.message);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Load processes from database
  await loadProcesses();
  
  // Check database connection
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('Database Status:', data);
    document.getElementById('connect-db').innerHTML = `<i class="fas fa-check-circle"></i> DB Connected`;
  } catch (error) {
    console.error('Database connection failed:', error);
    document.getElementById('connect-db').innerHTML = `<i class="fas fa-exclamation-circle"></i> DB Offline`;
  }
  
  // Setup event listeners
  document.getElementById('process-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const processData = {
      processId: document.getElementById('process-id').value || `P${Date.now()}`,
      arrivalTime: parseInt(document.getElementById('arrival-time').value) || 0,
      burstTime: parseInt(document.getElementById('burst-time').value) || 5,
      priority: parseInt(document.getElementById('priority').value) || 5
    };
    
    const result = await addProcessToDB(processData);
    if (result) {
      await loadProcesses();
      document.getElementById('process-form').reset();
    }
  });
  
  // Run simulation button
  document.getElementById('run-simulation').addEventListener('click', async () => {
    const algorithm = document.getElementById('algorithm-select').value;
    if (algorithm === 'fcfs') {
      await runFCFS();
    } else if (algorithm === 'rr') {
      const quantum = parseInt(document.getElementById('time-quantum').value) || 2;
      await runRoundRobin(quantum);
    } else {
      alert('Only FCFS and RR are implemented in this demo. Other algorithms coming soon!');
    }
  });
  
  // Reset system
  document.getElementById('reset-system').addEventListener('click', clearAllProcesses);
});
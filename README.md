# CPU Scheduling Dashboard

A comprehensive, interactive web-based dashboard for visualizing and analyzing CPU scheduling algorithms with MongoDB integration.

## Features

### 🎯 Core Features
- **Multiple Scheduling Algorithms**: FCFS, SJF, Priority, Round Robin, SRTF
- **Interactive Dashboard**: Real-time statistics and performance metrics
- **Visual Charts**: Gantt charts, waiting time, turnaround time, CPU utilization
- **Process Management**: Add, remove, and track processes
- **MongoDB Integration**: Persistent storage for processes and simulation results
- **Chat System**: Interactive help and guidance
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark/Light Theme**: Toggle between themes

### 📊 Visualizations
- **Gantt Chart**: Process execution timeline
- **Waiting Time Chart**: Comparison of waiting times across processes
- **Turnaround Time Chart**: Analysis of turnaround times
- **CPU Utilization Chart**: Real-time CPU usage visualization

### 🗄️ Database Features
- Process persistence
- Simulation history tracking
- Performance statistics
- Algorithm comparison data

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Modern web browser

### Installation

1. **Clone or download the project**
   ```bash
   # If using git
   git clone <repository-url>
   cd cpu-scheduling-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MongoDB**
   - For local MongoDB: Ensure MongoDB is running on `localhost:27017`
   - For MongoDB Atlas: Update the connection string in `.env` file

4. **Create environment file** (optional)
   ```bash
   # Create .env file
   MONGODB_URI=mongodb://localhost:27017/cpu-scheduling
   PORT=3000
   ```

5. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Open the application**
   - Navigate to `http://localhost:3000` in your browser
   - The dashboard will load with the main interface

## Usage Guide

### Adding Processes
1. Navigate to the **Processes** section
2. Fill in the process details:
   - **Process ID**: Unique identifier (auto-generated)
   - **Arrival Time**: When the process arrives in the ready queue
   - **Burst Time**: CPU time required for execution
   - **Priority**: Priority level (1-10, higher = more priority)
3. Click **Add Process** to add to the queue

### Running Simulations
1. Select a scheduling algorithm from the **Algorithms** section
2. Configure algorithm parameters (e.g., time quantum for Round Robin)
3. Click **Run Simulation** to execute
4. View results in the **Charts** section

### Understanding Algorithms

#### First Come First Serve (FCFS)
- Processes executed in arrival order
- Simple but can lead to long waiting times
- Non-preemptive

#### Shortest Job First (SJF)
- Processes with shortest burst time first
- Optimal for minimizing average waiting time
- Can cause starvation for long processes

#### Priority Scheduling
- Higher priority processes executed first
- Can lead to starvation for low-priority processes
- Priority range: 1-10

#### Round Robin (RR)
- Each process gets equal time quantum
- Fair scheduling for time-sharing systems
- Preemptive algorithm

#### Shortest Remaining Time First (SRTF)
- Preemptive version of SJF
- Better average waiting time
- More complex implementation

### Database Integration
- **Auto-save**: Processes are automatically saved to MongoDB
- **History**: All simulations are stored for analysis
- **Statistics**: View algorithm performance comparisons
- **Connection**: Configure MongoDB URI in settings

### Chat System
- Interactive help for understanding algorithms
- Ask questions about scheduling concepts
- Get guidance on using the dashboard

## Project Structure

```
cpu-scheduling-dashboard/
├── index.html          # Main HTML file
├── styles.css          # Styling and responsive design
├── script.js           # Frontend JavaScript logic
├── server.js           # Node.js backend server
├── package.json        # Dependencies and scripts
├── README.md          # Documentation
└── .env               # Environment variables (create this)
```

## API Endpoints

### Processes
- `GET /api/processes` - Get all processes
- `POST /api/processes` - Save processes
- `DELETE /api/clear` - Clear all data

### Simulations
- `GET /api/simulations` - Get simulation history
- `POST /api/simulations` - Save simulation results
- `GET /api/statistics` - Get algorithm statistics

### Database
- `GET /api/test-connection` - Test MongoDB connection

## Configuration

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/cpu-scheduling
PORT=3000
```

### Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Features in Detail

### Dashboard Statistics
- **CPU Usage**: Current CPU utilization percentage
- **Active Processes**: Number of processes waiting or running
- **Average Wait Time**: Mean waiting time across all processes
- **Throughput**: Number of processes completed per unit time

### Chart Visualizations
- **Gantt Chart**: Timeline view of process execution
- **Performance Charts**: Bar charts for waiting and turnaround times
- **Utilization Graph**: Line chart showing CPU usage over time

### Theme System
- **Light Theme**: Clean, bright interface
- **Dark Theme**: Easy on the eyes for extended use
- **Auto Mode**: Follows system preference

### Responsive Design
- **Desktop**: Full-featured dashboard experience
- **Tablet**: Optimized layout for touch interaction
- **Mobile**: Compact view with essential features

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in environment variables
   - Verify network connectivity

2. **Port Already in Use**
   ```bash
   # Find process using port 3000
   netstat -ano | findstr :3000
   
   # Kill the process (replace PID)
   taskkill /PID <PID> /F
   ```

3. **Charts Not Displaying**
   - Check browser console for errors
   - Ensure Chart.js library is loaded
   - Verify data is being processed correctly

### Performance Tips
- Use moderate number of processes for better visualization
- Clear simulation history periodically for better performance
- Use appropriate time quantum for Round Robin (2-5 recommended)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review the API documentation
- Create an issue in the repository

## Future Enhancements

- [ ] Real-time multi-user collaboration
- [ ] Advanced algorithm visualizations
- [ ] Export simulation results to CSV/PDF
- [ ] Algorithm comparison mode
- [ ] Process priority optimization
- [ ] Cloud deployment options
- [ ] Mobile app version

---

**Built with ❤️ for Operating Systems education and visualization**

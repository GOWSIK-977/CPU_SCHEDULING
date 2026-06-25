const mongoose = require('mongoose');

// Try multiple connection strings
const connectionStrings = [
  // Option 1: Direct multi-node connection (Bypasses SRV DNS issues)
  'mongodb://gowsik977_db_user:gowsik123@ac-tuf5u2x-shard-00-00.t4w8mul.mongodb.net:27017,ac-tuf5u2x-shard-00-01.t4w8mul.mongodb.net:27017,ac-tuf5u2x-shard-00-02.t4w8mul.mongodb.net:27017/CPU_SCHEDULING?ssl=true&authSource=admin&retryWrites=true&w=majority',

  // Option 2: SRV with appName
  'mongodb+srv://gowsik977_db_user:gowsik123@cluster1.t4w8mul.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1',
  
  // Option 3: SRV without appName
  'mongodb+srv://gowsik977_db_user:gowsik123@cluster1.t4w8mul.mongodb.net/?retryWrites=true&w=majority',
  
  // Option 4: Direct connection with SSL
  'mongodb://gowsik977_db_user:gowsik123@cluster1.t4w8mul.mongodb.net:27017/CPU_SCHEDULING?retryWrites=true&w=majority&ssl=true'
];

async function testAllConnections() {
  console.log('🔍 Testing MongoDB connections...\n');
  
  for (let i = 0; i < connectionStrings.length; i++) {
    const uri = connectionStrings[i];
    console.log(`📡 Testing Option ${i + 1}:`);
    console.log(`   ${uri.replace(/:.+@/, ':****@')}\n`);
    
    try {
      await mongoose.connect(uri, {
        dbName: 'CPU_SCHEDULING',
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 30000,
        family: 4,
        retryWrites: true,
        w: 'majority'
      });
      
      console.log('   ✅ CONNECTED SUCCESSFULLY!\n');
      console.log('📊 Database:', mongoose.connection.db.databaseName);
      console.log('🌐 Host:', mongoose.connection.host);
      
      await mongoose.connection.close();
      console.log('✅ Connection closed.\n');
      
      // Save this working connection string
      console.log('🎯 USE THIS CONNECTION STRING IN YOUR .env FILE:');
      console.log(uri);
      console.log('\n');
      
      process.exit(0);
      
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}\n`);
      // Clean up connection attempt
      try { await mongoose.connection.close(); } catch (e) {}
    }
  }
  
  console.log('❌ All connection attempts failed.');
  console.log('\n💡 Troubleshooting tips:');
  console.log('1. Check your internet connection');
  console.log('2. Try using a different network (mobile hotspot)');
  console.log('3. Check if your firewall is blocking MongoDB');
  console.log('4. Make sure your MongoDB Atlas cluster is running');
  process.exit(1);
}

// Disable strict query mode to avoid warnings
mongoose.set('strictQuery', false);

testAllConnections();
const mongoose = require('mongoose');
const TaskStatus = require('./models/TaskStatus');
const StatusTransition = require('./models/StatusTransition');
require('dotenv').config();

async function verify() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/devflow';
    console.log('Using MongoDB URI:', uri ? '***connected***' : 'not found');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const statuses = await TaskStatus.find().sort({ order: 1 });
    console.log('\n=== Task Statuses ===');
    console.log(`Total: ${statuses.length}`);
    statuses.forEach(s => {
      console.log(`  ${s.order}. ${s.name} - ${s.color} (${s.description})`);
    });

    const transitions = await StatusTransition.find().populate('fromStatus toStatus');
    console.log('\n=== Status Transitions ===');
    console.log(`Total: ${transitions.length}`);
    transitions.slice(0, 10).forEach(t => {
      console.log(`  ${t.fromStatus?.name} -> ${t.toStatus?.name} (${t.description})`);
    });
    if (transitions.length > 10) {
      console.log(`  ... and ${transitions.length - 10} more`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verify();
import mongoose from 'mongoose';
import Item from './models/Item'; // Import Item first so Mongoose registers it
import Event from './models/Event';

const MONGODB_URI = 'mongodb+srv://rashad:rasha007@cluster0.kucdjp4.mongodb.net/event_erp?appName=Cluster0';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');
  const events = await Event.find({ isDeleted: false }).limit(5);
  events.forEach(e => {
    console.log(`Event ID: ${e._id}, customerName: ${e.customerName}, timeWindow:`, e.timeWindow);
  });
  await mongoose.disconnect();
}

run().catch(console.error);

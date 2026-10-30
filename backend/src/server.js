require('dotenv').config();
const mongoose=require('mongoose');
const app=require('./app');
const port=process.env.PORT||5000;
async function start(){await mongoose.connect(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/signbridge_ai');console.log('MongoDB connected');app.listen(port,()=>console.log(`SignBridge API listening on ${port}`));}
start().catch(e=>{console.error('Startup failed:',e.message);process.exit(1)});

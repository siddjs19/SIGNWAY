const mongoose=require('mongoose');
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},lesson:{type:mongoose.Schema.Types.ObjectId,ref:'Lesson',required:true},completedAt:{type:Date,default:Date.now}},{timestamps:true});
schema.index({user:1,lesson:1},{unique:true});
module.exports=mongoose.model('LessonProgress',schema);

const mongoose=require('mongoose');
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},title:{type:String,default:'New conversation'},temporary:{type:Boolean,default:false}},{timestamps:true});
module.exports=mongoose.model('Conversation',schema);

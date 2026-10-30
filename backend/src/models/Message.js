const mongoose=require('mongoose');
const schema=new mongoose.Schema({conversation:{type:mongoose.Schema.Types.ObjectId,ref:'Conversation',required:true,index:true},user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},role:{type:String,enum:['user','assistant'],required:true},content:{type:String,required:true,maxlength:8000},islPlan:{status:String,simplifiedText:String,segments:[{assetId:String,gloss:String,displayName:String,url:String}] }},{timestamps:true});
module.exports=mongoose.model('Message',schema);

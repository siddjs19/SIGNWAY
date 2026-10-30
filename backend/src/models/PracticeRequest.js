const mongoose=require('mongoose');
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},practitionerLabel:{type:String,required:true},note:{type:String,default:'',maxlength:1000},status:{type:String,enum:['pending','reviewed','closed'],default:'pending'}},{timestamps:true});
module.exports=mongoose.model('PracticeRequest',schema);

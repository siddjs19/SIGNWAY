const mongoose=require('mongoose');
const schema=new mongoose.Schema({title:{type:String,required:true},slug:{type:String,unique:true},description:String,learningObjective:String,category:String,level:{type:String,default:'beginner'},order:Number,durationMinutes:Number,published:{type:Boolean,default:true},signs:[{term:String,gloss:String,meaning:String,videoUrl:String,assetId:String,reviewStatus:String}],videoUrl:String},{timestamps:true});
module.exports=mongoose.model('Lesson',schema);

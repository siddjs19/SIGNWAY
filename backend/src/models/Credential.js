const mongoose=require('mongoose');
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},title:{type:String,required:true},credentialId:String,status:{type:String,enum:['pending','issued','verified','revoked'],default:'pending'},transactionHash:String,contractAddress:String,metadataUri:String},{timestamps:true});
module.exports=mongoose.model('Credential',schema);

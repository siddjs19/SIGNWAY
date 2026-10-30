const router=require('express').Router();const auth=require('../middleware/auth');const User=require('../models/User');
router.use(auth);
router.get('/',(req,res)=>res.json({success:true,data:{name:req.user.name,email:req.user.email,preferredLanguage:req.user.preferredLanguage,saveConversations:req.user.saveConversations}}));
router.patch('/',async(req,res)=>{const update={};if(typeof req.body.name==='string'&&req.body.name.trim())update.name=req.body.name.trim();if(['English','Hindi','Marathi'].includes(req.body.preferredLanguage))update.preferredLanguage=req.body.preferredLanguage;if(typeof req.body.saveConversations==='boolean')update.saveConversations=req.body.saveConversations;const u=await User.findByIdAndUpdate(req.user._id,{$set:update},{new:true}).select('-password');res.json({success:true,data:{name:u.name,email:u.email,preferredLanguage:u.preferredLanguage,saveConversations:u.saveConversations}})});
module.exports=router;

const inventory=require('../data/islVideoInventory.json');
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const words=s=>norm(s).split(/\s+/).filter(Boolean);
function plan(text){
 const available=new Map(inventory.map(a=>[norm(a.displayName),a]));
 const tokens=words(text),segments=[],missing=[];let i=0;
 while(i<tokens.length){
   let found=null,span=0;
   for(let n=Math.min(3,tokens.length-i);n>0;n--){const phrase=tokens.slice(i,i+n).join(' ');if(available.has(phrase)){found=available.get(phrase);span=n;break;}}
   if(found){segments.push({assetId:found.id,gloss:found.gloss,displayName:found.displayName,url:found.url});i+=span;}
   else {if(!['a','an','the','is','am','are','to','of','and','i','you','we','it','my','your'].includes(tokens[i]))missing.push(tokens[i]);i++;}
 }
 const status=segments.length===0?'unsupported':missing.length?'partial':'complete';
 return {status,segments,simplifiedText:segments.map(s=>s.displayName).join(' · '),missing:[...new Set(missing)]};
}
module.exports={plan,inventory};

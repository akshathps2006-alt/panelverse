
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express(), PORT=process.env.PORT||3000;
const SECRET=process.env.JWT_SECRET||"change-this-secret-in-production";
const DATA=path.join(__dirname,"..","data"), UP=path.join(__dirname,"..","uploads");
fs.mkdirSync(DATA,{recursive:true}); fs.mkdirSync(UP,{recursive:true});
const DB=path.join(DATA,"db.json");
const blank={users:[],series:[],chapters:[],likes:[],follows:[],bookmarks:[],history:[],comments:[],notifications:[],reports:[],events:[]};
if(!fs.existsSync(DB)) fs.writeFileSync(DB,JSON.stringify(blank,null,2));
const read=()=>JSON.parse(fs.readFileSync(DB,"utf8"));
const save=d=>fs.writeFileSync(DB,JSON.stringify(d,null,2));

app.use(cors()); app.use(express.json({limit:"2mb"})); app.use("/uploads",express.static(UP)); app.use(express.static(path.join(__dirname,"..","public")));

const storage=multer.diskStorage({
 destination:(_,__,cb)=>cb(null,UP),
 filename:(_,f,cb)=>cb(null,crypto.randomUUID()+path.extname(f.originalname).toLowerCase())
});
const imageOnly=(_,f,cb)=>f.mimetype.startsWith("image/")?cb(null,true):cb(new Error("Only image files are allowed"));
const upload=multer({storage,fileFilter:imageOnly,limits:{files:100,fileSize:15*1024*1024}});

function tokenFor(u){return jwt.sign({id:u.id,username:u.username,role:u.role},SECRET,{expiresIn:"7d"})}
function auth(req,res,next){const h=req.headers.authorization||"";if(!h.startsWith("Bearer "))return res.status(401).json({error:"Authentication required"});try{req.user=jwt.verify(h.slice(7),SECRET);next()}catch{res.status(401).json({error:"Invalid or expired session"})}}
function optional(req,_,next){const h=req.headers.authorization||"";if(h.startsWith("Bearer "))try{req.user=jwt.verify(h.slice(7),SECRET)}catch{}next()}
function owner(req,res,next){const d=read(),s=d.series.find(x=>x.id===req.params.id);if(!s)return res.status(404).json({error:"Series not found"});if(s.ownerId!==req.user.id)return res.status(403).json({error:"You do not own this series"});req.series=s;next()}
function event(d,type,userId,seriesId,chapterId,meta={}){d.events.push({id:crypto.randomUUID(),type,userId,seriesId,chapterId,meta,createdAt:new Date().toISOString()})}

app.get("/",(_,res)=>res.sendFile(path.join(__dirname,"..","public","index.html")));
app.get("/api/health",(_,res)=>res.json({ok:true,name:"PanelVerse API",version:"1.0.0"}));

app.post("/api/auth/register",async(req,res)=>{
 const {username,email,password}=req.body;
 if(!username||!email||!password||password.length<8)return res.status(400).json({error:"Username, email and password (8+ chars) are required"});
 const d=read(),e=email.trim().toLowerCase();
 if(d.users.some(u=>u.email===e||u.username.toLowerCase()===username.trim().toLowerCase()))return res.status(409).json({error:"Username or email already exists"});
 const u={id:crypto.randomUUID(),username:username.trim(),email:e,passwordHash:await bcrypt.hash(password,12),role:"creator",createdAt:new Date().toISOString()};
 d.users.push(u);save(d);res.status(201).json({user:{id:u.id,username:u.username,email:u.email,role:u.role},token:tokenFor(u)});
});
app.post("/api/auth/login",async(req,res)=>{
 const d=read(),u=d.users.find(x=>x.email===String(req.body.email||"").trim().toLowerCase());
 if(!u||!(await bcrypt.compare(req.body.password||"",u.passwordHash)))return res.status(401).json({error:"Invalid credentials"});
 res.json({user:{id:u.id,username:u.username,email:u.email,role:u.role},token:tokenFor(u)});
});
app.get("/api/auth/me",auth,(req,res)=>{const u=read().users.find(x=>x.id===req.user.id);res.json({id:u.id,username:u.username,email:u.email,role:u.role})});

function stats(d,id,uid=null){
 const s=d.series.find(x=>x.id===id);
 return {likes:d.likes.filter(x=>x.seriesId===id).length,followers:d.follows.filter(x=>x.seriesId===id).length,
 comments:d.comments.filter(x=>x.seriesId===id).length,chapters:d.chapters.filter(x=>x.seriesId===id&&x.status==="published").length,
 following:!!uid&&d.follows.some(x=>x.seriesId===id&&x.userId===uid),
 liked:!!uid&&d.likes.some(x=>x.seriesId===id&&x.userId===uid),
 bookmarked:!!uid&&d.bookmarks.some(x=>x.seriesId===id&&x.userId===uid)};
}
app.get("/api/series",optional,(req,res)=>{
 const d=read(); let rows=d.series.filter(s=>s.status==="published");
 if(req.query.q){const q=req.query.q.toLowerCase();rows=rows.filter(s=>(s.title+" "+s.author+" "+s.genre+" "+s.description).toLowerCase().includes(q))}
 if(req.query.genre)rows=rows.filter(s=>s.genre.toLowerCase()===req.query.genre.toLowerCase());
 res.json(rows.map(s=>({...s,...stats(d,s.id,req.user?.id)})));
});
app.get("/api/series/:id",optional,(req,res)=>{const d=read(),s=d.series.find(x=>x.id===req.params.id);if(!s)return res.status(404).json({error:"Not found"});res.json({...s,...stats(d,s.id,req.user?.id)})});
app.get("/api/series/:id/chapters",(req,res)=>{const d=read();res.json(d.chapters.filter(c=>c.seriesId===req.params.id&&c.status==="published").sort((a,b)=>a.number-b.number))});

app.post("/api/series",auth,(req,res)=>{
 const {title,description="",genre="Other",format="Webtoon"}=req.body;if(!title)return res.status(400).json({error:"Title required"});
 const d=read(),s={id:crypto.randomUUID(),ownerId:req.user.id,author:req.user.username,title,description,genre,format,status:"draft",createdAt:new Date().toISOString()};
 d.series.push(s);save(d);res.status(201).json(s);
});
app.get("/api/me/series",auth,(req,res)=>{const d=read();res.json(d.series.filter(s=>s.ownerId===req.user.id).map(s=>({...s,...stats(d,s.id)})))});
app.post("/api/series/:id/cover",auth,owner,upload.single("cover"),(req,res)=>{if(!req.file)return res.status(400).json({error:"Cover required"});const d=read(),s=d.series.find(x=>x.id===req.params.id);s.coverUrl="/uploads/"+req.file.filename;save(d);res.json(s)});
app.post("/api/series/:id/chapters",auth,owner,upload.array("pages",100),(req,res)=>{
 const d=read();if(!req.files?.length)return res.status(400).json({error:"At least one page required"});
 const existing=d.chapters.filter(c=>c.seriesId===req.params.id),number=Number(req.body.number)||Math.max(0,...existing.map(c=>c.number||0))+1;
 if(existing.some(c=>c.number===number))return res.status(409).json({error:"Chapter number already exists"});
 const pages=req.files.map((f,i)=>({order:i+1,url:"/uploads/"+f.filename,name:f.originalname}));
 const c={id:crypto.randomUUID(),seriesId:req.params.id,number,title:req.body.title||`Chapter ${number}`,pages,status:"draft",createdAt:new Date().toISOString()};
 d.chapters.push(c);save(d);res.status(201).json(c);
});
app.post("/api/chapters/:id/publish",auth,(req,res)=>{const d=read(),c=d.chapters.find(x=>x.id===req.params.id),s=c&&d.series.find(x=>x.id===c.seriesId);if(!c)return res.status(404).json({error:"Chapter not found"});if(s.ownerId!==req.user.id)return res.status(403).json({error:"Not your chapter"});c.status="published";save(d);res.json(c)});
app.post("/api/series/:id/publish",auth,owner,(req,res)=>{const d=read(),s=d.series.find(x=>x.id===req.params.id);if(!d.chapters.some(c=>c.seriesId===s.id&&c.status==="published"))return res.status(400).json({error:"Publish at least one chapter first"});s.status="published";save(d);res.json(s)});

function toggle(req,res,type){const d=read(),arr=d[type],i=arr.findIndex(x=>x.userId===req.user.id&&x.seriesId===req.params.id);if(i>=0)arr.splice(i,1);else arr.push({id:crypto.randomUUID(),userId:req.user.id,seriesId:req.params.id,createdAt:new Date().toISOString()});save(d);res.json({active:i<0})}
app.post("/api/series/:id/like",auth,(req,res)=>toggle(req,res,"likes"));
app.post("/api/series/:id/follow",auth,(req,res)=>toggle(req,res,"follows"));
app.post("/api/series/:id/bookmark",auth,(req,res)=>toggle(req,res,"bookmarks"));

app.post("/api/chapters/:id/history",auth,(req,res)=>{const d=read(),i=d.history.findIndex(x=>x.userId===req.user.id&&x.chapterId===req.params.id),item={userId:req.user.id,chapterId:req.params.id,progress:Number(req.body.progress||0),updatedAt:new Date().toISOString()};if(i>=0)d.history[i]=item;else d.history.push(item);event(d,"read",req.user.id,null,req.params.id,{progress:item.progress});save(d);res.json(item)});
app.get("/api/me/history",auth,(req,res)=>{const d=read();res.json(d.history.filter(x=>x.userId===req.user.id).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(h=>({...h,chapter:d.chapters.find(c=>c.id===h.chapterId)})))});

app.post("/api/series/:id/comments",auth,(req,res)=>{const text=String(req.body.text||"").trim();if(!text)return res.status(400).json({error:"Comment required"});const d=read(),c={id:crypto.randomUUID(),userId:req.user.id,seriesId:req.params.id,text,createdAt:new Date().toISOString()};d.comments.push(c);d.notifications.push({id:crypto.randomUUID(),userId:req.user.id,type:"comment",text:"Your comment was posted.",read:false,createdAt:c.createdAt});save(d);res.status(201).json(c)});
app.get("/api/series/:id/comments",(req,res)=>{const d=read();res.json(d.comments.filter(c=>c.seriesId===req.params.id).map(c=>({...c,username:d.users.find(u=>u.id===c.userId)?.username||"Reader"})))});
app.get("/api/me/notifications",auth,(req,res)=>{const d=read();res.json(d.notifications.filter(n=>n.userId===req.user.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))});

app.get("/api/discovery",optional,(req,res)=>{
 const d=read(),pub=d.series.filter(s=>s.status==="published");
 const score=s=>d.likes.filter(x=>x.seriesId===s.id).length*5+d.follows.filter(x=>x.seriesId===s.id).length*8+d.comments.filter(x=>x.seriesId===s.id).length*2;
 const enriched=s=>({...s,...stats(d,s.id,req.user?.id)});
 const trending=[...pub].sort((a,b)=>score(b)-score(a)).map(enriched).slice(0,12), newest=[...pub].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(enriched).slice(0,12);
 res.json({featured:trending.slice(0,6),trending,newest,genres:[...new Set(pub.map(s=>s.genre))]});
});
app.get("/api/recommendations",optional,(req,res)=>{
 const d=read(),pub=d.series.filter(s=>s.status==="published"),uid=req.user?.id;
 const history=d.history.filter(h=>h.userId===uid),seen=new Set(history.map(h=>d.chapters.find(c=>c.id===h.chapterId)?.seriesId).filter(Boolean));
 const followed=new Set(d.follows.filter(f=>f.userId===uid).map(f=>f.seriesId)),liked=new Set(d.likes.filter(f=>f.userId===uid).map(f=>f.seriesId));
 const genre={}; for(const s of pub.filter(s=>seen.has(s.id)||followed.has(s.id)||liked.has(s.id)))genre[s.genre]=(genre[s.genre]||0)+1;
 const rows=pub.map(s=>{let score=d.likes.filter(x=>x.seriesId===s.id).length+d.follows.filter(x=>x.seriesId===s.id).length*1.5;const reasons=[];if(genre[s.genre]){score+=genre[s.genre]*20;reasons.push(`Because you like ${s.genre}`)}if(seen.has(s.id))score-=300;if(followed.has(s.id))score-=500;return {...s,...stats(d,s.id,uid),score,reasons}});
 res.json({personalized:!!uid,recommendations:rows.sort((a,b)=>b.score-a.score).slice(0,12)});
});

app.get("/api/creator/:id", (req,res)=>{
 const d=read(),series=d.series.filter(s=>s.ownerId===req.params.id&&s.status==="published");if(!series.length)return res.status(404).json({error:"Creator not found"});
 const u=d.users.find(x=>x.id===req.params.id);res.json({id:req.params.id,username:u?.username||series[0].author,series:series.map(s=>({...s,...stats(d,s.id)}))});
});
app.get("/api/creator/:id/analytics",auth,(req,res)=>{
 const d=read();if(req.params.id!==req.user.id)return res.status(403).json({error:"Forbidden"});
 const series=d.series.filter(s=>s.ownerId===req.user.id), ids=new Set(series.map(s=>s.id)), chapters=d.chapters.filter(c=>ids.has(c.seriesId));
 const views=d.events.filter(e=>e.type==="read"&&ids.has(e.seriesId)||e.type==="read"&&chapters.some(c=>c.id===e.chapterId&&ids.has(c.seriesId))).length;
 res.json({series:series.length,chapters:chapters.length,published:series.filter(s=>s.status==="published").length,views,followers:d.follows.filter(x=>ids.has(x.seriesId)).length,likes:d.likes.filter(x=>ids.has(x.seriesId)).length,comments:d.comments.filter(x=>ids.has(x.seriesId)).length});
});

app.get("/api/external-catalog",(_,res)=>res.json([
 {platform:"WEBTOON",url:"https://www.webtoons.com/",mode:"official link / permitted integration"},
 {platform:"GlobalComix",url:"https://globalcomix.com/",mode:"official link / permitted integration"},
 {platform:"Tapas",url:"https://tapas.io/",mode:"official link / permitted integration"},
 {platform:"MANGA Plus",url:"https://mangaplus.shueisha.co.jp/",mode:"official link / permitted integration"}
]));

app.post("/api/reports",auth,(req,res)=>{const{seriesId,reason,details=""}=req.body;if(!seriesId||!reason)return res.status(400).json({error:"seriesId and reason required"});const d=read();const r={id:crypto.randomUUID(),reporterId:req.user.id,seriesId,reason,details,status:"open",createdAt:new Date().toISOString()};d.reports.push(r);save(d);res.status(201).json(r)});
app.get("/api/admin/reports",auth,(req,res)=>{const d=read(),u=d.users.find(x=>x.id===req.user.id);if(u?.role!=="admin")return res.status(403).json({error:"Admin only"});res.json(d.reports)});
app.get("/api/admin/stats",auth,(req,res)=>{const d=read(),u=d.users.find(x=>x.id===req.user.id);if(u?.role!=="admin")return res.status(403).json({error:"Admin only"});res.json({users:d.users.length,series:d.series.length,published:d.series.filter(s=>s.status==="published").length,chapters:d.chapters.length,reports:d.reports.filter(r=>r.status==="open").length})});

app.use((err,_,res)=>res.status(400).json({error:err.message||"Request failed"}));
app.listen(PORT,()=>console.log(`PanelVerse API running at http://localhost:${PORT}`));

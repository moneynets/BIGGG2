const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const app=express();const server=http.createServer(app);const io=new Server(server);
app.use(express.static('public'));
const suits=['C','D','H','S']; const values=[3,4,5,6,7,8,9,10,11,12,13,1,2];
const deck=()=>suits.flatMap(s=>values.map(v=>({id:s+v,s,v})));
const power=c=>values.indexOf(c.v)*4+suits.indexOf(c.s);
const sort=(a,b)=>power(a)-power(b);
const players=new Map();let waiting=[];const games=new Map();let gid=0;
function evaluate(cards){
 const n=cards.length;if(![1,2,3,5].includes(n))return null;
 const counts=new Map();cards.forEach(c=>counts.set(c.v,(counts.get(c.v)||0)+1));
 const groups=[...counts.entries()].sort((a,b)=>b[1]-a[1]||values.indexOf(b[0])-values.indexOf(a[0]));
 const top=Math.max(...cards.map(power));
 if(n===1)return {kind:'single',tier:0,score:[top]};
 if(n===2||n===3){if(groups.length!==1)return null;return {kind:n===2?'pair':'triple',tier:0,score:[values.indexOf(groups[0][0]),Math.max(...cards.map(c=>suits.indexOf(c.s)))]};}
 const flush=cards.every(c=>c.s===cards[0].s);
 const idx=cards.map(c=>values.indexOf(c.v));
 // 3-4-5-6-7 through 10-J-Q-K-A and J-Q-K-A-2 are valid; Q-K-A-2-3 is not.
 const sorted=[...new Set(idx)].sort((a,b)=>a-b);
 const straight=sorted.length===5&&sorted[4]-sorted[0]===4;
 const straightHigh=straight?sorted[4]:-1;
 const four=groups[0][1]===4,full=groups[0][1]===3&&groups[1]?.[1]===2;
 let tier,score;
 if(straight&&flush){tier=5;score=[straightHigh,suits.indexOf(cards[0].s)];}
 else if(four){tier=4;score=[values.indexOf(groups[0][0])];}
 else if(full){tier=3;score=[values.indexOf(groups[0][0])];}
 else if(flush){tier=2;score=[...cards].sort((a,b)=>power(b)-power(a)).map(power);}
 else if(straight){tier=1;score=[straightHigh,Math.max(...cards.filter(c=>values.indexOf(c.v)===straightHigh).map(c=>suits.indexOf(c.s)))];}
 else return null;
 return {kind:'five',tier,score};
}
function beats(a,b){if(!b)return true;if(a.kind!==b.kind)return false;if(a.tier!==b.tier)return a.tier>b.tier;for(let i=0;i<Math.max(a.score.length,b.score.length);i++){let d=(a.score[i]||0)-(b.score[i]||0);if(d)return d>0;}return false;}
function send(g){g.ids.forEach((id,i)=>{const sock=io.sockets.sockets.get(id);if(!sock)return; sock.emit('state',{status:g.done?'finished':'playing',hand:[...g.hands[i]].sort(sort),opponentCount:g.hands[1-i].length,turn:g.turn===i,table:g.table,tablePlayer:g.tablePlayer,free:g.table===null,first:g.first,winner:g.done?g.winner===i? 'you':'opponent':null,message:g.message});});}
function start(a,b){let d=deck();for(let i=d.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}const hands=[d.slice(0,26),d.slice(26)];const first=hands[0].some(c=>c.id==='C3')?0:1;const g={ids:[a,b],hands,turn:first,first:true,table:null,tablePlayer:null,done:false,winner:null,message:'持有梅花 3 的玩家先出牌'};const id=++gid;games.set(id,g);players.set(a,id);players.set(b,id);send(g);}
function match(){waiting=waiting.filter(id=>io.sockets.sockets.has(id)&&!players.has(id));while(waiting.length>=2)start(waiting.shift(),waiting.shift());}
io.on('connection',s=>{
 s.emit('state',{status:'waiting',message:'等待另一位玩家加入…'});waiting.push(s.id);match();
 s.on('play',ids=>{const g=games.get(players.get(s.id));if(!g||g.done)return;const i=g.ids.indexOf(s.id);if(i!==g.turn)return s.emit('errorMsg','還沒輪到你');if(!Array.isArray(ids)||new Set(ids).size!==ids.length)return s.emit('errorMsg','選牌資料錯誤');const cards=ids.map(id=>g.hands[i].find(c=>c.id===id));if(!cards.length||cards.some(c=>!c))return s.emit('errorMsg','請選擇有效手牌');const ev=evaluate(cards);if(!ev)return s.emit('errorMsg','不符合大老二牌型');if(g.first&&!ids.includes('C3'))return s.emit('errorMsg','第一手必須包含梅花 3');if(!beats(ev,g.table?.evaluation))return s.emit('errorMsg','牌型必須大於桌面上的牌');g.hands[i]=g.hands[i].filter(c=>!ids.includes(c.id));g.table={cards,evaluation:ev};g.tablePlayer=i;g.first=false;g.turn=1-i;g.message='對方已出牌';if(g.hands[i].length===0){g.done=true;g.winner=i;g.message='本局結束';}send(g);});
 s.on('pass',()=>{const g=games.get(players.get(s.id));if(!g||g.done)return;const i=g.ids.indexOf(s.id);if(i!==g.turn)return s.emit('errorMsg','還沒輪到你');if(!g.table)return s.emit('errorMsg','目前沒有牌可以 Pass');g.table=null;g.tablePlayer=null;g.turn=1-i;g.message='對方 Pass，你可以自由出牌';send(g);});
 s.on('disconnect',()=>{waiting=waiting.filter(id=>id!==s.id);const id=players.get(s.id);players.delete(s.id);if(id){const g=games.get(id);if(g){const other=g.ids.find(x=>x!==s.id);players.delete(other);games.delete(id);const os=io.sockets.sockets.get(other);if(os){os.emit('state',{status:'waiting',message:'對方離線，正在重新配對…'});waiting.push(other);}}}match();});
});
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Big2 Duo running'));

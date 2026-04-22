import { useState, useEffect, useRef } from "react";

// ===================== CONSTANTS =====================
const CS = 22, M = 10;
const COLORS = ['RED','GREEN','BLUE','YELLOW'];
const CHX = { RED:'#ef4444', GREEN:'#22c55e', BLUE:'#3b82f6', YELLOW:'#eab308' };
const CNAME = { RED:'Red', GREEN:'Green', BLUE:'Blue', YELLOW:'Yellow' };
const BASE_POS = { RED:0, GREEN:25, BLUE:50, YELLOW:75 };
const ENTRY_POS = { RED:98, GREEN:23, BLUE:48, YELLOW:73 };

function cellXY(p){
  if(p<=24) return {x:M+p*CS,      y:M+25*CS};
  if(p<=49) return {x:M+25*CS,     y:M+(50-p)*CS};
  if(p<=74) return {x:M+(75-p)*CS, y:M};
  return           {x:M,           y:M+(p-75)*CS};
}
function safeXY(c,i){
  if(c==='RED')    return {x:M+(i+1)*CS,   y:M+23*CS};
  if(c==='GREEN')  return {x:M+23*CS,      y:M+(24-i)*CS};
  if(c==='BLUE')   return {x:M+(24-i)*CS,  y:M+2*CS};
  if(c==='YELLOW') return {x:M+2*CS,       y:M+(1+i)*CS};
  return {x:0,y:0};
}
function homeXY(c,i){
  const off=[[0,0],[1,0],[0,1],[1,1]][i], sp=30;
  const bx={RED:78,GREEN:448,BLUE:448,YELLOW:78}[c];
  const by={RED:458,GREEN:458,BLUE:92,YELLOW:92}[c];
  return {x:bx+off[0]*sp, y:by+off[1]*sp};
}

// ===================== DECK =====================
function createDeck(){
  let id=0; const deck=[];
  const SYM={SPADE:'♠',CLUB:'♣',DIAMOND:'♦',HEART:'♥'};
  const defs=[
    {type:'ACE',  rank:1,  name:'Ace',   cnt:{SPADE:2,CLUB:2,DIAMOND:1,HEART:1}},
    {type:'STD',  rank:2,  name:'Two',   cnt:{SPADE:3,CLUB:3,DIAMOND:2,HEART:2}},
    {type:'STD',  rank:3,  name:'Three', cnt:{SPADE:3,CLUB:3,DIAMOND:2,HEART:2}},
    {type:'FOUR', rank:-4, name:'Four',  cnt:{SPADE:2,CLUB:2,DIAMOND:1,HEART:1}},
    {type:'FIVE', rank:5,  name:'Five',  cnt:{SPADE:2,CLUB:2,DIAMOND:1,HEART:1}},
    {type:'STD',  rank:6,  name:'Six',   cnt:{SPADE:3,CLUB:3,DIAMOND:2,HEART:2}},
    {type:'SEVEN',rank:7,  name:'Seven', cnt:{SPADE:2,CLUB:2,DIAMOND:1,HEART:1}},
    {type:'STD',  rank:8,  name:'Eight', cnt:{SPADE:3,CLUB:3,DIAMOND:2,HEART:2}},
    {type:'STD',  rank:9,  name:'Nine',  cnt:{SPADE:3,CLUB:3,DIAMOND:2,HEART:2}},
    {type:'TEN',  rank:10, name:'Ten',   cnt:{SPADE:2,CLUB:2,DIAMOND:1,HEART:1}},
    {type:'JACK', rank:11, name:'Jack',  cnt:{SPADE:1,CLUB:2,DIAMOND:2,HEART:1}},
    {type:'QUEEN',rank:12, name:'Queen', cnt:{SPADE:2,CLUB:2,DIAMOND:1,HEART:1}},
    {type:'KING', rank:13, name:'King',  cnt:{SPADE:2,CLUB:2,DIAMOND:1,HEART:3}},
    {type:'BURNER',rank:0, name:'Burner',cnt:{WILD:1}},
    {type:'SAVER', rank:0, name:'Saver', cnt:{WILD:1}},
  ];
  defs.forEach(d=>{
    Object.entries(d.cnt).forEach(([suit,count])=>{
      for(let i=0;i<count;i++){
        deck.push({id:id++,type:d.type,rank:d.rank,
          name:suit==='WILD'?d.name:`${d.name} ${SYM[suit]||''}`,
          shortName:d.name,suit:suit==='WILD'?null:suit,
          suitSym:suit==='WILD'?'':SYM[suit]||''});
      }
    });
  });
  return deck;
}

function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

// ===================== INIT =====================
function initGame(pName){
  const marbles={};let mid=0;
  const homeZones={};
  COLORS.forEach(c=>{
    homeZones[c]=[];
    for(let i=0;i<4;i++){const m={id:mid++,color:c};marbles[m.id]=m;homeZones[c].push(m.id);}
  });
  const track=Array.from({length:100},(_,i)=>{
    const type=i%25===0?'BASE':((i+2)%25===0?'ENTRY':'NORMAL');
    return {marble:null,type,trap:false};
  });
  let traps=0;
  while(traps<8){
    const r=Math.floor(Math.random()*100);
    if(track[r].type==='NORMAL'&&!track[r].trap){track[r]={...track[r],trap:true};traps++;}
  }
  const safeZones=Object.fromEntries(COLORS.map(c=>[c,[null,null,null,null]]));
  let deck=shuffle(createDeck());
  const players=[
    {name:pName||'You',  color:'RED',   isHuman:true, hand:[]},
    {name:'CPU Alice',   color:'GREEN', isHuman:false,hand:[]},
    {name:'CPU Bob',     color:'BLUE',  isHuman:false,hand:[]},
    {name:'CPU Carol',   color:'YELLOW',isHuman:false,hand:[]},
  ];
  for(let i=0;i<4;i++) players[i]={...players[i],hand:deck.splice(0,4)};
  return {marbles,homeZones,track,safeZones,players,firePit:[],deck,
    currentPlayerIdx:0,turn:0,phase:'playing',winner:null,
    log:[`🎮 Game started! ${pName||'You'} (🔴 Red) vs 3 CPU players.`,
         '📋 Click a card, then click marbles, then Play!']};
}

// ===================== LOGIC =====================
function findLoc(st,mId){
  for(let i=0;i<100;i++) if(st.track[i].marble===mId) return {loc:'track',pos:i};
  for(const c of COLORS) for(let i=0;i<4;i++) if(st.safeZones[c][i]===mId) return {loc:'safe',c,i};
  for(const c of COLORS) if(st.homeZones[c].includes(mId)) return {loc:'home',c};
  return null;
}

function sendHome(st,mId){
  const color=st.marbles[mId].color;
  const newTrack=st.track.map(c=>c.marble===mId?{...c,marble:null}:c);
  const newSafe={...st.safeZones};
  for(const c of COLORS){
    if(newSafe[c].includes(mId)) newSafe[c]=newSafe[c].map(m=>m===mId?null:m);
  }
  return {...st,track:newTrack,safeZones:newSafe,
    homeZones:{...st.homeZones,[color]:[...st.homeZones[color],mId]}};
}

function doField(st,pc){
  const home=st.homeZones[pc];
  if(!home.length) return {st,err:'No marbles in home zone'};
  const mId=home[0];
  const bp=BASE_POS[pc];
  let nst=st;
  if(st.track[bp].marble!==null){
    const occ=st.track[bp].marble;
    if(st.marbles[occ].color===pc) return {st,err:'Your marble is already on base cell'};
    nst=sendHome(nst,occ);
  }
  const newHome={...nst.homeZones,[pc]:nst.homeZones[pc].filter(id=>id!==mId)};
  const newTrack=nst.track.map((c,i)=>i===bp?{...c,marble:mId}:c);
  return {st:{...nst,homeZones:newHome,track:newTrack},err:null,msg:`⭐ ${CNAME[pc]} fielded a marble to base!`};
}

function doMove(st,mId,steps,activeColor,destroy=false){
  const loc=findLoc(st,mId);
  const marble=st.marbles[mId];
  const msgs=[];
  if(!loc) return {st,err:'Marble not found',msgs};
  if(loc.loc==='home') return {st,err:'Cannot move marble in home. Use Field.',msgs};

  // Safe zone movement
  if(loc.loc==='safe'){
    if(steps<=0) return {st,err:'Cannot move backward in safe zone',msgs};
    const ni=loc.i+steps;
    if(ni>3) return {st,err:`Overshoots safe zone (would be slot ${ni})`,msgs};
    if(st.safeZones[loc.c][ni]!==null) return {st,err:'Safe zone slot occupied',msgs};
    const nSafe={...st.safeZones,[loc.c]:st.safeZones[loc.c].map((m,j)=>j===loc.i?null:(j===ni?mId:m))};
    msgs.push(`${CNAME[marble.color]} marble advanced in safe zone to slot ${ni+1}`);
    return {st:{...st,safeZones:nSafe},err:null,msgs};
  }

  // Track movement
  const fromPos=loc.pos;
  const entryPos=ENTRY_POS[marble.color];
  let nst=st;

  // Safe zone routing: only for own color marble moved by active player
  if(steps>0 && marble.color===activeColor){
    const distToEntry=entryPos-fromPos; // non-modular (as in Java)
    if(distToEntry>=0){
      if(steps>distToEntry+4) return {st,err:'Move rank too high — overshoots safe zone',msgs};
      if(steps>distToEntry){
        const safeIdx=steps-distToEntry-1;
        if(safeIdx<0||safeIdx>3) return {st,err:`Invalid safe zone index: ${safeIdx}`,msgs};
        if(st.safeZones[marble.color][safeIdx]!==null) return {st,err:'Safe zone target slot is occupied',msgs};
        // Traverse track path to entryPos, clearing enemies
        let newTrack=[...nst.track];
        for(let s=1;s<=distToEntry;s++){
          const pp=(fromPos+s)%100;
          if(newTrack[pp].marble!==null){
            const bId=newTrack[pp].marble;
            const bColor=nst.marbles[bId].color;
            if(bColor===activeColor) return {st,err:`Own marble blocking path at pos ${pp}`,msgs};
            nst=sendHome(nst,bId);
            newTrack=[...nst.track];
            msgs.push(`💥 ${CNAME[bColor]} marble at ${pp} destroyed!`);
          }
        }
        newTrack[fromPos]={...newTrack[fromPos],marble:null};
        const nSafe={...nst.safeZones,[marble.color]:nst.safeZones[marble.color].map((m,j)=>j===safeIdx?mId:m)};
        msgs.push(`⭐ ${CNAME[marble.color]} marble entered safe zone! (slot ${safeIdx+1})`);
        return {st:{...nst,track:newTrack,safeZones:nSafe},err:null,msgs};
      }
    }
  }

  // Regular track move
  const dir=steps>0?1:-1;
  const numSteps=Math.abs(steps);
  let newTrack=[...nst.track];

  for(let s=1;s<=numSteps;s++){
    const pp=((fromPos+dir*s)%100+100)%100;
    const isLast=(s===numSteps);
    if(newTrack[pp].marble!==null){
      const bId=newTrack[pp].marble;
      const bColor=nst.marbles[bId].color;
      // Base cell protection
      if(newTrack[pp].type==='BASE' && BASE_POS[bColor]===pp){
        return {st,err:`Cannot cross marble safe on its own base (pos ${pp})`,msgs};
      }
      // Cannot cross/land on active player's own marbles
      if(bColor===activeColor){
        return {st,err:'Cannot land on or pass your own marble',msgs};
      }
      if(destroy){
        nst=sendHome(nst,bId);
        newTrack=[...nst.track];
        newTrack[pp]={...newTrack[pp],marble:null};
        msgs.push(`💥 King destroyed ${CNAME[bColor]} marble at ${pp}!`);
      } else if(isLast){
        nst=sendHome(nst,bId);
        newTrack=[...nst.track];
        newTrack[pp]={...newTrack[pp],marble:null};
        msgs.push(`💥 ${CNAME[bColor]} marble at ${pp} sent home!`);
      }
      // else: mid-path enemy marble is passed over (simplified)
    }
  }

  const toPos=((fromPos+steps)%100+100)%100;
  newTrack[fromPos]={...newTrack[fromPos],marble:null};

  // Trap check
  if(newTrack[toPos].trap){
    msgs.push(`⚠️ ${CNAME[marble.color]} hit a TRAP at ${toPos}! Marble sent home.`);
    newTrack[toPos]={...newTrack[toPos],trap:false};
    // Relocate trap to random NORMAL cell
    const valid=newTrack.reduce((a,c,i)=>c.type==='NORMAL'&&!c.trap?[...a,i]:a,[]);
    if(valid.length){const ni=valid[Math.floor(Math.random()*valid.length)];newTrack[ni]={...newTrack[ni],trap:true};}
    const newHome={...nst.homeZones,[marble.color]:[...nst.homeZones[marble.color],mId]};
    return {st:{...nst,track:newTrack,homeZones:newHome},err:null,msgs};
  }

  newTrack[toPos]={...newTrack[toPos],marble:mId};
  msgs.push(`${CNAME[marble.color]} marble: ${fromPos}→${toPos} (${steps>0?'+':''}${steps})`);
  return {st:{...nst,track:newTrack},err:null,msgs};
}

function execCard(st,card,mIds,splitDist,pIdx){
  const player=st.players[pIdx];
  const pc=player.color;
  const msgs=[];
  let nst=st, err=null;

  const mv=(mId,steps,destroy=false)=>{
    if(err) return;
    const r=doMove(nst,mId,steps,pc,destroy);
    if(r.err){err=r.err;return;}
    nst=r.st; msgs.push(...r.msgs);
  };
  const field=()=>{
    if(err) return;
    const r=doField(nst,pc);
    if(r.err){err=r.err;return;}
    nst=r.st; if(r.msg) msgs.push(r.msg);
  };

  switch(card.type){
    case 'ACE':
      if(mIds.length===0) field();
      else mv(mIds[0],1);
      break;
    case 'KING':
      if(mIds.length===0) field();
      else mv(mIds[0],13,true);
      break;
    case 'FOUR':
      if(!mIds.length){err='Select a marble';break;}
      mv(mIds[0],-4); break;
    case 'FIVE':{
      if(!mIds.length){err='Select a marble';break;}
      // Five can move any marble (any color)
      const r5=doMove(nst,mIds[0],5,pc);
      if(r5.err){err=r5.err;break;}
      nst=r5.st; msgs.push(...r5.msgs); break;
    }
    case 'SEVEN':
      if(mIds.length===2){mv(mIds[0],splitDist);if(!err)mv(mIds[1],7-splitDist);}
      else if(mIds.length===1) mv(mIds[0],7);
      else err='Select 1 or 2 marbles';
      break;
    case 'JACK':
      if(mIds.length===2){
        const l1=findLoc(nst,mIds[0]),l2=findLoc(nst,mIds[1]);
        if(!l1||!l2||l1.loc!=='track'||l2.loc!=='track'){err='Both marbles must be on track to swap';break;}
        const m2c=nst.marbles[mIds[1]].color;
        if(nst.track[l2.pos].type==='BASE'&&BASE_POS[m2c]===l2.pos){err='Cannot swap marble on its own base cell';break;}
        const nt=nst.track.map((c,i)=>{
          if(i===l1.pos) return {...c,marble:mIds[1]};
          if(i===l2.pos) return {...c,marble:mIds[0]};
          return c;
        });
        nst={...nst,track:nt};
        msgs.push(`🔄 Swapped ${CNAME[pc]} marble with ${CNAME[m2c]}!`);
      } else if(mIds.length===1) mv(mIds[0],11);
      else err='Select 1 marble (move 11) or 2 marbles (own+enemy, swap)';
      break;
    case 'TEN':
      if(mIds.length===0){
        const ni=(pIdx+1)%4, np=st.players[ni];
        if(np.hand.length>0){
          const rc=np.hand[Math.floor(Math.random()*np.hand.length)];
          nst={...nst,players:nst.players.map((p,i)=>i===ni?{...p,hand:p.hand.filter(c=>c.id!==rc.id)}:p),
               firePit:[...nst.firePit,rc]};
          msgs.push(`🃏 Discarded ${np.name}'s ${rc.name}!`);
        } else msgs.push(`${np.name} has no cards`);
      } else if(mIds.length===1) mv(mIds[0],10);
      else err='Select 0 marbles (discard) or 1 marble (move 10)';
      break;
    case 'QUEEN':
      if(mIds.length===0){
        const others=[0,1,2,3].filter(i=>i!==pIdx);
        const ri=others[Math.floor(Math.random()*others.length)];
        const tp=nst.players[ri];
        if(tp.hand.length>0){
          const rc=tp.hand[Math.floor(Math.random()*tp.hand.length)];
          nst={...nst,players:nst.players.map((p,i)=>i===ri?{...p,hand:p.hand.filter(c=>c.id!==rc.id)}:p),
               firePit:[...nst.firePit,rc]};
          msgs.push(`🃏 Discarded ${tp.name}'s ${rc.name}!`);
        } else msgs.push('Target has no cards');
      } else if(mIds.length===1) mv(mIds[0],12);
      else err='Select 0 marbles (discard) or 1 marble (move 12)';
      break;
    case 'BURNER':{
      if(!mIds.length){err='Select an enemy marble to burn';break;}
      const bm=nst.marbles[mIds[0]];
      if(bm.color===pc){err='Burner only targets enemy marbles';break;}
      const bloc=findLoc(nst,mIds[0]);
      if(!bloc||bloc.loc!=='track'){err='Can only burn marbles on track';break;}
      if(nst.track[bloc.pos].type==='BASE'&&BASE_POS[bm.color]===bloc.pos){err='Cannot burn marble safe on its own base';break;}
      nst=sendHome(nst,mIds[0]);
      msgs.push(`🔥 ${CNAME[pc]} burned ${CNAME[bm.color]}'s marble!`);
      break;
    }
    case 'SAVER':{
      if(!mIds.length){err='Select your marble to save';break;}
      const sm=nst.marbles[mIds[0]];
      if(sm.color!==pc){err='Saver only saves your own marble';break;}
      const sloc=findLoc(nst,mIds[0]);
      if(!sloc||sloc.loc!=='track'){err='Marble must be on track to save';break;}
      const empty=nst.safeZones[pc].map((m,i)=>m===null?i:-1).filter(i=>i>=0);
      if(!empty.length){err='Safe zone is full!';break;}
      const slot=empty[Math.floor(Math.random()*empty.length)];
      const nt=nst.track.map((c,i)=>i===sloc.pos?{...c,marble:null}:c);
      const ns2={...nst.safeZones,[pc]:nst.safeZones[pc].map((m,i)=>i===slot?mIds[0]:m)};
      nst={...nst,track:nt,safeZones:ns2};
      msgs.push(`💎 ${CNAME[pc]} marble saved to safe zone slot ${slot+1}!`);
      break;
    }
    default:
      if(!mIds.length){err='Select a marble';break;}
      mv(mIds[0],card.rank);
  }

  if(err) return {st,err,msgs:[]};
  return {st:nst,err:null,msgs};
}

function checkWin(st){
  for(const c of COLORS) if(st.safeZones[c].every(m=>m!==null)) return c;
  return null;
}

function doEndTurn(st,pIdx,card){
  const newP=st.players.map((p,i)=>i===pIdx?{...p,hand:p.hand.filter(c=>c.id!==card.id)}:p);
  const newFP=[...st.firePit,card];
  const nextIdx=(pIdx+1)%4;
  let nst={...st,players:newP,firePit:newFP,currentPlayerIdx:nextIdx};
  if(nextIdx===0){
    if(nst.turn<3) nst={...nst,turn:nst.turn+1};
    else{
      nst={...nst,turn:0};
      let pool=[...nst.deck],fp=[...nst.firePit];
      const newPlayers=[...nst.players];
      for(let i=0;i<4;i++){
        if(pool.length<4){pool=shuffle([...pool,...fp]);fp=[];}
        newPlayers[i]={...newPlayers[i],hand:pool.splice(0,4)};
      }
      nst={...nst,players:newPlayers,deck:pool,firePit:fp};
    }
  }
  return nst;
}

// CPU AI
function cpuDecide(st,pIdx){
  const player=st.players[pIdx];
  const pc=player.color;
  const actionable=[];
  for(let i=0;i<100;i++) if(st.track[i].marble!==null) actionable.push(st.track[i].marble);
  for(const c of COLORS) for(const m of st.safeZones[c]) if(m!==null) actionable.push(m);

  for(const card of shuffle([...player.hand])){
    for(const cnt of shuffle([0,1,2])){
      if(cnt===0){
        const {err,st:ns}=execCard(st,card,[],st.splitDistance||3,pIdx);
        if(!err) return {card,mIds:[],newSt:ns};
      } else if(cnt===1){
        for(const mId of shuffle([...actionable])){
          const mb=st.marbles[mId];
          if(card.type==='BURNER'&&mb.color===pc) continue;
          if(card.type!=='FIVE'&&card.type!=='BURNER'&&mb.color!==pc) continue;
          const {err,st:ns}=execCard(st,card,[mId],st.splitDistance||3,pIdx);
          if(!err) return {card,mIds:[mId],newSt:ns};
        }
      } else {
        if(card.type!=='SEVEN'&&card.type!=='JACK') continue;
        const ownM=actionable.filter(m=>st.marbles[m].color===pc);
        const enemyM=actionable.filter(m=>st.marbles[m].color!==pc);
        if(card.type==='SEVEN'){
          for(const m1 of shuffle(ownM)) for(const m2 of shuffle(ownM)){
            if(m1===m2) continue;
            const {err,st:ns}=execCard(st,card,[m1,m2],3,pIdx);
            if(!err) return {card,mIds:[m1,m2],newSt:ns};
          }
        } else if(card.type==='JACK'){
          for(const om of shuffle(ownM)) for(const em of shuffle(enemyM)){
            const {err,st:ns}=execCard(st,card,[om,em],3,pIdx);
            if(!err) return {card,mIds:[om,em],newSt:ns};
          }
        }
      }
    }
  }
  return null;
}

// ===================== CARD VIEW =====================
function CardView({card,selected,onClick,disabled}){
  const redSuits=new Set(['♦','♥']);
  const suitColor=redSuits.has(card.suitSym)?'#dc2626':'#1e293b';
  const typeColors={ACE:'#7c3aed',FOUR:'#dc2626',FIVE:'#b45309',SEVEN:'#0891b2',
    JACK:'#059669',QUEEN:'#db2777',KING:'#7c2d12',TEN:'#0891b2',BURNER:'#dc2626',SAVER:'#16a34a'};
  const tc=typeColors[card.type]||'#1e293b';
  return(
    <div onClick={disabled?undefined:onClick}
      style={{width:58,height:86,background:'#fffbeb',border:`2px solid ${selected?'#7c3aed':'#d1d5db'}`,
        borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',
        justifyContent:'space-between',padding:'3px 4px',cursor:disabled?'default':'pointer',
        transform:selected?'translateY(-8px)':'none',
        boxShadow:selected?'0 8px 20px rgba(124,58,237,0.4)':'0 2px 6px rgba(0,0,0,0.12)',
        transition:'all 0.15s ease',opacity:disabled?0.5:1,userSelect:'none',flexShrink:0}}>
      <span style={{fontSize:11,fontWeight:'bold',color:suitColor,alignSelf:'flex-start'}}>{card.suitSym}</span>
      <span style={{fontSize:11,fontWeight:900,color:tc,textAlign:'center',lineHeight:1.1}}>{card.shortName}</span>
      <span style={{fontSize:11,fontWeight:'bold',color:suitColor,alignSelf:'flex-end',transform:'rotate(180deg)'}}>{card.suitSym}</span>
    </div>
  );
}

// ===================== BOARD SVG =====================
function Board({gs,selMIds,clickable,onMarbleClick}){
  const SZ=580;
  const TRAP_COLOR='#f97316', BASE_COLOR='#fbbf24', ENTRY_COLOR='#60a5fa', NORMAL_COLOR='#d4edda';

  return(
    <svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`} style={{borderRadius:12,display:'block'}}>
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1a6b40"/>
          <stop offset="100%" stopColor="#0d3d22"/>
        </radialGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.4"/></filter>
      </defs>

      {/* Background */}
      <rect width={SZ} height={SZ} rx={12} fill="url(#bg)"/>
      <rect x={2} y={2} width={SZ-4} height={SZ-4} rx={10} fill="none" stroke="#2d9b5e" strokeWidth={1.5}/>

      {/* Inner board */}
      <rect x={M+CS} y={M+CS} width={23*CS} height={23*CS} rx={8} fill="#166534" opacity={0.5}/>

      {/* Home zone backgrounds */}
      {COLORS.map(c=>{
        const pts=[0,1,2,3].map(i=>homeXY(c,i));
        const minX=Math.min(...pts.map(p=>p.x))-16, minY=Math.min(...pts.map(p=>p.y))-16;
        return <rect key={c} x={minX} y={minY} width={78} height={78} rx={10}
          fill={CHX[c]} opacity={0.15} stroke={CHX[c]} strokeWidth={1.5}/>;
      })}

      {/* Fire pit center */}
      <circle cx={290} cy={290} r={38} fill="#7c2d12" stroke="#dc2626" strokeWidth={2}/>
      <text x={290} y={284} textAnchor="middle" fill="#fca5a5" fontSize={10} fontWeight="bold">🔥 FIRE</text>
      <text x={290} y={296} textAnchor="middle" fill="#fca5a5" fontSize={10} fontWeight="bold">PIT</text>
      <text x={290} y={309} textAnchor="middle" fill="#fed7aa" fontSize={9}>{gs.firePit.length} cards</text>

      {/* Track cells */}
      {Array.from({length:100},(_,p)=>{
        const {x,y}=cellXY(p);
        const cell=gs.track[p];
        let fill=cell.type==='BASE'?BASE_COLOR:cell.type==='ENTRY'?ENTRY_COLOR:cell.trap?TRAP_COLOR:NORMAL_COLOR;
        const hasMrb=cell.marble!==null;
        const isSel=hasMrb&&selMIds.includes(cell.marble);
        const canClick=hasMrb&&clickable.has(cell.marble);
        return(
          <g key={p} onClick={canClick?()=>onMarbleClick(cell.marble):undefined}
             style={{cursor:canClick?'pointer':'default'}}>
            <rect x={x+1} y={y+1} width={CS-2} height={CS-2} rx={3}
              fill={hasMrb?fill:fill} stroke={isSel?'#7c3aed':'rgba(0,0,0,0.2)'} strokeWidth={isSel?2:0.5}
              filter={isSel?'url(#shadow)':undefined}/>
            {p%25===0&&!hasMrb&&<text x={x+CS/2} y={y+CS/2+4} textAnchor="middle" fill="#92400e" fontSize={7} fontWeight="bold">{p}</text>}
            {cell.trap&&!hasMrb&&<text x={x+CS/2} y={y+CS/2+4} textAnchor="middle" fontSize={8}>⚠</text>}
            {hasMrb&&(()=>{
              const mc=gs.marbles[cell.marble].color;
              return <>
                <circle cx={x+CS/2} cy={y+CS/2} r={CS/2-2} fill={CHX[mc]} stroke="white" strokeWidth={1.5} filter="url(#shadow)"/>
                {isSel&&<circle cx={x+CS/2} cy={y+CS/2} r={CS/2-2} fill="none" stroke="#7c3aed" strokeWidth={2.5}/>}
                {canClick&&!isSel&&<circle cx={x+CS/2} cy={y+CS/2} r={CS/2} fill="none" stroke="white" strokeWidth={1} strokeDasharray="3,2" opacity={0.8}/>}
              </>;
            })()}
          </g>
        );
      })}

      {/* Safe zone cells */}
      {COLORS.map(c=>[0,1,2,3].map(i=>{
        const {x,y}=safeXY(c,i);
        const mId=gs.safeZones[c][i];
        const isSel=mId!==null&&selMIds.includes(mId);
        const canClick=mId!==null&&clickable.has(mId);
        return(
          <g key={`sz${c}${i}`} onClick={canClick?()=>onMarbleClick(mId):undefined}
             style={{cursor:canClick?'pointer':'default'}}>
            <rect x={x+1} y={y+1} width={CS-2} height={CS-2} rx={3}
              fill={CHX[c]} opacity={0.3} stroke={isSel?'#7c3aed':CHX[c]} strokeWidth={isSel?2:1}/>
            <text x={x+CS/2} y={y+CS/2+3} textAnchor="middle" fill={CHX[c]} fontSize={7} fontWeight="bold" opacity={0.8}>{i+1}</text>
            {mId!==null&&<>
              <circle cx={x+CS/2} cy={y+CS/2} r={CS/2-3} fill={CHX[c]} stroke="white" strokeWidth={1.5} filter="url(#shadow)"/>
              {isSel&&<circle cx={x+CS/2} cy={y+CS/2} r={CS/2-2} fill="none" stroke="#7c3aed" strokeWidth={2}/>}
              {canClick&&!isSel&&<circle cx={x+CS/2} cy={y+CS/2} r={CS/2} fill="none" stroke="white" strokeWidth={1} strokeDasharray="3,2" opacity={0.8}/>}
            </>}
          </g>
        );
      }))}

      {/* Home zone marbles */}
      {COLORS.map(c=>gs.homeZones[c].map(mId=>{
        const localIdx=mId%4;
        const {x,y}=homeXY(c,localIdx);
        return <circle key={mId} cx={x} cy={y} r={12} fill={CHX[c]} stroke="white" strokeWidth={1.5} opacity={0.75} filter="url(#shadow)"/>;
      }))}

      {/* Corner labels */}
      {[{c:'RED',lbl:'RED\n0',x:22,y:573},{c:'GREEN',lbl:'GREEN\n25',x:548,y:573},{c:'BLUE',lbl:'BLUE\n50',x:548,y:18},{c:'YELLOW',lbl:'YEL\n75',x:22,y:18}].map(({c,lbl,x,y})=>
        <text key={c} x={x} y={y} textAnchor="middle" fill={CHX[c]} fontSize={7} fontWeight="bold" opacity={0.8}>{lbl.split('\n').map((l,i)=><tspan key={i} x={x} dy={i?9:0}>{l}</tspan>)}</text>
      )}

      {/* Legend */}
      <rect x={200} y={558} width={8} height={8} rx={2} fill={BASE_COLOR}/>
      <text x={210} y={565} fill="white" fontSize={7} opacity={0.7}>Base</text>
      <rect x={230} y={558} width={8} height={8} rx={2} fill={ENTRY_COLOR}/>
      <text x={240} y={565} fill="white" fontSize={7} opacity={0.7}>Entry</text>
      <rect x={260} y={558} width={8} height={8} rx={2} fill={TRAP_COLOR}/>
      <text x={270} y={565} fill="white" fontSize={7} opacity={0.7}>Trap</text>
    </svg>
  );
}

// ===================== MAIN COMPONENT =====================
export default function JackarooGame(){
  const [gs,setGs]=useState(null);
  const [nameInput,setNameInput]=useState('');
  const [selCardId,setSelCardId]=useState(null);
  const [selMIds,setSelMIds]=useState([]);
  const [splitDist,setSplitDist]=useState(3);
  const [errMsg,setErrMsg]=useState('');
  const [thinking,setThinking]=useState(false);
  const logRef=useRef(null);

  const selCard=gs?.players[0]?.hand.find(c=>c.id===selCardId)||null;
  const isMyTurn=gs?.phase==='playing'&&gs?.players[gs.currentPlayerIdx]?.isHuman&&!thinking;

  // CPU turns
  useEffect(()=>{
    if(!gs||gs.phase!=='playing') return;
    const player=gs.players[gs.currentPlayerIdx];
    if(player.isHuman) return;
    setThinking(true);
    const t=setTimeout(()=>{
      const decision=cpuDecide(gs,gs.currentPlayerIdx);
      const newLog=[...gs.log];
      let nst;
      if(decision){
        newLog.push(`🤖 ${player.name} played ${decision.card.name}`);
        if(decision.newSt.log) {}
        nst=doEndTurn(decision.newSt,gs.currentPlayerIdx,decision.card);
      } else {
        const card=player.hand[0];
        newLog.push(`🤖 ${player.name} discarded ${card.name} (no valid move)`);
        nst=doEndTurn(gs,gs.currentPlayerIdx,card);
      }
      const winner=checkWin(nst);
      if(winner){
        newLog.push(`🏆 ${nst.players.find(p=>p.color===winner)?.name} WINS THE GAME!`);
        nst={...nst,phase:'over',winner};
      } else {
        const np=nst.players[nst.currentPlayerIdx];
        newLog.push(np.isHuman?'👤 Your turn!':` ⏳ ${np.name}'s turn...`);
      }
      setGs({...nst,log:newLog});
      setThinking(false);
    },900);
    return ()=>clearTimeout(t);
  },[gs]);

  useEffect(()=>{
    if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight;
  },[gs?.log]);

  const startGame=()=>{
    setGs(initGame(nameInput||'You'));
    setSelCardId(null);setSelMIds([]);setErrMsg('');setSplitDist(3);
  };

  const handleCardClick=(cardId)=>{
    if(!isMyTurn) return;
    setSelCardId(cardId===selCardId?null:cardId);
    setSelMIds([]);setErrMsg('');
  };

  const handleMarbleClick=(mId)=>{
    if(!isMyTurn){setErrMsg('Not your turn');return;}
    if(!selCardId){setErrMsg('Select a card first!');return;}
    if(selMIds.includes(mId)){setSelMIds(prev=>prev.filter(id=>id!==mId));return;}
    const maxM=(selCard?.type==='SEVEN'||selCard?.type==='JACK')?2:1;
    if(selMIds.length>=maxM) setSelMIds([mId]);
    else setSelMIds(prev=>[...prev,mId]);
    setErrMsg('');
  };

  const getClickable=()=>{
    if(!selCard||!gs) return new Set();
    const pc=gs.players[0].color;
    const result=new Set();
    const addIfValid=(mId,check)=>{if(check) result.add(mId);};
    for(let i=0;i<100;i++){
      const mId=gs.track[i].marble; if(mId===null) continue;
      const mc=gs.marbles[mId].color;
      if(selCard.type==='BURNER') addIfValid(mId,mc!==pc);
      else if(selCard.type==='FIVE') addIfValid(mId,true);
      else if(selCard.type==='JACK'&&selMIds.length===1) addIfValid(mId,mc!==pc);
      else addIfValid(mId,mc===pc);
    }
    // Safe zone marbles (own color for most cards)
    for(const c of COLORS){
      for(let i=0;i<4;i++){
        const mId=gs.safeZones[c][i]; if(mId===null) continue;
        const mc=gs.marbles[mId].color;
        if(selCard.type!=='BURNER'&&mc===pc) result.add(mId);
      }
    }
    return result;
  };

  const clickable=isMyTurn?getClickable():new Set();

  const handlePlay=()=>{
    if(!isMyTurn||!selCard) return;
    const {st:nst,err,msgs}=execCard(gs,selCard,selMIds,splitDist,gs.currentPlayerIdx);
    if(err){setErrMsg(`❌ ${err}`);return;}
    const newLog=[...gs.log,`▶ You played ${selCard.name}`,...msgs.map(m=>`  ${m}`)];
    let finalSt=doEndTurn(nst,gs.currentPlayerIdx,selCard);
    const winner=checkWin(finalSt);
    if(winner){
      newLog.push(`🏆 ${finalSt.players.find(p=>p.color===winner)?.name} WINS!`);
      finalSt={...finalSt,phase:'over',winner};
    } else {
      const np=finalSt.players[finalSt.currentPlayerIdx];
      newLog.push(np.isHuman?'👤 Your turn!':` ⏳ ${np.name}'s turn...`);
    }
    setGs({...finalSt,log:newLog});
    setSelCardId(null);setSelMIds([]);setErrMsg('');
  };

  const handleDiscard=()=>{
    if(!isMyTurn) return;
    const player=gs.players[gs.currentPlayerIdx];
    if(!player.hand.length) return;
    const card=selCard||player.hand[0];
    const newLog=[...gs.log,`⏭ You discarded ${card.name}`];
    let nst=doEndTurn(gs,gs.currentPlayerIdx,card);
    const np=nst.players[nst.currentPlayerIdx];
    newLog.push(np.isHuman?'👤 Your turn!':` ⏳ ${np.name}'s turn...`);
    setGs({...nst,log:newLog});
    setSelCardId(null);setSelMIds([]);setErrMsg('');
  };

  // Home screen
  if(!gs){
    return(
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
        background:'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)'}}>
        <div style={{textAlign:'center',padding:'40px',borderRadius:'20px',maxWidth:'400px',width:'100%',
          background:'rgba(255,255,255,0.05)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{fontSize:72,marginBottom:8}}>🃏</div>
          <h1 style={{fontSize:40,fontWeight:900,color:'#fbbf24',margin:'0 0 6px',letterSpacing:'-2px'}}>JACKAROO</h1>
          <p style={{color:'#86efac',marginBottom:28,fontSize:14}}>The classic marble racing card game</p>
          <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
            placeholder="Your name (optional)"
            onKeyDown={e=>e.key==='Enter'&&startGame()}
            style={{width:'100%',boxSizing:'border-box',padding:'12px 16px',borderRadius:10,fontSize:16,
              background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.3)',color:'white',
              outline:'none',marginBottom:16,textAlign:'center'}}/>
          <button onClick={startGame}
            style={{width:'100%',padding:'14px',borderRadius:12,fontSize:17,fontWeight:'bold',cursor:'pointer',
              background:'linear-gradient(135deg,#fbbf24,#f59e0b)',color:'#1c1917',border:'none',
              boxShadow:'0 4px 16px rgba(251,191,36,0.4)',transition:'transform 0.15s'}}
            onMouseOver={e=>e.target.style.transform='scale(1.02)'}
            onMouseOut={e=>e.target.style.transform='scale(1)'}>
            🎮 Start Game
          </button>
          <div style={{marginTop:24,textAlign:'left',fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:2}}>
            <strong style={{color:'rgba(255,255,255,0.8)'}}>How to play:</strong><br/>
            🔴 You are Red — get all 4 marbles to safe zone to win<br/>
            🟡 Base cells — marble starting point<br/>
            🔵 Entry cells — gateway to safe zone<br/>
            🟠 Trap cells — destroys marbles that land here<br/>
            Select a card → select marble(s) → Play!
          </div>
        </div>
      </div>
    );
  }

  const humanPlayer=gs.players[0];
  const curPlayer=gs.players[gs.currentPlayerIdx];

  return(
    <div style={{display:'flex',flexDirection:'column',minHeight:'100vh',background:'#0f172a',color:'white',fontFamily:'system-ui,sans-serif'}}>

      {/* Player info bar */}
      <div style={{display:'flex',gap:8,padding:'8px 12px',background:'rgba(0,0,0,0.3)',
        borderBottom:'1px solid rgba(255,255,255,0.08)',overflowX:'auto',flexShrink:0}}>
        {gs.players.map((p,i)=>{
          const isCur=i===gs.currentPlayerIdx;
          const safe=gs.safeZones[p.color].filter(m=>m!==null).length;
          const onTrack=gs.track.filter(c=>c.marble!==null&&gs.marbles[c.marble].color===p.color).length;
          const atHome=gs.homeZones[p.color].length;
          return(
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderRadius:10,flexShrink:0,
              background:isCur?`${CHX[p.color]}20`:'transparent',
              border:`1px solid ${isCur?CHX[p.color]:'rgba(255,255,255,0.1)'}`,
              transition:'all 0.2s'}}>
              <div style={{width:12,height:12,borderRadius:'50%',background:CHX[p.color],boxShadow:`0 0 6px ${CHX[p.color]}`}}/>
              <div>
                <div style={{fontSize:12,fontWeight:'bold',color:isCur?CHX[p.color]:'white'}}>
                  {p.isHuman?'👤':''}{p.name}{isCur?' ▶':''}
                </div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.45)'}}>
                  🏠{atHome} 🛤️{onTrack} ⭐{safe}/4
                </div>
              </div>
            </div>
          );
        })}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:12,fontSize:11,
          color:'rgba(255,255,255,0.4)',paddingRight:4,flexShrink:0}}>
          <span>📦{gs.deck.length}</span>
          <span>🔥{gs.firePit.length}</span>
          <span>Turn {gs.turn+1}/4</span>
        </div>
      </div>

      {/* Main area */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* Board */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:12,flexShrink:0}}>
          <Board gs={gs} selMIds={selMIds} clickable={clickable} onMarbleClick={handleMarbleClick}/>
        </div>

        {/* Control panel */}
        <div style={{display:'flex',flexDirection:'column',flex:1,padding:12,gap:10,overflowY:'auto',minWidth:0,maxWidth:360}}>

          {/* Status */}
          <div style={{borderRadius:12,padding:12,background:'rgba(255,255,255,0.05)',
            border:'1px solid rgba(255,255,255,0.1)'}}>
            {gs.phase==='over'?(
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:40}}>🏆</div>
                <div style={{fontSize:20,fontWeight:'bold',color:'#fbbf24',margin:'6px 0'}}>
                  {gs.players.find(p=>p.color===gs.winner)?.name} Wins!
                </div>
                <button onClick={()=>{setGs(null);setSelCardId(null);setSelMIds([]);}}
                  style={{padding:'10px 24px',borderRadius:10,fontWeight:'bold',cursor:'pointer',
                    background:'#fbbf24',color:'#1c1917',border:'none',fontSize:14,marginTop:4}}>
                  Play Again
                </button>
              </div>
            ):(
              <>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:CHX[curPlayer.color],
                    boxShadow:`0 0 8px ${CHX[curPlayer.color]}`}}/>
                  <span style={{fontWeight:'bold',color:CHX[curPlayer.color],fontSize:14}}>
                    {curPlayer.isHuman?'👤 Your Turn!'
                      :thinking?`🤖 ${curPlayer.name} is thinking…`
                      :`⏳ ${curPlayer.name}'s turn`}
                  </span>
                </div>
                {isMyTurn&&selCard&&(
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginBottom:4}}>
                    <strong style={{color:'#fbbf24'}}>{selCard.name}</strong>
                    {selMIds.length>0&&` · ${selMIds.length} marble${selMIds.length>1?'s':''} selected`}
                  </div>
                )}
                {errMsg&&<div style={{fontSize:11,color:'#fca5a5',marginTop:4}}>{errMsg}</div>}
              </>
            )}
          </div>

          {/* Card hint */}
          {isMyTurn&&selCard&&(
            <div style={{borderRadius:10,padding:'8px 10px',background:'rgba(251,191,36,0.08)',
              border:'1px solid rgba(251,191,36,0.2)',fontSize:11,color:'rgba(255,255,255,0.7)'}}>
              <strong style={{color:'#fbbf24'}}>{selCard.shortName}:</strong> {
                selCard.type==='ACE'?'0 marbles = Field marble from home | 1 marble = Move 1 forward':
                selCard.type==='KING'?'0 marbles = Field marble | 1 marble = Move 13 (destroys everything in path)':
                selCard.type==='FOUR'?'Select YOUR marble → move 4 backward':
                selCard.type==='FIVE'?'Select ANY marble (any color) → move 5 forward':
                selCard.type==='SEVEN'?'1 marble = move 7 | 2 marbles = split total of 7 (use slider)':
                selCard.type==='JACK'?'1 marble = move 11 | 2 marbles (own + enemy) = swap positions':
                selCard.type==='TEN'?'0 marbles = discard next player\'s card | 1 marble = move 10':
                selCard.type==='QUEEN'?'0 marbles = discard random enemy card | 1 marble = move 12':
                selCard.type==='BURNER'?'Select ENEMY marble on track to destroy and send home':
                selCard.type==='SAVER'?'Select YOUR marble on track → instantly sent to random safe zone slot':
                `Select YOUR marble → move ${selCard.rank} forward`
              }
            </div>
          )}

          {/* Card hand */}
          {gs.phase==='playing'&&(
            <div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:6}}>
                Your Hand ({humanPlayer.hand.length} cards)
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {humanPlayer.hand.map(card=>(
                  <CardView key={card.id} card={card} selected={card.id===selCardId}
                    onClick={()=>handleCardClick(card.id)} disabled={!isMyTurn}/>
                ))}
                {!humanPlayer.hand.length&&<span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>No cards in hand</span>}
              </div>
            </div>
          )}

          {/* Seven split slider */}
          {isMyTurn&&selCard?.type==='SEVEN'&&(
            <div style={{background:'rgba(255,255,255,0.05)',borderRadius:10,padding:10}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginBottom:6}}>
                Split Distance (for 2-marble play):
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <input type="range" min={1} max={6} value={splitDist}
                  onChange={e=>setSplitDist(+e.target.value)}
                  style={{flex:1,accentColor:'#fbbf24'}}/>
                <span style={{color:'#fbbf24',fontSize:13,fontWeight:'bold',minWidth:40}}>
                  {splitDist} / {7-splitDist}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {isMyTurn&&gs.phase==='playing'&&(
            <div style={{display:'flex',gap:8}}>
              <button onClick={handlePlay} disabled={!selCard}
                style={{flex:1,padding:'10px 0',borderRadius:10,fontWeight:'bold',fontSize:13,cursor:selCard?'pointer':'not-allowed',
                  background:selCard?'linear-gradient(135deg,#22c55e,#16a34a)':'rgba(255,255,255,0.1)',
                  color:'white',border:'none',opacity:selCard?1:0.5,transition:'all 0.15s'}}>
                ▶ Play Card
              </button>
              <button onClick={handleDiscard}
                style={{flex:1,padding:'10px 0',borderRadius:10,fontWeight:'bold',fontSize:13,cursor:'pointer',
                  background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.7)',
                  border:'1px solid rgba(255,255,255,0.15)'}}>
                ⏭ Discard
              </button>
            </div>
          )}

          {/* Selected marbles info */}
          {selMIds.length>0&&gs&&(
            <div style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.3)',
              borderRadius:10,padding:'8px 10px',fontSize:11}}>
              <strong style={{color:'#c4b5fd'}}>Selected:</strong>
              {selMIds.map(mId=>{
                const loc=findLoc(gs,mId);
                const mc=gs.marbles[mId].color;
                const locLabel=loc?.loc==='track'?`pos ${loc.pos}`:loc?.loc==='safe'?'safe zone':'home';
                return <span key={mId} style={{marginLeft:6,color:CHX[mc]}}>
                  {CNAME[mc]}@{locLabel}
                </span>;
              })}
            </div>
          )}

          {/* Game log */}
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:4}}>Game Log</div>
            <div ref={logRef} style={{height:200,overflowY:'auto',background:'rgba(0,0,0,0.25)',
              borderRadius:10,padding:'8px 10px',fontSize:11,color:'rgba(255,255,255,0.65)',lineHeight:1.7}}>
              {gs.log.map((msg,i)=><div key={i}>{msg}</div>)}
            </div>
          </div>

          {/* Card guide */}
          <details style={{borderRadius:10,overflow:'hidden'}}>
            <summary style={{padding:'8px 10px',background:'rgba(255,255,255,0.05)',cursor:'pointer',
              fontSize:11,color:'rgba(255,255,255,0.5)'}}>📖 Card Reference</summary>
            <div style={{background:'rgba(0,0,0,0.2)',padding:'8px 10px',fontSize:10,
              color:'rgba(255,255,255,0.5)',lineHeight:1.9}}>
              <strong style={{color:'rgba(255,255,255,0.7)'}}>ACE/KING:</strong> Field OR move forward<br/>
              <strong style={{color:'rgba(255,255,255,0.7)'}}>FOUR:</strong> Move 4 backward<br/>
              <strong style={{color:'rgba(255,255,255,0.7)'}}>FIVE:</strong> Move any marble 5 (even enemy!)<br/>
              <strong style={{color:'rgba(255,255,255,0.7)'}}>SEVEN:</strong> Move 7 or split between 2 marbles<br/>
              <strong style={{color:'rgba(255,255,255,0.7)'}}>JACK:</strong> Move 11 or swap with enemy<br/>
              <strong style={{color:'rgba(255,255,255,0.7)'}}>TEN:</strong> Move 10 or discard next player's card<br/>
              <strong style={{color:'rgba(255,255,255,0.7)'}}>QUEEN:</strong> Move 12 or discard random card<br/>
              <strong style={{color:'rgba(255,255,255,0.7)'}}>BURNER:</strong> Destroy enemy marble on track<br/>
              <strong style={{color:'rgba(255,255,255,0.7)'}}>SAVER:</strong> Send own marble to safe zone instantly
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

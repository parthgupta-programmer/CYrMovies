import{r as y,j as e,m as g,a as w}from"./index-CSzLEcuh.js";import{A as k,H as I,B as m}from"./api-BnY97rrw.js";function M({onRate:t,initialRating:s=0}){const[r,a]=y.useState(0),[i,x]=y.useState(s),l=n=>{x(n),t==null||t(n)};return e.jsxs("div",{style:{display:"flex",gap:"0.6rem",alignItems:"center"},children:[[1,2,3,4,5].map(n=>{const o=n<=(r||i);return e.jsx(g.button,{onMouseEnter:()=>a(n),onMouseLeave:()=>a(0),onClick:()=>l(n),whileHover:{scale:1.2},whileTap:{scale:.9},style:{width:28,height:28,borderRadius:"50%",background:o?"linear-gradient(135deg, #f97316, #fbbf24)":"transparent",border:o?"2px solid #f97316":"2px solid rgba(249,115,22,0.3)",cursor:"pointer",boxShadow:o?"0 0 14px rgba(249,115,22,0.6)":"none",transition:"all 0.15s ease"},"aria-label":`Rate ${n} star${n>1?"s":""}`},n)}),e.jsx("span",{style:{fontFamily:"Orbitron",fontSize:"0.62rem",letterSpacing:"0.1em",color:r||i?"#f97316":"rgba(255,255,255,0.3)",marginLeft:"0.25rem"},children:r||i?`${r||i} / 5`:"SELECT"})]})}function $({value:t=.9,label:s="MATCH",color:r="#f97316",delay:a=0}){return e.jsxs("div",{style:{marginBottom:"0.8rem"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.3rem"},children:[e.jsx("span",{style:{fontFamily:"Orbitron",fontSize:"0.57rem",letterSpacing:"0.15em",color:"rgba(255,255,255,0.45)",textTransform:"uppercase"},children:s}),e.jsxs(g.span,{initial:{opacity:0},animate:{opacity:1},transition:{delay:a+.5},style:{fontFamily:"Orbitron",fontSize:"0.72rem",fontWeight:700,color:r},children:[Math.round(t*100),"%"]})]}),e.jsx("div",{style:{height:3,background:"rgba(255,255,255,0.07)",borderRadius:2,overflow:"hidden"},children:e.jsx(g.div,{style:{height:"100%",background:`linear-gradient(90deg, ${r}, #fbbf24)`,borderRadius:2,boxShadow:`0 0 10px ${r}60`},initial:{width:0},animate:{width:`${t*100}%`},transition:{duration:1.4,ease:"easeOut",delay:a}})})]})}const z={Action:["#f97316","#dc2626"],"Sci-Fi":["#06b6d4","#3b82f6"],Adventure:["#10b981","#06b6d4"],Drama:["#8b5cf6","#ec4899"],Thriller:["#f59e0b","#ef4444"],Comedy:["#84cc16","#10b981"],Horror:["#dc2626","#18181b"],Romance:["#f43f5e","#a855f7"],Animation:["#fbbf24","#f97316"],Crime:["#64748b","#0f172a"],Fantasy:["#d946ef","#8b5cf6"],Mystery:["#6366f1","#4f46e5"],Music:["#ec4899","#f59e0b"],War:["#6b7280","#374151"],Western:["#d97706","#92400e"]};function b(t=""){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function j(t="Movie",s=""){const r=(s||"").split("|").map(d=>d.trim()).filter(Boolean),a=r[0]||"Sci-Fi",[i,x]=z[a]||["#f97316","#7c3aed"],l=(t||"Unknown Title").replace(/\s*\(\d{4}\)$/,"").trim(),n=(t||"").match(/\((\d{4})\)$/),o=n?n[1]:"",f=l.split(" ");let h=l,p="";if(l.length>18&&f.length>1){const d=Math.ceil(f.length/2);h=f.slice(0,d).join(" "),p=f.slice(d).join(" ")}const u=`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${i}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${x}" stop-opacity="0.95"/>
      </linearGradient>
      <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0a0a0f" stop-opacity="0.3"/>
        <stop offset="50%" stop-color="#0a0a0f" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#0a0a0f" stop-opacity="0.98"/>
      </linearGradient>
    </defs>
    
    <!-- Base background -->
    <rect width="300" height="450" fill="#0a0a0f"/>
    <rect width="300" height="450" fill="url(#bg)"/>
    
    <!-- Grid overlay pattern -->
    <g stroke="rgba(255,255,255,0.06)" stroke-width="1">
      <line x1="0" y1="90" x2="300" y2="90"/>
      <line x1="0" y1="180" x2="300" y2="180"/>
      <line x1="0" y1="270" x2="300" y2="270"/>
      <line x1="0" y1="360" x2="300" y2="360"/>
      <line x1="100" y1="0" x2="100" y2="450"/>
      <line x1="200" y1="0" x2="200" y2="450"/>
    </g>

    <!-- Dark gradient shadow -->
    <rect width="300" height="450" fill="url(#overlay)"/>

    <!-- Corner Accents -->
    <path d="M15,25 L15,15 L25,15" stroke="${i}" stroke-width="2" fill="none"/>
    <path d="M275,25 L275,15 L265,15" stroke="${i}" stroke-width="2" fill="none"/>
    <path d="M15,425 L15,435 L25,435" stroke="${i}" stroke-width="2" fill="none"/>
    <path d="M275,425 L275,435 L265,435" stroke="${i}" stroke-width="2" fill="none"/>

    <!-- Central Emblem / Icon -->
    <g transform="translate(126, 130)" fill="none" stroke="${i}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="2" width="44" height="44" rx="8" stroke="rgba(255,255,255,0.8)"/>
      <circle cx="24" cy="24" r="10" stroke="${i}"/>
      <polygon points="21,19 30,24 21,29" fill="${i}"/>
    </g>

    <!-- Year Badge -->
    ${o?`
      <rect x="110" y="210" width="80" height="22" rx="4" fill="rgba(10,10,15,0.8)" stroke="rgba(249,115,22,0.4)" stroke-width="1"/>
      <text x="150" y="225" fill="#f97316" font-family="Orbitron, sans-serif" font-size="11" font-weight="700" letter-spacing="2" text-anchor="middle">${b(o)}</text>
    `:""}

    <!-- Movie Title -->
    <text x="150" y="${p?"290":"305"}" fill="#ffffff" font-family="Space Grotesk, sans-serif" font-size="20" font-weight="700" text-anchor="middle">
      ${b(h)}
    </text>
    ${p?`
      <text x="150" y="320" fill="#ffffff" font-family="Space Grotesk, sans-serif" font-size="18" font-weight="700" text-anchor="middle">
        ${b(p)}
      </text>
    `:""}

    <!-- Genres line -->
    <text x="150" y="385" fill="rgba(249,115,22,0.85)" font-family="Orbitron, sans-serif" font-size="10" font-weight="600" letter-spacing="2" text-anchor="middle">
      ${b((r.slice(0,3).join(" • ")||"CINEMA").toUpperCase())}
    </text>
  </svg>`;return`data:image/svg+xml;utf8,${encodeURIComponent(u)}`}function A(t,s="lg"){return t?t.poster&&typeof t.poster=="string"&&t.poster.startsWith("http")?t.poster:t.poster_url&&typeof t.poster_url=="string"&&t.poster_url.startsWith("http")?t.poster_url:t.imdbId&&String(t.imdbId).trim()!==""&&String(t.imdbId)!=="0"?`https://images.metahub.space/poster/medium/tt${String(t.imdbId).replace(/^tt/,"").padStart(7,"0")}/img`:j(t==null?void 0:t.title,t==null?void 0:t.genres):j("Movie","")}function F({movie:t,onClose:s,onWatchlist:r,onRate:a}){const[i,x]=y.useState(!1),[l,n]=y.useState((t==null?void 0:t.user_rating)||null),[o,f]=y.useState(!!(t!=null&&t.user_rating)),h=w();if(!t)return null;const p=i?j(t==null?void 0:t.title,t==null?void 0:t.genres):A(t),u=((t==null?void 0:t.genres)||"").split("|"),d=(t==null?void 0:t.score)??null,S=c=>{n(c),f(!0),a==null||a(t.movieId,c)};return e.jsxs(k,{children:[e.jsx(g.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:s,style:{position:"fixed",inset:0,zIndex:2e3,background:"rgba(3,3,3,0.88)",backdropFilter:"blur(12px)"}},"backdrop"),e.jsx(g.div,{initial:{opacity:0,scale:.94,y:30},animate:{opacity:1,scale:1,y:0},exit:{opacity:0,scale:.94,y:30},transition:{type:"spring",stiffness:280,damping:28},style:{position:"fixed",inset:0,zIndex:2001,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem",pointerEvents:"none"},children:e.jsxs("div",{onClick:c=>c.stopPropagation(),style:{pointerEvents:"auto",width:"100%",maxWidth:900,maxHeight:"90vh",overflowY:"auto",background:"rgba(10,10,15,0.97)",border:"1px solid rgba(249,115,22,0.22)",borderRadius:4,position:"relative"},children:[e.jsx("button",{onClick:s,style:{position:"absolute",top:16,right:16,zIndex:10,background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.3)",color:"#f97316",width:32,height:32,borderRadius:3,cursor:"pointer",fontFamily:"Orbitron",fontSize:"0.8rem",display:"flex",alignItems:"center",justifyContent:"center"},children:"✕"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"280px 1fr",gap:0},children:[e.jsxs("div",{style:{position:"relative",overflow:"hidden"},children:[e.jsx("img",{src:p,alt:t.title,onError:()=>x(!0),style:{width:"100%",height:"100%",objectFit:"cover",display:"block",minHeight:420}}),e.jsx("div",{style:{position:"absolute",inset:0,background:"linear-gradient(to right, transparent 70%, rgba(10,10,15,1) 100%)"}})]}),e.jsxs("div",{style:{padding:"2rem 2rem 2rem 1.5rem"},children:[e.jsx("div",{style:{fontFamily:"Orbitron",fontSize:"0.6rem",letterSpacing:"0.25em",color:"#f97316",marginBottom:"0.5rem",textTransform:"uppercase"},children:"CYRMOVIE / FILM ANALYSIS"}),e.jsx("h2",{style:{fontSize:"1.8rem",fontWeight:700,lineHeight:1.2,color:"#f1f5f9",marginBottom:"0.5rem"},children:t.title}),e.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap"},children:[t.year&&e.jsx("span",{style:{fontFamily:"Orbitron",fontSize:"0.7rem",color:"rgba(255,255,255,0.4)"},children:t.year}),t.rating&&e.jsxs("span",{style:{color:"#fbbf24",fontSize:"0.85rem"},children:["★ ",t.rating]}),u.slice(0,3).map(c=>e.jsx("span",{style:{fontFamily:"Orbitron",fontSize:"0.58rem",letterSpacing:"0.08em",color:"rgba(249,115,22,0.75)",border:"1px solid rgba(249,115,22,0.25)",padding:"2px 8px"},children:c},c))]}),e.jsx("p",{style:{fontSize:"0.88rem",color:"rgba(255,255,255,0.6)",lineHeight:1.7,marginBottom:"1.5rem"},children:t.description||"No description available."}),d!==null&&e.jsx("div",{style:{marginBottom:"1.5rem"},children:e.jsxs(I,{label:"MATCH ANALYSIS",animate:!1,style:{padding:"1rem 1.2rem"},children:[e.jsx($,{value:d,label:"CINEMA MATCH",delay:.2}),t.explanation&&e.jsxs("p",{style:{fontSize:"0.78rem",color:"rgba(255,255,255,0.5)",lineHeight:1.6,marginTop:"0.6rem",fontStyle:"italic"},children:['"',t.explanation,'"']})]})}),e.jsxs("div",{style:{marginBottom:"1.5rem"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.6rem"},children:[e.jsx("div",{style:{fontFamily:"Orbitron",fontSize:"0.6rem",letterSpacing:"0.2em",color:"rgba(255,255,255,0.5)"},children:l?`YOUR RATING: ★ ${Number(l).toFixed(1)}`:"RATE THIS FILM"}),o&&e.jsx(g.span,{initial:{opacity:0,x:10},animate:{opacity:1,x:0},style:{fontFamily:"Orbitron",fontSize:"0.58rem",letterSpacing:"0.15em",color:"#f97316",fontWeight:700},children:"✓ SAVED TO PROFILE"})]}),e.jsx(M,{onRate:S,initialRating:l?Math.round(Number(l)):0})]}),e.jsxs("div",{style:{display:"flex",gap:"0.75rem",flexWrap:"wrap"},children:[e.jsx(m,{size:"sm",onClick:()=>r==null?void 0:r(t),children:"+ WATCHLIST"}),e.jsx(m,{size:"sm",variant:"secondary",onClick:()=>{s==null||s(),h(`/similar/${t.movieId}`,{state:{movie:t}})},children:"SIMILAR FILMS"}),e.jsx(m,{size:"sm",variant:"secondary",onClick:s,children:"CLOSE"})]})]})]})]})},"panel")]})}export{F as M,A as a,j as g};

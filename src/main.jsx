import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {motion,AnimatePresence,useScroll,useSpring,useTransform} from 'framer-motion';
import {ArrowDown,ArrowRight,Check,ExternalLink,Leaf,MapPin,Menu,Move3D,Play,Rotate3D,Send,X,ZoomIn,Building2,TreePine,Route,Plane,Flag} from 'lucide-react';
import './styles.css';

const A='/images/';
const MAPS='https://www.google.com/maps';
const fallback={
 eyebrow:'YAMUNA EXPRESSWAY & JEWAR AIRPORT TRIANGLE · GREATER NOIDA',
 headline:'Nature Around You. Peace Within You.',
 subcopy:'A private farmhouse lifestyle address near the Yamuna Expressway — built around land, landscape, leisure and long-horizon ownership.',
 minPlot:'1 Bigha*',price:'₹8,000*',planned:'55 Acres*'
};
const gallery=[['lifestyle-01.jpeg','The private green'],['lifestyle-02.jpeg','Landscaped open space'],['lifestyle-03.jpeg','Farm life, outdoors'],['lifestyle-04.jpeg','A sense of place'],['lifestyle-05.jpeg','Nature-led living']];

const destinations=[
 {name:'Buddha International Circuit',meta:'~5.5 km geographic',icon:Flag,href:'https://www.google.com/maps/dir/Buddha+International+Circuit,+Yamuna+Expy,+Jaypee+Sports+City,+Sector+25,+Greater+Noida,+Uttar+Pradesh+203201/Veda+farms,+9GR3%2BMVW,+Yamuna+Expy,+Sikanderpur,+Uttar+Pradesh+201312/',note:'In the immediate project vicinity.'},
 {name:'Stellar Business Park · TechZone 03',meta:'3.4 km · ~8 min',icon:Building2,href:'https://www.google.com/maps/dir/Veda+farms,+9GR3%2BMVW,+Yamuna+Expy,+Sikanderpur,+Uttar+Pradesh+201312/Stellar+Business+Park+-+TechZone:03,+Greater+Noida,+Plot+No:+3,+Tech+Zone,+Greater+Noida,+Uttar+Pradesh+201312/',note:'Fastest route shown by Google Maps in supplied screenshot.'},
 {name:'Noida International Airport, Jewar',meta:'33.3 km · ~43 min',icon:Plane,href:'https://www.google.com/maps/dir/Noida+International+Airport,+Jewar,+Uttar+Pradesh+201355/Veda+farms,+9GR3%2BMVW,+Yamuna+Expy,+Sikanderpur,+Uttar+Pradesh+201312/',note:'Via Yamuna Expressway; fastest route shown in supplied screenshot.'},
 {name:'DLF Mall of India',meta:'~26.5 km geographic',icon:MapPin,href:'https://www.google.com/maps/dir/DLF+Mall+of+India,+Noida,+Sector+18,+Noida,+Uttar+Pradesh+201301/Veda+farms,+9GR3%2BMVW,+Yamuna+Expy,+Sikanderpur,+Uttar+Pradesh+201312/',note:'Geographic distance from the supplied coordinates; use Maps for live driving time.'}
];

function Site3D(){
 return <div className="site3d three-masterplan-host">
   <iframe
     className="three-masterplan-frame"
     src="/masterplan3d/index.html"
     title="Veda Vastu Farms interactive 3D masterplan"
     loading="eager"
     allow="fullscreen"
   />
 </div>;
}

function App(){
 const [content,setContent]=useState(fallback),[menu,setMenu]=useState(false),[selected,setSelected]=useState(null),[lightbox,setLightbox]=useState(null),[submitted,setSubmitted]=useState(false),[submitting,setSubmitting]=useState(false),[submitError,setSubmitError]=useState(''),[showVideo,setShowVideo]=useState(false),[mapView,setMapView]=useState('satellite');
 const {scrollYProgress}=useScroll();const smooth=useSpring(scrollYProgress,{stiffness:80,damping:24});const heroY=useTransform(smooth,[0,.3],[0,110]);const heroScale=useTransform(smooth,[0,.25],[1.06,1]);
 useEffect(()=>{const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_ANON_KEY;if(!url||!key)return;fetch(`${url}/rest/v1/site_content?key=eq.home&select=value`,{headers:{apikey:key,Authorization:`Bearer ${key}`}}).then(r=>r.json()).then(x=>x?.[0]?.value&&setContent({...fallback,...x[0].value})).catch(()=>{});},[]);
 useEffect(()=>{const ld={'@context':'https://schema.org','@type':'WebSite','name':'Veda Farms','url':'https://vedafarms.in/','description':'Private farmhouse lifestyle and plotted green spaces in Greater Noida near the Yamuna Expressway.','inLanguage':'en-IN'};const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify(ld);document.head.appendChild(s);return()=>s.remove()},[]);
 const nav=id=>{document.getElementById(id)?.scrollIntoView({behavior:'smooth'});setMenu(false)};
 async function submit(e){
  e.preventDefault();
  if(submitting)return;
  const form=e.currentTarget;
  const f=new FormData(form);
  const body=Object.fromEntries(f.entries());
  if(body.company)return; // honeypot: silently ignore bots
  const now=new Date();
  const leadId=`VF-${now.toISOString().slice(0,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  const params=new URLSearchParams(location.search);
  Object.assign(body,{
    leadId,
    source:'veda-farms-website',
    page:location.pathname,
    landingUrl:location.href,
    referrer:document.referrer||'direct',
    clientTimestamp:now.toISOString(),
    device:/Mobi|Android/i.test(navigator.userAgent)?'mobile':'desktop',
    utmSource:params.get('utm_source')||'',
    utmMedium:params.get('utm_medium')||'',
    utmCampaign:params.get('utm_campaign')||'',
    utmContent:params.get('utm_content')||'',
    utmTerm:params.get('utm_term')||''
  });
  const hook=import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL;
  if(!hook){setSubmitError('Lead endpoint is not configured yet. Add VITE_GOOGLE_SHEETS_WEBHOOK_URL before launch.');return;}
  setSubmitting(true);setSubmitError('');
  try{
    await fetch(hook,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),mode:'no-cors'});
    form.reset();
    setSubmitted({leadId});
  }catch{
    setSubmitError('We could not send your request. Please try again.');
  }finally{setSubmitting(false)}
 }
 return <div className="app"><motion.div className="progress" style={{scaleX:smooth}}/><a className="skip" href="#main">Skip to content</a>
 <header className="nav"><button className="brand" onClick={()=>nav('top')} aria-label="Veda Farms home"><span className="partner-mark"><b>ALTITUDE.SPACE</b><small>DESIGN & BUILD PVT. LTD.</small><em>EXCLUSIVE PARTNER</em></span><span className="brand-name"><b>VEDA</b><strong>Farms</strong></span></button><nav className={menu?'open':''}><button onClick={()=>nav('story')}>Story</button><button onClick={()=>nav('masterplan')}>Masterplan</button><button onClick={()=>nav('access')}>Reality</button><button onClick={()=>nav('visit')}>Process</button></nav><button className="nav-cta" onClick={()=>nav('visit')}>Book a Visit <ArrowRight size={15}/></button><button className="menu" onClick={()=>setMenu(!menu)} aria-expanded={menu} aria-label="Toggle navigation">{menu?<X/>:<Menu/>}</button></header>
 <main id="main">
 <section id="top" className="hero"><motion.div className="hero-bg" style={{y:heroY,scale:heroScale,backgroundImage:`url(${A}hero.jpeg)`}}/><div className="hero-overlay"/><div className="hero-grain"/><div className="hero-content"><div className="eyebrow"><span/> {content.eyebrow}</div><h1>{content.headline}</h1><p>{content.subcopy}</p><div className="actions"><button className="gold" onClick={()=>nav('masterplan')}>Enter the masterplan <Move3D size={17}/></button><button className="outline" onClick={()=>nav('visit')}>Request private access <ArrowRight size={17}/></button></div></div><div className="hero-stats"><span>01</span><div><b>{content.minPlot}</b><small>minimum plot*</small></div><div><b>{content.price}</b><small>indicative / sq. yd.*</small></div><div><b>{content.planned}</b><small>planned development*</small></div></div><div className="scroll"><span>SCROLL TO ENTER</span><ArrowDown size={16}/></div></section>

 <section className="proof"><div><b>AUTHORISED CHANNEL PARTNER</b><span>Altitude.Space Design & Build Pvt. Ltd.</span></div><div><b>TRANSPARENT & DOCUMENTED</b><span>Project information presented for due diligence.</span></div><div><b>100+ HAPPY INVESTORS</b><span>Supplied marketing claim.</span></div><div><b>2,00,000+ TREES PLANTED</b><span>Supplied marketing claim.</span></div></section>
 <section id="story" className="numbers"><div><strong>2L+</strong><span>Sq. yards of farm land*</span></div><div><strong>40 ft</strong><span>Wide main road*</span></div><div><strong>80%</strong><span>Bookings completed*</span></div><div><strong>100+</strong><span>Satisfied customers*</span></div></section>

 <section className="vision"><div className="kicker">02 / THE IDEA</div><div className="vision-grid"><h2>Nature around you.<br/><em>Peace within you.</em></h2><div><p className="lead">The story is no longer just “buy a farm plot.” It is the combination of <b>land + a real site + a mapped masterplan + a future-facing location story.</b></p><p>Veda Farms sits on the Yamuna Expressway corridor, with the supplied plan showing an expressway edge, proposed 6-lane road, internal roads, green areas, Central Park, clubhouse, pool, organic farming and an entry sequence. The exact Google Maps pin used for this site is <b>28.3917443, 77.504711.</b></p><div className="chips"><span><Leaf/>Landscape-led</span><span><MapPin/>Greater Noida</span><span><Route/>Yamuna Expressway</span><span><Move3D/>Interactive plan</span></div></div></div></section>

 <section id="aerial" className="aerial"><div className="aerial-copy"><div className="kicker">03 / SEE THE LAND</div><h2>From the ground,<br/><em>it feels different.</em></h2><p>Your supplied aerial footage becomes the emotional proof point: real landscape, real farmhouse context, real paths and existing site character. The video is used as provided, without inventing a new property scene.</p><button className="outline light" onClick={()=>setShowVideo(true)}><Play size={16}/> Watch aerial view</button></div><div className="aerial-frame"><video src="/media/aerial-site.mp4" autoPlay muted loop playsInline preload="metadata"/><div className="video-tag">LIVE SITE REFERENCE · VEDA FARMS</div><button className="video-expand" onClick={()=>setShowVideo(true)} aria-label="Open aerial video"><ZoomIn/></button></div></section>

 <section id="masterplan" className="master"><div className="master-head"><div><div className="kicker">04 / THE MASTERPLAN</div><h2>Your land,<br/><em>mapped in space.</em></h2></div><p>The supplied Veda Vastu Farms layout is the source for this scene: plot zones and labels, internal road hierarchy, Central Park, Club House, Pool, Organic Farming, Green Area, Gaushala, Entry, Yamuna Expressway, proposed 6-lane road and future extension areas are carried into the interactive 3D presentation. The interactive Three.js masterplan uses the supplied AutoCAD PDF as its geometry source. Plot geometry, roads, green-area footprints, entry location and source annotations are preserved from the approved PDF-faithful build; vertical styling and lighting are conceptual. It is not a legal survey.</p></div><div className="master-card"><Site3D/>{selected&&<motion.div className="plot-card" initial={{opacity:0,x:25}} animate={{opacity:1,x:0}}><button onClick={()=>setSelected(null)} aria-label="Close plot details"><X size={16}/></button><small>SELECTED FROM PLAN</small><h3>{selected.id}</h3><strong>{selected.size}</strong><p>Zone {selected.zone} · Plot label/area sourced from the supplied layout.</p><button className="gold small" onClick={()=>nav('visit')}>Request details <ArrowRight size={15}/></button></motion.div>}</div><div className="master-foot"><div><b>ROAD NETWORK</b><span>25' · 30' · 32' · 35' · 40' · 45' widths appear on the plan.</span></div><div><b>GREEN HEART</b><span>Central Park + Green Area + Organic Farming.</span></div><div><b>SOCIAL CORE</b><span>Club House + Pool are shown on the supplied plan.</span></div><div><b>EDGE & ACCESS</b><span>Yamuna Expressway + proposed 6-lane road + Entry.</span></div></div></section>

 <section id="access" className="access"><div><div className="kicker">05 / LOCATION REALITY</div><h2>See exactly<br/><em>where Veda sits.</em></h2><p>Two map views are integrated directly into the experience: a satellite view for the real landscape context and a standard map view for roads and surrounding destinations. The project anchor is your exact Google Maps pin.</p><a className="gold" href={`${MAPS}/search/?api=1&query=28.3917443,77.504711`} target="_blank" rel="noreferrer">Open exact Veda Farms pin <ExternalLink size={15}/></a><div className="location-anchor"><MapPin/><div><b>28.3917443, 77.504711</b><span>Exact project pin supplied by you</span></div></div><div className="map-destination-strip"><span>🏁 Buddha International Circuit · ~5.5 km geographic</span><span>🏢 Stellar Business Park · 3.4 km / ~8 min</span><span>✈️ Jewar Airport · 33.3 km / ~43 min</span></div></div><div className="map-shell"><div className="map-toolbar"><div><b>VEDA FARMS · LIVE MAP VIEW</b><small>Exact pin · 28.3917443, 77.504711</small></div><div className="map-tabs"><button className={mapView==='satellite'?'active':''} onClick={()=>setMapView('satellite')}>Satellite</button><button className={mapView==='map'?'active':''} onClick={()=>setMapView('map')}>Road map</button></div></div><div className="map-embed"><iframe title="Veda Farms exact location map" src={mapView==='satellite' ? 'https://www.google.com/maps?q=28.3917443,77.504711&t=k&z=15&output=embed' : 'https://www.google.com/maps?q=28.3917443,77.504711&z=15&output=embed'} loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe><div className="map-pin-card"><MapPin/><div><b>Veda Farms</b><span>Yamuna Expressway · Sikanderpur</span><small>Exact project coordinate</small></div></div></div><div className="map-links"><a href="https://www.google.com/maps/search/?api=1&query=28.3917443,77.504711" target="_blank" rel="noreferrer">View in Google Maps <ExternalLink size={14}/></a><a href="https://www.google.com/maps/dir/?api=1&destination=28.3917443,77.504711" target="_blank" rel="noreferrer">Get directions <Route size={14}/></a></div></div></section>

 <section className="gallery"><div className="kicker">06 / A SENSE OF PLACE</div><div className="gallery-head"><h2>See the feeling<br/><em>before you arrive.</em></h2><p>Original supplied imagery and site footage anchor the experience in the actual project atmosphere. Tap any frame to expand.</p></div><div className="gallery-grid">{gallery.map(([src,alt],i)=><motion.button className={`g g${i}`} key={src} whileHover={{scale:1.01}} onClick={()=>setLightbox(A+src)}><img src={A+src} alt={alt} loading={i?'lazy':'eager'}/><span>{String(i+1).padStart(2,'0')} <ZoomIn size={14}/></span></motion.button>)}</div></section>

 <section id="visit" className="visit lead-funnel"><div className="visit-copy"><div className="kicker">07 / GET IN TOUCH</div><h2>Start with<br/><em>a conversation.</em></h2><p>Tell us what you are looking for. Your request is captured as a lead for the Veda Farms team, added to the project Google Sheet, and can trigger a WhatsApp notification for fast follow-up.</p><div className="visit-points"><span><Check/>Current plot availability & pricing</span><span><Check/>Private site visit coordination</span><span><Check/>Documentation & masterplan discussion</span></div><div className="lead-promise"><span>01</span><div><b>YOU SEND A REQUEST</b><small>Contact details + what you are interested in.</small></div><span>02</span><div><b>OUR TEAM IS ALERTED</b><small>Lead row in Google Sheets + WhatsApp notification.</small></div><span>03</span><div><b>WE CONTACT YOU</b><small>For availability, documentation or a site visit.</small></div></div></div>{submitted?<div className="success lead-success"><Check size={22}/><small>LEAD REFERENCE</small><h3>Request received.</h3><strong>{submitted.leadId}</strong><p>Thank you. Your request has been sent to the Veda Farms lead channel. Keep this reference handy if you contact the team again.</p><button className="outline" onClick={()=>{setSubmitted(false);setSubmitError('')}}>Send another request</button></div>:<form className="lead-form" onSubmit={submit}><div className="form-head"><small>PRIVATE ENQUIRY</small><h3>How can we help?</h3><p>Required fields are marked *</p></div><div className="form-grid"><label>Name *<input name="name" required autoComplete="name" placeholder="Your full name"/></label><label>Phone *<input name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98XXXXXXXX"/></label><label>Email<input name="email" type="email" autoComplete="email" placeholder="Optional"/></label><label>City<input name="city" autoComplete="address-level2" placeholder="Your city"/></label><label>I'm interested in *<select name="interest" required defaultValue=""><option value="" disabled>Select an option</option><option value="PLOT_AVAILABILITY">Plot availability</option><option value="SITE_VISIT">Schedule a site visit</option><option value="PRICING">Pricing & commercial details</option><option value="DOCUMENTS">Project documentation</option><option value="INVESTMENT">Investment discussion</option><option value="GENERAL">General enquiry</option></select></label><label>Preferred callback<select name="callback" defaultValue="ANYTIME"><option value="ANYTIME">Anytime</option><option value="MORNING">Morning</option><option value="AFTERNOON">Afternoon</option><option value="EVENING">Evening</option><option value="WEEKEND">Weekend</option></select></label></div><label className="message-field">Message<textarea name="message" rows="4" placeholder="Plot preference, visit date, questions or anything else you'd like us to know."/></label><label className="consent"><input type="checkbox" name="consent" value="yes" required/><span>I agree to be contacted by Veda Farms / its authorised sales partner regarding this enquiry.</span></label><label className="honeypot" aria-hidden="true">Company<input name="company" tabIndex="-1" autoComplete="off"/></label>{submitError&&<div className="form-error" role="alert">{submitError}</div>}<button className="gold lead-submit" type="submit" disabled={submitting}>{submitting?'Sending request…':'Request a call'} <Send size={15}/></button><small className="form-note">Your details are used only to respond to this property enquiry. Marketing figures on this page should be independently verified against current project documentation.</small></form>}</section>

 <section className="faq"><div className="kicker">08 / THE ESSENTIALS</div><div className="faq-grid"><h2>Compelling story,<br/><em>clear boundaries.</em></h2><div>{[['Why is the location story stronger now?','Because we can show the exact Veda Farms pin and connect it to real nearby destinations: Buddha International Circuit, Stellar Business Park, Noida International Airport and DLF Mall of India. We also distinguish geographic distance from live driving distance.'],['What does the supplied plan actually show?','The layout includes multiple plot zones, plot labels and areas, internal roads, Central Park, Club House, Pool, Organic Farming, Green Area, Gaushala, Entry, Yamuna Expressway, proposed 6-lane road and future extension areas.'],['Is the 3D model the legal/cadastral plan?','No. The interactive geometry is derived from the supplied AutoCAD PDF, while vertical styling, landscaping, lighting and amenity elevation are conceptual. It remains a presentation model, not a legal or cadastral survey.'],['What claims should be verified before launch?','Pricing, booking percentage, investor/customer counts, tree counts, total acreage, exact road status and all legal/title/documentation details should be confirmed by the project team before publication.']].map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
 </main><footer><span>VEDA <b>Farms</b></span><small>THE PRIVATE GREEN · GREATER NOIDA · EXACT PIN 28.3917443, 77.504711</small><button onClick={()=>nav('top')}>Back to top ↑</button></footer>
 <AnimatePresence>{lightbox&&<motion.div className="lightbox" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setLightbox(null)}><motion.img src={lightbox} initial={{scale:.92}} animate={{scale:1}}/><button onClick={()=>setLightbox(null)} aria-label="Close"><X/></button></motion.div>}</AnimatePresence>
 <AnimatePresence>{showVideo&&<motion.div className="video-modal" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowVideo(false)}><div onClick={e=>e.stopPropagation()}><button onClick={()=>setShowVideo(false)} aria-label="Close video"><X/></button><video src="/media/aerial-site.mp4" controls autoPlay playsInline/></div></motion.div>}</AnimatePresence>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);

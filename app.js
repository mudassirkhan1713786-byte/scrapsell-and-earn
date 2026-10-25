const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
$("#year").textContent = new Date().getFullYear();
let adminPassword = "";
const defaultRates = [
 {id:1,name:"Pure Copper Wire",category:"Copper",rate:""},
 {id:2,name:"Mixed Copper Scrap",category:"Copper",rate:""},
 {id:3,name:"Copper Cable Scrap",category:"Copper",rate:""},
 {id:4,name:"Aluminium Wire Scrap",category:"Aluminium",rate:""},
 {id:5,name:"Mixed Aluminium Scrap",category:"Aluminium",rate:""}
];
async function loadRates(){
 try {
  const r = await fetch("/api/rates");
  if(!r.ok) throw new Error();
  const rates = await r.json();
  $("#rateGrid").innerHTML = rates.map(x => `<article class="rate-card"><span>${x.category==="Copper"?"CU":"AL"}</span><h3>${escapeHtml(x.name)}</h3><p>${x.category==="Copper"?"Copper scrap buying category":"Aluminium scrap buying category"}</p><strong>${x.rate ? "₹"+escapeHtml(x.rate)+"/kg" : "Ask for today's rate"}</strong></article>`).join("");
 } catch {}
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
loadRates();
$("#enquiryForm").addEventListener("submit", async e=>{
 e.preventDefault();
 const btn = e.currentTarget.querySelector("button[type=submit]");
 btn.disabled=true; btn.textContent="Submitting…";
 const body=Object.fromEntries(new FormData(e.currentTarget).entries());
 try{
  const r=await fetch("/api/enquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json();
  if(!r.ok) throw new Error(d.error||"Could not submit enquiry.");
  $("#formMessage").textContent=`Thank you! Your enquiry reference is ${d.enquiryId}. We will contact you after reviewing the details.`;
  $("#formMessage").style.color="#477b3a"; e.currentTarget.reset();
 }catch(err){$("#formMessage").textContent="Enquiry could not be saved. Please try again or contact the business directly.";$("#formMessage").style.color="#a43d32";}
 btn.disabled=false;btn.innerHTML='Submit Scrap Enquiry <b>↗</b>';
});
function showAdmin(){ $("#adminModal").classList.remove("hidden"); $("#adminLogin").classList.remove("hidden"); $("#adminDashboard").classList.add("hidden"); }
$("#adminOpen").addEventListener("click",showAdmin);
$("#adminClose").addEventListener("click",()=>$("#adminModal").classList.add("hidden"));
$("#adminModal").addEventListener("click",e=>{if(e.target===$("#adminModal"))$("#adminModal").classList.add("hidden")});
$("#loginForm").addEventListener("submit",async e=>{
 e.preventDefault(); adminPassword=$("#adminPassword").value;
 try{const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:adminPassword})});const d=await r.json();if(!r.ok)throw new Error(d.error);
 $("#adminLogin").classList.add("hidden");$("#adminDashboard").classList.remove("hidden");await loadAdminData();
 }catch(err){$("#loginMessage").textContent=err.message||"Login failed";}
});
async function adminFetch(url,opts={}){return fetch(url,{...opts,headers:{...(opts.headers||{}),"Content-Type":"application/json","x-admin-password":adminPassword}});}
async function loadAdminData(){
 const r=await adminFetch("/api/admin/data");if(!r.ok){$("#adminDashboard").classList.add("hidden");$("#adminLogin").classList.remove("hidden");return;}
 const data=await r.json();
 $("#adminRates").innerHTML=data.rates.map((x,i)=>`<div class="rate-edit"><b>${escapeHtml(x.name)}</b><span>${escapeHtml(x.category)}</span><input aria-label="${escapeHtml(x.name)} rate in rupees per kg" data-rate-id="${x.id}" value="${escapeHtml(x.rate)}" placeholder="₹ per kg (optional)"></div>`).join("");
 $("#enquiryList").innerHTML=data.enquiries.length?data.enquiries.map(x=>`<article class="enquiry-item"><h4>${escapeHtml(x.name)} · ${escapeHtml(x.material)}</h4><p><b>Phone:</b> ${escapeHtml(x.phone)} &nbsp; <b>Qty:</b> ${escapeHtml(x.quantity)}</p><p><b>Location:</b> ${escapeHtml(x.location)}</p><p>${escapeHtml(x.details||"No extra details")}</p><p><b>Received:</b> ${new Date(x.createdAt).toLocaleString()}</p><label>Status<select data-enquiry-id="${x.id}"><option ${x.status==="Pending"?"selected":""}>Pending</option><option ${x.status==="Contacted"?"selected":""}>Contacted</option><option ${x.status==="Purchased"?"selected":""}>Purchased</option><option ${x.status==="Cancelled"?"selected":""}>Cancelled</option></select></label></article>`).join(""):"<p>No enquiries yet.</p>";
 $$("#enquiryList select").forEach(sel=>sel.addEventListener("change",async()=>{await adminFetch(`/api/admin/enquiries/${sel.dataset.enquiryId}`,{method:"PUT",body:JSON.stringify({status:sel.value})});}));
}
$("#saveRates").addEventListener("click",async()=>{
 const rates=$$("#adminRates input").map(input=>({id:Number(input.dataset.rateId),name:defaultRates.find(x=>x.id===Number(input.dataset.rateId))?.name,category:defaultRates.find(x=>x.id===Number(input.dataset.rateId))?.category,rate:input.value.trim()}));
 try{const r=await adminFetch("/api/admin/rates",{method:"PUT",body:JSON.stringify({rates})});if(!r.ok)throw new Error("Could not save rates.");$("#rateMessage").textContent="Rates saved successfully.";await loadRates();}catch(e){$("#rateMessage").textContent=e.message;}
});
$$(".tab").forEach(btn=>btn.addEventListener("click",()=>{$$(".tab").forEach(x=>x.classList.toggle("active",x===btn));$("#ratesAdmin").classList.toggle("hidden",btn.dataset.tab!=="ratesAdmin");$("#enquiriesAdmin").classList.toggle("hidden",btn.dataset.tab!=="enquiriesAdmin");}));
$("#logout").addEventListener("click",()=>{adminPassword="";$("#adminPassword").value="";$("#adminDashboard").classList.add("hidden");$("#adminLogin").classList.remove("hidden");});

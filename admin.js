const {createClient}=supabase;
const supabaseClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
let allRows=[];

const $=id=>document.getElementById(id);
function err(msg){$("loginError").textContent=msg;$("loginError").classList.remove("hidden")}
async function init(){
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(session) showDashboard(session.user); 
}
function showDashboard(user){
  $("loginCard").classList.add("hidden");$("dashboard").classList.remove("hidden");$("userEmail").textContent=user.email||"";loadRows();
}
$("loginBtn").onclick=async()=>{
  try{
    const {data,error}=await supabaseClient.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
    if(error)throw error; showDashboard(data.user);
  }catch(e){err(e.message)}
};
$("logoutBtn").onclick=async()=>{await supabaseClient.auth.signOut();location.reload()};
$("refreshBtn").onclick=loadRows;
$("search").oninput=render;
$("filterStatus").onchange=render;

async function loadRows(){
  const {data,error}=await supabaseClient.from("registrations").select("*").order("submitted_at",{ascending:false});
  if(error){console.error(error);return alert(error.message)}
  allRows=data||[];updateStats();render();
}
function updateStats(){
  $("total").textContent=allRows.length;
  $("pending").textContent=allRows.filter(x=>x.registration_status==="pending").length;
  $("approved").textContent=allRows.filter(x=>x.registration_status==="approved").length;
  $("rejected").textContent=allRows.filter(x=>x.registration_status==="rejected").length;
}
function render(){
  const q=$("search").value.toLowerCase().trim(), f=$("filterStatus").value;
  const rows=allRows.filter(x=>(!f||x.registration_status===f)&&(!q||[x.registration_number,x.full_name,x.school_name,x.province].join(" ").toLowerCase().includes(q)));
  $("tbody").innerHTML=rows.map(x=>`<tr>
<td>${x.registration_number}</td><td>${escapeHtml(x.full_name)}</td><td>${escapeHtml(x.gender)}</td><td>${escapeHtml(x.grade)}</td><td>${escapeHtml(x.school_name)}</td><td>${escapeHtml(x.province)}</td>
<td><span class="badge ${x.payment_status}">${x.payment_status}</span></td><td><span class="badge ${x.registration_status}">${x.registration_status}</span></td>
<td>${new Date(x.submitted_at).toLocaleString("km-KH")}</td>
<td><button class="action view" onclick="viewReceipt('${x.id}')">មើល</button>
<button class="action approve" onclick="setStatus('${x.id}','approved')">Approve</button>
<button class="action reject" onclick="setStatus('${x.id}','rejected')">Reject</button></td></tr>`).join("");
}
function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
window.setStatus=async(id,status)=>{
  const row=allRows.find(x=>x.id===id); if(!row)return;
  const {error}=await supabaseClient.from("registrations").update({registration_status:status,payment_status:status==="approved"?"approved":status==="rejected"?"rejected":row.payment_status}).eq("id",id);
  if(error)return alert(error.message); await loadRows();
};
window.viewReceipt=async(id)=>{
  const row=allRows.find(x=>x.id===id); if(!row)return;
  const {data,error}=await supabaseClient.storage.from("receipts").createSignedUrl(row.receipt_path,600);
  if(error)return alert(error.message);
  const isPdf=row.receipt_path.toLowerCase().endsWith(".pdf");
  $("modalContent").innerHTML=`<h2>${escapeHtml(row.full_name)}</h2><p>លេខ: ${escapeHtml(row.registration_number)}</p><p>សាលា: ${escapeHtml(row.school_name)}</p>${isPdf?`<p><a href="${data.signedUrl}" target="_blank">បើក PDF វិក្កយបត្រ</a></p>`:`<img class="receipt" src="${data.signedUrl}" alt="Receipt">`}`;
  $("modal").classList.remove("hidden");
};
$("closeModal").onclick=()=>$("modal").classList.add("hidden");

$("exportBtn").onclick=()=>{
  const headers=["registration_number","full_name","gender","grade","school_name","province","payment_status","registration_status","submitted_at"];
  const csv=[headers.join(","),...allRows.map(r=>headers.map(h=>`"${String(r[h]??"").replaceAll('"','""')}"`).join(","))].join("\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="registrations.csv";a.click();URL.revokeObjectURL(a.href);
};
init();

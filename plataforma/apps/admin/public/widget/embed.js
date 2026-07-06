var SynovaWidget=function(p){"use strict";class w extends Error{constructor(e,t,s){super(e),this.code=t,this.status=s}}class L{constructor(e,t=(...s)=>fetch(...s)){this.cfg=e,this.fetchImpl=t,this.token=null}setToken(e){this.token=e}url(e){return`${this.cfg.apiBase}${e}`}authHeaders(e){const t={"X-Synova-Key":this.cfg.apiKey};return e&&(t["Content-Type"]="application/json"),this.token&&(t.Authorization=`Bearer ${this.token}`),t}async unwrap(e){let t=null;try{t=await e.json()}catch{throw new w("Resposta inválida do servidor.","bad_response",e.status)}if(t&&t.ok)return t.data;const s=t&&!t.ok?t.code:"server_error",r=t&&!t.ok?t.message:"Erro inesperado.";throw new w(r,s,e.status)}async startSession(e){const t=await this.fetchImpl(this.url("/api/widget/session"),{method:"POST",headers:this.authHeaders(!0),body:JSON.stringify(e)}),s=await this.unwrap(t);return this.token=s.token,s}async sendMessage(e,t,s){const r=await this.fetchImpl(this.url("/api/widget/message"),{method:"POST",headers:this.authHeaders(!0),body:JSON.stringify({sessionId:e,content:t,attachmentIds:s})});return this.unwrap(r)}async fetchHistory(e,t=30){const s=await this.fetchImpl(this.url(`/api/widget/history?sessionId=${encodeURIComponent(e)}&limit=${t}`),{method:"GET",headers:this.authHeaders(!1)});return this.unwrap(s)}async openTicket(e){const t=await this.fetchImpl(this.url("/api/widget/ticket"),{method:"POST",headers:this.authHeaders(!0),body:JSON.stringify(e)});return this.unwrap(t)}async listTickets(){const e=await this.fetchImpl(this.url("/api/widget/tickets"),{method:"GET",headers:this.authHeaders(!1)});return this.unwrap(e)}async getTicketThread(e){const t=await this.fetchImpl(this.url(`/api/widget/ticket-thread?ticketId=${encodeURIComponent(e)}`),{method:"GET",headers:this.authHeaders(!1)});return this.unwrap(t)}async sendTicketMessage(e,t,s){const r=await this.fetchImpl(this.url("/api/widget/ticket-message"),{method:"POST",headers:this.authHeaders(!0),body:JSON.stringify({ticketId:e,content:t,attachmentIds:s})});return this.unwrap(r)}async getUpdates(e){const t=await this.fetchImpl(this.url(`/api/widget/updates?since=${encodeURIComponent(e)}`),{method:"GET",headers:this.authHeaders(!1)});return this.unwrap(t)}async upload(e){const t=new FormData;t.append("file",e);const s=await this.fetchImpl(this.url("/api/widget/attachment"),{method:"POST",headers:this.authHeaders(!1),body:t});return this.unwrap(s)}}const S={title:"Suporte",color:"#4f46e5"};function M(n,e){const t=(n.synovaKey??"").trim();if(!t)throw new Error("Synova: data-synova-key é obrigatório.");const s=(n.apiBase??"").trim()||e;return{apiKey:t,apiBase:s.replace(/\/+$/,""),title:(n.title??"").trim()||S.title,color:(n.color??"").trim()||S.color}}function A(n,e){return M({synovaKey:n.getAttribute("data-synova-key"),apiBase:n.getAttribute("data-api-base"),title:n.getAttribute("data-title"),color:n.getAttribute("data-color")},e)}const z={user:"msg user",ai:"msg ai",admin:"msg admin",system:"msg system"},O={open:"Aberto",in_progress:"Em andamento",escalated:"Escalado",waiting_customer:"Aguardando você",resolved:"Resolvido",closed:"Fechado"};class ${constructor(e,t){this.cfg=e,this.cb=t,this.open=!1,this.seen=new Set,this.threadSeen=new Set}mount(){const e=document.createElement("div");e.id="synova-widget-root",document.body.appendChild(e),this.root=e.attachShadow({mode:"open"}),this.root.innerHTML=this.template(),this.panel=this.root.querySelector(".panel"),this.list=this.root.querySelector(".messages"),this.input=this.root.querySelector("textarea.composer-input"),this.statusEl=this.root.querySelector(".status"),this.fileInput=this.root.querySelector("input.chat-file"),this.sendBtn=this.root.querySelector(".send"),this.attachBtn=this.root.querySelector(".attach"),this.modal=this.root.querySelector(".modal"),this.ticketFile=this.root.querySelector("input.t-file"),this.threadMessages=this.root.querySelector(".thread-messages"),this.threadInput=this.root.querySelector("textarea.thread-input"),this.root.querySelector(".launcher").addEventListener("click",()=>this.toggle()),this.root.querySelector(".close").addEventListener("click",()=>this.toggle()),this.sendBtn.addEventListener("click",()=>this.submit()),this.attachBtn.addEventListener("click",()=>this.fileInput.click()),this.fileInput.addEventListener("change",()=>{var s;const t=(s=this.fileInput.files)==null?void 0:s[0];t&&this.cb.onAttach(t),this.fileInput.value=""}),this.input.addEventListener("keydown",t=>{t.key==="Enter"&&!t.shiftKey&&(t.preventDefault(),this.submit())}),this.root.querySelector(".modal-close").addEventListener("click",()=>this.closeTicketModal()),this.root.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>this.switchTab(t.dataset.tab==="list"?"list":"new"))),this.root.querySelector(".t-attach").addEventListener("click",()=>this.ticketFile.click()),this.ticketFile.addEventListener("change",()=>{var s;const t=(s=this.ticketFile.files)==null?void 0:s[0];t&&this.cb.onAttachTicket(t),this.ticketFile.value=""}),this.root.querySelector(".t-submit").addEventListener("click",()=>{const t=this.root.querySelector(".t-subject").value.trim(),s=this.root.querySelector(".t-desc").value.trim();this.cb.onSubmitTicket({subject:t,description:s})}),this.root.querySelector(".thread-back").addEventListener("click",()=>this.backToList()),this.root.querySelector(".thread-send").addEventListener("click",()=>this.submitThread()),this.threadInput.addEventListener("keydown",t=>{t.key==="Enter"&&!t.shiftKey&&(t.preventDefault(),this.submitThread())})}submit(){const e=this.input.value.trim();!e||this.input.disabled||(this.input.value="",this.cb.onSend(e))}submitThread(){const e=this.threadInput.value.trim();e&&(this.threadInput.value="",this.cb.onSendThreadMessage(e))}toggle(){this.open=!this.open,this.panel.style.display=this.open?"flex":"none",this.open&&(this.cb.onOpen(),this.input.disabled||this.input.focus())}isOpen(){return this.open}setStatus(e,t=!1){const s=this.statusEl.querySelector(".dot"),r=this.statusEl.querySelector(".status-text");r&&(r.textContent=e),s&&s.classList.toggle("on",t)}setUnread(e){const t=this.root.querySelector(".launcher"),s=this.root.querySelector(".badge");e>0?(t.classList.add("has-unread"),s.textContent=e>9?"9+":String(e),s.style.display=""):(t.classList.remove("has-unread"),s.style.display="none")}addMessage(e){return this.seen.has(e.id)?!1:(this.seen.add(e.id),this.list.appendChild(this.buildMessageEl(e)),this.scrollDown(this.list),!0)}buildMessageEl(e){const t=document.createElement("div");t.className=z[e.senderType]??"msg system",e.content&&t.appendChild(document.createTextNode(e.content));for(const s of e.attachments??[])this.appendAttachment(t,s);return t}appendAttachment(e,t){if(t.url)if(t.mimeType.startsWith("image/")){const s=document.createElement("img");s.className="msg-img",s.src=t.url,s.alt=t.fileName,s.loading="lazy",s.addEventListener("click",()=>window.open(t.url,"_blank","noopener")),e.appendChild(s)}else{const s=document.createElement("a");s.className="msg-file",s.href=t.url,s.target="_blank",s.rel="noopener",s.textContent=`📎 ${t.fileName}`,e.appendChild(s)}}addLocal(e,t){const s=document.createElement("div");s.className=`msg ${t}`,s.textContent=e,this.list.appendChild(s),this.scrollDown(this.list)}renderHistory(e){this.list.innerHTML="",this.seen.clear();for(const t of e)this.addMessage(t)}showTicketAction(){if(this.list.querySelector(".action-ticket"))return;const e=document.createElement("button");e.className="action-ticket",e.textContent="Abrir chamado",e.addEventListener("click",()=>this.cb.onOpenTicket()),this.list.appendChild(e),this.scrollDown(this.list)}lockComposer(e){if(this.input.disabled=!0,this.input.value="",this.input.placeholder=e,this.sendBtn.disabled=!0,this.attachBtn.disabled=!0,!this.list.querySelector(".action-newchat")){const t=document.createElement("button");t.className="action-newchat",t.textContent="Iniciar nova conversa",t.addEventListener("click",()=>this.cb.onNewChat()),this.list.appendChild(t),this.scrollDown(this.list)}}reset(){this.list.innerHTML="",this.seen.clear(),this.input.disabled=!1,this.input.placeholder="Escreva sua mensagem...",this.sendBtn.disabled=!1,this.attachBtn.disabled=!1}openTicketModal(){this.modal.style.display="flex",this.backToList(),this.switchTab("new")}closeTicketModal(){this.modal.style.display="none",this.cb.onCloseThread()}switchTab(e){this.root.querySelector(".panel-new").style.display=e==="new"?"flex":"none",this.root.querySelector(".panel-list").style.display=e==="list"?"block":"none",this.root.querySelectorAll(".tab").forEach(t=>{const s=t;s.classList.toggle("active",s.dataset.tab===e)})}addTicketAttachment(e){const t=this.root.querySelector(".t-attachments"),s=document.createElement("span");s.className="chip",s.textContent=`📎 ${e}`,t.appendChild(s)}clearTicketForm(){this.root.querySelector(".t-subject").value="",this.root.querySelector(".t-desc").value="",this.root.querySelector(".t-attachments").innerHTML=""}setTicketResult(e){this.root.querySelector(".t-result").textContent=e}renderTickets(e){const t=this.root.querySelector(".tickets");if(!e.length){t.innerHTML='<p class="empty">Você ainda não abriu nenhum chamado.</p>';return}t.innerHTML="";for(const s of e){const r=document.createElement("div");r.className="ticket-row";const c=new Date(s.createdAt).toLocaleDateString("pt-BR");r.innerHTML=`
        <div class="ticket-subject"></div>
        <div class="ticket-meta"><span class="ticket-status s-${s.status}"></span><span class="ticket-date"></span></div>`,r.querySelector(".ticket-subject").textContent=s.subject,r.querySelector(".ticket-status").textContent=O[s.status]??s.status,r.querySelector(".ticket-date").textContent=c,r.addEventListener("click",()=>this.cb.onOpenThread(s.id)),t.appendChild(r)}}openThreadView(e){this.root.querySelector(".tabs").style.display="none",this.root.querySelector(".tab-content").style.display="none",this.root.querySelector(".thread").style.display="flex",this.root.querySelector(".thread-title").textContent=e,this.threadMessages.innerHTML="",this.threadSeen.clear()}backToList(){this.root.querySelector(".thread").style.display="none",this.root.querySelector(".tabs").style.display="flex",this.root.querySelector(".tab-content").style.display="block",this.cb.onCloseThread()}renderThreadMessages(e){this.threadMessages.innerHTML="",this.threadSeen.clear();for(const t of e)this.addThreadMessage(t)}addThreadMessage(e){return this.threadSeen.has(e.id)?!1:(this.threadSeen.add(e.id),this.threadMessages.appendChild(this.buildMessageEl(e)),this.scrollDown(this.threadMessages),!0)}scrollDown(e){e.scrollTop=e.scrollHeight}template(){const e=this.cfg.color;return`
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
        .launcher {
          position: fixed; right: 20px; bottom: 20px; width: 56px; height: 56px;
          border-radius: 50%; background: ${e}; color: #fff; border: none; cursor: pointer;
          box-shadow: 0 6px 20px rgba(0,0,0,.25); font-size: 24px; z-index: 2147483000;
        }
        .launcher.has-unread { background: #dc2626; }
        .badge {
          position: absolute; top: -2px; right: -2px; min-width: 20px; height: 20px; padding: 0 4px;
          background: #dc2626; color: #fff; border: 2px solid #fff; border-radius: 999px;
          font-size: 11px; line-height: 16px; font-weight: 700;
        }
        .panel {
          position: fixed; right: 20px; bottom: 88px; width: 360px; max-width: calc(100vw - 40px);
          height: 520px; max-height: calc(100vh - 120px); background: #fff; border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0,0,0,.28); display: none; flex-direction: column;
          overflow: hidden; z-index: 2147483000;
        }
        .header { background: ${e}; color: #fff; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; }
        .header .title { font-weight: 600; font-size: 15px; }
        .close, .modal-close { background: transparent; border: none; color: #fff; font-size: 20px; cursor: pointer; }
        .status { font-size: 11px; color: #6b7280; padding: 4px 14px; background: #f9fafb; display: flex; align-items: center; gap: 6px; }
        .status .dot { width: 8px; height: 8px; border-radius: 50%; background: #9ca3af; flex: none; }
        .status .dot.on { background: #22c55e; }
        .messages, .thread-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: #f3f4f6; }
        .msg { max-width: 85%; padding: 8px 10px; border-radius: 10px; font-size: 14px; line-height: 1.35; white-space: pre-wrap; word-break: break-word; }
        .msg.user { align-self: flex-end; background: ${e}; color: #fff; border-bottom-right-radius: 2px; }
        .msg.ai, .msg.admin { align-self: flex-start; background: #fff; color: #111827; border: 1px solid #e5e7eb; border-bottom-left-radius: 2px; }
        .msg.system { align-self: center; background: #fef3c7; color: #92400e; font-size: 12px; }
        .msg-img { display: block; max-width: 100%; margin-top: 6px; border-radius: 8px; cursor: pointer; }
        .msg-file { display: inline-block; margin-top: 6px; font-size: 13px; text-decoration: underline; word-break: break-all; }
        .action-ticket, .action-newchat {
          align-self: center; margin: 2px 0; border: none; border-radius: 8px; cursor: pointer;
          padding: 8px 14px; font-size: 13px; font-weight: 600;
        }
        .action-ticket { background: ${e}; color: #fff; }
        .action-newchat { background: #e5e7eb; color: #374151; }
        .composer { display: flex; gap: 6px; padding: 10px; border-top: 1px solid #e5e7eb; align-items: flex-end; }
        textarea { resize: none; padding: 9px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit; }
        .composer-input, .thread-input { flex: 1; height: 40px; max-height: 90px; }
        .composer-input:disabled { background: #f3f4f6; color: #9ca3af; }
        .icon-btn, .send, .thread-send { border: none; border-radius: 8px; cursor: pointer; padding: 9px 10px; }
        .icon-btn:disabled, .send:disabled { opacity: .5; cursor: not-allowed; }
        .attach { background: #e5e7eb; color: #374151; }
        .send, .thread-send { background: ${e}; color: #fff; }
        input[type=file] { display: none; }

        /* Modal de chamados: cobre o painel inteiro */
        .modal { position: absolute; inset: 0; background: #fff; display: none; flex-direction: column; z-index: 5; }
        .modal-header { background: ${e}; color: #fff; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 15px; }
        .tabs { display: flex; border-bottom: 1px solid #e5e7eb; }
        .tab { flex: 1; padding: 10px; border: none; background: #fff; cursor: pointer; font-size: 13px; color: #6b7280; border-bottom: 2px solid transparent; }
        .tab.active { color: #111827; font-weight: 600; border-bottom-color: ${e}; }
        .tab-content { flex: 1; overflow-y: auto; padding: 12px; }
        .panel-new { display: flex; flex-direction: column; gap: 8px; height: 100%; }
        .t-subject { padding: 9px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        .t-desc { flex: 1; min-height: 120px; }
        .t-attachments { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { background: #eef2ff; color: #3730a3; font-size: 11px; padding: 3px 8px; border-radius: 999px; }
        .modal-actions { display: flex; gap: 6px; }
        .t-attach { background: #e5e7eb; color: #374151; border: none; border-radius: 8px; padding: 9px 10px; cursor: pointer; }
        .t-submit { flex: 1; background: ${e}; color: #fff; border: none; border-radius: 8px; padding: 9px 10px; cursor: pointer; font-weight: 600; }
        .t-result { font-size: 12px; color: #059669; min-height: 16px; }
        .ticket-row { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; margin-bottom: 8px; cursor: pointer; }
        .ticket-row:hover { border-color: ${e}; }
        .ticket-subject { font-size: 14px; color: #111827; margin-bottom: 4px; word-break: break-word; }
        .ticket-meta { display: flex; align-items: center; justify-content: space-between; font-size: 11px; }
        .ticket-status { padding: 2px 8px; border-radius: 999px; background: #e5e7eb; color: #374151; }
        .ticket-status.s-resolved, .ticket-status.s-closed { background: #dcfce7; color: #166534; }
        .ticket-status.s-escalated, .ticket-status.s-open { background: #fef3c7; color: #92400e; }
        .ticket-date { color: #9ca3af; }
        .empty { color: #6b7280; font-size: 13px; text-align: center; margin-top: 20px; }

        /* Thread do ticket */
        .thread { position: absolute; inset: 0; top: 47px; background: #fff; display: none; flex-direction: column; }
        .thread-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        .thread-back { border: none; background: #e5e7eb; color: #374151; border-radius: 8px; padding: 4px 10px; cursor: pointer; font-size: 16px; }
        .thread-title { font-size: 13px; font-weight: 600; color: #111827; word-break: break-word; }
        .thread-composer { display: flex; gap: 6px; padding: 10px; border-top: 1px solid #e5e7eb; align-items: flex-end; }
      </style>
      <button class="launcher" aria-label="Abrir suporte">&#128172;<span class="badge" style="display:none">0</span></button>
      <div class="panel" role="dialog" aria-label="Suporte">
        <div class="header">
          <span class="title">${H(this.cfg.title)}</span>
          <button class="close" aria-label="Fechar">&times;</button>
        </div>
        <div class="status"><span class="dot"></span><span class="status-text">Conectando...</span></div>
        <div class="messages"></div>
        <div class="composer">
          <button class="icon-btn attach" aria-label="Anexar">&#128206;</button>
          <textarea class="composer-input" placeholder="Escreva sua mensagem..."></textarea>
          <button class="send" aria-label="Enviar">&#10148;</button>
          <input type="file" class="chat-file" />
        </div>

        <div class="modal" role="dialog" aria-label="Chamados">
          <div class="modal-header">
            <span>Chamados</span>
            <button class="modal-close" aria-label="Fechar">&times;</button>
          </div>
          <div class="tabs">
            <button class="tab active" data-tab="new">Novo chamado</button>
            <button class="tab" data-tab="list">Meus chamados</button>
          </div>
          <div class="tab-content">
            <div class="panel-new">
              <input class="t-subject" placeholder="Assunto (ex.: erro ao emitir nota)" />
              <textarea class="t-desc" placeholder="Descreva o que você precisa. Você pode anexar imagens."></textarea>
              <div class="t-attachments"></div>
              <div class="modal-actions">
                <button class="t-attach" aria-label="Anexar">&#128206; Anexar</button>
                <button class="t-submit">Enviar chamado</button>
              </div>
              <div class="t-result"></div>
              <input type="file" class="t-file" />
            </div>
            <div class="panel-list" style="display:none">
              <div class="tickets"></div>
            </div>
          </div>
          <div class="thread">
            <div class="thread-head">
              <button class="thread-back" aria-label="Voltar">&#8592;</button>
              <span class="thread-title"></span>
            </div>
            <div class="thread-messages"></div>
            <div class="thread-composer">
              <textarea class="thread-input" placeholder="Responder..."></textarea>
              <button class="thread-send" aria-label="Enviar">&#10148;</button>
            </div>
          </div>
        </div>
      </div>
    `}}function H(n){return n.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[e])}class N{constructor(){this.items=[]}enqueue(e){this.items.push(e)}size(){return this.items.length}peek(){return this.items[0]}clear(){this.items=[]}async flush(e){let t=0;for(;this.items.length>0;){const s=this.items[0];try{await e(s)}catch{break}this.items.shift(),t+=1}return t}}const l=document.currentScript;function D(n){const e=new L(n),t=new N;let s=null,r=!1,c=null,g=[],y=[],d=null,h=null,T=null;const x=`synova_session_${n.apiKey}`,u=`synova_seen_${n.apiKey}`,o=new $(n,{onOpen:k,onSend:B,onAttach:U,onOpenTicket:F,onNewChat:X,onSubmitTicket:Q,onAttachTicket:J,onOpenThread:_,onSendThreadMessage:P,onCloseThread:K});o.mount();async function k(){if(!r)try{const i=f(x)??void 0,a=await e.startSession(i?{sessionId:i}:{});s=a.sessionId,b(x,s),r=!0,o.renderHistory(a.history),o.setStatus(a.user.name?`Olá, ${a.user.name}!`:"Conectado",!0),f(u)||b(u,new Date().toISOString()),Y(),G(),E()}catch{o.setStatus("Sem conexão. Tentaremos novamente.",!1)}}async function B(i){o.addLocal(i,"user");const a=g;if(g=[],!r||!s){t.enqueue({content:i,attachmentIds:a}),o.setStatus("Offline: mensagem na fila."),k();return}await R({content:i,attachmentIds:a})}async function R(i){try{const a=await e.sendMessage(s,i.content,i.attachmentIds);a.reply&&o.addMessage({id:a.messageId+"-ai",senderType:"ai",content:a.reply,createdAt:new Date().toISOString()}),a.escalated&&o.showTicketAction(),o.setStatus("Conectado",!0)}catch{t.enqueue(i),o.setStatus("Offline: mensagem na fila.",!1)}}async function E(){!r||!s||await t.flush(async i=>{const a=await e.sendMessage(s,i.content,i.attachmentIds);a.reply&&o.addMessage({id:a.messageId+"-ai",senderType:"ai",content:a.reply,createdAt:new Date().toISOString()})})}async function U(i){try{const a=await e.upload(i);g.push(a.attachmentId),o.addLocal(`Anexo pronto: ${a.fileName}`,"system")}catch{o.addLocal("Não foi possível enviar o anexo.","system")}}function F(){o.openTicketModal(),q()}async function q(){if(r)try{const{tickets:i}=await e.listTickets();o.renderTickets(i),I()}catch{}}async function _(i){d=i;try{const{ticket:a,messages:v}=await e.getTicketThread(i);o.openThreadView(a.subject),o.renderThreadMessages(v)}catch{o.openThreadView("Chamado")}W(),I()}function K(){d=null,h&&(clearInterval(h),h=null)}async function P(i){if(d)try{const{message:a}=await e.sendTicketMessage(d,i);o.addThreadMessage(a)}catch{}}function W(){h||(h=setInterval(async()=>{if(d)try{const{messages:i}=await e.getTicketThread(d);for(const a of i)o.addThreadMessage(a)}catch{}},5e3))}function V(){return f(u)??new Date(0).toISOString()}function I(){b(u,new Date().toISOString()),o.setUnread(0)}function G(){T||(T=setInterval(C,1e4),C())}async function C(){if(r)try{const{newAdminMessages:i}=await e.getUpdates(V());o.setUnread(i)}catch{}}async function J(i){try{const a=await e.upload(i);y.push(a.attachmentId),o.addTicketAttachment(a.fileName)}catch{o.setTicketResult("Não foi possível anexar o arquivo.")}}async function Q(i){const a=i.description.trim();if(a.length<3){o.setTicketResult("Descreva um pouco mais o que você precisa.");return}const v=i.subject.trim()||a.slice(0,60);try{await e.openTicket({sessionId:s??void 0,category:"suporte",subject:v,description:a,attachmentIds:y}),y=[],o.clearTicketForm(),o.setTicketResult("Enviado ✓ A equipe vai responder por aqui."),await q(),o.switchTab("list"),o.lockComposer("Chamado aberto — inicie uma nova conversa se precisar.")}catch{o.setTicketResult("Não foi possível enviar. Tente de novo.")}}function X(){r=!1,s=null,j(x),c&&(clearInterval(c),c=null),o.reset(),k()}function Y(){c||(c=setInterval(async()=>{if(!(!r||!s))try{const{history:i}=await e.fetchHistory(s,30);for(const a of i)o.addMessage(a)}catch{}},5e3))}window.addEventListener("online",()=>void E())}function f(n){try{return window.localStorage.getItem(n)}catch{return null}}function b(n,e){try{window.localStorage.setItem(n,e)}catch{}}function j(n){try{window.localStorage.removeItem(n)}catch{}}const m={init(n){const e=n??l;if(!e){console.error("Synova: não foi possível localizar a tag <script>.");return}try{const t=A(e,new URL(e.src,window.location.href).origin);D(t)}catch(t){console.error(t instanceof Error?t.message:"Synova: erro ao iniciar.")}}};return window.SynovaWidget=m,l!=null&&l.getAttribute("data-synova-key")&&m.init(l),p.SynovaWidget=m,Object.defineProperty(p,Symbol.toStringTag,{value:"Module"}),p}({});

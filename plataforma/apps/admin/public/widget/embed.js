var SynovaWidget=function(b){"use strict";class w extends Error{constructor(e,t,s){super(e),this.code=t,this.status=s}}class L{constructor(e,t=(...s)=>fetch(...s)){this.cfg=e,this.fetchImpl=t,this.token=null}setToken(e){this.token=e}url(e){return`${this.cfg.apiBase}${e}`}authHeaders(e){const t={"X-Synova-Key":this.cfg.apiKey};return e&&(t["Content-Type"]="application/json"),this.token&&(t.Authorization=`Bearer ${this.token}`),t}async unwrap(e){let t=null;try{t=await e.json()}catch{throw new w("Resposta inválida do servidor.","bad_response",e.status)}if(t&&t.ok)return t.data;const s=t&&!t.ok?t.code:"server_error",o=t&&!t.ok?t.message:"Erro inesperado.";throw new w(o,s,e.status)}async startSession(e){const t=await this.fetchImpl(this.url("/api/widget/session"),{method:"POST",headers:this.authHeaders(!0),body:JSON.stringify(e)}),s=await this.unwrap(t);return this.token=s.token,s}async sendMessage(e,t,s){const o=await this.fetchImpl(this.url("/api/widget/message"),{method:"POST",headers:this.authHeaders(!0),body:JSON.stringify({sessionId:e,content:t,attachmentIds:s})});return this.unwrap(o)}async fetchHistory(e,t=30){const s=await this.fetchImpl(this.url(`/api/widget/history?sessionId=${encodeURIComponent(e)}&limit=${t}`),{method:"GET",headers:this.authHeaders(!1)});return this.unwrap(s)}async openTicket(e){const t=await this.fetchImpl(this.url("/api/widget/ticket"),{method:"POST",headers:this.authHeaders(!0),body:JSON.stringify(e)});return this.unwrap(t)}async listTickets(){const e=await this.fetchImpl(this.url("/api/widget/tickets"),{method:"GET",headers:this.authHeaders(!1)});return this.unwrap(e)}async getTicketThread(e){const t=await this.fetchImpl(this.url(`/api/widget/ticket-thread?ticketId=${encodeURIComponent(e)}`),{method:"GET",headers:this.authHeaders(!1)});return this.unwrap(t)}async rateTicket(e,t,s){const o=await this.fetchImpl(this.url("/api/widget/ticket-rating"),{method:"POST",headers:this.authHeaders(!0),body:JSON.stringify({ticketId:e,rating:t,comment:s})});return this.unwrap(o)}async sendTicketMessage(e,t,s){const o=await this.fetchImpl(this.url("/api/widget/ticket-message"),{method:"POST",headers:this.authHeaders(!0),body:JSON.stringify({ticketId:e,content:t,attachmentIds:s})});return this.unwrap(o)}async getUpdates(e){const t=await this.fetchImpl(this.url(`/api/widget/updates?since=${encodeURIComponent(e)}`),{method:"GET",headers:this.authHeaders(!1)});return this.unwrap(t)}async upload(e){const t=new FormData;t.append("file",e);const s=await this.fetchImpl(this.url("/api/widget/attachment"),{method:"POST",headers:this.authHeaders(!1),body:t});return this.unwrap(s)}}const S={title:"Suporte",color:"#4f46e5"};function M(r,e){const t=(r.synovaKey??"").trim();if(!t)throw new Error("Synova: data-synova-key é obrigatório.");const s=(r.apiBase??"").trim()||e;return{apiKey:t,apiBase:s.replace(/\/+$/,""),title:(r.title??"").trim()||S.title,color:(r.color??"").trim()||S.color}}function A(r,e){return M({synovaKey:r.getAttribute("data-synova-key"),apiBase:r.getAttribute("data-api-base"),title:r.getAttribute("data-title"),color:r.getAttribute("data-color")},e)}const z={user:"msg user",ai:"msg ai",admin:"msg admin",system:"msg system"},$={open:"Aberto",in_progress:"Em andamento",escalated:"Escalado",waiting_customer:"Aguardando você",resolved:"Resolvido",closed:"Fechado"};class N{constructor(e,t){this.cfg=e,this.cb=t,this.open=!1,this.seen=new Set,this.threadSeen=new Set,this.lastRatingKey=""}mount(){const e=document.createElement("div");e.id="synova-widget-root",document.body.appendChild(e),this.root=e.attachShadow({mode:"open"}),this.root.innerHTML=this.template(),this.panel=this.root.querySelector(".panel"),this.list=this.root.querySelector(".messages"),this.input=this.root.querySelector("textarea.composer-input"),this.statusEl=this.root.querySelector(".status"),this.fileInput=this.root.querySelector("input.chat-file"),this.sendBtn=this.root.querySelector(".send"),this.attachBtn=this.root.querySelector(".attach"),this.modal=this.root.querySelector(".modal"),this.ticketFile=this.root.querySelector("input.t-file"),this.threadMessages=this.root.querySelector(".thread-messages"),this.threadInput=this.root.querySelector("textarea.thread-input"),this.root.querySelector(".launcher").addEventListener("click",()=>this.toggle()),this.root.querySelector(".close").addEventListener("click",()=>this.toggle()),this.sendBtn.addEventListener("click",()=>this.submit()),this.attachBtn.addEventListener("click",()=>this.fileInput.click()),this.fileInput.addEventListener("change",()=>{var s;const t=(s=this.fileInput.files)==null?void 0:s[0];t&&this.cb.onAttach(t),this.fileInput.value=""}),this.input.addEventListener("keydown",t=>{t.key==="Enter"&&!t.shiftKey&&(t.preventDefault(),this.submit())}),this.root.querySelector(".modal-close").addEventListener("click",()=>this.closeTicketModal()),this.root.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>this.switchTab(t.dataset.tab==="list"?"list":"new"))),this.root.querySelector(".t-attach").addEventListener("click",()=>this.ticketFile.click()),this.ticketFile.addEventListener("change",()=>{var s;const t=(s=this.ticketFile.files)==null?void 0:s[0];t&&this.cb.onAttachTicket(t),this.ticketFile.value=""}),this.root.querySelector(".t-submit").addEventListener("click",()=>{const t=this.root.querySelector(".t-subject").value.trim(),s=this.root.querySelector(".t-desc").value.trim();this.cb.onSubmitTicket({subject:t,description:s})}),this.root.querySelector(".thread-back").addEventListener("click",()=>this.backToList()),this.root.querySelector(".thread-send").addEventListener("click",()=>this.submitThread()),this.threadInput.addEventListener("keydown",t=>{t.key==="Enter"&&!t.shiftKey&&(t.preventDefault(),this.submitThread())})}submit(){const e=this.input.value.trim();!e||this.input.disabled||(this.input.value="",this.cb.onSend(e))}submitThread(){const e=this.threadInput.value.trim();e&&(this.threadInput.value="",this.cb.onSendThreadMessage(e))}toggle(){this.open=!this.open,this.panel.style.display=this.open?"flex":"none",this.open&&(this.cb.onOpen(),this.input.disabled||this.input.focus())}isOpen(){return this.open}setStatus(e,t=!1){const s=this.statusEl.querySelector(".dot"),o=this.statusEl.querySelector(".status-text");o&&(o.textContent=e),s&&s.classList.toggle("on",t)}setUnread(e){const t=this.root.querySelector(".launcher"),s=this.root.querySelector(".badge");e>0?(t.classList.add("has-unread"),s.textContent=e>9?"9+":String(e),s.style.display=""):(t.classList.remove("has-unread"),s.style.display="none")}addMessage(e){return this.seen.has(e.id)?!1:(this.seen.add(e.id),this.list.appendChild(this.buildMessageEl(e)),this.scrollDown(this.list),!0)}buildMessageEl(e){const t=document.createElement("div");t.className=z[e.senderType]??"msg system",e.content&&t.appendChild(document.createTextNode(e.content));for(const s of e.attachments??[])this.appendAttachment(t,s);return t}appendAttachment(e,t){if(t.url)if(t.mimeType.startsWith("image/")){const s=document.createElement("img");s.className="msg-img",s.src=t.url,s.alt=t.fileName,s.loading="lazy",s.addEventListener("click",()=>window.open(t.url,"_blank","noopener")),e.appendChild(s)}else{const s=document.createElement("a");s.className="msg-file",s.href=t.url,s.target="_blank",s.rel="noopener",s.textContent=`📎 ${t.fileName}`,e.appendChild(s)}}addLocal(e,t){const s=document.createElement("div");s.className=`msg ${t}`,s.textContent=e,this.list.appendChild(s),this.scrollDown(this.list)}renderHistory(e){this.list.innerHTML="",this.seen.clear();for(const t of e)this.addMessage(t)}showTicketAction(){if(this.list.querySelector(".action-ticket"))return;const e=document.createElement("button");e.className="action-ticket",e.textContent="Abrir chamado",e.addEventListener("click",()=>this.cb.onOpenTicket()),this.list.appendChild(e),this.scrollDown(this.list)}lockComposer(e){if(this.input.disabled=!0,this.input.value="",this.input.placeholder=e,this.sendBtn.disabled=!0,this.attachBtn.disabled=!0,!this.list.querySelector(".action-newchat")){const t=document.createElement("button");t.className="action-newchat",t.textContent="Iniciar nova conversa",t.addEventListener("click",()=>this.cb.onNewChat()),this.list.appendChild(t),this.scrollDown(this.list)}}reset(){this.list.innerHTML="",this.seen.clear(),this.input.disabled=!1,this.input.placeholder="Escreva sua mensagem...",this.sendBtn.disabled=!1,this.attachBtn.disabled=!1}openTicketModal(){this.modal.style.display="flex",this.backToList(),this.switchTab("new")}closeTicketModal(){this.modal.style.display="none",this.cb.onCloseThread()}switchTab(e){this.root.querySelector(".panel-new").style.display=e==="new"?"flex":"none",this.root.querySelector(".panel-list").style.display=e==="list"?"block":"none",this.root.querySelectorAll(".tab").forEach(t=>{const s=t;s.classList.toggle("active",s.dataset.tab===e)})}addTicketAttachment(e){const t=this.root.querySelector(".t-attachments"),s=document.createElement("span");s.className="chip",s.textContent=`📎 ${e}`,t.appendChild(s)}clearTicketForm(){this.root.querySelector(".t-subject").value="",this.root.querySelector(".t-desc").value="",this.root.querySelector(".t-attachments").innerHTML=""}setTicketResult(e){this.root.querySelector(".t-result").textContent=e}renderTickets(e){const t=this.root.querySelector(".tickets");if(!e.length){t.innerHTML='<p class="empty">Você ainda não abriu nenhum chamado.</p>';return}t.innerHTML="";for(const s of e){const o=document.createElement("div");o.className="ticket-row";const l=new Date(s.createdAt).toLocaleDateString("pt-BR");o.innerHTML=`
        <div class="ticket-subject"></div>
        <div class="ticket-meta"><span class="ticket-status s-${s.status}"></span><span class="ticket-date"></span></div>`,o.querySelector(".ticket-subject").textContent=s.subject,o.querySelector(".ticket-status").textContent=$[s.status]??s.status,o.querySelector(".ticket-date").textContent=l,o.addEventListener("click",()=>this.cb.onOpenThread(s.id)),t.appendChild(o)}}openThreadView(e){this.root.querySelector(".tabs").style.display="none",this.root.querySelector(".tab-content").style.display="none",this.root.querySelector(".thread").style.display="flex",this.root.querySelector(".thread-title").textContent=e,this.threadMessages.innerHTML="",this.threadSeen.clear(),this.lastRatingKey="";const t=this.root.querySelector(".thread-rating");t.style.display="none",t.innerHTML=""}backToList(){this.root.querySelector(".thread").style.display="none",this.root.querySelector(".tabs").style.display="flex",this.root.querySelector(".tab-content").style.display="block",this.cb.onCloseThread()}renderThreadMessages(e){this.threadMessages.innerHTML="",this.threadSeen.clear();for(const t of e)this.addThreadMessage(t)}addThreadMessage(e){return this.threadSeen.has(e.id)?!1:(this.threadSeen.add(e.id),this.threadMessages.appendChild(this.buildMessageEl(e)),this.scrollDown(this.threadMessages),!0)}renderThreadRating(e){const t=this.root.querySelector(".thread-rating"),s=e.status==="resolved"||e.status==="closed",o=`${s}:${e.csat??""}`;if(o===this.lastRatingKey)return;if(this.lastRatingKey=o,t.innerHTML="",!s){t.style.display="none";return}if(t.style.display="block",e.csat!=null){const d=document.createElement("div");d.className="rating-thanks",d.textContent=`Obrigado pela avaliação: ${"★".repeat(e.csat)}${"☆".repeat(5-e.csat)}`,t.appendChild(d);return}const l=document.createElement("div");l.className="rating-label",l.textContent="Como foi o atendimento?",t.appendChild(l);const h=document.createElement("div");h.className="rating-stars";for(let d=1;d<=5;d++){const c=document.createElement("button");c.type="button",c.className="star",c.textContent="★",c.setAttribute("aria-label",`${d} de 5`),c.addEventListener("mouseenter",()=>this.highlightStars(h,d)),c.addEventListener("mouseleave",()=>this.highlightStars(h,0)),c.addEventListener("click",()=>this.cb.onRateTicket(d)),h.appendChild(c)}t.appendChild(h)}highlightStars(e,t){e.querySelectorAll(".star").forEach((s,o)=>{s.classList.toggle("on",o<t)})}scrollDown(e){e.scrollTop=e.scrollHeight}template(){const e=this.cfg.color;return`
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
        .thread-rating { padding: 8px 12px; border-top: 1px solid #e5e7eb; background: #fff; text-align: center; }
        .rating-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
        .rating-stars { display: flex; justify-content: center; gap: 4px; }
        .rating-stars .star { border: none; background: transparent; cursor: pointer; font-size: 22px; line-height: 1; color: #d1d5db; padding: 0; }
        .rating-stars .star.on { color: #f59e0b; }
        .rating-thanks { font-size: 12px; color: #059669; }
      </style>
      <button class="launcher" aria-label="Abrir suporte">&#128172;<span class="badge" style="display:none">0</span></button>
      <div class="panel" role="dialog" aria-label="Suporte">
        <div class="header">
          <span class="title">${O(this.cfg.title)}</span>
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
            <div class="thread-rating" style="display:none"></div>
            <div class="thread-composer">
              <textarea class="thread-input" placeholder="Responder..."></textarea>
              <button class="thread-send" aria-label="Enviar">&#10148;</button>
            </div>
          </div>
        </div>
      </div>
    `}}function O(r){return r.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[e])}class H{constructor(){this.items=[]}enqueue(e){this.items.push(e)}size(){return this.items.length}peek(){return this.items[0]}clear(){this.items=[]}async flush(e){let t=0;for(;this.items.length>0;){const s=this.items[0];try{await e(s)}catch{break}this.items.shift(),t+=1}return t}}const u=document.currentScript;function R(r){const e=new L(r),t=new H;let s=null,o=!1,l=null,h=[],d=[],c=null,p=null,T=null;const k=`synova_session_${r.apiKey}`,g=`synova_seen_${r.apiKey}`,i=new N(r,{onOpen:v,onSend:j,onAttach:K,onOpenTicket:U,onNewChat:Y,onSubmitTicket:X,onAttachTicket:Q,onOpenThread:F,onSendThreadMessage:W,onCloseThread:_,onRateTicket:P});i.mount();async function v(){if(!o)try{const n=m(k)??void 0,a=await e.startSession(n?{sessionId:n}:{});s=a.sessionId,y(k,s),o=!0,i.renderHistory(a.history),i.setStatus(a.user.name?`Olá, ${a.user.name}!`:"Conectado",!0),m(g)||y(g,new Date().toISOString()),Z(),J(),E()}catch{i.setStatus("Sem conexão. Tentaremos novamente.",!1)}}async function j(n){i.addLocal(n,"user");const a=h;if(h=[],!o||!s){t.enqueue({content:n,attachmentIds:a}),i.setStatus("Offline: mensagem na fila."),v();return}await B({content:n,attachmentIds:a})}async function B(n){try{const a=await e.sendMessage(s,n.content,n.attachmentIds);a.reply&&i.addMessage({id:a.messageId+"-ai",senderType:"ai",content:a.reply,createdAt:new Date().toISOString()}),a.escalated&&i.showTicketAction(),i.setStatus("Conectado",!0)}catch{t.enqueue(n),i.setStatus("Offline: mensagem na fila.",!1)}}async function E(){!o||!s||await t.flush(async n=>{const a=await e.sendMessage(s,n.content,n.attachmentIds);a.reply&&i.addMessage({id:a.messageId+"-ai",senderType:"ai",content:a.reply,createdAt:new Date().toISOString()})})}async function K(n){try{const a=await e.upload(n);h.push(a.attachmentId),i.addLocal(`Anexo pronto: ${a.fileName}`,"system")}catch{i.addLocal("Não foi possível enviar o anexo.","system")}}function U(){i.openTicketModal(),q()}async function q(){if(o)try{const{tickets:n}=await e.listTickets();i.renderTickets(n),C()}catch{}}async function F(n){c=n;try{const{ticket:a,messages:f}=await e.getTicketThread(n);i.openThreadView(a.subject),i.renderThreadMessages(f),i.renderThreadRating(a)}catch{i.openThreadView("Chamado")}V(),C()}async function P(n){if(c)try{await e.rateTicket(c,n);const{ticket:a}=await e.getTicketThread(c);i.renderThreadRating(a)}catch{}}function _(){c=null,p&&(clearInterval(p),p=null)}async function W(n){if(c)try{const{message:a}=await e.sendTicketMessage(c,n);i.addThreadMessage(a)}catch{}}function V(){p||(p=setInterval(async()=>{if(c)try{const{ticket:n,messages:a}=await e.getTicketThread(c);for(const f of a)i.addThreadMessage(f);i.renderThreadRating(n)}catch{}},5e3))}function G(){return m(g)??new Date(0).toISOString()}function C(){y(g,new Date().toISOString()),i.setUnread(0)}function J(){T||(T=setInterval(I,1e4),I())}async function I(){if(o)try{const{newAdminMessages:n}=await e.getUpdates(G());i.setUnread(n)}catch{}}async function Q(n){try{const a=await e.upload(n);d.push(a.attachmentId),i.addTicketAttachment(a.fileName)}catch{i.setTicketResult("Não foi possível anexar o arquivo.")}}async function X(n){const a=n.description.trim();if(a.length<3){i.setTicketResult("Descreva um pouco mais o que você precisa.");return}const f=n.subject.trim()||a.slice(0,60);try{await e.openTicket({sessionId:s??void 0,category:"suporte",subject:f,description:a,attachmentIds:d}),d=[],i.clearTicketForm(),i.setTicketResult("Enviado ✓ A equipe vai responder por aqui."),await q(),i.switchTab("list"),i.lockComposer("Chamado aberto — inicie uma nova conversa se precisar.")}catch{i.setTicketResult("Não foi possível enviar. Tente de novo.")}}function Y(){o=!1,s=null,D(k),l&&(clearInterval(l),l=null),i.reset(),v()}function Z(){l||(l=setInterval(async()=>{if(!(!o||!s))try{const{history:n}=await e.fetchHistory(s,30);for(const a of n)i.addMessage(a)}catch{}},5e3))}window.addEventListener("online",()=>void E())}function m(r){try{return window.localStorage.getItem(r)}catch{return null}}function y(r,e){try{window.localStorage.setItem(r,e)}catch{}}function D(r){try{window.localStorage.removeItem(r)}catch{}}const x={init(r){const e=r??u;if(!e){console.error("Synova: não foi possível localizar a tag <script>.");return}try{const t=A(e,new URL(e.src,window.location.href).origin);R(t)}catch(t){console.error(t instanceof Error?t.message:"Synova: erro ao iniciar.")}}};return window.SynovaWidget=x,u!=null&&u.getAttribute("data-synova-key")&&x.init(u),b.SynovaWidget=x,Object.defineProperty(b,Symbol.toStringTag,{value:"Module"}),b}({});

/* ============================================================
   Synova — Páginas de serviço
   Fundo em "rede de conexões" + cursor + revelar ao rolar.
   Tudo protegido por guardas (não quebra se faltar elemento).
   ============================================================ */
(function () {
    "use strict";

    /* ---------- Rede de conexões (fundo) ---------- */
    var starsContainer = document.getElementById("stars");
    if (starsContainer) {
        var canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        starsContainer.appendChild(canvas);

        var ctx = canvas.getContext("2d");
        var w = 0, h = 0, nodes = [];
        var mouse = { x: null, y: null };
        var LINK_DIST = 150, MOUSE_DIST = 200;

        function nodeCount() {
            var area = w * h;
            return Math.min(110, Math.max(40, Math.floor(area / 16000)));
        }

        function createNodes() {
            nodes = [];
            var total = nodeCount();
            for (var i = 0; i < total; i++) {
                nodes.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4
                });
            }
        }

        function resize() {
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w;
            canvas.height = h;
            createNodes();
        }

        window.addEventListener("resize", resize);
        window.addEventListener("mousemove", function (e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        window.addEventListener("mouseout", function () {
            mouse.x = null;
            mouse.y = null;
        });

        function draw() {
            ctx.clearRect(0, 0, w, h);

            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > w) n.vx *= -1;
                if (n.y < 0 || n.y > h) n.vy *= -1;

                ctx.beginPath();
                ctx.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
                ctx.fill();
            }

            for (var a = 0; a < nodes.length; a++) {
                for (var b = a + 1; b < nodes.length; b++) {
                    var dx = nodes[a].x - nodes[b].x;
                    var dy = nodes[a].y - nodes[b].y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < LINK_DIST) {
                        ctx.beginPath();
                        ctx.moveTo(nodes[a].x, nodes[a].y);
                        ctx.lineTo(nodes[b].x, nodes[b].y);
                        ctx.strokeStyle = "rgba(255, 255, 255, " + (1 - dist / LINK_DIST) * 0.35 + ")";
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }

                if (mouse.x !== null) {
                    var mdx = nodes[a].x - mouse.x;
                    var mdy = nodes[a].y - mouse.y;
                    var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                    if (mdist < MOUSE_DIST) {
                        ctx.beginPath();
                        ctx.moveTo(nodes[a].x, nodes[a].y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.strokeStyle = "rgba(255, 255, 255, " + (1 - mdist / MOUSE_DIST) * 0.5 + ")";
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(draw);
        }

        resize();
        draw();
    }

    /* ---------- Cursor personalizado ---------- */
    var follower = document.getElementById("mouseFollower");
    if (follower) {
        var mx = 0, my = 0, fx = 0, fy = 0;
        document.addEventListener("mousemove", function (e) {
            mx = e.clientX;
            my = e.clientY;
        });
        (function loop() {
            fx += (mx - fx) * 0.1;
            fy += (my - fy) * 0.1;
            follower.style.left = fx + "px";
            follower.style.top = fy + "px";
            requestAnimationFrame(loop);
        })();
    }

    /* ---------- Revelar ao rolar ---------- */
    var reveals = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && reveals.length) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

        reveals.forEach(function (el) { observer.observe(el); });
    } else {
        reveals.forEach(function (el) { el.classList.add("is-visible"); });
    }
})();


/* ============================================================
   Filtro da página "Nossos Sistemas" (apenas visual)
   Compara data-filter do botão com data-cat de cada card.
   Só roda nas páginas que tiverem .sys-filter.
   ============================================================ */
(function () {
    "use strict";

    var filterBtns = document.querySelectorAll(".sys-filter");
    if (!filterBtns.length) return;

    var items = document.querySelectorAll(".sys-item");

    filterBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            var filtro = btn.getAttribute("data-filter");

            filterBtns.forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");

            items.forEach(function (item) {
                var cat = item.getAttribute("data-cat");
                var mostrar = (filtro === "todos" || cat === filtro);
                item.style.display = mostrar ? "" : "none";
            });
        });
    });
})();


/* ============================================================
   Modal "Entre em Contato" nas páginas internas.
   Qualquer botão .js-open-orcamento abre o modal (em vez de ir
   direto ao WhatsApp). O modal é injetado só quando há um gatilho
   na página; o CSS já vem de /tooplate-parallax-depth.css.
   ============================================================ */
(function () {
    "use strict";

    var WHATSAPP_NUMBER = "5562994757240";
    var triggers = document.querySelectorAll(".js-open-orcamento");
    if (!triggers.length) return;

    var modal = document.getElementById("orcamento-modal");
    if (!modal) {
        var holder = document.createElement("div");
        holder.innerHTML =
            '<div class="orcamento-modal" id="orcamento-modal">' +
            '<div class="orcamento-modal-overlay"></div>' +
            '<div class="orcamento-modal-box">' +
            '<button class="orcamento-close" id="close-orcamento-modal" type="button">&times;</button>' +
            '<h2 class="orcamento-title">Entre em Contato</h2>' +
            '<p style="text-align:center; margin:-14px 0 22px; opacity:0.9;">Vamos conversar sobre o seu projeto!</p>' +
            '<form id="orcamento-form">' +
            '<div class="orcamento-row">' +
            '<select id="tipo-negocio" name="tipo-negocio" class="orcamento-input" required>' +
            '<option value="" disabled selected>Você já tem ideia do seu negócio?</option>' +
            '<option>Já tenho ideia sobre o meu negócio</option>' +
            '<option>Não tenho ideia sobre o meu negócio</option>' +
            '</select>' +
            '</div>' +
            '<div class="orcamento-row">' +
            '<input type="text" id="nome" name="nome" class="orcamento-input" placeholder="Nome" required />' +
            '<input type="email" id="email" name="email" class="orcamento-input" placeholder="Email" required />' +
            '</div>' +
            '<div class="orcamento-row">' +
            '<select id="servico" name="servico" class="orcamento-input" required>' +
            '<option value="" disabled selected>Qual serviço você precisa?</option>' +
            '<option>Desenvolvimento Web</option>' +
            '<option>App Mobile (iOS/Android)</option>' +
            '<option>Sistema Sob Medida</option>' +
            '<option>E-commerce / Loja Virtual</option>' +
            '<option>Integração / API</option>' +
            '<option>Mais de um Serviço</option>' +
            '<option>Ainda não sei</option>' +
            '</select>' +
            '</div>' +
            '<button type="submit" class="orcamento-submit">CHAMAR NO WHATSAPP</button>' +
            '</form>' +
            '</div>' +
            '</div>';
        document.body.appendChild(holder.firstChild);
        modal = document.getElementById("orcamento-modal");
    }

    var overlay = modal.querySelector(".orcamento-modal-overlay");
    var closeBtn = document.getElementById("close-orcamento-modal");
    var form = document.getElementById("orcamento-form");

    function openModal(e) {
        if (e) e.preventDefault();
        modal.classList.add("show");
    }

    function closeModal() {
        modal.classList.remove("show");
    }

    triggers.forEach(function (btn) {
        btn.addEventListener("click", openModal);
    });
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (overlay) overlay.addEventListener("click", closeModal);

    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            var tipoNegocio = document.getElementById("tipo-negocio").value;
            var nome = document.getElementById("nome").value.trim();
            var email = document.getElementById("email").value.trim();
            var servico = document.getElementById("servico").value;

            if (!tipoNegocio || !nome || !email || !servico) {
                alert("Por favor, preencha todos os campos.");
                return;
            }

            var mensagem =
                "Olá, meu nome é " + nome + ".\n" +
                "Email: " + email + "\n" +
                "Sobre o negócio: " + tipoNegocio + "\n" +
                "Serviço desejado: " + servico + "\n\n" +
                "Gostaria de conversar sobre um projeto.";

            var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(mensagem);
            window.open(url, "_blank");

            closeModal();
            form.reset();
        });
    }
})();

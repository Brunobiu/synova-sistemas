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

(() => {
  gsap.registerPlugin(ScrollTrigger);

  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
    else $(target)?.scrollIntoView({ behavior: "smooth" });
  };

  /* ---------- Text splitting ---------- */
  // Hover-only effect: skip the extra DOM on touch devices.
  if (finePointer)
    $$("[data-roll]").forEach((el) => {
      const text = el.textContent;
      el.innerHTML =
        `<span class="sr-only">${text}</span>` +
        [...text]
          .map((c, i) => `<span class="roll__char" aria-hidden="true" style="--i:${i}" data-char="${c}">${c}</span>`)
          .join("");
    });

  const splitWords = (el, wrap) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words
      .map((w) => (wrap ? `<span class="wmask"><span class="word">${w}</span></span>` : `<span class="word">${w}</span>`))
      .join(" ");
    return $$(".word", el);
  };

  const heroName = $(".hero__name");
  heroName.innerHTML = [...heroName.textContent]
    .map((c) => `<span class="char-wrap"><span class="char">${c}</span></span>`)
    .join("");
  const heroChars = $$(".char", heroName);

  const fitHeroName = () => {
    const avail = heroName.parentElement.clientWidth - parseFloat(getComputedStyle(heroName.parentElement).paddingLeft) * 2;
    heroName.style.fontSize = "100px";
    heroName.style.width = "max-content";
    const natural = heroName.offsetWidth;
    heroName.style.width = "";
    heroName.style.fontSize = `${(100 * avail) / natural}px`;
  };
  document.fonts?.addEventListener("loadingdone", fitHeroName);

  /* ---------- Loader + hero intro ---------- */
  const heroImg = $(".hero__img");
  const imgReady = heroImg.complete
    ? Promise.resolve()
    : new Promise((res) => {
        heroImg.addEventListener("load", res, { once: true });
        heroImg.addEventListener("error", res, { once: true });
      });
  // Fonts stylesheet loads async (media="print" swap), so wait for it before trusting document.fonts.ready.
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fontLink = $('link[rel="stylesheet"][href*="fonts.googleapis"]');
  const sheetReady = new Promise((res) => {
    if (!fontLink || fontLink.media === "all") return res();
    fontLink.addEventListener("load", res, { once: true });
    fontLink.addEventListener("error", res, { once: true });
  });
  const fontsReady = Promise.race([
    sheetReady.then(() => new Promise((r) => requestAnimationFrame(r))).then(() => document.fonts?.ready),
    wait(2500),
  ]);
  const repeatVisit = sessionStorage.getItem("sk-visited") === "1";
  sessionStorage.setItem("sk-visited", "1");

  gsap.set(heroChars, { yPercent: 110 });
  gsap.set(".hero__meta > *", { autoAlpha: 0, y: 20 });
  gsap.set(heroImg, { scale: 1.25 });

  const counter = { v: 0 };
  const loaderNum = $(".loader__num");
  const loadTween = gsap.to(counter, {
    v: 100,
    duration: reduceMotion ? 0.2 : repeatVisit ? 0.5 : 1.2,
    ease: "power2.inOut",
    onUpdate: () => {
      loaderNum.textContent = Math.round(counter.v);
      gsap.set(".loader__bar span", { scaleX: counter.v / 100 });
    },
    paused: true,
  });

  Promise.all([fontsReady, new Promise((r) => loadTween.eventCallback("onComplete", r).play())])
    .then(() => imgReady)
    .then(() => {
      fitHeroName();
      const tl = gsap.timeline({
        defaults: { ease: "expo.inOut" },
        onComplete: () => {
          body.classList.remove("is-loading");
          lenis?.start();
          ScrollTrigger.refresh();
        },
      });
      tl.to(".loader__count, .loader__top", { yPercent: -40, autoAlpha: 0, duration: 0.8, ease: "power3.in" })
        .to(".loader", { clipPath: "inset(0 0 100% 0)", duration: 1.2 }, "-=0.2")
        .to(heroImg, { scale: 1, duration: 2, ease: "expo.out" }, "-=0.9")
        .to(heroChars, { yPercent: 0, duration: 1.4, stagger: 0.06, ease: "expo.out" }, "-=1.9")
        .to(".script--left .script__inner", { clipPath: "inset(0 0% 0 0)", duration: 1.2, ease: "power2.inOut" }, "-=1.0")
        .to(".script--right .script__inner", { clipPath: "inset(0 0% 0 0)", duration: 1.0, ease: "power2.inOut" }, "-=0.7")
        .to(".hero__meta > *", { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: "power3.out" }, "-=1.4")
        .set(".loader", { display: "none" });
    });

  /* ---------- Hero scroll + mouse parallax ---------- */
  gsap.timeline({
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  })
    .to(".hero__media", { yPercent: 18, scale: 1.08, ease: "none" }, 0)
    .to(".hero__meta", { yPercent: -120, autoAlpha: 0, ease: "none" }, 0)
    .to(".script--left", { xPercent: -30, yPercent: -60, ease: "none" }, 0)
    .to(".script--right", { xPercent: 30, yPercent: -60, ease: "none" }, 0);

  ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: true,
    onUpdate: (self) => {
      if (body.classList.contains("is-loading")) return;
      heroChars.forEach((c, i) => {
        const mid = (heroChars.length - 1) / 2;
        gsap.set(c, { yPercent: -self.progress * (40 + Math.abs(i - mid) * 22) });
      });
    },
  });

  if (finePointer) {
    const hx = gsap.quickTo(heroImg, "x", { duration: 1.2, ease: "power3.out" });
    const hy = gsap.quickTo(heroImg, "y", { duration: 1.2, ease: "power3.out" });
    $(".hero").addEventListener("mousemove", (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      hx(nx * -24);
      hy(ny * -16);
    });
  }

  /* ---------- Header hide/show ---------- */
  const header = $(".header");
  let lastY = 0;
  const onScroll = (y) => {
    if (body.classList.contains("menu-open")) return;
    header.classList.toggle("is-hidden", y > lastY && y > window.innerHeight * 0.6);
    lastY = y;
  };
  if (lenis) lenis.on("scroll", ({ scroll }) => onScroll(scroll));
  else window.addEventListener("scroll", () => onScroll(window.scrollY), { passive: true });

  /* ---------- Custom scrollbar ---------- */
  const bar = $(".scrollbar");
  const thumb = $(".scrollbar__thumb");
  const currentScroll = () => (lenis ? lenis.scroll : window.scrollY);
  let thumbH = 0;
  let maxScroll = 0;
  let idleTimer;

  const measureBar = () => {
    const vh = window.innerHeight;
    maxScroll = document.documentElement.scrollHeight - vh;
    thumbH = Math.max(40, (vh * vh) / (maxScroll + vh));
    thumb.style.height = `${thumbH}px`;
  };

  const updateBar = (scroll = currentScroll()) => {
    const y = maxScroll > 0 ? (scroll / maxScroll) * (window.innerHeight - thumbH) : 0;
    thumb.style.transform = `translate3d(0, ${y}px, 0)`;
  };

  const pingBar = () => {
    bar.classList.add("is-active");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => bar.classList.remove("is-active"), 1000);
  };

  const scrollInstant = (y) => (lenis ? lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y));

  if (lenis)
    lenis.on("scroll", ({ scroll }) => {
      updateBar(scroll);
      pingBar();
    });
  else
    window.addEventListener("scroll", () => {
      updateBar();
      pingBar();
    }, { passive: true });

  thumb.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    thumb.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startScroll = currentScroll();
    const ratio = maxScroll / (window.innerHeight - thumbH);
    bar.classList.add("is-dragging");
    body.classList.add("is-dragging-scroll");
    const move = (ev) => scrollInstant(startScroll + (ev.clientY - startY) * ratio);
    const up = () => {
      bar.classList.remove("is-dragging");
      body.classList.remove("is-dragging-scroll");
      thumb.removeEventListener("pointermove", move);
      thumb.removeEventListener("pointerup", up);
      thumb.removeEventListener("pointercancel", up);
    };
    thumb.addEventListener("pointermove", move);
    thumb.addEventListener("pointerup", up);
    thumb.addEventListener("pointercancel", up);
  });

  bar.addEventListener("pointerdown", (e) => {
    if (e.target === thumb) return;
    const p = (e.clientY - thumbH / 2) / (window.innerHeight - thumbH);
    scrollTo(gsap.utils.clamp(0, maxScroll, p * maxScroll));
  });

  ScrollTrigger.addEventListener("refresh", () => {
    measureBar();
    updateBar();
  });
  measureBar();
  updateBar();

  /* ---------- Fullscreen menu ---------- */
  const burger = $(".burger");
  const menu = $(".menu");
  const menuTl = gsap
    .timeline({
      paused: true,
      defaults: { ease: "expo.inOut" },
      onReverseComplete: () => menu.classList.remove("is-open"),
    })
    .fromTo(".menu__panel", { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1 })
    .fromTo(".menu__text", { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.06, ease: "expo.out" }, "-=0.45")
    .fromTo(".menu__num", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.06 }, "<0.2")
    .fromTo(".menu__fade", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out" }, "<");

  let menuOpen = false;
  const toggleMenu = (force) => {
    menuOpen = typeof force === "boolean" ? force : !menuOpen;
    burger.classList.toggle("is-open", menuOpen);
    burger.setAttribute("aria-expanded", menuOpen);
    burger.setAttribute("aria-label", menuOpen ? "Close menu" : "Open menu");
    menu.inert = !menuOpen;
    body.classList.toggle("menu-open", menuOpen);
    header.classList.remove("is-hidden");
    if (menuOpen) {
      lenis?.stop();
      menu.classList.add("is-open");
      menuTl.timeScale(1).play();
    } else {
      lenis?.start();
      menuTl.timeScale(1.6).reverse();
    }
  };
  burger.addEventListener("click", () => toggleMenu());
  document.addEventListener("keydown", (e) => e.key === "Escape" && menuOpen && toggleMenu(false));

  $$("[data-scroll-to]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const hash = a.getAttribute("href");
      if (!hash || !hash.startsWith("#")) return;
      e.preventDefault();
      const target = hash === "#top" ? 0 : hash;
      if (menuOpen) {
        toggleMenu(false);
        gsap.delayedCall(0.7, () => scrollTo(target));
      } else scrollTo(target);
    });
  });

  /* ---------- Deferred below-the-fold setup ---------- */
  // Each task runs in its own idle slot so startup never produces one long main-thread block.
  const idle = window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 0 }), 1));
  const deferred = [];
  const defer = (fn) => deferred.push(fn);
  const runDeferred = (deadline) => {
    do deferred.shift()();
    while (deferred.length && deadline.timeRemaining() > 8);
    if (deferred.length) idle(runDeferred, { timeout: 300 });
  };

  /* ---------- Reveals ---------- */
  defer(() =>
    $$("[data-lines]").forEach((el) => {
      gsap.from(splitWords(el, true), {
        yPercent: 110,
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.035,
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    })
  );

  // Scroll-driven colour sweep: dim -> accent band -> full colour, character by character.
  const accentRGB = gsap.utils.splitColor(getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
  const rgba = (c) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3].toFixed(3)})`;
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  $$("[data-words]").forEach((el) => defer(() => {
    const text = el.textContent.trim();
    el.innerHTML =
      `<span class="sr-only">${text}</span><span aria-hidden="true">` +
      text
        .split(/\s+/)
        .map((w) => `<span class="w">${[...w].map((c) => `<span class="ch">${c}</span>`).join("")}</span>`)
        .join(" ") +
      "</span>";
    const chars = $$(".ch", el);
    const base = gsap.utils.splitColor(getComputedStyle(el).color).slice(0, 3);
    const full = [...base, 1];
    const dim = [...base, 0.2];
    const red = [...accentRGB.slice(0, 3), 1];
    const n = chars.length;
    const maxBand = Math.max(14, Math.round(n * 0.16));
    const edge = 4;
    // head = leading edge of the red band (follows scroll); tail = where black begins (eases after head).
    const state = { head: 0, tail: 0 };

    const paint = () => {
      const { head, tail } = state;
      chars.forEach((ch, i) => {
        const a = head - i;
        let c = dim;
        if (a > 0) {
          c = mix(dim, red, Math.min(1, a / edge));
          const b = tail - i;
          if (b > 0) c = mix(c, full, Math.min(1, b / edge));
        }
        const s = rgba(c);
        if (ch._c !== s) ch.style.color = ch._c = s;
      });
    };

    // Tail follows head with frame-rate independent damping, so the lag scales with scroll speed
    // and settles on the same curve whether scrolling or stopped.
    const follow = 5;
    let ticking = false;
    const step = (time, dt) => {
      const target = state.head + edge;
      state.tail += (target - state.tail) * (1 - Math.exp((-follow * dt) / 1000));
      state.tail = gsap.utils.clamp(state.head - maxBand, target, state.tail);
      if (Math.abs(target - state.tail) < 0.02) {
        state.tail = target;
        gsap.ticker.remove(step);
        ticking = false;
      }
      paint();
    };

    const update = (p) => {
      state.head = p * (n + edge);
      state.tail = gsap.utils.clamp(state.head - maxBand, state.head + edge, state.tail);
      paint();
      if (!ticking) {
        ticking = true;
        gsap.ticker.add(step);
      }
    };

    paint();
    ScrollTrigger.create({
      trigger: el,
      start: "top 78%",
      end: "bottom 42%",
      onUpdate: (self) => update(self.progress),
      onRefresh: (self) => update(self.progress),
    });
  }));

  defer(() => {
    $$("[data-reveal]").forEach((el) => {
      gsap.from(el, {
        y: 60,
        autoAlpha: 0,
        duration: 1.2,
        ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
      });
    });

    gsap.from(".contact__line > span", {
      yPercent: 110,
      duration: 1.4,
      ease: "expo.out",
      stagger: 0.12,
      scrollTrigger: { trigger: ".contact__title", start: "top 85%" },
    });

    gsap.from(".footer__big", {
      yPercent: 60,
      ease: "none",
      scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true },
    });
  });

  /* ---------- Counters ---------- */
  defer(() =>
    $$("[data-count]").forEach((el) => {
      const end = +el.dataset.count;
      const suffix = el.dataset.suffix || "";
      const o = { v: end > 1000 ? end - 30 : 0 };
      ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        once: true,
        onEnter: () =>
          gsap.to(o, {
            v: end,
            duration: 2,
            ease: "power3.out",
            onUpdate: () => (el.textContent = Math.round(o.v) + suffix),
          }),
      });
    })
  );

  /* ---------- Marquee (reacts to scroll velocity/direction) ---------- */
  defer(() => {
    const marqueeTweens = $$(".marquee").map((m) => {
      const track = $(".marquee__track", m);
      m.appendChild(track.cloneNode(true)).setAttribute("aria-hidden", "true");
      const tracks = $$(".marquee__track", m);
      const reverse = m.classList.contains("marquee--reverse");
      const tween = gsap.fromTo(
        tracks,
        { xPercent: reverse ? -100 : 0 },
        { xPercent: reverse ? 0 : -100, duration: 28, ease: "none", repeat: -1 }
      );
      // Start deep into the infinite repeat so a negative timeScale never hits time 0 and stalls.
      return tween.totalTime(tween.duration() * 1000);
    });

    let marqueeDir = 1;
    const setMarqueeSpeed = (velocity) => {
      if (velocity !== 0) marqueeDir = Math.sign(velocity);
      const speed = marqueeDir * (1 + Math.min(Math.abs(velocity) * 0.08, 5));
      marqueeTweens.forEach((t) => gsap.to(t, { timeScale: speed, duration: 0.4, overwrite: true }));
    };
    if (lenis) lenis.on("scroll", ({ velocity }) => setMarqueeSpeed(velocity));
  });

  /* ---------- Theme switch for the lab ---------- */
  defer(() =>
    ScrollTrigger.create({
      trigger: ".lab",
      start: "top 55%",
      end: "bottom 45%",
      onToggle: (self) => body.classList.toggle("is-dark", self.isActive),
    })
  );

  idle(runDeferred, { timeout: 300 });

  /* ---------- Cursor ---------- */
  const cursor = $(".cursor");
  if (finePointer) {
    const cx = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3.out" });
    const cy = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3.out" });
    window.addEventListener("mousemove", (e) => {
      cx(e.clientX);
      cy(e.clientY);
    });
    document.addEventListener("mouseover", (e) => {
      const onProject = e.target.closest(".project");
      const onLink = e.target.closest("a, button, input, textarea");
      cursor.classList.toggle("is-view", !!onProject);
      cursor.classList.toggle("is-hover", !onProject && !!onLink);
    });
  }

  /* ---------- Project preview ---------- */
  const preview = $(".preview");
  const previewTrack = $(".preview__track");
  if (finePointer) {
    const px = gsap.quickTo(preview, "x", { duration: 0.6, ease: "power3.out" });
    const py = gsap.quickTo(preview, "y", { duration: 0.6, ease: "power3.out" });
    const projects = $(".projects");
    projects.addEventListener("mousemove", (e) => {
      px(e.clientX);
      py(e.clientY);
    });
    $$(".project").forEach((p) => {
      p.addEventListener("mouseenter", (e) => {
        previewTrack.style.transform = `translateY(${-p.dataset.index * 100}%)`;
        gsap.set(preview, { x: e.clientX, y: e.clientY });
      });
    });
    projects.addEventListener("mouseenter", () =>
      gsap.to(preview, { autoAlpha: 1, scale: 1, xPercent: -50, yPercent: -50, duration: 0.5, ease: "power3.out" })
    );
    projects.addEventListener("mouseleave", () => gsap.to(preview, { autoAlpha: 0, scale: 0.6, duration: 0.4, ease: "power3.in" }));
    gsap.set(preview, { xPercent: -50, yPercent: -50 });
  }

  /* ---------- Magnetic elements ---------- */
  if (finePointer) {
    $$("[data-magnetic]").forEach((el) => {
      const strength = el.classList.contains("burger") ? 0.45 : 0.3;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - (r.left + r.width / 2)) * strength,
          y: (e.clientY - (r.top + r.height / 2)) * strength,
          duration: 0.6,
          ease: "power3.out",
        });
      });
      el.addEventListener("mouseleave", () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.35)" }));
    });

    const paper = $(".paper");
    paper.addEventListener("mousemove", (e) => {
      const r = paper.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(paper, { rotateY: nx * 10, rotateX: -ny * 10, transformPerspective: 900, duration: 0.6, ease: "power3.out" });
    });
    paper.addEventListener("mouseleave", () => gsap.to(paper, { rotateX: 0, rotateY: 0, duration: 1, ease: "elastic.out(1, 0.4)" }));
  }

  /* ---------- Neural network canvas ---------- */
  const canvas = $(".lab__canvas");
  const ctx = canvas.getContext("2d");
  const mouse = { x: -9999, y: -9999 };
  let nodes = [];
  let running = false;
  let w = 0;
  let h = 0;

  const resizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(110, (w * h) / 14000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.8,
    }));
  };

  const draw = () => {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    const linkDist = 130;
    for (const n of nodes) {
      const dx = mouse.x - n.x;
      const dy = mouse.y - n.y;
      const d = Math.hypot(dx, dy);
      if (d < 180) {
        n.vx += (dx / d) * 0.02;
        n.vy += (dy / d) * 0.02;
      }
      n.vx *= 0.985;
      n.vy *= 0.985;
      n.x += n.vx + (Math.random() - 0.5) * 0.05;
      n.y += n.vy + (Math.random() - 0.5) * 0.05;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < linkDist) {
          ctx.strokeStyle = `rgba(246,246,244,${(1 - d / linkDist) * 0.18})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (md < 180) {
        ctx.strokeStyle = `rgba(212,42,31,${(1 - md / 180) * 0.7})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
      ctx.fillStyle = md < 180 ? "#d42a1f" : "rgba(246,246,244,0.6)";
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  };

  const lab = $(".lab");
  lab.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  lab.addEventListener("mouseleave", () => {
    mouse.x = mouse.y = -9999;
  });

  resizeCanvas();
  new IntersectionObserver(([entry]) => {
    const was = running;
    running = entry.isIntersecting && !reduceMotion;
    if (running && !was) requestAnimationFrame(draw);
  }).observe(lab);

  /* ---------- Contact form (mailto) ---------- */
  const form = $(".form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    $$("input, textarea", form).forEach((f) => {
      const valid = f.checkValidity() && f.value.trim() !== "";
      f.closest(".field").classList.toggle("is-invalid", !valid);
      ok = ok && valid;
    });
    if (!ok) return;
    const data = new FormData(form);
    const to = $(".form__note a").getAttribute("href").replace("mailto:", "");
    const subject = encodeURIComponent(`Hello from ${data.get("name")}`);
    const bodyText = encodeURIComponent(`${data.get("message")}\n\n- ${data.get("name")} (${data.get("email")})`);
    window.location.href = `mailto:${to}?subject=${subject}&body=${bodyText}`;
  });

  /* ---------- Tab title when away ---------- */
  const pageTitle = document.title;
  document.addEventListener("visibilitychange", () => {
    document.title = document.hidden ? "Come back - let's build ✦" : pageTitle;
  });

  /* ---------- Clock + year ---------- */
  const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const tick = () => $$("[data-clock]").forEach((el) => (el.textContent = fmt.format(new Date())));
  tick();
  setInterval(tick, 15000);
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- Resize ---------- */
  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      fitHeroName();
      resizeCanvas();
      ScrollTrigger.refresh();
    }, 150);
  });
})();

(() => {
  "use strict";

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const loader = document.querySelector(".loader");
  const body = document.body;
  const nav = document.querySelector(".nav");
  const resumeLink = document.querySelector(".resume-button");
  const resumeStatus = document.querySelector(".resume-status");

  if (nav) {
    const updateNavScrollState = () => {
      nav.classList.toggle("is-scrolled", window.scrollY > 8);
    };

    window.addEventListener("scroll", updateNavScrollState, { passive: true });
    updateNavScrollState();
  }

  if (resumeLink && resumeStatus) {
    resumeLink.addEventListener("click", (event) => {
      if (resumeLink.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
      }
    });

    if (window.location.protocol === "file:") {
      resumeStatus.textContent = "Resume download requires the site to be served over HTTP.";
    } else {
      fetch(resumeLink.href, { method: "HEAD" })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Resume PDF check failed with HTTP ${response.status}.`);
          }

          resumeLink.setAttribute("aria-disabled", "false");
          resumeLink.removeAttribute("tabindex");
          resumeStatus.textContent = "";
        })
        .catch((error) => {
          resumeStatus.textContent = "Resume PDF unavailable. Add the file at public/resume.pdf.";
          console.warn("Resume download is unavailable.", error);
        });
    }
  }

  if (reduceMotion) {
    if (loader) loader.remove();

    document.querySelectorAll(".name-word").forEach((el) => {
      el.style.transform = "translateY(0)";
    });

    return;
  }

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    if (loader) loader.remove();
    document.querySelectorAll(".name-word").forEach((el) => {
      el.style.transform = "translateY(0)";
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  body.classList.add("is-loading");

  const cursor = document.querySelector(".cursor");
  const cursorDot = document.querySelector(".cursor-dot");
  const resumeIcon = resumeLink?.querySelector(".resume-icon");
  const heroName = document.querySelector(".hero-name");
  const nameWords = heroName ? Array.from(heroName.querySelectorAll(".name-word")) : [];
  const nameCharacters = nameWords.map((word) => {
    const characters = Array.from(word.textContent, (character, index) => {
      const span = document.createElement("span");
      span.className = "name-character";
      span.textContent = character;
      span.style.setProperty("--fragment-x", `${Math.sin(index * 2.17) * 1.2}px`);
      span.style.setProperty("--fragment-y", `${Math.cos(index * 1.63) * 0.35}px`);
      return span;
    });

    word.replaceChildren(...characters);
    return characters;
  });

  const canUseMagneticField = heroName
    && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let nameReady = false;

  if (heroName) {
    heroName.classList.add("name-is-initializing");
    heroName.style.setProperty("--identity-scan-y", "-3%");
  }

  if (canUseMagneticField) {
    const magneticCharacters = nameCharacters.flat().map((element) => ({
      element,
      bounds: null,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0
    }));
    let magneticRange = window.innerWidth <= 900 ? 72 : 96;
    let magneticStrength = window.innerWidth <= 900 ? 1.15 : 2;
    let pointerPosition = null;
    let animationFrame = 0;
    let lastGlitchedCharacter = null;
    let lastGlitchTime = 0;
    let glitchTimer = 0;

    const cacheCharacterBounds = () => {
      magneticCharacters.forEach((character) => {
        character.bounds = character.element.getBoundingClientRect();
      });
    };

    const animateMagneticField = () => {
      animationFrame = 0;

      if (!nameReady) return;

      let hasUnsettledCharacter = false;

      magneticCharacters.forEach((character) => {
        if (pointerPosition && character.bounds) {
          const centerX = character.bounds.left + character.bounds.width / 2;
          const centerY = character.bounds.top + character.bounds.height / 2;
          const dx = pointerPosition.x - centerX;
          const dy = pointerPosition.y - centerY;
          const distance = Math.hypot(dx, dy);
          const influence = Math.max(0, 1 - distance / magneticRange);

          if (influence > 0 && distance > 0) {
            const displacement = magneticStrength * influence * influence;
            character.targetX = (dx / distance) * displacement;
            character.targetY = (dy / distance) * displacement;
          } else {
            character.targetX = 0;
            character.targetY = 0;
          }
        } else {
          character.targetX = 0;
          character.targetY = 0;
        }

        character.x += (character.targetX - character.x) * 0.24;
        character.y += (character.targetY - character.y) * 0.24;

        if (Math.abs(character.targetX - character.x) <= 0.015) {
          character.x = character.targetX;
        }

        if (Math.abs(character.targetY - character.y) <= 0.015) {
          character.y = character.targetY;
        }

        character.element.style.setProperty("--magnetic-x", `${character.x.toFixed(2)}px`);
        character.element.style.setProperty("--magnetic-y", `${character.y.toFixed(2)}px`);
        character.element.style.setProperty(
          "--magnetic-z",
          `${(Math.max(0, 1 - Math.hypot(character.x, character.y) / magneticStrength) * 1.5).toFixed(2)}px`
        );

        if (Math.abs(character.targetX - character.x) > 0.015
          || Math.abs(character.targetY - character.y) > 0.015) {
          hasUnsettledCharacter = true;
        }
      });

      if (hasUnsettledCharacter) {
        animationFrame = window.requestAnimationFrame(animateMagneticField);
      }
    };

    const requestMagneticFrame = () => {
      if (nameReady && !animationFrame) {
        animationFrame = window.requestAnimationFrame(animateMagneticField);
      }
    };

    heroName.addEventListener("pointerenter", () => {
      if (!nameReady) return;
      cacheCharacterBounds();
    });

    heroName.addEventListener("pointermove", (event) => {
      if (!nameReady) return;

      if (!magneticCharacters[0]?.bounds) {
        cacheCharacterBounds();
      }

      pointerPosition = { x: event.clientX, y: event.clientY };
      requestMagneticFrame();
    });

    heroName.addEventListener("pointerleave", () => {
      pointerPosition = null;
      requestMagneticFrame();
    });

    heroName.addEventListener("pointerover", (event) => {
      if (!nameReady) return;

      const character = event.target.closest(".name-character");

      if (!character || character === event.relatedTarget?.closest?.(".name-character")) return;

      const now = performance.now();

      if (character === lastGlitchedCharacter || now - lastGlitchTime < 110) return;

      lastGlitchedCharacter = character;
      lastGlitchTime = now;
      character.classList.add("is-micro-glitch");
      window.clearTimeout(glitchTimer);
      glitchTimer = window.setTimeout(() => {
        character.classList.remove("is-micro-glitch");
        lastGlitchedCharacter = null;
      }, 55);
    });

    window.addEventListener("resize", () => {
      magneticRange = window.innerWidth <= 900 ? 72 : 96;
      magneticStrength = window.innerWidth <= 900 ? 1.15 : 2;

      if (pointerPosition) cacheCharacterBounds();
    });
  }

  if (resumeLink && resumeIcon) {
    resumeLink.addEventListener("mouseenter", () => {
      gsap.to(resumeLink, { scale: 1.035, duration: 0.2, ease: "power2.out" });
      gsap.to(resumeIcon, { y: 2, duration: 0.2, ease: "power2.out" });
    });

    resumeLink.addEventListener("mouseleave", () => {
      gsap.to(resumeLink, { scale: 1, duration: 0.25, ease: "power2.out" });
      gsap.to(resumeIcon, { y: 0, duration: 0.25, ease: "power2.out" });
    });

    resumeLink.addEventListener("pointerdown", () => {
      if (resumeLink.getAttribute("aria-disabled") !== "true") {
        gsap.to(resumeLink, { scale: 0.97, duration: 0.1, ease: "power1.out" });
      }
    });

    resumeLink.addEventListener("pointerup", () => {
      if (resumeLink.getAttribute("aria-disabled") !== "true") {
        gsap.to(resumeLink, { scale: 1.035, duration: 0.15, ease: "power2.out" });
      }
    });
  }

  const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };

  if (cursor && cursorDot && window.innerWidth > 700) {
    window.addEventListener("mousemove", (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    });

    gsap.ticker.add(() => {
      gsap.set(cursor, {
        x: mouse.x,
        y: mouse.y
      });

      gsap.set(cursorDot, {
        x: mouse.x,
        y: mouse.y
      });
    });

    document.querySelectorAll("a, .skill-card, .project-card").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        cursor.classList.add("active");
      });

      el.addEventListener("mouseleave", () => {
        cursor.classList.remove("active");
      });
    });
  }


  const loaderNumber = document.querySelector(".loader-number");
  const loaderProgress = document.querySelector(".loader-progress");

  const loaderTimeline = gsap.timeline({
    onComplete: () => {
      body.classList.remove("is-loading");

      if (loader) {
        loader.style.pointerEvents = "none";
      }
    }
  });

  loaderTimeline
    .to(loaderProgress, {
      width: "100%",
      duration: 1.4,
      ease: "power3.inOut"
    })
    .to(loaderNumber, {
      opacity: 0,
      y: -20,
      duration: 0.35,
      ease: "power2.in"
    }, "-=.25")
    .to(loader, {
      yPercent: -100,
      duration: 1,
      ease: "power4.inOut"
    })
    .set(loader, {
      display: "none"
    });


  const heroTimeline = gsap.timeline({
    delay: 1.55,
    defaults: {
      ease: "power4.out"
    }
  });

  heroTimeline
    .from(".nav", {
      y: -30,
      opacity: 0,
      duration: 0.8
    })
    .from(".hero-top", {
      y: 30,
      opacity: 0,
      duration: 0.8
    }, "-=.45")
    .addLabel("identityScan", "-=.35")
    .to(heroName, {
      "--identity-scan-y": "103%",
      duration: 0.78,
      ease: "none"
    }, "identityScan")
    .to(nameCharacters[0], {
      "--fragment-x": "0px",
      "--fragment-y": "0px",
      opacity: 1,
      filter: "blur(0px)",
      textShadow: "0 0 0 rgba(215,255,56,0)",
      duration: 0.24,
      ease: "power2.out"
    }, "identityScan+=.12")
    .to(nameCharacters[1], {
      "--fragment-x": "0px",
      "--fragment-y": "0px",
      opacity: 1,
      filter: "blur(0px)",
      textShadow: "0 0 0 rgba(215,255,56,0)",
      duration: 0.24,
      ease: "power2.out"
    }, "identityScan+=.34")
    .to(nameCharacters[2], {
      "--fragment-x": "0px",
      "--fragment-y": "0px",
      opacity: 1,
      filter: "blur(0px)",
      textShadow: "0 0 0 rgba(215,255,56,0)",
      duration: 0.24,
      ease: "power2.out"
    }, "identityScan+=.56")
    .fromTo(heroName, {
      scale: 0.998
    }, {
      scale: 1,
      duration: 0.2,
      ease: "power2.out"
    }, "identityScan+=.74")
    .to(nameWords, {
      textShadow: "0 0 7px rgba(215,255,56,.12)",
      duration: 0.07,
      yoyo: true,
      repeat: 1,
      ease: "sine.inOut"
    }, "identityScan+=.74")
    .add(() => {
      if (!heroName) return;

      heroName.classList.remove("name-is-initializing");
      heroName.style.removeProperty("--identity-scan-y");
      gsap.set(nameWords, { clearProps: "textShadow" });
      nameReady = true;
    }, "identityScan+=.98")
    .from(".hero-description", {
      y: 35,
      opacity: 0,
      duration: 0.9
    }, "-=.7")
    .from(".resume-button", {
      y: 18,
      opacity: 0,
      duration: 0.65,
      ease: "power3.out"
    }, "-=.7")
    .from(".hero-scroll, .hero-number", {
      opacity: 0,
      duration: 0.7
    }, "-=.5")
    .from(".hero-orb", {
      scale: 0.4,
      opacity: 0,
      duration: 1.5,
      ease: "power3.out"
    }, "-=1.2");


  gsap.to(".hero-orb", {
    y: 120,
    rotation: 15,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: 1
    }
  });


  gsap.to(".hero-grid", {
    yPercent: 15,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: 1
    }
  });

  const marquee = gsap.to(".marquee-track", {
    xPercent: -50,
    duration: 25,
    ease: "none",
    repeat: -1
  });

  ScrollTrigger.create({
    trigger: ".marquee-section",
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      const velocity = Math.abs(self.getVelocity());

      gsap.to(marquee, {
        timeScale: Math.min(3, 1 + velocity / 1000),
        duration: 0.2,
        overwrite: true
      });
    }
  });


  document.querySelectorAll(".reveal-title").forEach((title) => {
    gsap.from(title, {
      y: 80,
      opacity: 0,
      duration: 1.1,
      ease: "power4.out",
      scrollTrigger: {
        trigger: title,
        start: "top 85%",
        toggleActions: "play none none reverse"
      }
    });
  });


  document.querySelectorAll(".reveal-text").forEach((text) => {
    gsap.from(text, {
      y: 50,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: text,
        start: "top 88%",
        toggleActions: "play none none reverse"
      }
    });
  });


  gsap.from(".project-visual", {
    clipPath: "inset(0 100% 0 0)",
    duration: 1.4,
    ease: "power4.inOut",
    scrollTrigger: {
      trigger: ".project-card",
      start: "top 78%",
      toggleActions: "play none none reverse"
    }
  });


  gsap.from(".project-info > *", {
    y: 40,
    opacity: 0,
    stagger: 0.12,
    duration: 0.8,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".project-info",
      start: "top 78%",
      toggleActions: "play none none reverse"
    }
  });


  gsap.from(".browser", {
    y: 80,
    rotateX: 18,
    opacity: 0,
    duration: 1.2,
    ease: "power4.out",
    scrollTrigger: {
      trigger: ".project-visual",
      start: "top 80%",
      toggleActions: "play none none reverse"
    }
  });


  const timelineItems = document.querySelectorAll(".timeline-item");

  timelineItems.forEach((item) => {
    gsap.from(item, {
      x: -60,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: {
        trigger: item,
        start: "top 82%",
        toggleActions: "play none none reverse"
      }
    });
  });


  gsap.to(".timeline-line div", {
    height: "100%",
    ease: "none",
    scrollTrigger: {
      trigger: ".timeline",
      start: "top 65%",
      end: "bottom 70%",
      scrub: 1
    }
  });


  const skillsReveal = gsap.timeline({
    scrollTrigger: {
      trigger: ".skills-list",
      start: "top 80%",
      toggleActions: "play none none reverse"
    }
  });

  skillsReveal.from(".skill-card", {
    y: 36,
    opacity: 0,
    stagger: 0.08,
    duration: 0.8,
    ease: "power3.out"
  }).from(".skill-icon", {
    y: 8,
    opacity: 0,
    stagger: 0.08,
    duration: 0.45,
    ease: "power2.out"
  }, "-=0.45");


  gsap.from(".contact-main > *, .contact-mail", {
    y: 60,
    opacity: 0,
    stagger: 0.15,
    duration: 1,
    ease: "power4.out",
    scrollTrigger: {
      trigger: ".contact",
      start: "top 75%",
      toggleActions: "play none none reverse"
    }
  });


  document.querySelectorAll(".magnetic").forEach((element) => {

    const strength = 0.12;

    element.addEventListener("mousemove", (event) => {

      const rect = element.getBoundingClientRect();

      const x =
        event.clientX -
        (rect.left + rect.width / 2);

      const y =
        event.clientY -
        (rect.top + rect.height / 2);

      gsap.to(element, {
        x: x * strength,
        y: y * strength,
        duration: 0.45,
        ease: "power3.out",
        overwrite: true
      });

    });

    element.addEventListener("mouseleave", () => {

      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.8,
        ease: "elastic.out(1, 0.4)"
      });

    });

  });


  const projectCard = document.querySelector(".project-card");

  if (projectCard) {

    projectCard.addEventListener("mousemove", (event) => {

      const rect = projectCard.getBoundingClientRect();

      const x =
        (event.clientX - rect.left) /
        rect.width -
        0.5;

      const y =
        (event.clientY - rect.top) /
        rect.height -
        0.5;

      gsap.to(".browser", {
        rotationY: x * -7,
        rotationX: y * 5,
        duration: 0.7,
        ease: "power2.out",
        overwrite: true
      });

    });

    projectCard.addEventListener("mouseleave", () => {

      gsap.to(".browser", {
        rotationY: -5,
        rotationX: 5,
        duration: 0.8,
        ease: "power3.out"
      });

    });

  }


  document.querySelectorAll(".skill-card").forEach((row) => {

    const arrow = row.querySelector(".skill-arrow");

    row.addEventListener("mouseenter", () => {

      gsap.to(arrow, {
        x: 8,
        y: -8,
        rotation: 45,
        duration: 0.35,
        ease: "power3.out"
      });

    });

    row.addEventListener("mouseleave", () => {

      gsap.to(arrow, {
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.5,
        ease: "power3.out"
      });

    });

  });


  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
  });

  window.addEventListener("resize", () => {
    ScrollTrigger.refresh();
  });

})();
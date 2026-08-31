(() => {
  'use strict';

  const items = Array.from(document.querySelectorAll('.carousel-item'));
  const cursors = Array.from(document.querySelectorAll('.cursor'));
  const audio = document.getElementById('bgm');
  const musicButton = document.getElementById('toggleMusic');
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const carousel = document.querySelector('.carousel');

  if (!items.length) return;

  let progress = 50;
  let active = 0;

  let pointerDown = false;
  let startX = 0;
  let lastX = 0;
  let moved = false;

  let rafId = null;
  let videoTimer = null;

  const speedWheel = 0.02;
  const speedDrag = -0.1;

  const isTouchDevice =
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window;

  /* =========================
     CAROUSEL
  ========================= */

  function renderCarousel() {
    progress = Math.max(0, Math.min(100, progress));

    active = Math.round(
      (progress / 100) * (items.length - 1)
    );

    items.forEach((item, index) => {
      const distance = Math.abs(active - index);

      item.style.setProperty(
        '--zIndex',
        items.length - distance
      );

      item.style.setProperty(
        '--active',
        (index - active) / items.length
      );
    });

    updateVideos();
  }

  function scheduleRender() {
    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      renderCarousel();
    });
  }

  /* =========================
     VIDEO
  ========================= */

  function updateVideos() {
    clearTimeout(videoTimer);

    videoTimer = setTimeout(() => {
      items.forEach((item, index) => {
        const video = item.querySelector('video');

        if (!video) return;

        const distance = Math.abs(index - active);

        /*
          HP:
          aktif + 2 card terdekat boleh bergerak.

          Desktop:
          aktif + 3 card terdekat boleh bergerak.
        */
        const allowedDistance = isTouchDevice ? 2 : 3;

        if (distance <= allowedDistance) {
          video.muted = true;
          video.defaultMuted = true;
          video.playsInline = true;

          video.setAttribute('muted', '');
          video.setAttribute('playsinline', '');

          /*
            Jangan pakai preload="none".
            Browser HP kadang tidak mau langsung
            menampilkan video kalau belum pernah load.
          */
          if (video.preload === 'none') {
            video.preload = 'metadata';
          }

          /*
            Jangan load ulang kalau video sebenarnya
            sudah pernah dimuat.
          */
          if (video.readyState === 0) {
            try {
              video.load();
            } catch (e) {}
          }

          /*
            play() di mobile bisa menghasilkan Promise rejection.
            Kita tangkap supaya tidak memutus JS lainnya.
          */
          const playPromise = video.play();

          if (
            playPromise &&
            typeof playPromise.catch === 'function'
          ) {
            playPromise.catch(() => {});
          }

        } else {
          /*
            Video jauh dari posisi aktif dipause
            supaya HP tidak decode semuanya sekaligus.
          */
          try {
            video.pause();
          } catch (e) {}
        }
      });
    }, 30);
  }

  /*
    Kalau user benar-benar menyentuh layar,
    coba play video lagi.
  */
  if (carousel) {
    carousel.addEventListener(
      'pointerdown',
      () => {
        const activeVideo =
          items[active]?.querySelector('video');

        if (activeVideo) {
          activeVideo.muted = true;

          const promise = activeVideo.play();

          if (
            promise &&
            typeof promise.catch === 'function'
          ) {
            promise.catch(() => {});
          }
        }
      },
      { passive: true }
    );
  }

  /* =========================
     CARD CLICK
  ========================= */

  items.forEach((item, index) => {
    item.addEventListener('click', (event) => {

      /*
        Kalau sebelumnya swipe,
        jangan dianggap click.
      */
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      progress =
        (index / Math.max(1, items.length - 1)) * 100;

      scheduleRender();

      /*
        Coba play video card yang dipilih.
      */
      const video = item.querySelector('video');

      if (video) {
        video.muted = true;

        const promise = video.play();

        if (
          promise &&
          typeof promise.catch === 'function'
        ) {
          promise.catch(() => {});
        }
      }
    });
  });

  /* =========================
     TOUCH / SWIPE
  ========================= */

  if (carousel) {

    carousel.addEventListener(
      'pointerdown',
      (event) => {

        if (
          event.pointerType === 'mouse' &&
          event.button !== 0
        ) {
          return;
        }

        pointerDown = true;
        moved = false;

        startX = event.clientX;
        lastX = event.clientX;

        try {
          carousel.setPointerCapture(
            event.pointerId
          );
        } catch (e) {}
      },
      { passive: true }
    );


    carousel.addEventListener(
      'pointermove',
      (event) => {

        if (!pointerDown) return;

        const currentX = event.clientX;

        const totalMove =
          currentX - startX;

        const delta =
          currentX - lastX;

        if (Math.abs(totalMove) > 8) {
          moved = true;
        }

        if (Math.abs(delta) < 0.1) {
          return;
        }

        progress += delta * speedDrag;

        lastX = currentX;

        scheduleRender();
      },
      { passive: true }
    );


    function endPointer(event) {

      if (!pointerDown) return;

      pointerDown = false;

      try {
        carousel.releasePointerCapture(
          event.pointerId
        );
      } catch (e) {}

      /*
        Beri waktu sedikit supaya click
        tidak salah dianggap swipe.
      */
      setTimeout(() => {
        moved = false;
      }, 80);
    }


    carousel.addEventListener(
      'pointerup',
      endPointer
    );

    carousel.addEventListener(
      'pointercancel',
      endPointer
    );


    carousel.addEventListener(
      'pointerleave',
      (event) => {

        if (event.pointerType === 'mouse') {
          pointerDown = false;
        }

      }
    );


    /* =========================
       DESKTOP MOUSE WHEEL
    ========================= */

    carousel.addEventListener(
      'wheel',
      (event) => {

        event.preventDefault();

        progress +=
          event.deltaY * speedWheel;

        scheduleRender();

      },
      { passive: false }
    );
  }

  /* =========================
     CURSOR DESKTOP
  ========================= */

  if (!isTouchDevice) {

    document.addEventListener(
      'pointermove',
      (event) => {

        if (event.pointerType !== 'mouse') {
          return;
        }

        cursors.forEach((cursor) => {

          cursor.style.transform =
            `translate3d(
              ${event.clientX}px,
              ${event.clientY}px,
              0
            )`;

        });

      },
      { passive: true }
    );
  }

  /* =========================
     MUSIC
  ========================= */

  if (audio && musicButton) {

    musicButton.addEventListener(
      'click',
      async (event) => {

        event.stopPropagation();

        try {

          if (audio.paused) {

            await audio.play();

            musicButton.textContent = 'Stop';

            musicButton.setAttribute(
              'aria-pressed',
              'true'
            );

          } else {

            audio.pause();

            musicButton.textContent = 'Play';

            musicButton.setAttribute(
              'aria-pressed',
              'false'
            );

          }

        } catch (error) {

          /*
            Browser HP bisa menolak audio.
            Jangan sampai error audio menghentikan
            script lainnya.
          */

          musicButton.textContent = 'Play';

          musicButton.setAttribute(
            'aria-pressed',
            'false'
          );
        }

      }
    );


    audio.addEventListener(
      'ended',
      () => {

        musicButton.textContent = 'Play';

        musicButton.setAttribute(
          'aria-pressed',
          'false'
        );

      }
    );
  }

  /* =========================
     HAMBURGER MENU
  ========================= */

  if (hamburger && sidebar) {

    hamburger.setAttribute(
      'aria-expanded',
      'false'
    );

    hamburger.setAttribute(
      'aria-label',
      'Menu'
    );


    hamburger.addEventListener(
      'click',
      (event) => {

        event.stopPropagation();

        const open =
          sidebar.classList.toggle('active');

        hamburger.classList.toggle(
          'active',
          open
        );

        hamburger.setAttribute(
          'aria-expanded',
          String(open)
        );

      }
    );


    sidebar.addEventListener(
      'click',
      (event) => {
        event.stopPropagation();
      }
    );


    document.addEventListener(
      'click',
      () => {

        if (
          !sidebar.classList.contains('active')
        ) {
          return;
        }

        sidebar.classList.remove('active');

        hamburger.classList.remove('active');

        hamburger.setAttribute(
          'aria-expanded',
          'false'
        );

      }
    );
  }

  /* =========================
     LYRIC CANVAS
  ========================= */

  function initLyricCanvas() {

    const canvas =
      document.getElementById('c');

    if (
      !canvas ||
      !canvas.getContext
    ) {
      return;
    }

    const ctx =
      canvas.getContext(
        '2d',
        { alpha: true }
      );

    if (!ctx) return;


    const lyric =
      'Do you think I have forgotten about you? ' +
      'Do you think I have forgotten? ' +
      'There was something about you that now I cannot remember ' +
      'It is the same damn thing that made my heart surrender ' +
      'And I will miss you on a train ' +
      'I will miss you in the morning ' +
      'I never know what to think about, ' +
      'so think about you';


    const counts =
      Object.create(null);


    lyric
      .split(/\s+/)
      .forEach((word) => {

        counts[word] =
          (counts[word] || 0) + 1;

      });


    const words =
      Object.keys(counts)
        .map((word) => {

          return {
            text: word,
            x: Math.random(),
            y: Math.random(),

            size:
              Math.min(
                38,
                Math.max(
                  10,
                  counts[word] * 7
                )
              ),

            speed:
              Math.min(
                0.0007,
                Math.max(
                  0.00015,
                  counts[word] * 0.00012
                )
              ),

            width: 0
          };

        });


    let width = 0;
    let height = 0;
    let frame = null;
    let lastFrame = 0;

    /*
      HP dibuat lebih ringan.
    */
    const interval =
      isTouchDevice ? 80 : 40;


    function resize() {

      const dpr =
        Math.min(
          window.devicePixelRatio || 1,
          isTouchDevice ? 1.25 : 1.5
        );

      width =
        window.innerWidth;

      height =
        window.innerHeight;


      canvas.width =
        Math.floor(width * dpr);

      canvas.height =
        Math.floor(height * dpr);


      canvas.style.width =
        `${width}px`;

      canvas.style.height =
        `${height}px`;


      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );


      words.forEach((word) => {

        word.x = Math.random();
        word.y = Math.random();

      });

    }


    function draw(timestamp) {

      if (
        timestamp - lastFrame <
        interval
      ) {

        frame =
          requestAnimationFrame(draw);

        return;
      }


      lastFrame = timestamp;


      ctx.clearRect(
        0,
        0,
        width,
        height
      );


      ctx.fillStyle =
        'rgba(255,255,255,0.75)';


      words.forEach((word) => {

        const x =
          word.x * width;

        const y =
          word.y * height;


        ctx.font =
          `${word.size}px Arial`;


        ctx.fillText(
          word.text,
          x,
          y
        );


        word.width =
          ctx.measureText(
            word.text
          ).width;


        word.x +=
          word.speed;


        if (
          word.x * width >
          width + word.width
        ) {

          word.x =
            -word.width /
            Math.max(width, 1);

          word.y =
            Math.random();

        }

      });


      frame =
        requestAnimationFrame(draw);
    }


    resize();


    window.addEventListener(
      'resize',
      resize,
      { passive: true }
    );


    document.addEventListener(
      'visibilitychange',
      () => {

        if (document.hidden) {

          if (frame !== null) {
            cancelAnimationFrame(frame);
          }

        } else {

          lastFrame = 0;

          frame =
            requestAnimationFrame(draw);

        }

      }
    );


    frame =
      requestAnimationFrame(draw);
  }


  /* =========================
     START
  ========================= */

  renderCarousel();


  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      initLyricCanvas,
      { once: true }
    );

  } else {

    initLyricCanvas();

  }

})();
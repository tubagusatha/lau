/* =========================================================
   LAURAA - ORIGINAL CAROUSEL
   MOBILE PERFORMANCE FIX
   ========================================================= */

/* --------------------
   Vars
-------------------- */

let progress = 50
let startX = 0
let active = 0
let isDown = false

let animationFrame = null
let lastVideoActive = -1

/*
  Kalau user swipe, jangan dianggap sebagai click.
*/
let didDrag = false
let suppressClickUntil = 0


/* --------------------
   Constants
-------------------- */

const speedWheel = 0.02
const speedDrag = -0.1

/*
  Hanya video di sekitar card aktif yang
  akan diload dan dimainkan.

  2 = aktif + 2 card kiri/kanan.
  Jadi maksimal sekitar 5 video yang aktif.
*/
const VIDEO_RANGE = 2


/* --------------------
   Items
-------------------- */

const $items = Array.from(
  document.querySelectorAll('.carousel-item')
)

const $cursors = document.querySelectorAll('.cursor')

const $carousel =
  document.querySelector('.carousel')


/* --------------------
   Videos
-------------------- */

const $videos = []

$items.forEach((item) => {

  const video = item.querySelector('video')

  if (!video) return

  const source =
    video.querySelector('source')

  if (!source) return

  const originalSrc =
    source.getAttribute('src')

  if (!originalSrc) return

  /*
    Simpan alamat video.

    Kita kosongkan source setelah main.js
    dijalankan supaya browser tidak berusaha
    memainkan semua video sekaligus.
  */
  video.dataset.originalSrc = originalSrc

  video.autoplay = false
  video.removeAttribute('autoplay')

  video.loop = true
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true

  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')

  /*
    Metadata saja.
  */
  video.preload = 'metadata'

  $videos.push({
    video: video,
    source: source,
    src: originalSrc,
    loaded: false
  })

})


/* =========================================================
   VIDEO FUNCTIONS
========================================================= */

function findVideoData(video) {

  for (let i = 0; i < $videos.length; i++) {

    if ($videos[i].video === video) {
      return $videos[i]
    }

  }

  return null
}


/*
  Load satu video.
*/
function loadVideo(data) {

  if (!data) return

  const video = data.video

  /*
    Kalau source sudah ada, tidak perlu
    dimasukkan lagi.
  */
  if (
    data.loaded &&
    video.getAttribute('src')
  ) {
    return
  }

  data.source.setAttribute(
    'src',
    data.src
  )

  data.loaded = true

  try {
    video.load()
  } catch (error) {
    console.warn(
      'Video load error:',
      error
    )
  }

}


/*
  Play satu video.

  play() di HP bisa menghasilkan Promise
  rejection. Kita tangkap supaya tidak
  menghentikan JavaScript carousel.
*/
function playVideo(data) {

  if (!data) return

  const video = data.video

  video.muted = true
  video.defaultMuted = true
  video.playsInline = true

  const promise = video.play()

  if (
    promise &&
    typeof promise.catch === 'function'
  ) {

    promise.catch(() => {})

  }

}


/*
  Pause + unload video yang sudah jauh
  dari card aktif.
*/
function unloadVideo(data) {

  if (!data) return

  const video = data.video

  try {
    video.pause()
  } catch (error) {}

  /*
    Hapus source supaya browser tidak terus
    menyimpan decoder/video resource.
  */
  data.source.removeAttribute('src')

  data.loaded = false

  try {
    video.load()
  } catch (error) {}

}


/*
  Atur video berdasarkan posisi carousel.
*/
function updateVideos(force = false) {

  if (
    !force &&
    active === lastVideoActive
  ) {
    return
  }

  lastVideoActive = active


  $videos.forEach((data) => {

    const itemIndex =
      $items.indexOf(data.video.closest('.carousel-item'))

    if (itemIndex === -1) return

    const distance =
      Math.abs(itemIndex - active)

    if (distance <= VIDEO_RANGE) {

      /*
        Video dekat card aktif:
        load.
      */
      loadVideo(data)

      /*
        Yang aktif benar-benar dimainkan.
      */
      if (distance === 0) {
        playVideo(data)
      }

      /*
        Card sekitar aktif juga boleh bergerak.
        Ini supaya ketika card terlihat di
        samping, videonya tidak mendadak diam.
      */
      else {
        playVideo(data)
      }

    } else {

      /*
        Video jauh:
        pause + unload.
      */
      unloadVideo(data)

    }

  })

}


/* =========================================================
   Z-INDEX
========================================================= */

const getZindex = (
  arrayLength,
  index,
  activeIndex
) => {

  return (
    index === activeIndex
      ? arrayLength
      : arrayLength -
        Math.abs(activeIndex - index)
  )

}


/* =========================================================
   DISPLAY
========================================================= */

const displayItems = (
  item,
  index,
  currentActive
) => {

  const zIndex =
    getZindex(
      $items.length,
      index,
      currentActive
    )

  item.style.setProperty(
    '--zIndex',
    zIndex
  )

  item.style.setProperty(
    '--active',
    (index - currentActive) /
    $items.length
  )

}


/* =========================================================
   ANIMATE
========================================================= */

const animate = () => {

  progress =
    Math.max(
      0,
      Math.min(progress, 100)
    )


  const newActive =
    Math.floor(
      progress /
      100 *
      ($items.length - 1)
    )


  active = newActive


  /*
    Update 61 card.
    Ini tetap sama konsepnya dengan
    JavaScript original kamu.
  */
  $items.forEach(
    (item, index) => {

      displayItems(
        item,
        index,
        active
      )

    }
  )


  /*
    Video hanya diperiksa kalau active
    card berubah.
  */
  updateVideos()

}


/* =========================================================
   REQUEST ANIMATION FRAME
========================================================= */

function requestAnimate() {

  if (animationFrame !== null) {
    return
  }

  animationFrame =
    requestAnimationFrame(() => {

      animationFrame = null

      animate()

    })

}


/* =========================================================
   INITIALIZE
========================================================= */

animate()

/*
  Setelah posisi awal ditentukan,
  atur video yang boleh aktif.
*/
updateVideos(true)


/* =========================================================
   CLICK ON ITEMS
========================================================= */

$items.forEach((item, i) => {

  item.addEventListener(
    'click',
    (event) => {

      /*
        Kalau barusan swipe,
        jangan dianggap klik.
      */
      if (
        didDrag ||
        performance.now() <
        suppressClickUntil
      ) {

        event.preventDefault()
        event.stopPropagation()

        return
      }


      /*
        Rumus posisi tetap mengikuti
        JavaScript asli kamu.
      */
      progress =
        (i / $items.length) *
        100 +
        10


      requestAnimate()


      /*
        Kalau card tersebut memiliki video,
        langsung play setelah menjadi aktif.
      */
      const video =
        item.querySelector('video')

      if (video) {

        const data =
          findVideoData(video)

        if (data) {

          loadVideo(data)
          playVideo(data)

        }

      }

    }
  )

})


/* =========================================================
   MOUSE WHEEL
========================================================= */

function handleWheel(e) {

  /*
    Hanya proses wheel kalau memang
    terjadi pada carousel.
  */
  if (
    $carousel &&
    !e.target.closest('.carousel-item')
  ) {
    return
  }


  const wheelProgress =
    e.deltaY * speedWheel


  progress += wheelProgress


  requestAnimate()

}


if ($carousel) {

  $carousel.addEventListener(
    'wheel',
    handleWheel,
    {
      passive: true
    }
  )

}


/* =========================================================
   POINTER / TOUCH
========================================================= */

function getPointerX(e) {

  return e.clientX || 0

}


/*
  Pointer down
*/
function handlePointerDown(e) {

  /*
    Abaikan kalau bukan berasal dari card.
  */
  if (
    !$carousel ||
    !e.target.closest('.carousel-item')
  ) {
    return
  }


  /*
    Mouse hanya tombol kiri.
  */
  if (
    e.pointerType === 'mouse' &&
    e.button !== 0
  ) {
    return
  }


  isDown = true

  didDrag = false

  startX =
    getPointerX(e)


  /*
    Simpan pointer capture di carousel
    supaya swipe tetap terdeteksi meskipun
    jari keluar sedikit dari card.
  */
  try {

    $carousel.setPointerCapture(
      e.pointerId
    )

  } catch (error) {}

}


/*
  Pointer move
*/
function handlePointerMove(e) {

  if (!isDown) return


  const x =
    getPointerX(e)


  const distance =
    x - startX


  /*
    Kalau bergerak lebih dari 6px,
    anggap sebagai swipe/drag.
  */
  if (
    Math.abs(distance) > 6
  ) {

    didDrag = true

  }


  /*
    Persis seperti rumus original:
  */
  const mouseProgress =
    distance * speedDrag


  progress += mouseProgress


  startX = x


  /*
    JANGAN langsung animate().

    Gunakan requestAnimationFrame supaya
    100 event touch tidak menghasilkan
    100 render berturut-turut.
  */
  requestAnimate()

}


/*
  Pointer up
*/
function handlePointerUp(e) {

  if (!isDown) return

  isDown = false


  try {

    $carousel.releasePointerCapture(
      e.pointerId
    )

  } catch (error) {}


  /*
    Kalau tadi swipe, blok click sebentar.
  */
  if (didDrag) {

    suppressClickUntil =
      performance.now() + 250

  }


  /*
    Reset setelah click event selesai.
  */
  setTimeout(() => {

    didDrag = false

  }, 300)

}


/*
  Pointer cancel
*/
function handlePointerCancel(e) {

  isDown = false

  didDrag = true

  suppressClickUntil =
    performance.now() + 250


  try {

    $carousel.releasePointerCapture(
      e.pointerId
    )

  } catch (error) {}

}


/* =========================================================
   POINTER LISTENERS
========================================================= */

if ($carousel) {

  $carousel.addEventListener(
    'pointerdown',
    handlePointerDown,
    {
      passive: true
    }
  )


  $carousel.addEventListener(
    'pointermove',
    handlePointerMove,
    {
      passive: true
    }
  )


  $carousel.addEventListener(
    'pointerup',
    handlePointerUp,
    {
      passive: true
    }
  )


  $carousel.addEventListener(
    'pointercancel',
    handlePointerCancel,
    {
      passive: true
    }
  )

}


/* =========================================================
   DESKTOP CURSOR
========================================================= */

if ($cursors.length) {

  document.addEventListener(
    'pointermove',
    (e) => {

      /*
        Cursor hanya diperlukan untuk mouse.
      */
      if (
        e.pointerType &&
        e.pointerType !== 'mouse'
      ) {
        return
      }


      $cursors.forEach(
        ($cursor) => {

          $cursor.style.transform =
            `translate(
              ${e.clientX}px,
              ${e.clientY}px
            )`

        }
      )

    },
    {
      passive: true
    }
  )

}


/* =========================================================
   VISIBILITY
========================================================= */

/*
  Kalau user pindah tab,
  pause semua video.

  Saat kembali, video yang dekat card aktif
  akan dimainkan lagi.
*/

document.addEventListener(
  'visibilitychange',
  () => {

    if (document.hidden) {

      $videos.forEach(
        (data) => {

          try {
            data.video.pause()
          } catch (error) {}

        }
      )

    } else {

      updateVideos(true)

    }

  }
)


/* =========================================================
   PAGE EXIT
========================================================= */

window.addEventListener(
  'pagehide',
  () => {

    $videos.forEach(
      (data) => {

        try {
          data.video.pause()
        } catch (error) {}

      }
    )

  }
)
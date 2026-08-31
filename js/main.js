/*--------------------
Vars
--------------------*/
let progress = 50
let startX = 0
let active = 0
let isDown = false

/*
  Mobile performance
*/
let animationFrame = null
let renderPending = false
let didDrag = false


/*--------------------
Constants
--------------------*/
const speedWheel = 0.02
const speedDrag = -0.1


/*--------------------
Device
--------------------*/
const isMobile =
  window.matchMedia('(max-width: 768px)').matches


/*--------------------
Mobile Video Settings
--------------------*/

/*
  Desktop:
  semua video tetap berjalan.

  Mobile:
  hanya video di sekitar card aktif
  yang tetap berjalan.
*/
const VIDEO_RANGE = isMobile ? 1 : Infinity

let lastVideoActive = -1


/*--------------------
Get Z
--------------------*/
const getZindex = (array, index) => (
  array.map((_, i) =>
    (index === i)
      ? array.length
      : array.length - Math.abs(index - i)
  )
)


/*--------------------
Items
--------------------*/
const $items =
  document.querySelectorAll('.carousel-item')

const $cursors =
  document.querySelectorAll('.cursor')


/*--------------------
Videos
--------------------*/
const $videos = []

$items.forEach((item, index) => {

  const video =
    item.querySelector('video')

  if (!video) return

  $videos.push({
    video: video,
    index: index
  })

})


/*--------------------
Update Videos
--------------------*/
const updateVideos = (force = false) => {

  /*
    Desktop tidak perlu optimasi video.
    Semua video mengikuti behavior asli.
  */
  if (!isMobile) {
    return
  }


  /*
    Jangan mengulang pekerjaan video
    kalau active card belum berubah.
  */
  if (
    !force &&
    active === lastVideoActive
  ) {
    return
  }


  lastVideoActive = active


  $videos.forEach(({ video, index }) => {

    const distance =
      Math.abs(index - active)


    if (distance <= VIDEO_RANGE) {

      /*
        Video dekat card aktif:
        tetap dimainkan.
      */

      video.muted = true
      video.defaultMuted = true
      video.playsInline = true

      const playPromise =
        video.play()

      /*
        Mobile browser kadang menolak
        play(). Jangan sampai error ini
        menghentikan seluruh JS.
      */
      if (
        playPromise &&
        typeof playPromise.catch === 'function'
      ) {
        playPromise.catch(() => {})
      }

    } else {

      /*
        Video jauh hanya di-pause.

        TIDAK:
        - load()
        - remove src
        - reload video

        Jadi ketika kembali aktif,
        browser bisa lanjut memainkan video.
      */

      if (!video.paused) {
        video.pause()
      }

    }

  })

}


/*--------------------
Display Items
--------------------*/
const displayItems = (
  item,
  index,
  currentActive
) => {

  /*
    Rumus z-index sama seperti
    versi original kamu.
  */
  const zIndex =
    $items.length -
    Math.abs(
      currentActive - index
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


/*--------------------
Animate
--------------------*/
const animate = () => {

  progress =
    Math.max(
      0,
      Math.min(progress, 100)
    )


  active =
    Math.floor(
      progress /
      100 *
      ($items.length - 1)
    )


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
    Hanya HP yang menjalankan
    optimasi video.
  */
  updateVideos()

}


/*--------------------
Mobile Frame
--------------------*/

/*
  Desktop:
    animate() langsung seperti original.

  Mobile:
    animate() maksimal satu kali
    setiap animation frame.
*/
const requestAnimate = () => {

  if (!isMobile) {

    animate()

    return
  }


  if (renderPending) {
    return
  }


  renderPending = true


  animationFrame =
    requestAnimationFrame(() => {

      renderPending = false

      animate()

      animationFrame = null

    })

}


/*--------------------
Initial
--------------------*/
animate()

/*
  Pastikan video mobile yang dekat
  dengan card aktif langsung jalan.
*/
updateVideos(true)


/*--------------------
Click on Items
--------------------*/
$items.forEach((item, i) => {

  item.addEventListener(
    'click',
    (event) => {

      /*
        Kalau gerakan sebelumnya adalah
        swipe, jangan dianggap click.
      */
      if (isMobile && didDrag) {

        event.preventDefault()

        return

      }


      /*
        Rumus ORIGINAL kamu.
      */
      progress =
        (i / $items.length) *
        100 +
        10


      requestAnimate()

    }
  )

})


/*--------------------
Wheel
--------------------*/
const handleWheel = e => {

  const wheelProgress =
    e.deltaY * speedWheel


  progress =
    progress +
    wheelProgress


  /*
    Desktop = langsung animate.
    Mobile = frame optimized.
  */
  requestAnimate()

}


/*--------------------
Mouse / Touch Move
--------------------*/
const handleMouseMove = (e) => {

  /*
    Cursor tetap sama seperti original.
  */
  if (e.type === 'mousemove') {

    $cursors.forEach(($cursor) => {

      $cursor.style.transform =
        `translate(
          ${e.clientX}px,
          ${e.clientY}px
        )`

    })

  }


  if (!isDown) {
    return
  }


  const x =
    e.clientX ||
    (
      e.touches &&
      e.touches[0] &&
      e.touches[0].clientX
    ) ||
    0


  /*
    Hanya mobile yang perlu
    membedakan swipe dengan click.
  */
  if (
    isMobile &&
    Math.abs(x - startX) > 5
  ) {

    didDrag = true

  }


  const mouseProgress =
    (x - startX) *
    speedDrag


  progress =
    progress +
    mouseProgress


  startX = x


  requestAnimate()

}


/*--------------------
Mouse / Touch Down
--------------------*/
const handleMouseDown = e => {

  isDown = true


  if (isMobile) {
    didDrag = false
  }


  startX =
    e.clientX ||
    (
      e.touches &&
      e.touches[0] &&
      e.touches[0].clientX
    ) ||
    0

}


/*--------------------
Mouse / Touch Up
--------------------*/
const handleMouseUp = () => {

  isDown = false


  if (isMobile && didDrag) {

    /*
      Beri sedikit waktu agar event click
      tidak salah membaca swipe sebagai click.
    */
    setTimeout(() => {

      didDrag = false

    }, 100)

  }

}


/*--------------------
Listeners
--------------------*/

/*
  Tetap menggunakan listener asli kamu.
  Tidak ada listener hamburger/music
  yang disentuh.
*/

document.addEventListener(
  'mousewheel',
  handleWheel,
  {
    passive: true
  }
)


document.addEventListener(
  'mousedown',
  handleMouseDown,
  {
    passive: true
  }
)


document.addEventListener(
  'mousemove',
  handleMouseMove,
  {
    passive: true
  }
)


document.addEventListener(
  'mouseup',
  handleMouseUp,
  {
    passive: true
  }
)


document.addEventListener(
  'touchstart',
  handleMouseDown,
  {
    passive: true
  }
)


document.addEventListener(
  'touchmove',
  handleMouseMove,
  {
    passive: true
  }
)


document.addEventListener(
  'touchend',
  handleMouseUp,
  {
    passive: true
  }
)


/*--------------------
Visibility
--------------------*/

/*
  Khusus mobile:
  kalau tab ditinggalkan, pause video.

  Saat kembali, video sekitar card aktif
  akan dimainkan lagi.

  Desktop tidak disentuh.
*/
if (isMobile) {

  document.addEventListener(
    'visibilitychange',
    () => {

      if (document.hidden) {

        $videos.forEach(
          ({ video }) => {

            video.pause()

          }
        )

      } else {

        lastVideoActive = -1

        updateVideos(true)

      }

    }
  )

}
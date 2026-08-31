/*--------------------
Vars
--------------------*/
let progress = 50
let startX = 0
let active = 0
let isDown = false

/*
  Tambahan untuk performance.
  Tidak mengubah fungsi carousel.
*/
let animationFrame = null
let lastAnimatedProgress = progress
let didDrag = false


/*--------------------
Constants
--------------------*/
const speedWheel = 0.02
const speedDrag = -0.1


/*--------------------
Items
--------------------*/
const $items = document.querySelectorAll('.carousel-item')
const $cursors = document.querySelectorAll('.cursor')


/*--------------------
Videos
--------------------*/
const $videos = document.querySelectorAll(
  '.carousel-item video'
)

/*
  Berapa card dari posisi aktif yang
  videonya boleh tetap berjalan.

  Tidak dibuat terlalu kecil supaya
  video di sekitar card tetap bergerak.
*/
const VIDEO_RANGE = 2

let lastVideoActive = -1


const updateVideos = () => {

  /*
    Kalau tidak ada video, langsung selesai.
  */
  if (!$videos.length) return

  /*
    Tidak perlu menjalankan fungsi ini
    kalau active belum berubah.
  */
  if (active === lastVideoActive) return

  lastVideoActive = active


  $items.forEach((item, index) => {

    const video = item.querySelector('video')

    if (!video) return


    const distance =
      Math.abs(index - active)


    if (distance <= VIDEO_RANGE) {

      /*
        Video dekat card aktif tetap berjalan.
      */

      video.muted = true
      video.defaultMuted = true
      video.playsInline = true

      /*
        Browser mobile kadang menolak play().
        Jangan sampai error tersebut
        menghentikan main.js.
      */
      const playPromise = video.play()

      if (
        playPromise &&
        typeof playPromise.catch === 'function'
      ) {
        playPromise.catch(() => {})
      }

    } else {

      /*
        Hanya PAUSE.
        
        Jangan hapus src.
        Jangan video.load().
        Jangan reload video.

        Jadi ketika card kembali aktif,
        video bisa lanjut tanpa memaksa
        download ulang.
      */
      video.pause()

    }

  })

}


/*--------------------
Get Z
--------------------*/

/*
  Versi lama kamu membuat array/map
  baru setiap kali card dihitung.

  Dengan 61 card, itu cukup boros.

  Rumus hasilnya TETAP SAMA.
*/
const getZindex = (array, index) => {

  return array.map((_, i) => {

    return (
      index === i
        ? array.length
        : array.length -
          Math.abs(index - i)
    )

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
    Hasil tetap sama seperti original.
  */
  const zIndex =
    $items.length -
    Math.abs(currentActive - index)

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


  /*
    Tetap update SEMUA card seperti original.
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
    Atur video hanya ketika active
    card berubah.
  */
  updateVideos()

}


/*--------------------
Smooth Animate
--------------------*/

/*
  Ini bagian PALING PENTING.

  Original kamu:

      touchmove
          ↓
      animate()
          ↓
      61 card dihitung

  berkali-kali dalam satu detik.

  Sekarang:

      touchmove
          ↓
      requestAnimationFrame
          ↓
      animate() maksimal 1x/frame
*/

const requestAnimate = () => {

  if (animationFrame !== null) {
    return
  }


  animationFrame =
    requestAnimationFrame(() => {

      animationFrame = null

      /*
        Tidak ada perubahan berarti,
        tidak perlu render ulang.
      */
      if (
        progress === lastAnimatedProgress
      ) {
        return
      }


      lastAnimatedProgress =
        progress


      animate()

    })

}


/*
  Initial render.
*/
animate()


/*--------------------
Click on Items
--------------------*/
$items.forEach((item, i) => {

  item.addEventListener(
    'click',
    (event) => {

      /*
        Kalau user sebenarnya sedang swipe,
        jangan perlakukan sebagai click.
      */
      if (didDrag) {

        event.preventDefault()

        /*
          Reset sebentar setelah event click.
        */
        setTimeout(() => {
          didDrag = false
        }, 50)

        return

      }


      progress =
        (i / $items.length) *
        100 +
        10


      requestAnimate()

    }
  )

})


/*--------------------
Handlers
--------------------*/

const handleWheel = e => {

  const wheelProgress =
    e.deltaY * speedWheel


  progress =
    progress +
    wheelProgress


  requestAnimate()

}


/*--------------------
Mouse Move
--------------------*/

const handleMouseMove = (e) => {

  /*
    Cursor tetap SAMA seperti original.
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


  if (!isDown) return


  const x =
    e.clientX ||
    (
      e.touches &&
      e.touches[0] &&
      e.touches[0].clientX
    ) ||
    0


  /*
    Kalau bergerak lebih dari sedikit,
    tandai sebagai drag/swipe.
  */
  if (
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


  /*
    JANGAN langsung animate().
    Ini yang membuat HP lebih ringan.
  */
  requestAnimate()

}


/*--------------------
Mouse Down
--------------------*/

const handleMouseDown = e => {

  isDown = true

  didDrag = false


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
Mouse Up
--------------------*/

const handleMouseUp = () => {

  isDown = false

  /*
    Kalau bukan drag, biarkan click bekerja.
  */
  if (!didDrag) {
    return
  }

  /*
    Jangan langsung reset supaya
    click event tidak salah membaca swipe
    sebagai klik card.
  */
  setTimeout(() => {

    didDrag = false

  }, 100)

}


/*--------------------
Listeners
--------------------*/

/*
  Tetap memakai listener ASLI kamu.
  Jadi tidak menyentuh hamburger/menu.
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
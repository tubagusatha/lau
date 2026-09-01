/*--------------------
Vars
--------------------*/
let progress = 50
let startX = 0
let active = 0
let isDown = false

let animationFrame = null
let pendingRender = false
let didDrag = false


/*--------------------
Constants
--------------------*/
const speedWheel = 0.02
const speedDrag = -0.1

/*
  Jumlah video yang boleh tetap bergerak
  di sekitar card aktif.

  1 = card aktif + 1 kiri + 1 kanan
*/
const VIDEO_RANGE = 1


/*--------------------
Items
--------------------*/
const $items = document.querySelectorAll('.carousel-item')
const $cursors = document.querySelectorAll('.cursor')


/*--------------------
Videos
--------------------*/
const $videos = []

$items.forEach((item, index) => {

  const video = item.querySelector('video')

  if (!video) return

  $videos.push({
    video,
    index
  })

})


let lastVideoActive = -1


/*--------------------
Update Videos
--------------------*/
const updateVideos = () => {

  /*
    Jangan lakukan apa-apa kalau active
    belum berubah.
  */
  if (active === lastVideoActive) {
    return
  }

  lastVideoActive = active


  $videos.forEach(({ video, index }) => {

    const distance =
      Math.abs(index - active)


    if (distance <= VIDEO_RANGE) {

      /*
        Video yang dekat tengah tetap jalan.
      */

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

    } else {

      /*
        Cukup pause.
        JANGAN load ulang.
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
    Ini menghasilkan nilai yang sama
    seperti getZindex() original,
    tetapi tanpa membuat array baru.
  */

  const zIndex =
    index === currentActive
      ? $items.length
      : $items.length -
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


  const newActive =
    Math.floor(
      progress /
      100 *
      ($items.length - 1)
    )


  active = newActive


  /*
    Update semua card.
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
    Video hanya diatur kalau
    card aktif berubah.
  */
  updateVideos()

}


/*--------------------
Frame Scheduler
--------------------*/
const scheduleAnimate = () => {

  if (pendingRender) {
    return
  }

  pendingRender = true


  animationFrame =
    requestAnimationFrame(() => {

      pendingRender = false
      animationFrame = null

      animate()

    })

}


/*--------------------
Initial
--------------------*/
animate()


/*--------------------
Click on Items
--------------------*/
$items.forEach((item, i) => {

  item.addEventListener(
    'click',
    (event) => {

      /*
        Jangan anggap swipe sebagai click.
      */
      if (didDrag) {

        event.preventDefault()

        return

      }


      progress =
        (i / $items.length) *
        100 +
        10


      scheduleAnimate()

    }
  )

})


/*--------------------
Wheel
--------------------*/
const handleWheel = e => {

  progress +=
    e.deltaY *
    speedWheel


  scheduleAnimate()

}


/*--------------------
Mouse / Touch Move
--------------------*/
const handleMouseMove = e => {

  /*
    Cursor desktop.
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
    Tandai sebagai drag setelah
    bergerak sedikit.
  */
  if (
    Math.abs(x - startX) > 5
  ) {

    didDrag = true

  }


  const mouseProgress =
    (x - startX) *
    speedDrag


  progress +=
    mouseProgress


  startX = x


  /*
    Tidak langsung animate().
  */  
  scheduleAnimate()

}


/*--------------------
Mouse / Touch Down
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
Mouse / Touch Up
--------------------*/
const handleMouseUp = () => {

  isDown = false


  /*
    Biarkan click event selesai dulu.
  */
  if (didDrag) {

    setTimeout(() => {
      didDrag = false
    }, 100)

  }

}


/*--------------------
Listeners
--------------------*/

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
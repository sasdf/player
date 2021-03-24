var $file = document.getElementById("file");
var $selector = document.getElementById("selector");
var $box = document.getElementById("box");
var $audio = document.getElementById("audio");
var $backward = document.getElementById("backward");
var $play = document.getElementById("play");
var $pause = document.getElementById("pause");
var $forward = document.getElementById("forward");


const defaultSkipTime = 5; /* Time to skip in seconds by default */

function now() { return new Date().getTime() }

function updateStatus() {
    console.log($audio.paused, $audio.currentTime, $audio.duration, $audio.playbackRate)
    if ($audio.paused) {
        $play.classList.remove('hidden')
        $pause.classList.add('hidden')
        if (navigator.mediaSession) {
            navigator.mediaSession.playbackState = "paused";
        }
    } else {
        $play.classList.add('hidden')
        $pause.classList.remove('hidden')
        if (navigator.mediaSession) {
            navigator.mediaSession.playbackState = "playing";
        }
    }
    if (navigator.mediaSession && "setPositionState" in navigator.mediaSession) {
        try {
            navigator.mediaSession.setPositionState({
                duration: $audio.duration,
                playbackRate: $audio.playbackRate,
                position: $audio.currentTime
            });
        } catch (e) { console.log(e) }
    }
}

$file.addEventListener("change", function(e){
    var files = $file.files;
    if (files.length < 1) return false;
    var url = URL.createObjectURL(files[0]);
    console.log(url);
    $audio.src = url;
    updateStatus();
});

$audio.addEventListener("play", e => updateStatus())
$audio.addEventListener("pause", e => updateStatus())
$audio.addEventListener("seeked", e => updateStatus())

function play () { $audio.play() }
function pause () { $audio.pause() }
function trigger () {
    console.log($audio.paused)
    if ($audio.paused) {
        $audio.play()
    } else {
        $audio.pause()
    }
}


var skipFreq = 0;
var accuFreq = 0;
var lastSkip = now();
var lastDir = null

function getSkipScaling (dir) {
    const current = now();
    const diff = (current - lastSkip) / 1000;
    lastSkip = current
    let curFreq = Math.abs(1.0 / (diff + 0.00000001))
    if (diff > 1.5) {
        accuFreq = skipFreq = curFreq = 1
        lastDir = null
    }
    if (lastDir !== dir) {
        lastDir = dir
        return Math.max(accuFreq * 0.5, 1)
    }

    const ratio = 0.5
    skipFreq = skipFreq * ratio + curFreq * (1 - ratio);
    accuFreq = accuFreq * 0.9 + skipFreq * 1.0;

    return Math.max(accuFreq * 0.5, 1)
}

function seekbackward (details) {
    const skipTime = details.seekOffset || (defaultSkipTime * getSkipScaling('backward'));
    $audio.currentTime = Math.max($audio.currentTime - skipTime, 0);
}
function seekforward (details) {
    const skipTime = details.seekOffset || (defaultSkipTime * getSkipScaling('forward'));
    $audio.currentTime = Math.min($audio.currentTime + skipTime, $audio.duration);
}

$play.addEventListener("click", play)
$pause.addEventListener("click", pause)
$backward.addEventListener("click", seekbackward)
$forward.addEventListener("click", seekforward)

setInterval(async () => {
    if ($audio.paused) {
        // console.log(new Date())
        const volume = $audio.volume;
        const current = $audio.currentTime;
        $audio.volume = 0;
        try {
            await $audio.play()
            await $audio.pause()
            navigator.mediaSession.playbackState = "paused"
        } finally {
            $audio.volume = volume;
            $audio.currentTime = current;
            updateStatus()
        }
    }
}, 30000)

if (navigator.mediaSession) {
    console.log('setActionHandler')
    navigator.mediaSession.metadata = new MediaMetadata({
        title: 'track.title',
        artist: 'track.artist',
        album: 'track.album',
        artwork: [{
            src: 'data:image/png;base64,' +
                 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAAARElEQVR4nO3B' +
                 'AQEAAACAkP6v7ggKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
                 'AAAAAAAAAAAAAAAAAAAYwIAAAWMWdQAAAAAASUVORK5CYII=',
            sizes: '128x128',
            type: 'image/png'
        }],
    });

    try { navigator.mediaSession.setActionHandler('play', trigger) } catch(e){console.error('no play')}
    try { navigator.mediaSession.setActionHandler('pause', trigger); } catch(e){console.error('no pause')}
    try { navigator.mediaSession.setActionHandler('seekbackward', seekbackward); } catch(e){console.error('no backward')}
    try { navigator.mediaSession.setActionHandler('seekforward', seekforward); } catch(e){console.error('no forward')}
    try { navigator.mediaSession.setActionHandler('previoustrack', seekbackward); } catch(e){console.error('no prev')}
    try { navigator.mediaSession.setActionHandler('nexttrack', seekforward); } catch(e){console.error('no next')}
}


// Register service worker to control making site work offline

if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/sw.js')
        .then(() => { console.log('Service Worker Registered'); });
}

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('install prompt');
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    e.prompt();
    e.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
        } else {
            console.log('User dismissed the A2HS prompt');
        }
    });
});

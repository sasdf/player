const $file = document.querySelector("#file");
const $audio = document.querySelector("#audio");
const $backward = document.querySelector("#btn-backward");
const $play = document.querySelector("#btn-play");
const $pause = document.querySelector("#btn-pause");
const $forward = document.querySelector("#btn-forward");
const $histories = document.querySelectorAll(".hist-entry");


const defaultSkipTime = 5; /* Time to skip in seconds by default */

function now() { return new Date().getTime() }


var historyList = [];

// Load histories.
try {
    const loaded = JSON.parse(localStorage.getItem('histories'));
    if (loaded instanceof Array && loaded.every(e => typeof(e.name) === 'string' && typeof(e.time) === 'number')) {
        historyList = loaded;
    }
} catch (err) {
    console.log(err);
}

renderHistory(10000);

function saveHistory () {
    localStorage.setItem('histories', JSON.stringify(historyList));
}

// Render the top `length` history entries.
function renderHistory(length) {
    length = Math.min(length, $histories.length);
    for (let i = 0; i<length; i++) {
        $histories[i].classList.add('hidden');
    }
    length = Math.min(length, historyList.length);
    for (let i = 0; i<length; i++) {
        const h = historyList[i];
        $histories[i].querySelector('.hist-name').innerText = h.name;
        const time = Math.round(h.time);
        const second = ('00' + time % 60).slice(-2);
        const minute = ('00' + Math.floor(time / 60) % 60).slice(-2);
        const hour = Math.floor(time / 3600);
        let timeStr = (hour ? `${hour}:` : '') + `${minute}:${second}`;
        if (h.duration == h.time) {
            timeStr = 'Done'
        }
        $histories[i].querySelector('.hist-time').innerText = timeStr;
        $histories[i].classList.remove('hidden');
    }
}

// Left click handler to remove history.
for (let i = 0; i<$histories.length; i++) {
    $histories[i].addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (historyList[i].name !== $audio.name) {
            historyList.splice(i, 1);
            saveHistory();
            renderHistory(10000);
        }
    });
}

function updateStatus() {
    console.log($audio.paused, $audio.currentTime, $audio.duration, $audio.playbackRate)

    // Update history time and save to localStorage.
    if (historyList.length > 0 && historyList[0].name === $audio.name) {
        historyList[0].time = $audio.currentTime;
        historyList[0].duration = $audio.duration;
        renderHistory(1);
        localStorage.setItem('histories', JSON.stringify(historyList));
    }

    // Update play / pause icon.
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

    // Update mediaSession widget.
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
    console.log(files);
    var url = URL.createObjectURL(files[0]);
    console.log(url);
    $audio.src = url;
    const name = $audio.name = files[0].name;

    // Bring the history record to the front.
    var found = false;
    for (let i = 0; i<historyList.length; i++) {
        if (historyList[i].name === name) {
            found = true;
            historyList.unshift(historyList.splice(i, 1)[0]);
            break;
        }
    }
    if (!found) {
        historyList.unshift({name, time: 0, duration: $audio.duration});
    }

    // Keep last n history records.
    if (historyList.length > $histories.length) {
        historyList = historyList.slice(0, $histories.length);
    }
    renderHistory($histories.length);

    // Resume timestamp.
    $audio.currentTime = historyList[0].time;
    
    updateStatus();
});

$audio.addEventListener("play", e => updateStatus())
$audio.addEventListener("pause", e => updateStatus())
$audio.addEventListener("ended", e => updateStatus())
$audio.addEventListener("seeked", e => updateStatus())

function play () { $audio.play() }
function pause () { $audio.pause() }
function playpause () {
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
function seekto (details) {
    return false;
}

$play.addEventListener("click", play)
$pause.addEventListener("click", pause)
$backward.addEventListener("click", seekbackward)
$forward.addEventListener("click", seekforward)

setInterval(async () => {
    // // Keep player alive.
    // if ($audio.paused) {
    //     // console.log(new Date())
    //     const volume = $audio.volume;
    //     const current = $audio.currentTime;
    //     $audio.volume = 0;
    //     try {
    //         await $audio.play()
    //         await $audio.pause()
    //         navigator.mediaSession.playbackState = "paused"
    //     } finally {
    //         $audio.volume = volume;
    //         $audio.currentTime = current;
    //     }
    // }

    updateStatus()
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

    try { navigator.mediaSession.setActionHandler('play', playpause) } catch(e){console.error('no play')}
    try { navigator.mediaSession.setActionHandler('pause', playpause); } catch(e){console.error('no pause')}
    try { navigator.mediaSession.setActionHandler('seekbackward', seekbackward); } catch(e){console.error('no backward')}
    try { navigator.mediaSession.setActionHandler('seekforward', seekforward); } catch(e){console.error('no forward')}
    try { navigator.mediaSession.setActionHandler('seekto', seekto); } catch(e){console.error('no seekto')}
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


const pageUrl = new URL(location.href);
const url = pageUrl.searchParams.get('url');
if (url) {
    $audio.src = url;
    updateStatus();
}

let sourcelinkEl = document.getElementById('sourcelink')
let repoBaseUrl = 'https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/'
let filenameSplit = window.location.pathname.split('/')
let basename = filenameSplit[filenameSplit.length-1]

sourcelinkEl.href = repoBaseUrl + basename


// evaluate boolean
function bool(v){ return v==="false" || v==="null" || v==="NaN" || v==="undefined" || v==="0" ? false : !!v; }

// hides the header with a GET argument (convenient for iframed demos)
var url = new URL(window.location.href)
var hideheader = bool(url.searchParams.get("hideheader"))

if (hideheader) {
  document.getElementById('header').style.display = 'none'
}

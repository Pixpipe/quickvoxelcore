let sourcelinkEl = document.getElementById('sourcelink')
let repoBaseUrl = 'https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/'
let filenameSplit = window.location.pathname.split('/')
let basename = filenameSplit[filenameSplit.length-1]

sourcelinkEl.href = repoBaseUrl + basename

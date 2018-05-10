let sourcelinkEl = document.getElementById('sourcelink')
let repoBaseUrl = 'https://github.com/Pixpipe/quickvoxelcore/blob/master'
let currentSource = window.location.pathname
sourcelinkEl.href = repoBaseUrl + currentSource

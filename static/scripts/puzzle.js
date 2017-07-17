var across = document.getElementById('across');
var down = document.getElementById('down');

clues = clues.sort(function(a, b) {
  return a.clueAnchor - b.clueAnchor;
});

for (var c = 0; c < clues.length; c++) {
  var li = document.createElement('li');
  li.innerText = clues[c].clueAnchor + ' - ' + clues[c].clue;
  
  if (clues[c].direction === 'across') {
    across.append(li);
  } else {
    down.append(li);
  }
}

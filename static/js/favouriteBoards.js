var favoriteBoards = {};

favoriteBoards.init = function() {

  favoriteBoards.setFavoriteBoards();
  favoriteBoards.setTopBoards();

  var boardLabel = document.getElementById('labelName')
      || document.getElementById('labelBoard');

  if (boardLabel && api.boardUri) {

    var savedFavoriteBoards = JSON.parse(localStorage.savedFavoriteBoards
        || '[]');

    var favoriteButton = document.createElement('input'); 
    favoriteButton.type = 'checkbox';
    favoriteButton.id = 'favoriteButton'; 
    favoriteButton.className = 'glowOnHover';

    boardLabel.parentNode.appendChild(favoriteButton);

    if (savedFavoriteBoards.indexOf(api.boardUri) > -1) {
      favoriteButton.checked = true;
    }

    favoriteButton.oninput = function() {
      savedFavoriteBoards = JSON.parse(localStorage.savedFavoriteBoards
          || '[]');

      var index = savedFavoriteBoards.indexOf(api.boardUri);

      savedFavoriteBoards.checked = index > -1;
      if (index > -1) {
        savedFavoriteBoards.splice(index, 1);
      } else {
        savedFavoriteBoards.push(api.boardUri);
        savedFavoriteBoards.sort();
      }

      localStorage.setItem('savedFavoriteBoards', JSON
          .stringify(savedFavoriteBoards));

      favoriteBoards.setFavoriteBoards();

    };

  }

};

favoriteBoards.setFavoriteBoards = function() {

  var savedFavoriteBoards = JSON.parse(localStorage.savedFavoriteBoards
      || '[]');

  var boardsSpan = document.getElementById('navBoardsSpan');

  while (boardsSpan.hasChildNodes()) {
    boardsSpan.removeChild(boardsSpan.lastChild);
  }

  if (savedFavoriteBoards.length) {

    var firstBracket = document.createElement('span');
    firstBracket.innerHTML = '[';
    boardsSpan.appendChild(firstBracket);

    boardsSpan.appendChild(document.createTextNode(' '));

    for (var i = 0; i < savedFavoriteBoards.length; i++) {

      var link = document.createElement('a');
      link.href = '/' + savedFavoriteBoards[i];
      link.innerHTML = savedFavoriteBoards[i];
      boardsSpan.appendChild(link);

      boardsSpan.appendChild(document.createTextNode(' '));

      if (i < savedFavoriteBoards.length - 1) {

        var divider = document.createElement('span');
        divider.innerHTML = '/';
        boardsSpan.appendChild(divider);

        boardsSpan.appendChild(document.createTextNode(' '));
      }

    }

    var secondBracket = document.createElement('span');
    secondBracket.innerHTML = ']';
    boardsSpan.appendChild(secondBracket);
  }

};

favoriteBoards.setTopBoards = function() {
  var topBoardsGetter = new XMLHttpRequest();
  topBoardsGetter.open("GET", "/index.json");
  topBoardsGetter.onload = function(e) {
    var topBoards = JSON.parse(e.target.responseText || '{"topBoards": []}').topBoards

    var boardsSpan = document.getElementById('navTopBoardsSpan');

    while (boardsSpan.hasChildNodes()) {
      boardsSpan.removeChild(boardsSpan.lastChild);
    }

    if (topBoards.length) {

      var firstBracket = document.createElement('span');
      firstBracket.innerHTML = '[';
      boardsSpan.appendChild(firstBracket);

      boardsSpan.appendChild(document.createTextNode(' '));

      for (var i = 0; i < topBoards.length; i++) {

        var link = document.createElement('a');
        link.href = '/' + topBoards[i].boardUri;
        link.innerHTML = topBoards[i].boardUri;
        boardsSpan.appendChild(link);

        boardsSpan.appendChild(document.createTextNode(' '));

        if (i < topBoards.length - 1) {

          var divider = document.createElement('span');
          divider.innerHTML = '/';
          boardsSpan.appendChild(divider);

          boardsSpan.appendChild(document.createTextNode(' '));
        }

      }

    var secondBracket = document.createElement('span');
    secondBracket.innerHTML = ']';
    boardsSpan.appendChild(secondBracket);
    }
  }
  topBoardsGetter.send()
};

favoriteBoards.init();

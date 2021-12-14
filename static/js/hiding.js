var hiding = {};

hiding.init = function() {

  hiding.updateHidingData();

  hiding.filtered = [];
};

hiding.updateHidingData = function() {

  var storedHidingData = localStorage.hidingData;

  if (!storedHidingData) {
    hiding.storedHidingData = {};
    return;
  }

  hiding.storedHidingData = JSON.parse(storedHidingData);

};

hiding.checkFilters = function() {

  hiding.filtered = [];

  /* TODO use posting.existingPosts */
  var links = document.getElementsByClassName('linkSelf');

  for (var i = 0; i < links.length; i++) {
    hiding.checkFilterHiding(links[i]);
  }

};

hiding.filterMatches = function(string, filter, regex) {
  if (regex) {
    return Boolean( string.match(new RegExp(filter)) );
  } else {
    return string.indexOf(filter) >= 0;
  }
};

hiding.isFiltered = function(linkSelf, filter) {

  /* TODO do NOT give this function linkSelf, but abstracted post object */
  var postName = linkSelf.parentNode
      .getElementsByClassName('linkName')[0].innerText;
  var labelSubject = linkSelf.parentNode
      .getElementsByClassName('labelSubject')[0];
  if (labelSubject)
      var postSubject = labelSubject.innerText;
  var postMessage = linkSelf.parentNode.parentNode
        .getElementsByClassName('divMessage')[0].innerText;
  var postId = undefined;

  var labelId = linkSelf.parentNode
      .getElementsByClassName('labelId')[0]
  if (labelId)
    postId = labelId.innerText;

  if (filter.type < 2) {

    if (postName.indexOf('#') >= 0) {

      var trip = postName.substring(postName.lastIndexOf('#') + 1);
      postName = postName.substring(0, postName.indexOf('#'));

    }
  }

  switch (filter.type) {
  case 0:
    if (hiding.filterMatches(postName, filter.filter, filter.regex))
      return true;
    break;

  case 1:
    if (trip && hiding.filterMatches(trip, filter.filter, filter.regex))
      return true;
    break;

  case 2:
    if (labelSubject && hiding.filterMatches(postSubject, filter.filter, filter.regex))
      return true
    break;

  case 3:
    if (hiding.filterMatches(postMessage, filter.filter, filter.regex))
      return true;
    break;

  case 4:
    var isOP = api.parsePostLink(linkSelf.href);
    if (isOP === undefined) {
      console.log("リンクを解析できませんでした：", linkSelf.href)
      return false;
    }
    if (hiding.buildPostFilterId(linkSelf, postId) === filter.filter && !isOP.op)
      return true;
    break;
  }
}

hiding.checkFilterHiding = function(linkSelf) {

  for (var i = 0; i < settingsMenu.loadedFilters.length; i++) {

    var filter = settingsMenu.loadedFilters[i];

    if (hiding.isFiltered(linkSelf, filter)) {
        return hiding.hidePost(linkSelf, true);
    }
  }

};

hiding.registerHiding = function(board, thread, post, unhiding) {

  var storedData = localStorage.hidingData;

  var hidingData = storedData ? JSON.parse(storedData) : {};

  var boardData = hidingData[board] || {
    threads : [],
    posts : []
  };

  var listToUse = post ? boardData.posts : boardData.threads;
  post = thread;

  if (!unhiding) {
    if (listToUse.indexOf(post) < 0) {
      listToUse.push(post);
    }
  } else {
    listToUse.splice(listToUse.indexOf(post), 1);
  }

  hidingData[board] = boardData;

  localStorage.hidingData = JSON.stringify(hidingData);

  hiding.storedHidingData = hidingData;

};

hiding.hidePost = function(linkSelf, noCacheHidden, deleted) {

  var postInfo = api.parsePostLink(linkSelf.href);

  hiding.toggleHidden(linkSelf.parentNode.parentNode, true);

  var hideText = '[Unhide ' + (postInfo.op ? 'ポスター' : '役職') + ' ' 
      + postInfo.board + '/' + postInfo.post;

  if (!noCacheHidden) {
    hiding.registerHiding(postInfo.board, postInfo.thread, postInfo.post);
  } else if (deleted) {
    hideText += ' (削除)';
  } else {
    hideText += ' (フィルタリング)';
  }

  var unhidePostButton = document.createElement('span');
  unhidePostButton.innerText = hideText + ']';
  unhidePostButton.className = 'unhideButton glowOnHover';

  linkSelf.parentNode.parentNode.parentNode.insertBefore(unhidePostButton,
      linkSelf.parentNode.parentNode);

  unhidePostButton.onclick = function() {

    if (!noCacheHidden)
      hiding.registerHiding(postInfo.board, postInfo.thread, postInfo.post, true);
    unhidePostButton.remove();

    hiding.toggleHidden(linkSelf.parentNode.parentNode, false);

  };

};

hiding.hideReplies = function(board, thread, post) {
  var reply = tooltips.knownPosts[board][post]
  console.log(post)
  if (reply) {
    reply.added.forEach((a) => {
      var reply = a.split('_')
      if (reply[0] !== board)
        return
      var replyDiv = document.getElementById(reply[1]).getElementsByClassName('linkSelf')[0]
      hiding.hidePost(replyDiv);
    })
  }
}

hiding.hideThread = function(linkSelf, board, thread) {

  hiding.toggleHidden(linkSelf.parentNode.parentNode.parentNode, true);
  var unhideThreadButton = document.createElement('span');

  unhideThreadButton.innerHTML = '[スレッドを再表示 ' + board + '/' + thread + ']';
  unhideThreadButton.className = 'unhideButton glowOnHover';
  linkSelf.parentNode.parentNode.parentNode.parentNode.insertBefore(
      unhideThreadButton, linkSelf.parentNode.parentNode.parentNode);

  hiding.registerHiding(board, thread);

  unhideThreadButton.onclick = function() {
    hiding.toggleHidden(linkSelf.parentNode.parentNode.parentNode, false);
    unhideThreadButton.remove();
    hiding.registerHiding(board, thread, null, true);
  }

};

hiding.buildPostFilterId = function(linkSelf, id) {

  if (id === undefined) return;

  var checkbox = linkSelf.parentNode.getElementsByClassName('deletionCheckBox')[0];
  var postData = checkbox.name.split('-');
  var board = postData[0];
  var threadId = postData[1];

  return board + '-' + threadId + '-' + id;

};

hiding.buildMenu = function(post) {
  //reformatted this in such a way that doesn't make my eyes bleed as much
  var menuCallbacks = [
    {name: '投稿を非表示'
    ,callback: function() {
      hiding.hidePost(post.linkSelf); // board, thread, post || thread);
    }},
    {name: '投稿を非表示+'
    ,callback: function() {
      hiding.hidePost(post.linkSelf); // board, thread, post || thread);
      hiding.hideReplies(post.postInfo.board, post.postInfo.thread, post.postInfo.post);
    }},
    {name: 'ポスターを隠す'
    ,callback: function() {
      hiding.hidePost(post.linkSelf);
    }},
    {name: 'スレッドを非表示'
    ,callback: function() {
       hiding.hideThread(post.linkSelf, post.postInfo.board, post.postInfo.thread);
    }},
    {name: 'フィルタ名'
    ,callback: function() {
      settingsMenu.createFilter(post.postInfo.name, false, 0);
    }},
    {name: 'トリップコードをフィルタリングする'
    ,callback: function() {
      settingsMenu.createFilter(post.postInfo.trip, false, 1);
    }},
    {name: 'フィルタID'
    ,callback: function() {
      settingsMenu.createFilter(hiding.buildPostFilterId(post.linkSelf,
        post.postInfo.id), false, 4);
    }},
    {name: 'フィルタID +'
    ,callback: function() {
      settingsMenu.createFilter(hiding.buildPostFilterId(post.linkSelf,
        post.postInfo.id), false, 4);

      //TODO just saying, it'd be really nice if there were a small query
      //library to find posts with a specific id/name/tripcode
      Array.from(document.getElementsByClassName('labelId')).forEach(
      (postId) => {
        if (postId.innerHTML !== labelId.innerHTML)
          return;
        var postNumber = postId.parentNode.parentNode.parentNode.parentNode.id;
        hiding.hideReplies(post.postInfo.board, post.postInfo.thread, postNumber);
      });
    }}
  ]

  if (post.postInfo.op) {
    menuCallbacks.splice(0, 2); //drop the post filters
  } else {
    menuCallbacks.splice(2, 2); //drop the OP filters
  }

  if (!post.postInfo.trip) {
    //remove tripcode options
    var tripIndex = menuCallbacks.findIndex((a) => a.name == 'トリップコードをフィルタリングする');
    menuCallbacks.splice(tripIndex, 1);
  }

  if (!post.postInfo.id) {
    //remove id options
    var idIndex = menuCallbacks.findIndex((a) => a.name == 'フィルタID');
    menuCallbacks.splice(idIndex, 2);
  }

  return menuCallbacks;
};

hiding.toggleHidden = function(element, hide) {

  var className = element.className;

  if (hide) {
    element.classList.add('hidden');
  } else {
    element.classList.remove('hidden');
  }

};

hiding.hideIfHidden = function(post) {

  var boardData = hiding.storedHidingData[post.postInfo.board];

  if (!boardData) {
    return;
  }

  if (boardData.posts.indexOf(post.postInfo.post) > -1) {
    hiding.hidePost(post.linkSelf);
  }

  if (post.postInfo.op && boardData.threads.indexOf(post.postInfo.thread) > -1) {
    hiding.hideThread(post.linkSelf, post.postInfo.board, post.postInfo.thread);
  }

};

hiding.init();

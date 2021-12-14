//posting.js: iterating over posts and adding new ones to the thread
posting = {};

posting.init = function() {

  api.noReportCaptcha = !document.getElementById('divReportCaptcha');
  posting.idsRelation = {};
  posting.highLightedIds = [];

  posting.postCellTemplate = '<div class="innerPost"><h3 class="labelBoard"></h3><div class="postInfo title">'
      + '<input type="checkbox" class="deletionCheckBox"> <span class="labelSubject">'
      + '</span> <a class="linkName"></a> <img class="imgFlag"> <span class="labelRole">'
      + '</span> <span class="labelCreated"></span> <span class="spanId"> Id:<span '
      + 'class="labelId"></span></span> <a '
      + 'class="linkSelf">No.</a> <a class="linkQuote"></a> <a class="linkEdit">[Edit]</a> '
      + '<a class="linkHistory">[History]</a> <a class="linkFileHistory">[File history]</a>'
      + ' <a class="linkOffenseRecord">[Offense record]</a>'
      + ' <span class="panelBacklinks"></span></div>'
      + '<div class="panelASN">Asn： <span class="labelASN"></span> </div>'
      + '<div class="panelBypassId"> Bypass Id: <span class="labelBypassId"></span> </div>'
      + '<div class="panelIp"> <span class="panelRange">Broad '
      + 'range(1/2 octets): <span class="labelBroadRange"> </span> <br>'
      + 'Narrow range(3/4 octets): <span class="labelNarrowRange"> </span> <br>'
      + '</span> Ip: <span class="labelIp"></span></div>'
      + '<div class="panelUploads"></div><div class="divMessage"></div>'
      + '<div class="divBanMessage"></div><div class="labelLastEdit"></div></div>';

  posting.uploadCell = '<details open> <summary> <div class="uploadDetails">'
    + '<a class="nameLink coloredIcon" target="_blank"></a>'
    + '<span class="hideFileButton glowOnHover coloredIcon"></span>'
    + '<span class="hideMobile">(</span><span class="sizeLabel"></span> '
    + '<span class="dimensionLabel"></span> '
    + '<a class="originalNameLink"></a><span class="hideMobile">)</span> </div>'
    + '<div class="divHash"> <span>SHA256: <span class="labelHash"></span></span>'
    + '</div> <div> <a class="unlinkLink">[Unlink]</a>'
    + '<a class="unlinkAndDeleteLink">[Unlink and delete]</a> </div> </summary>'
    + '<br><a class="imgLink" target="_blank"> </a> </details>';

  posting.guiEditInfo = 'Edited last time by {$login} on {$date}.';

  posting.reverseHTMLReplaceTable = {};

  for ( var key in api.htmlReplaceTable) {
    posting.reverseHTMLReplaceTable[api.htmlReplaceTable[key]] = key;
  }

  posting.localTime = JSON.parse(localStorage.localTime || "false");
  posting.relativeTime = JSON.parse(localStorage.relativeTime || "false");

  /*TODO figure out what this was preventing
  if (typeof (thread) !== 'undefined') {
    return;
  }*/
  
  if (api.boardUri) {
    var yous = localStorage.getItem(api.boardUri + "-yous");

    posting.yous = yous === null ? [] : JSON.parse(yous);
    if (!(posting.yous instanceof Array))
      posting.yous = [posting.yous];
  }

  posting.existingPosts = Array.from(document.getElementsByClassName('linkSelf'))
    .map((linkSelf) => posting.parseExistingPost(linkSelf));

  if (posting.relativeTime) {
    posting.updateAllRelativeTimes();
    setInterval(posting.updateAllRelativeTimes, 1000 * 60 * 5);
  }
};

//extract the name, tripcode, and ID (if enabled) from a post
posting.getExtraInfo = function(innerPost, postInfo) {
  var name = innerPost.getElementsByClassName('linkName')[0].innerHTML;

  if (name.indexOf('#') >= 0) {
    postInfo.trip = name.substring(name.lastIndexOf('#') + 1);
    postInfo.name = name.substring(0, name.indexOf('#'));
  } else {
    postInfo.name = name;
  }

  var labelId = innerPost.getElementsByClassName('labelId')[0];

  if (labelId) {
    postInfo.id = labelId.innerHTML;
  }
}

//parse (and modify) an existing post in the thread; adds tooltips, dropdowns,
//etc if scripts are loaded
posting.parseExistingPost = function(linkSelf, noExtras, noModify, noTooltips) {
  var innerPost = linkSelf.parentNode.parentNode;
  var postInfo = api.parsePostLink(linkSelf.href);
  posting.getExtraInfo(innerPost, postInfo);

  var ret = {};
  ret.postInfo = postInfo;
  ret.linkSelf = linkSelf;
  ret.innerPost = innerPost;
  ret.files = innerPost.getElementsByClassName('panelUploads')[0];
  ret.message = innerPost.getElementsByClassName("divMessage")[0];

  if (noModify)
    return;

  //cache a clone of the node with alt before it gets additional backlinks
  if (typeof tooltips !== "undefined" && !noTooltips) {
    tooltips.addToKnownPostsForBackLinks(innerPost);
    tooltips.postCache[linkSelf.href] = innerPost.cloneNode(true);
  }

  //update with local times
  var labelCreated = innerPost.getElementsByClassName('labelCreated')[0];
  if (posting.localTime) {
    posting.setLocalTime(labelCreated);
  }

  if (posting.relativeTime) {
    posting.addRelativeTime(labelCreated);
  }

  //thumbnail hovering/hiding
  if (typeof thumbs !== "undefined") {
    Array.from(innerPost.getElementsByClassName('uploadCell'))
      .forEach((cell) => thumbs.processUploadCell(cell));
  }

  if (typeof embed !== "undefined") {
    Array.from(ret.message.getElementsByTagName("a"))
      .forEach((embedLink) => embed.processLinkForEmbed(embedLink));
  }

  if (typeof hiding !== "undefined") {
    hiding.checkFilterHiding(linkSelf);
    hiding.hideIfHidden(ret);
  }

  if (!noExtras)
    posting.addExternalExtras(ret, noTooltips);

  return ret;
};


posting.addExternalExtras = function(ret, noTooltips) {
  var innerPost = ret.innerPost;
  var linkSelf = ret.linkSelf;
  var postInfo = ret.postInfo;

  posting.processIdLabel(innerPost.getElementsByClassName("labelId")[0]);

  //(You)s
  if (posting.yous && posting.yous.indexOf(+postInfo.post) !== -1) {
    posting.markPostAsYou(postInfo.post);
  }

  //load posting menu, hiding menu, and watcher
  //TODO: coalesce files?
  if (typeof postingMenu !== "undefined") {
    interfaceUtils.addMenuDropdown(ret, "Post Menu", 
      "extraMenuButton", postingMenu.buildMenu);
  }

  if (typeof hiding !== "undefined") {
    interfaceUtils.addMenuDropdown(ret, "Hide", 
      "hideButton", hiding.buildMenu);
  }

  if (typeof watcher !== "undefined") {
    if (postInfo.op)
      watcher.processOP(innerPost);
  }

  if (typeof qr !== "undefined") {
    var linkQuote = innerPost.getElementsByClassName('linkQuote')[0];

    linkQuote.onclick = function() {
      qr.showQr(linkQuote.href.match(/#q(\d+)/)[1]);
    };
  }

  if (typeof tooltips !== "undefined") {
    Array.from(innerPost.getElementsByClassName('quoteLink'))
      .forEach((quote) => {
        var target = api.parsePostLink(quote.href);
        tooltips.processQuote(quote, false, noTooltips);

        if (!posting.yous) return;

        if (api.boardUri === target.board && posting.yous.indexOf(+target.post) !== -1)
          quote.classList.add("you");

      });
  }
};

posting.setLocalTime = function(time) {

  time.innerHTML = api.formatDateToDisplay(
    new Date(time.innerHTML + ' UTC'), true);

};

posting.updateAllRelativeTimes = function() {

  var times = document.getElementsByClassName('labelCreated');

  for (var i = 0; i < times.length; i++) {
    posting.addRelativeTime(times[i]);
  }

};

posting.addRelativeTime = function(time) {

  var timeObject = new Date(time.innerHTML + (posting.localTime ? '' : ' UTC'));

  var relativeTime = time.nextSibling;
  if (relativeTime.className !== 'relativeTime') {

    relativeTime = document.createElement('span');

    relativeTime.className = 'relativeTime';

    time.parentNode.insertBefore(relativeTime, time.nextSibling);

  }

  var now = new Date();

  var content;

  var delta = now - timeObject;

  var second = 1000;
  var minute = second * 60;
  var hour = minute * 60;
  var day = hour * 24;
  var month = day * 30.5;
  var year = day * 365.25;

  if (delta > 2 * year) {
    content = Math.ceil(delta / year) + ' years ago';
  } else if (delta > 2 * month) {
    content = Math.ceil(delta / month) + ' months ago';
  } else if (delta > 2 * day) {
    content = Math.ceil(delta / day) + ' days ago';
  } else if (delta > 2 * hour) {
    content = Math.ceil(delta / hour) + ' hours ago';
  } else if (delta > 2 * minute) {
    content = Math.ceil(delta / minute) + ' minutes ago';
  } else {
    content = 'Just now'
  }

  relativeTime.innerHTML = ' (' + content + ')';

};


posting.processIdLabel = function(label) {

  if (label === undefined)
    return;

  var id = label.innerHTML;
  var array = posting.idsRelation[id] || [];
  var cell = label.parentNode.parentNode.parentNode;

  if (cell.parentNode.className === 'inlineQuote'
      || cell.parentNode.className === 'quoteTooltip') {
  } else {
    posting.idsRelation[id] = array;

    array.push(cell);
  }

  label.onmouseover = function() {
    label.innerHTML = id + ' (' + array.length + ')';
  }

  label.onmouseout = function() {
    label.innerHTML = id;
  }

  label.onclick = function() {

    var index = posting.highLightedIds.indexOf(id);
	window.location.hash = '_';

    if (index > -1) {
      posting.highLightedIds.splice(index, 1);
    } else {
      posting.highLightedIds.push(id);
    }

    for (var i = 0; i < array.length; i++) {
      var cellToChange = array[i];

      if (cellToChange.className === 'innerOP') {
        continue;
      }

      if (index > -1) { /*? 'innerPost' : 'markedPost';*/
        cellToChange.classList.add("markedPost");
      }
    }

  };

};

posting.setLastEditedLabel = function(post, cell) {

  var editedLabel = cell.getElementsByClassName('labelLastEdit')[0];

  if (post.lastEditTime) {

    var formatedDate = api.formatDateToDisplay(new Date(post.lastEditTime));

    editedLabel.innerHTML = posting.guiEditInfo
        .replace('{$date}', formatedDate).replace('{$login}',
            post.lastEditLogin);

  } else {
    editedLabel.remove();
  }

};

posting.setUploadLinks = function(cell, file, noExtras) {

  var thumbLink = cell.getElementsByClassName('imgLink')[0];
  thumbLink.href = file.path;

  thumbLink.setAttribute('data-filemime', file.mime);

  if (file.mime.indexOf('image/') > -1 && !noExtras
      && (typeof gallery !== 'undefined') && !api.mobile) {
    gallery.addGalleryFile(file.path);
  }

  var img = document.createElement('img');
  img.src = file.thumb;

  thumbLink.appendChild(img);

  var nameLink = cell.getElementsByClassName('nameLink')[0];
  nameLink.href = file.path;

  var originalLink = cell.getElementsByClassName('originalNameLink')[0];
  originalLink.innerHTML = file.originalName;
  originalLink.href = file.path;
  originalLink.setAttribute('download', file.originalName);

};

posting.getUploadCellBase = function() {

  var cell = document.createElement('figure');
  cell.innerHTML = posting.uploadCell;
  cell.className = 'uploadCell';

  return cell;

}

posting.setUploadCell = function(node, post, boardUri, noExtras) {

  if (!post.files) {
    return;
  }

  var files = post.files;

  for (var i = 0; i < files.length; i++) {
    var file = files[i];

    var cell = posting.getUploadCellBase();

    posting.setUploadLinks(cell, file, noExtras);

    var sizeString = api.formatFileSize(file.size);
    cell.getElementsByClassName('sizeLabel')[0].innerHTML = sizeString;

    var dimensionLabel = cell.getElementsByClassName('dimensionLabel')[0];

	//unfortunately, this is a stopgap. the backend needs to do the same thing
    if (file.width) {
      dimensionLabel.innerHTML = file.width + '&times;' + file.height;
      var gcd = (function(a,b){
		while (b != 0) {
			var t = b;
			b = a % b;
			a = t;
		}
		return a;
      })(file.width, file.height)
      dimensionLabel.title = (file.width/gcd) + ':' + (file.height/gcd);
    } else {
      dimensionLabel.remove();
    }

    var unlinkCell = cell.getElementsByClassName('unlinkLink')[0];
    var deleteCell = cell.getElementsByClassName('unlinkAndDeleteLink')[0];

    if (!api.mod) {
      unlinkCell.remove();
      deleteCell.remove();
    } else {
      var urlToUse = '/unlinkSingle.js?boardUri=' + boardUri;

      if (post.postId) {
        urlToUse += '&postId=' + post.postId;
      } else {
        urlToUse += '&threadId=' + post.threadId;
      }

      urlToUse += '&index=' + i;

      unlinkCell.href = urlToUse;
      deleteCell.href = urlToUse + '&delete=1';

    }

    if (file.sha256) {
      cell.getElementsByClassName('labelHash')[0].innerHTML = file.sha256;
    } else {
      cell.getElementsByClassName('divHash')[0].remove();
    }

    node.appendChild(cell);
  }

};

posting.setPostHideableElements = function(postCell, post, noExtras) {

  var subjectLabel = postCell.getElementsByClassName('labelSubject')[0];

  if (post.subject) {
    subjectLabel.innerHTML = post.subject;
  } else {
    subjectLabel.remove();
  }

  if (post.id) {
    var labelId = postCell.getElementsByClassName('labelId')[0];
    labelId.setAttribute('style', 'background-color: #' + post.id);
    labelId.innerHTML = post.id;
  } else {
    var spanId = postCell.getElementsByClassName('spanId')[0];
    spanId.remove();
  }

  var banMessageLabel = postCell.getElementsByClassName('divBanMessage')[0];

  if (!post.banMessage) {
    banMessageLabel.parentNode.removeChild(banMessageLabel);
  } else {
    banMessageLabel.innerHTML = post.banMessage;
  }

  posting.setLastEditedLabel(post, postCell);

  var imgFlag = postCell.getElementsByClassName('imgFlag')[0];

  if (post.flag) {
    imgFlag.src = post.flag;
    imgFlag.title = post.flagName.replace(/&(l|g)t;/g, function replace(match) {
      return posting.reverseHTMLReplaceTable[match];
    });

    if (post.flagCode) {
      imgFlag.className += ' flag' + post.flagCode;
    }
  } else {
    imgFlag.remove();
  }

  if (!post.asn) {
    postCell.getElementsByClassName('panelASN')[0].remove();
  } else {
    postCell.getElementsByClassName('labelASN')[0].innerHTML = post.asn;
  }

  if (!post.bypassId) {
    postCell.getElementsByClassName('panelBypassId')[0].remove();
  } else {
    postCell.getElementsByClassName('labelBypassId')[0].innerHTML = post.bypassId;
  }

  if (!post.ip) {
    postCell.getElementsByClassName('panelIp')[0].remove();
  } else {

    postCell.getElementsByClassName('labelIp')[0].innerHTML = post.ip;

    if (!post.broadRange) {
      postCell.getElementsByClassName('panelRange')[0].remove();
    } else {

      postCell.getElementsByClassName('labelBroadRange')[0].innerHTML = post.broadRange;
      postCell.getElementsByClassName('labelNarrowRange')[0].innerHTML = post.narrowRange;

    }

  }

};

posting.setPostLinks = function(postCell, post, boardUri, link, threadId,
    linkQuote, deletionCheckbox, preview) {

  var postingId = post.postId || threadId;

  preview = preview || api.isBoard;

  var linkStart = (preview ? '/' + boardUri + '/res/' + threadId + '.html' : '')
      + '#';

  linkQuote.href = linkStart;
  link.href = linkStart;

  link.href += postingId;
  linkQuote.href += 'q' + postingId;

  var linkEdit = postCell.getElementsByClassName('linkEdit')[0];
  var linkHistory = postCell.getElementsByClassName('linkHistory')[0];
  var linkFileHistory = postCell.getElementsByClassName('linkFileHistory')[0];
  var linkOffenseHistory = postCell.getElementsByClassName('linkOffenseRecord')[0];

  var complement = (post.postId ? 'postId' : 'threadId') + '=' + postingId;

  if (api.mod) {
    linkEdit.href = '/edit.js?boardUri=' + boardUri + '&';
    linkEdit.href += complement;
  } else if (linkEdit) {
    linkEdit.remove();
  }

  if (api.mod && (post.ip || post.bypassId)) {
    linkFileHistory.href = '/mediaManagement.js?boardUri=' + boardUri + '&';
    linkFileHistory.href += complement;

    linkHistory.href = '/latestPostings.js?boardUri=' + boardUri + '&';
    linkHistory.href += complement;

    linkOffenseHistory.href = '/offenseRecord.js?boardUri=' + boardUri + '&';
    linkOffenseHistory.href += complement;

  } else if (linkHistory) {
    linkHistory.remove();
    linkFileHistory.remove();
    linkOffenseHistory.remove();
  }

  var checkboxName = boardUri + '-' + threadId;

  if (post.postId) {
    checkboxName += '-' + post.postId;
  }

  deletionCheckbox.setAttribute('name', checkboxName);

};

posting.setRoleSignature = function(postingCell, posting) {

  var labelRole = postingCell.getElementsByClassName('labelRole')[0];

  if (posting.signedRole) {
    labelRole.innerHTML = posting.signedRole;
  } else {
    labelRole.parentNode.removeChild(labelRole);
  }

};

posting.setPostComplexElements = function(postCell, post, boardUri, threadId,
    noExtras, preview) {

  posting.setRoleSignature(postCell, post);

  var link = postCell.getElementsByClassName('linkSelf')[0];

  var linkQuote = postCell.getElementsByClassName('linkQuote')[0];
  linkQuote.innerHTML = post.postId || threadId;

  var deletionCheckbox = postCell.getElementsByClassName('deletionCheckBox')[0];

  posting.setPostLinks(postCell, post, boardUri, link, threadId, linkQuote,
      deletionCheckbox, preview);

  var panelUploads = postCell.getElementsByClassName('panelUploads')[0];

  if (!post.files || !post.files.length) {
    panelUploads.remove();
  } else {

    if (post.files.length > 1) {
      panelUploads.className += ' multipleUploads';
    }

    posting.setUploadCell(panelUploads, post, boardUri, noExtras);
  }

};

posting.addPost = function(post, boardUri, threadId, noExtras, preview, noParse) {

  var postCell = document.createElement('div');
  //XXX this is awful; the backend should be processing these posts instead of
  //this script duplicating the template
  postCell.innerHTML = posting.postCellTemplate;

  postCell.id = post.postId;
  postCell.setAttribute('class', 'postCell');

  postCell.setAttribute('data-boarduri', boardUri);

  var labelBoard = postCell.getElementsByClassName('labelBoard')[0];

  if (preview) {
    labelBoard.innerHTML = '/' + boardUri + '/';
  } else {
    labelBoard.remove();
  }

  var linkName = postCell.getElementsByClassName('linkName')[0];

  linkName.innerHTML = post.name;

  if (post.email) {
    linkName.href = 'mailto:' + post.email;
  } else {
    linkName.className += ' noEmailName';
  }

  var labelCreated = postCell.getElementsByClassName('labelCreated')[0];

  labelCreated.innerHTML = api.formatDateToDisplay(new Date(post.creation));

  postCell.getElementsByClassName('divMessage')[0].innerHTML = post.markdown;

  posting.setPostHideableElements(postCell, post, noExtras);

  posting.setPostComplexElements(postCell, post, boardUri, threadId, noExtras,
      preview);

  if (!noParse) {
    var existParse = posting.parseExistingPost(
      postCell.getElementsByClassName('linkSelf')[0], noExtras);

    if (!noExtras) {
      posting.existingPosts.push(existParse);
    }
  }

  return postCell;

};

posting.markPostAsYou = function(id, obj) {
  var post = obj || document.getElementById(+id);
  if (!post) return;

  var author = post.querySelector(".linkName");
  if (!author) return;

  author.classList.add("youName");
};

//TODO this is only used by sideCatalog
posting.checkForYou = function(post, id) {
  if (posting.yous.indexOf(id) !== -1) {
    posting.markPostAsYou(id, post);
  }

  Array.from(post.getElementsByClassName("quoteLink"))
    .forEach(function(quote) {
      var id = quote.href.split("#")[1];
      if (posting.yous.indexOf(+id) !== -1) {
        posting.markReplyAsYou(quote);
      }
  });
};

posting.init();

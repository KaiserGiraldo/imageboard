var thumbs = {};

thumbs.init = function() {

  thumbs.playableTypes = [ 'video/webm', 'audio/mpeg', 'video/mp4',
      'video/ogg', 'audio/ogg', 'audio/webm' ];

  thumbs.videoTypes = [ 'video/webm', 'video/mp4', 'video/ogg' ];

  thumbs.hiddenMedia = JSON.parse(localStorage.hiddenMedia || "[]");

  thumbs.playingVideos = []

  thumbs.hoveringImage = undefined;
  if (JSON.parse(localStorage.hoveringImage || 'false'))
	thumbs.addHoveringExpand();
};

thumbs.scrollToPost = function(thumb) {
  while (!thumb.classList.contains("innerPost") &&
      !thumb.classList.contains("innerOP")) {
    thumb = thumb.parentNode;
  }
  thumb.scrollIntoView();
}

thumbs.addHoveringExpand = function() {
  if (thumbs.hoveringImage !== undefined)
	thumbs.hoveringImage.remove();

  var hover = document.createElement("img");
  hover.style.position = "fixed";

  thumbs.hoveringImage = hover;
}

thumbs.removeHoveringExpand = function() {
  if (thumbs.hoveringImage !== undefined) {
	thumbs.hoveringImage.remove();
	thumbs.hoveringImage = undefined;
  }
}

thumbs.expandImage = function(mouseEvent, link, mime) {

  if (mouseEvent.which === 2 || mouseEvent.ctrlKey) {
    return true;
  }

  link.parentNode.classList.toggle('expandedCell');

  var thumb = link.getElementsByTagName('img')[0];

  if (thumb.style.display === 'none') {
    link.getElementsByClassName('imgExpanded')[0].style.display = 'none';
    thumb.style.display = '';

    if (thumb.getBoundingClientRect().top < 0) {
      thumbs.scrollToPost(thumb);
    }

    return false;
  }

  var expanded = link.getElementsByClassName('imgExpanded')[0];

  if (expanded) {
    thumb.style.display = 'none';
    expanded.style.display = '';
    thumbs.scrollToPost(link);
  } else {
    var expandedSrc = link.href;

    if (thumb.src === expandedSrc && mime !== 'image/svg+xml') {
      return false;
    }

    expanded = document.createElement('img');
    expanded.setAttribute('src', expandedSrc);
    expanded.className = 'imgExpanded';
    expanded.style.width = link.dataset.filewidth + "px";

    thumb.style.display = 'none';
    link.appendChild(expanded);
    var maxwidth = Math.min(link.parentNode.getBoundingClientRect(), maxwidth);
    expanded.style.width = maxwidth.width + "px";
    var rect = expanded.getBoundingClientRect();
    expanded.style.height = ((link.dataset.fileheight / link.dataset.filewidth) * maxwidth) + "px";
  }

    //remove image on expand
  if (thumbs.hoveringImage !== undefined) {
	thumbs.hoveringImage.src = "";
	thumbs.hoveringImage.remove();
  }

  return false;

};

thumbs.setPlayer = function(link, mime) {

  var path = link.href;
  var parent = link.parentNode;

  var src = document.createElement('source');
  src.setAttribute('src', link.href);
  src.setAttribute('type', mime);

  var isVideo = thumbs.videoTypes.indexOf(mime) > -1;

  var video = document.createElement(isVideo ? 'video' : 'audio');
  if (isVideo) {
    video.loop = !JSON.parse(localStorage.noAutoLoop || 'false');
  }

  video.setAttribute('controls', true);
  video.style.display = 'none';
  video.volume = JSON.parse(localStorage.videovol || 1);

  var videoContainer = document.createElement('span');

  var hideLink = document.createElement('a');
  hideLink.innerHTML = '[ - ]';
  hideLink.style.cursor = 'pointer';
  hideLink.style.display = 'none';
  hideLink.className = 'hideLink';
  hideLink.onclick = function() {
    parent.parentNode.classList.toggle('expandedCell');
    newThumbLink.style.display = 'inline';
    video.style.display = 'none';
    hideLink.style.display = 'none';
    video.pause();

	var findVideo = thumbs.playingVideos.indexOf(video)
	if (findVideo >= 0) {
	  thumbs.playingVideos.splice(findVideo, 1)
      if (!thumbs.playingVideos.length && typeof thread !== "undefined") {
		//restart refresh countdown
		thread.startTimer(thread.currentRefresh || 5)
	  }
	}
  };

  var newThumbLink = document.createElement('a');
  newThumbLink.href = link.href;

  var newThumb = document.createElement('img');
  newThumbLink.appendChild(newThumb);
  newThumb.className = 'imgLink';
  newThumb.src = link.getElementsByTagName("img")[0].src;
  newThumbLink.onclick = function(mouseEvent) {

    if (mouseEvent.which === 2 || mouseEvent.ctrlKey) {
      return true;
    }

    parent.parentNode.classList.toggle('expandedCell');

    if (!video.childNodes.count) {
      video.appendChild(src);
    }
	
    if (typeof thread !== "undefined" && thread.currentRefresh) {
      clearInterval(thread.refreshTimer);
    }

	thumbs.playingVideos.push(video)

    newThumbLink.style.display = 'none';
    video.style.display = 'inline';
    hideLink.style.display = 'inline';
    video.play();

    return false;
  };
  newThumb.style.cursor = 'pointer';

  videoContainer.appendChild(hideLink);
  videoContainer.appendChild(video);
  videoContainer.appendChild(newThumbLink);

  parent.replaceChild(videoContainer, link);

};

thumbs.hoverExpand = function(e, link) {
	if (thumbs.hoveringImage === undefined)
		return;

	var thumb = link.getElementsByTagName("img")[0];

	//no hover if hiding thumbnail
	if (thumb === undefined || thumb.style.display === "none")
		return;

	var hover = thumbs.hoveringImage;
	hover.src = link.href;

	var boundBox = link.getBoundingClientRect();
	var right = window.innerWidth - boundBox.left;
	if (right > boundBox.left) {
		hover.style.left = boundBox.right + "px";
		hover.style.right = "";
	} else {
		hover.style.left = "";
		hover.style.right = right + "px";
	//	hover.style.maxWidth = boundBox.left + "px";
	}

	hover.style.maxHeight = "100%";
	hover.style.top = "0px"; //(16 + boundBox.top) + "px";

	document.body.appendChild(thumbs.hoveringImage);
}

thumbs.processImageLink = function(link) {

  var mime = link.dataset.filemime;

  if (mime.indexOf('image/') > -1) {

    link.onclick = function(mouseEvent) {
      return thumbs.expandImage(mouseEvent, link, mime);
    };

	link.onmouseenter = function(e) {
      return thumbs.hoverExpand(e, link);
	};

	link.onmouseleave = function(e) {
	  if (thumbs.hoveringImage !== undefined) {
		//TODO replace source with loading icon?
		thumbs.hoveringImage.src = "";
		thumbs.hoveringImage.remove();
	  }
	};

  } else if (thumbs.playableTypes.indexOf(mime) > -1) {
    thumbs.setPlayer(link, mime);
	
  }
};

thumbs.processFileForHiding = function(file) {

  var details = file.getElementsByTagName('details')[0];
  if (!details)
    return;

  var nameLink = file.getElementsByClassName('nameLink')[0];

  var fileName = nameLink.href.split('/');
  fileName = fileName[fileName.length - 1];

  var hiddenIndex = thumbs.hiddenMedia.indexOf(fileName);

  if (hiddenIndex !== -1)
    details.removeAttribute("open")

  details.ontoggle = function() {

    var hiddenIndex = thumbs.hiddenMedia.indexOf(fileName);

    if (details.open && hiddenIndex >= 0) {
      thumbs.hiddenMedia.splice(hiddenIndex, 1);
    } else if (!details.open && hiddenIndex == -1) {
      thumbs.hiddenMedia.push(fileName);
    }

    localStorage.hiddenMedia = JSON.stringify(thumbs.hiddenMedia);

  };

};

thumbs.processUploadCell = function(uploadCell) {
  thumbs.processFileForHiding(uploadCell);

  var imgLink = uploadCell.getElementsByClassName('imgLink')[0];
  if (!imgLink)
    return;

  thumbs.processImageLink(imgLink); 
};

thumbs.init();

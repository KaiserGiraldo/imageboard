api.isBoard = true;

var board = {};

board.init = function() {

  api.mod = !!document.getElementById('divMod');
  api.hiddenCaptcha = !document.getElementById('captchaDiv');

  var identifierElement = document.getElementById('boardIdentifier');
  api.boardUri = identifierElement ? identifierElement.value : null;
  document.getElementById('useSageSpan').classList.add('hidden');

  if (!api.boardUri) {

    var altIdentifierElement = document.getElementById('labelBoard');

    api.boardUri = altIdentifierElement ? altIdentifierElement.innerHTML
        .replace(/\//g, '') : null;

  }

  if (identifierElement) {

    board.messageLimit = +document.getElementById('labelMessageLength').innerHTML;

    board.postButton = document.getElementById('formButton');

    board.postingForm = document.getElementById('postingFormContents').parentNode;
    board.postingForm.onsubmit = function(e) {
      e.preventDefault()
      board.postThread();
    }
  }

  if (api.mod) {
    api.convertButton('inputBan', postCommon.banPosts, 'banField');
    api.convertButton('inputBanDelete', postCommon.banDeletePosts, 'banField');
    api.convertButton('inputIpDelete', postCommon.deleteFromIpOnBoard);
    api.convertButton('inputThreadIpDelete', postCommon.deleteFromIpOnThread);
    api.convertButton('inputSpoil', postCommon.spoilFiles);
  }

  var archiveTarget = document.location.toString().split('/');
  archiveTarget.pop()
  var archiveLink = document.getElementById('archiveLinkBoard');
  archiveLink.href = 'http://archive.today/' + encodeURIComponent(archiveTarget.join('/')) + '/*';
  archiveLink.parentNode.style.display = 'inline-block';

};

board.postCallback = function(status, data) {

  if (status === 'ok') {

    postCommon.storeUsedPostingPassword(api.boardUri, data);
    api.addYou(api.boardUri, data);

    window.location.pathname = '/' + api.boardUri + '/res/' + data + '.html';
  } else {
    alert(status + ': ' + JSON.stringify(data));
  }
};

board.postCallback.stop = function() {
  board.postButton.innerHTML = board.originalButtonText;
  board.postButton.disabled = false;
};

board.postCallback.progress = function(info) {

  if (info.lengthComputable) {
    var newText = 'アップロード' + Math.floor((info.loaded / info.total) * 100)
        + '%';
    board.postButton.innerHTML = newText;
  }
};

board.sendThreadData = function(files, captchaId) {

  var hiddenFlags = !document.getElementById('flagsDiv');

  if (!hiddenFlags) {
    var combo = document.getElementById('flagCombobox');

    var selectedFlag = combo.options[combo.selectedIndex].value;

    postCommon.savedSelectedFlag(selectedFlag);
  }

  var forcedAnon = !document.getElementById('fieldName');

  if (!forcedAnon) {
    var typedName = document.getElementById('fieldName').value.trim();

    localStorage.setItem('name', typedName);

  }

  var typedEmail = document.getElementById('fieldEmail').value.trim();
  var typedMessage = document.getElementById('fieldMessage').value.trim();
  var typedSubject = document.getElementById('fieldSubject').value.trim();
  var typedPassword = document.getElementById('fieldPostingPassword').value
      .trim();

  if (!postCommon.belowMaxFileSize(files)) {
    alert("アップロードに失敗しました：ファイルが大きすぎます");
    return;
  }
  if (!typedMessage.length) {
    alert('メッセージは必須です。');
    return;
  } else if (!forcedAnon && typedName.length > 32) {
    alert('名前が長すぎます。32文字未満にしてください。');
    return;
  } else if (typedMessage.length > board.messageLimit) {
    alert('メッセージが長すぎるため、' + board.messageLimit
        + '文字以下に抑えてください。');
    return;
  } else if (typedEmail.length > 64) {
    alert('メールが長すぎます。64文字未満にしてください。');
    return;
  } else if (typedSubject.length > 128) {
    alert('件名が長すぎます。128文字未満にしてください。');
    return;
  } else if (typedPassword.length > 8) {
    alert('パスワードが長すぎます。8文字未満にしてください。');
    return;
  }

  if (!typedPassword) {
    typedPassword = Math.random().toString(36).substring(2, 10);
  }

  localStorage.setItem('deletionPassword', typedPassword);

  board.originalButtonText = board.postButton.innerHTML;
  board.postButton.innerHTML = '0％をアップロード';
  board.postButton.disabled = true;

  var spoilerCheckBox = document.getElementById('checkboxSpoiler');

  var noFlagCheckBox = document.getElementById('checkboxNoFlag');

  api.formApiRequest('newThread', {
    name : forcedAnon ? null : typedName,
    flag : hiddenFlags ? null : selectedFlag,
    captcha : captchaId,
    password : typedPassword,
    noFlag : noFlagCheckBox ? noFlagCheckBox.checked : false,
    spoiler : spoilerCheckBox ? spoilerCheckBox.checked : false,
    subject : typedSubject,
    message : typedMessage,
    email : typedEmail,
    files : files,
    boardUri : api.boardUri
  }, board.postCallback);

};

board.processFilesToPost = function(captchaId) {

  postCommon.newGetFilesToUpload(function gotFiles(files) {
    board.sendThreadData(files, captchaId);
  });

};

board.postThread = function() {

  if (api.hiddenCaptcha) {
    return bypassUtils.checkPass(board.processFilesToPost);
  }

  var typedCaptcha = document.getElementById('fieldCaptcha').value.trim();

  if (typedCaptcha.length !== 6 && typedCaptcha.length !== 112) {
    return alert('キャプチャの長さは正確に6文字（クッキーがない場合は112文字）です。');
  }

  if (typedCaptcha.length == 112) {

    bypassUtils.checkPass(function() {
      board.processFilesToPost(typedCaptcha);
    });
  } else {
    var parsedCookies = api.getCookies();
    api.formApiRequest('solveCaptcha', {
      captchaId : parsedCookies.captchaid,
      answer : typedCaptcha
    }, function solvedCaptcha(status, data) {

      if (status !== 'ok') {
        alert(status);
        return;
      }

      bypassUtils.checkPass(function() {
        board.processFilesToPost(parsedCookies.captchaid);
      });

    });
  }

};

board.init();

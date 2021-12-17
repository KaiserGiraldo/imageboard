//TODO this script has some *heavy* function signatures. some of these could be
//freshened up by sending the callbacks `post` objects from posting, while some
//seem to have too many options for their own good.
var postingMenu = {};

postingMenu.init = function() {

  postingMenu.banLabels = [ 'IP/バイパス禁止', '範囲禁止（1/2オクテット）',
      '範囲禁止（3/4オクテット）', 'ASN禁止', 'IP/バイパス警告' ];
  postingMenu.deletionOptions = [ '削除しないでください', '投稿を削除',
      '投稿とメディアを削除する', 'IP/バイパスで削除' ];
  postingMenu.threadSettingsList = [ {
    label : 'ロックを開始します',
    field : 'locked',
    parameter : 'lock'
  }, {
    label : '自動下降を開始',
    field : 'autoSage',
    parameter : 'bumplock'
  }, {
    label : 'スタートピン',
    field : 'pinned',
    parameter : 'pin'
  }, {
    label : 'サイクリック開始',
    field : 'cyclic',
    parameter : 'cyclic'
  } ];

  api.formApiRequest('account', {}, function gotLoginData(status, data) {

    if (status !== 'ok') {
      return;
    }

    postingMenu.loggedIn = true;

    postingMenu.globalRole = data.globalRole;
    postingMenu.noBanCaptcha = data.noCaptchaBan;

    postingMenu.moddedBoards = [];

    for (var i = 0; i < data.ownedBoards.length; i++) {
      postingMenu.moddedBoards.push(data.ownedBoards[i]);
    }

    for (i = 0; i < data.volunteeredBoards.length; i++) {
      postingMenu.moddedBoards.push(data.volunteeredBoards[i]);
    }

  }, {}, true);

};

postingMenu.showReport = function(board, thread, post, global) {

  var outerPanel = interfaceUtils.getModal(global ? 'Global report'
      : 'Report', api.noReportCaptcha);

  var reasonField = document.createElement('input');
  reasonField.type = 'text';

  var categories = document.getElementById('reportComboboxCategory');

  if (categories) {

    var newCategories = categories.cloneNode(true);
    newCategories.id = null;

  }

  var modalForm = outerPanel.getElementsByClassName('modalForm')[0];

  modalForm.onsubmit = function(e) {
	e.preventDefault();

    if (!api.noReportCaptcha) {

      var typedCaptcha = outerPanel.getElementsByClassName('modalAnswer')[0].value
          .trim();

      if (typedCaptcha.length !== 6 && typedCaptcha.length !== 112) {
        alert('キャプチャの長さは正確に6文字（クッキーがない場合は112文字）です。');
        return;
      }
    }

    var params = {
      captchaReport : typedCaptcha,
      reasonReport : reasonField.value.trim(),
      globalReport : global,
      action : 'report'
    };

    if (categories) {
      params.categoryReport = newCategories.options[newCategories.selectedIndex].value;
    }

    var key = board + '-' + thread;

    if (post && thread !== post) {
      key += '-' + post;
    }

    params[key] = true;

    api.formApiRequest('contentActions', params, function(
        status, data) {

      if (status === 'ok') {
        outerPanel.remove();
      } else {
        alert(status + ': ' + JSON.stringify(data));
      }

    });

  };

  interfaceUtils.addModalRow('理由', reasonField);
  if (categories) {
    interfaceUtils.addModalRow('カテゴリー', newCategories);
  }

};

postingMenu.deleteSinglePost = function(boardUri, threadId, post, fromIp,
    unlinkFiles, wipeMedia, innerPart, forcedPassword, onThread, trash) {

  var key = boardUri + '/' + threadId

  if (post !== threadId) {
    key += '/' + post;
  }

  var storedData = JSON.parse(localStorage.postingPasswords || '{}');

  var delPass = document.getElementById('deletionFieldPassword');

  if (delPass) {
    delPass = delPass.value.trim();
  }

  var password = forcedPassword || storedData[key]
      || localStorage.deletionPassword || delPass
      || Math.random().toString(36).substring(2, 10);

  var selectedAction;

  if (trash) {
    selectedAction = 'trash';
  } else if (fromIp) {
    selectedAction = onThread ? 'thread-ip-deletion' : 'ip-deletion';
  } else {
    selectedAction = 'delete';
  }

  var params = {
    confirmation : true,
    password : password,
    deleteUploads : unlinkFiles,
    deleteMedia : wipeMedia,
    action : selectedAction
  };

  var key = boardUri + '-' + threadId;

  if (post !== threadId) {
    key += '-' + post;
  }

  params[key] = true;

  var deletionCb = function(status, data) {

    if (status !== 'ok') {
      alert(status + ': ' + JSON.stringify(data));
      return;
    }

    var data = data || {};

    var removed = data.removedThreads || data.removedPosts;

    if (unlinkFiles && removed) {
      innerPart.getElementsByClassName('panelUploads')[0].remove();
    } else if (fromIp) {

      if (api.isBoard || !api.boardUri) {
        location.reload(true);
      } else {
        window.location.pathname = '/' + boardUri + '/';
      }

    } else if (api.threadId && data.removedThreads) {
      window.location.pathname = '/' + boardUri + '/';
    } else if (removed) {

      if (typeof (reports) !== 'undefined') {
        innerPart.parentNode.parentNode.remove();
      } else {
        innerPart.parentNode.remove();
      }

    } else if (!removed) {

      var newPass = prompt('削除できませんでした。 別のパスワードを試してみませんか？');

      if (newPass) {
        postingMenu.deleteSinglePost(boardUri, threadId, post, fromIp,
            unlinkFiles, wipeMedia, innerPart, newPass, onThread, trash);
      }

    }

  };

  api.formApiRequest('contentActions', params, deletionCb);

};

postingMenu.applySingleBan = function(typedMessage, deletionOption,
    typedReason, typedCaptcha, banType, typedDuration, global, nonBypassable,
    boardUri, thread, post, innerPart, outerPanel) {

  localStorage.setItem('autoDeletionOption', deletionOption);

  var params = {
    action : deletionOption === 1 ? 'ban-delete' : 'ban',
    nonBypassable : nonBypassable,
    reasonBan : typedReason,
    captchaBan : typedCaptcha,
    banType : banType,
    duration : typedDuration,
    banMessage : typedMessage,
    globalBan : global
  };

  var key = boardUri + '-' + thread;

  if (post !== thread) {
    key += '-' + post;
  }

  params[key] = true;

  api.formApiRequest('contentActions', params, function(status,
      data) {

    if (status === 'ok') {

      var banMessageDiv = innerPart.getElementsByClassName('divBanMessage')[0];

      if (!banMessageDiv) {
        banMessageDiv = document.createElement('div');
        banMessageDiv.className = 'divBanMessage';
        innerPart.appendChild(banMessageDiv);
      }

      banMessageDiv.innerHTML = typedMessage
          || postingMenu.defaultBanMessage(banType);

      outerPanel.remove();

      if (deletionOption > 1) {
        postingMenu.deleteSinglePost(boardUri, thread, post,
            deletionOption === 3, false, deletionOption === 2, innerPart);
      } else if (deletionOption) {
        innerPart.parentNode.remove();
      }

    } else {
      alert(status + ': ' + JSON.stringify(data));
    }
  });


};

//FIXME the backend should send its defaults in the response to contentForms
postingMenu.defaultBanMessage = function(banType) {
  switch (banType) {
    case 4:
      return '(この投稿に対してユーザーに警告が表示されました)';
	default:
      return '(ユーザーはこの投稿で禁止されました)';
  }
}

postingMenu.banSinglePost = function(innerPart, boardUri, thread, post, global) {

  var useCaptcha = !(postingMenu.globalRole < 4 || postingMenu.noBanCaptcha);
  var outerPanel = interfaceUtils.getModal(global ? 'グローバル禁止' : '禁止',
      !useCaptcha);

  var modalForm = outerPanel.getElementsByClassName('modalForm')[0];

  var reasonField = document.createElement('input');
  reasonField.type = 'text';

  var durationField = document.createElement('input');
  durationField.type = 'text';

  var messageField = document.createElement('input');
  messageField.type = 'text';

  var typeCombo = document.createElement('select');

  for (var i = 0; i < postingMenu.banLabels.length; i++) {

    var option = document.createElement('option');
    option.innerHTML = postingMenu.banLabels[i];
    typeCombo.appendChild(option);

  }

  var deletionCombo = document.createElement('select');

  for (var i = 0; i < postingMenu.deletionOptions.length; i++) {

    var option = document.createElement('option');
    option.innerHTML = postingMenu.deletionOptions[i];
    deletionCombo.appendChild(option);

  }

  deletionCombo.selectedIndex = +localStorage.autoDeletionOption;

  var captchaField = outerPanel.getElementsByClassName('modalAnswer')[0];
  if (useCaptcha) {
    captchaField = outerPanel.getElementsByClassName('modalAnswer')[0];
  }
  //captchaField.setAttribute('placeholder', 'only for board staff)');

  var nonBypassableCheckbox = document.createElement('input');
  nonBypassableCheckbox.type = 'checkbox';

  modalForm.onsubmit = function(e) {
	e.preventDefault();
    postingMenu.applySingleBan(messageField.value.trim(),
        deletionCombo.selectedIndex, reasonField.value.trim(), useCaptcha
        	&& captchaField.value.trim(), typeCombo.selectedIndex,
			durationField.value.trim(), global, nonBypassableCheckbox.checked,
			boardUri, thread, post, innerPart, outerPanel);
  };

  interfaceUtils.addModalRow('理由', reasonField);
  interfaceUtils.addModalRow('間隔', durationField);
  interfaceUtils.addModalRow('メッセージ', messageField);
  interfaceUtils.addModalRow('種類', typeCombo);
  interfaceUtils.addModalRow('削除アクション', deletionCombo);
  interfaceUtils.addModalRow('バイパス不可', nonBypassableCheckbox);

};

postingMenu.spoilSinglePost = function(innerPart, boardUri, thread, post) {

  var params = {
    action : 'spoil'
  };

  var key = boardUri + '-' + thread;

  if (post !== thread) {
    key += '-' + post;
  }

  params[key] = true;

  api.formApiRequest('contentActions', params, function(status,
      data) {

    // style exception, too simple
    api.localRequest('/' + boardUri + '/res/' + thread + '.json', function(
        error, data) {

      if (error) {
        return;
      }

      var thumbs = innerPart.getElementsByClassName('imgLink');

      for (var i = 0; i < thumbs.length; i++) {
        thumbs[i].childNodes[0].src = '/spoiler.png';
      }

    });

  });

};

postingMenu.mergeThread = function(board, thread) {

  var destination = prompt('どのスレッドとマージしますか？', 'スレッドID');

  if (!destination) {
    return;
  }

  destination = destination.trim();

  api.formApiRequest('mergeThread', {
    boardUri : board,
    threadSource : thread,
    threadDestination : destination
  }, function transferred(status, data) {

    if (status === 'ok') {
      window.location.pathname = '/' + board + '/res/' + destination + '.html';
    } else {
      alert(status + ': ' + JSON.stringify(data));
    }
  });

};

postingMenu.transferThread = function(boardUri, thread) {

  var destination = prompt('どの掲示板に転送しますか？',
      'スラッシュなしの掲示板uri');

  if (!destination) {
    return;
  }

  destination = destination.trim();

  api.formApiRequest('transferThread', {
    boardUri : boardUri,
    threadId : thread,
    boardUriDestination : destination
  }, function transferred(status, data) {

    if (status === 'ok') {
      window.location.pathname = '/' + destination + '/res/' + data + '.html';
    } else {
      alert(status + ': ' + JSON.stringify(data));
    }
  });

};

postingMenu.updateEditedPosting = function(board, thread, post, innerPart, data) {

  innerPart.getElementsByClassName('divMessage')[0].innerHTML = data.markdown;

  var subjectLabel = innerPart.getElementsByClassName('labelSubject')[0];

  if (!subjectLabel && data.subject) {

    var pivot = innerPart.getElementsByClassName('linkName')[0];

    subjectLabel = document.createElement('span');
    subjectLabel.className = 'labelSubject';
    pivot.parentNode.insertBefore(subjectLabel, pivot);

    pivot.parentNode.insertBefore(document.createTextNode(' '), pivot);

  } else if (subjectLabel && !data.subject) {
    subjectLabel.remove();
  }

  if (data.subject) {
    subjectLabel.innerHTML = data.subject;
  }

};

postingMenu.getNewEditData = function(board, thread, post, innerPart) {

  api.localRequest('/' + board + '/res/' + thread + '.json', function(error,
      data) {

    if (error) {
      return;
    }

    data = JSON.parse(data);

    if (post !== thread) {

      for (var i = 0; i < data.posts.length; i++) {
        if (data.posts[i].postId === +post) {
          data = data.posts[i];
          break;
        }
      }

    }

    postingMenu.updateEditedPosting(board, thread, post, innerPart, data);

  });

};

postingMenu.editPost = function(board, thread, post, innerPart) {

  var parameters = {
    boardUri : board,
    threadId : thread
  };

  if (post !== thread) {
    parameters.postId = post;
  }

  api.formApiRequest('edit', {}, function gotData(status, data) {

    if (status !== 'ok') {
      alert(status);
      return;
    }

    var outerPanel = interfaceUtils.getModal('Edit', true);

    var okButton = outerPanel.getElementsByClassName('modalOkButton')[0];

    var subjectField = document.createElement('input');
    subjectField.type = 'text';
    subjectField.value = data.subject || '';

    var messageArea = document.createElement('textarea');
    messageArea.setAttribute('rows', '5');
    messageArea.setAttribute('cols', '35');
    messageArea.setAttribute('placeholder', 'message');
    messageArea.defaultValue = data.message || '';

    okButton.onclick = function(e) {
      e.preventDefault();

      var typedSubject = subjectField.value.trim();
      var typedMessage = messageArea.value.trim();

      if (typedSubject.length > 128) {
        alert('件名が長すぎる場合は、128文字未満にしてください。');
      } else if (!typedMessage.length) {
        alert('メッセージは必須です。');
      } else {

        var parameters = {
          boardUri : board,
          message : typedMessage,
          subject : typedSubject
        };

        if (post !== thread) {
          parameters.postId = post;
        } else {
          parameters.threadId = thread;
        }

        // style exception, too simple
        api.formApiRequest('saveEdit', parameters, function(
            status, data) {

          if (status === 'ok') {
            outerPanel.remove();
            postingMenu.getNewEditData(board, thread, post, innerPart);
          } else {
            alert(status + ': ' + JSON.stringify(data));
          }
        });
      }

    };

    interfaceUtils.addModalRow('件名', subjectField);
    interfaceUtils.addModalRow('メッセージ', messageArea);

  }, false, parameters);

};

postingMenu.toggleThreadSetting = function(boardUri, thread, settingIndex,
    innerPart) {

  /* Note to self: why does this script in particular not look at 
   * the Indicator elements? Does it appear on some page without them? 
   * Getting fresh data isn't the best idea: moderators want to toggle
   * what they see, not what the current state actually is */
  api.localRequest('/' + boardUri + '/res/' + thread + '.json',
      function gotData(error, data) {

        if (error) {
          alert(error);
          return;
        }

        var data = JSON.parse(data);

        var parameters = {
          boardUri : boardUri,
          threadId : thread
        };

        for (var i = 0; i < postingMenu.threadSettingsList.length; i++) {

          var field = postingMenu.threadSettingsList[i];

          parameters[field.parameter] = settingIndex === i ? !data[field.field]
              : data[field.field];

        }

        api.formApiRequest('changeThreadSettings', parameters,
            function(status, data) {

              if (status === 'ok') {
                api.resetIndicators({
                  locked : parameters.lock,
                  bumplock : parameters.bumplock,
                  pinned : parameters.pin,
                  cyclic : parameters.cyclic,
                  archived : innerPart
                      .getElementsByClassName('archiveIndicator').length
                }, innerPart);
              } else {
                alert(status + ': ' + JSON.stringify(data));
              }
            });

      });

};

postingMenu.addToggleSettingButton = function(extraMenu, board, thread, index,
    innerPart) {

  extraMenu.appendChild(document.createElement('hr'));

  var toggleButton = document.createElement('div');
  toggleButton.innerHTML = postingMenu.threadSettingsList[index].label;
  toggleButton.onclick = function() {
    postingMenu.toggleThreadSetting(board, thread, index, innerPart);
  };

  extraMenu.appendChild(toggleButton);

};

postingMenu.sendArchiveRequest = function(board, thread, innerPart) {

  api.formApiRequest('archiveThread', {
    confirmation : true,
    boardUri : board,
    threadId : thread
  }, function(status, data) {

    if (status === 'ok') {

      if (!api.threadId) {
        innerPart.parentNode.remove();
        return;
      }

      var lock = innerPart.getElementsByClassName('lockIndicator').length;
      var autosage = innerPart.getElementsByClassName('bumpLockIndicator').length;
      var pin = innerPart.getElementsByClassName('pinIndicator').length;
      var cyclic = innerPart.getElementsByClassName('cyclicIndicator').length;

      api.resetIndicators({
        locked : lock,
        bumplock : autosage,
        pinned : pin,
        cyclic : cyclic,
        archived : true
      }, innerPart);

    } else {
      alert(status + ': ' + JSON.stringify(data));
    }

  });

};

postingMenu.setExtraMenuThread = function(post, menuCallbacks) {

  if (postingMenu.globalRole <= 1) {
	menuCallbacks.push(
	  {name: '転送スレッド'
	  ,callback: function() {
        postingMenu.transferThread(post.postInfo.board, post.postInfo.thread);
	  }}
	)
  }

  postingMenu.threadSettingsList.forEach(function(entry, i) {
	menuCallbacks.push(
	  {name: entry.label
	  ,callback: function() {
        //TODO
		postingMenu.toggleThreadSetting(post.postInfo.board, post.postInfo.thread,
          i, post.innerPost);
	  }}
	)
  })

  if (post.innerPost.getElementsByClassName('archiveIndicator').length) {
    return;
  }

  var newCallbacks = [
	  {name: 'アーカイブ'
	  ,callback: function() {
		if (confirm("Are you sure you wish to lock and archive this thread?")) {
		  postingMenu.sendArchiveRequest(post.postInfo.board,
            post.postInfo.thread, post.innerPost);
		}
	  }},
	  {name: 'マージ'
	  ,callback: function() {
    	postingMenu.mergeThread(post.postInfo.board, post.postInfo.thread);
	  }},
  ]

  Array.prototype.push.apply(menuCallbacks, newCallbacks)

};

postingMenu.setModFileOptions = function(post, menuCallbacks) {

  menuCallbacks.push(
	{name: 'ネタバレファイル'
	,callback: function() {
      postingMenu.spoilSinglePost(post.innerPost, post.postInfo.board,
        post.postInfo.thread, post.postInfo.post);
 	}},
  )

  if (postingMenu.globalRole > 3) {
    return;
  }

  menuCallbacks.push(
	{name: '投稿とメディアを削除する'
	,callback: function() {
      postingMenu.deleteSinglePost(post.postInfo.board, post.postInfo.thread,
        post.postInfo.post, false, false, true, post.innerPost);
 	}},
  )
};

postingMenu.setExtraMenuMod = function(post, menuCallbacks, hasFiles) {

  if (hasFiles) {
	//TODO
    postingMenu.setModFileOptions(post, menuCallbacks);
  }

  var newCallbacks = [
	{name: 'ゴミ箱の投稿'
    ,callback: function() {
      postingMenu.deleteSinglePost(post.postInfo.board, post.postInfo.thread,
        post.postInfo.post, null, null, null, post.innerPost, null, null, true);
    }},
    {name: 'ファイルのリンクを解除する'
    ,callback: function() {
      postingMenu.deleteSinglePost(post.postInfo.board, post.postInfo.thread,
        post.postInfo.post, false, true, null, post.innerPost);
    }},
	{name: 'IP/バイパスで削除'
	,callback: function() {
	  if (confirm("このIP/バイパスによって作成されたこの掲示板上のすべての投稿を削除してもよろしいですか？")) {
	    postingMenu.deleteSinglePost(post.postInfo.board, post.postInfo.thread,
          post.postInfo.post, true, null, null, post.innerPost);
	  }
 	}},
	{name: '禁止'
	,callback: function() {
      postingMenu.banSinglePost(post.innerPost, post.postInfo.board,
        post.postInfo.thread, post.postInfo.post);
 	}},
	{name: 'グローバル禁止'
	,callback: function() {
      postingMenu.banSinglePost(post.innerPost, post.postInfo.board,
        post.postInfo.thread, post.postInfo.post, true);
 	}},
	{name: '編集'
	,callback: function() {
      postingMenu.editPost(post.postInfo.board, post.postInfo.thread,
        post.postInfo.post, post.innerPost);
 	}}
  ]

  //remove global ban for global janitors
  if (postingMenu.globalRole > 2) {
	newCallbacks.splice(4, 1);
  }

  Array.prototype.push.apply(menuCallbacks, newCallbacks);

  if (post.postInfo.op) {
	//TODO
    postingMenu.setExtraMenuThread(post, menuCallbacks);
  }

};

postingMenu.buildMenu = function(post, extraMenu) {

  var menuCallbacks = [
    {name: '報告する'
    ,callback: function() {
      postingMenu.showReport(post.postInfo.board, post.postInfo.thread,
        post.postInfo.post);
    }},
    {name: 'グローバルレポート'
    ,callback: function() {
      postingMenu.showReport(post.postInfo.board, post.postInfo.thread,
        post.postInfo.post, true);
    }},
    //TODO:	'Remove Post' means that a user deletes their own post 
    // 		'Delete Post' means that a moderator purges the post immediately
    {name: '投稿を削除'
    ,callback: function() {
      postingMenu.deleteSinglePost(post.postInfo.board, post.postInfo.thread,
        post.postInfo.post, null, null, null, post.innerPost);
    /*}},
    //TODO: allow users to unlink files they uploaded
    {name: 'Unlink Files'
    ,callback: function() {
      postingMenu.deleteSinglePost(post.postInfo.board, post.postInfo.thread,
        post.postInfo.post, false, true, null, post.innerPost);
    */
    }}
  ]

  var hasFiles = post.files && post.files.children.length > 0;

  /*
  if (!hasFiles) {
	menuCallbacks.pop();
  }
  */

  if (postingMenu.loggedIn && (postingMenu.globalRole < 4 
    || postingMenu.moddedBoards.indexOf(post.postInfo.board) >= 0)) {

    postingMenu.setExtraMenuMod(post, menuCallbacks, hasFiles);
  }

  return menuCallbacks;
};

postingMenu.init();

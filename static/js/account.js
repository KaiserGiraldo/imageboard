var account = {};

account.settingsRelation = {
  checkboxNoBoardReports : 'noBoardReports',
  checkboxAlwaysSign : 'alwaysSignRole',
  checkboxReportNotify : 'reportNotify'
};

account.init = function() {

  if (document.getElementById('requestConfirmationFormButton')) {
    api.convertButton('requestConfirmationFormButton',
        account.requestConfirmation);
  }

  api.convertButton('passwordFormButton', account.changePassword,
      'passwordChangeField');

  api.convertButton('deleteAccountFormButton', account.deleteAccount,
      'deleteAccountField');

  api.convertButton('saveFormButton', account.save, 'settingsField');

  api.convertButton('logoutFormButton', account.logout);

  if (document.getElementById('boardCreationDiv')) {
    api.convertButton('newBoardFormButton', account.createBoard,
        'creationField');
  }

};

account.deleteAccount = function() {

  var confirmed = document.getElementById('confirmationCheckbox').checked;

  if (!confirmed) {
    alert('アカウントを削除することを確認する必要があります。');
  } else {

    api.formApiRequest('deleteAccount', {
      confirmation : confirmed
    }, function requestComplete(status, data) {

      if (status === 'ok') {
        window.location = '/';
      } else {
        alert(status + ': ' + JSON.stringify(data));
      }
    });

  }

};

account.requestConfirmation = function() {

  api.formApiRequest('requestEmailConfirmation', {}, function requestComplete(
      status, data) {

    if (status === 'ok') {
      alert('確認をお願いします。');
    } else {
      alert(status + ': ' + JSON.stringify(data));
    }

  });

};

account.logout = function() {

  document.cookie = 'login=invalid+login';
  document.cookie = 'hash=invalid+hash; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

  window.location.pathname = '/login.html';

};

account.changePassword = function() {

  var typedPassword = document.getElementById('fieldPassword').value;
  var typedNewPassword = document.getElementById('fieldNewPassword').value;
  var typedConfirmation = document.getElementById('fieldConfirmation').value;

  if (!typedPassword.length) {
    alert('現在のパスワードを入力する必要があります。');
  } else if (typedConfirmation !== typedNewPassword) {
    alert('パスワードの確認が一致しません')
  } else if (!typedNewPassword.length) {
    alert('空白のパスワードを入力することはできません。');
  } else {
    api.formApiRequest('changeAccountPassword', {
      password : typedPassword,
      newPassword : typedNewPassword,
      confirmation : typedConfirmation
    }, function requestComplete(status, data) {

      if (status === 'ok') {

        alert('パスワード変更済み。');

        document.getElementById('fieldPassword').value = '';
        document.getElementById('fieldNewPassword').value = '';
        document.getElementById('fieldConfirmation').value = '';

      } else {
        alert(status + ': ' + JSON.stringify(data));
      }
    });
  }

};

account.save = function() {

  var parameters = {};

  for ( var key in account.settingsRelation) {
    parameters[account.settingsRelation[key]] = document.getElementById(key).checked;
  }

  var filters = [];

  var filterCells = document.getElementsByClassName('categoryCheckbox');

  for (var i = 0; i < filterCells.length; i++) {

    if (filterCells[i].checked) {
      filters.push(filterCells[i].value);
    }

  }

  parameters.categoryFilter = filters;

  var typedEmail = document.getElementById('emailField').value.trim();

  if (typedEmail.length > 64) {
    alert('メールが長すぎます。64文字未満にしてください');
  } else {

    parameters.email = typedEmail

    api.formApiRequest('changeAccountSettings', parameters,
        function requestComplete(status, data) {

          if (status === 'ok') {
            alert('設定が変更されました。');
          } else {
            alert(status + ': ' + JSON.stringify(data));
          }
        });

  }

};

account.createBoard = function() {

  var typedUri = document.getElementById('newBoardFieldUri').value.trim();
  var typedName = document.getElementById('newBoardFieldName').value.trim();
  var typedDescription = document.getElementById('newBoardFieldDescription').value
      .trim();
  var typedCaptcha = document.getElementById('fieldCaptcha').value.trim();

  if (!typedUri.length || !typedName.length) {
    alert('URIと名前は必須です。');
  } else if (/\W/.test(typedUri)) {
    alert('無効なURI。');
    return;
  } else if (typedCaptcha.length !== 6 && typedCaptcha.length !== 112) {
    alert('キャプチャの長さは正確に6文字（クッキーがない場合は112文字）です。');
    return;
  } else {
    api.formApiRequest('createBoard', {
      boardUri : typedUri,
      boardName : typedName,
      boardDescription : typedDescription,
      captcha : typedCaptcha
    }, function requestComplete(status, data) {

      if (status === 'ok') {
        window.location.pathname = '/' + typedUri + '/';
      } else {
        alert(status + ': ' + JSON.stringify(data));
      }
    });
  }

};

account.init();
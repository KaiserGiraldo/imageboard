var bypassUtils = {};

bypassUtils.running = false;

bypassUtils.checkPass = function(callback) {

  api.formApiRequest('blockBypass', {},
      function checked(status, data) {

        if (status !== 'ok') {
          return alert(status + ': ' + JSON.stringify(data));
        }

        var alwaysUseBypass = document
            .getElementById('alwaysUseBypassCheckBox').checked;

        var required = data.mode == 2 || (data.mode == 1 && alwaysUseBypass);

        if (!data.valid && required) {
          postCommon.displayBlockBypassPrompt(callback);

        } else if (!data.validated && required) {

          if (!crypto.subtle
              || JSON.parse(localStorage.noJsValidation || 'false')) {
            bypassUtils.showNoJsValidation(callback);
          } else {
            bypassUtils.runValidation(callback);
          }

        } else {
          callback();
        }

      });

};

bypassUtils.showNoJsValidation = function(callback) {

  var outerPanel = interfaceUtils.getModal('JSバイパス検証なし', true);

  var modalForm = outerPanel.getElementsByClassName('modalForm')[0];
  var tableBody = outerPanel.getElementsByClassName('modalTableBody')[0];

  var instructions = 'ハッシュをコピーして、';
  instructions += '<a href="https://gitgud.io/LynxChan/PoWSolver"> ';
  instructions += 'java PoW solver</a> のコードを入手することができます。';
  var divInstructions = document.createElement('div');
  divInstructions.innerHTML = instructions;  n

  var instructionsRow = document.createElement('tr');
  tableBody.appendChild(instructionsRow);

  var instructionsHolder = document.createElement('td');
  instructionsHolder.colSpan = 2;
  instructionsHolder.appendChild(divInstructions);

  instructionsRow.appendChild(instructionsHolder);

  var divHash = document.createElement('div');
  divHash.innerHTML = 'text';

  var buttonCopyHash = document.createElement('button');

  buttonCopyHash.onclick = function() {

    var tempArea = document.createElement('textarea');
    tempArea.value = api.getCookies().bypass;
    document.body.appendChild(tempArea);
    tempArea.select();
    document.execCommand('copy');
    tempArea.remove();

    alert('コピーされたバイパス');

  };

  buttonCopyHash.innerHTML = 'ハッシュをコピーする';

  var tableRow = document.createElement('tr');
  tableBody.appendChild(tableRow);

  var buttonHolder = document.createElement('td');
  buttonHolder.appendChild(buttonCopyHash);

  tableRow.appendChild(buttonHolder);

  var codeField = document.createElement('input');
  codeField.type = 'text';

  interfaceUtils.addModalRow('Code', codeField);

  modalForm.onclick = function(e) {
    e.preventDefault();

    api.formApiRequest('validateBypass', {
      code : codeField.value
    }, function(status, data) {
      outerPanel.remove();
      callback(status, data);
    });

  };

};

bypassUtils.runValidation = async function(callback) {

  if (bypassUtils.running) {

    if (callback.stop) {
      callback.stop();
    }

    return;

  }

  bypassUtils.running = true;

  var bypassData = api.getCookies().bypass;

  var session = bypassData.substr(24, 344);
  var hash = bypassData.substr(24 + 344);

  for (var i = 0; i < bypassUtils.workers.length; i++) {

    bypassUtils.workers[i].postMessage({
      type : 'start',
      session : session,
      code : i,
      hash : hash
    });

  }

  bypassUtils.callback = callback;

};

bypassUtils.workers = [];

bypassUtils.workerResponse = function(code) {

  code = code.data;

  bypassUtils.running = false;

  for (var i = 0; i < bypassUtils.workers.length; i++) {

    bypassUtils.workers[i].postMessage({
      type : 'stop'
    });

  }

  api.formApiRequest('validateBypass', {
    code : code
  }, bypassUtils.callback);

};

for (var i = 0; i < navigator.hardwareConcurrency; i++) {
  bypassUtils.workers.push(new Worker('/.static/js/validationWorker.js'));
  bypassUtils.workers[i].onmessage = bypassUtils.workerResponse;
}

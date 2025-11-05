function convertScript() {
  inputStr = document.querySelector("#githubScript").value;
  if (inputStr == "") {
    return;
  }

  ghproxy = document.querySelector("#ghproxy").value;

  // 先给裸的git类链接前面加上 https://
  inputStr = inputStr.replace(/ git/g, ' https://git');

  // 再进行加github proxy的转换
  // 在 http://git 或者 https://git 的前面加上 ghproxy
  resultStr1 = inputStr.replace(/(https?:\/\/git)/g, ghproxy + '$1');
  if (resultStr1 !== inputStr) {
    document.querySelector("#result1").value = resultStr1;
  }
}

function copyResult1() {
  resultStr = document.querySelector("#result1").value;
  navigator.clipboard.writeText(resultStr);
}

function copyResult2() {
  resultStr = document.querySelector("#result2").value;
  navigator.clipboard.writeText(resultStr);
}

function getLocalUrl() {
  document.querySelector("#ghproxy").value = window.location.href;
}

function convertRes() {
  inputStr = document.querySelector("#githubRes").value;
  if (inputStr == "") {
    return;
  }

  ghproxy = document.querySelector("#ghproxy").value;

  // 先给裸的git类链接前面加上 https://
  inputStr = inputStr.replace(/ git/g, ' https://git');

  resultStr = ghproxy + inputStr;

  document.querySelector("#resAfterGhproxy").value = resultStr;
}

function fetchRes() {
  window.open(document.querySelector("#resAfterGhproxy").value);
}

getLocalUrl()

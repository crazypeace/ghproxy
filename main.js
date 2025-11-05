/**
 * 助手函数：判断是否为目标的 GitHub 域名
 * 域名是否以 git 开头
 * @param {string} hostname
 * @returns {boolean}
 */
function isGitHubDomain(hostname) {
// 这个正则表达式检查：
  // 1. (^|\.) : 字符串是否以...开头 (^) 或 ( | ) 以一个点 (.) 开头
  // 2. git     : 后面紧跟着 'git'
  //
  // 示例:
  // - "github.com"      -> 匹配 (^git)
  // - "api.github.com"  -> 匹配 (.git)hub.com
  // - "gitlab.com"      -> 匹配 (^git)
  // - "my.gitee.com"    -> 匹配 (.git)ee.com
  // - "my-git.com"      -> 不匹配 (因为 'g' 前面是 '-' 而不是 '.' 或开头)
  return /(^|\.)git/.test(hostname);
}

function convertScript() {
  inputStr = document.querySelector("#githubScript").value;
  if (inputStr == "") {
    return;
  }

  ghproxy = document.querySelector("#ghproxy").value;

  // 先给裸的git类链接前面加上 https://
  inputStr = inputStr.replace(/ git/g, ' https://git');

  // 再进行加github proxy的转换

  // 匹配所有 https?://... 链接
  const urlRegex = /(https?:\/\/[^\s"'`()<>]+)/g;

  resultStr1 = inputStr.replace(urlRegex, (match) => {
    try {
      // 'match' 是一个完整的 URL, e.g., "https://github.com/foo"
      const linkUrl = new URL(match);

      // 使用 isGitHubDomain 函数来判断
      if (isGitHubDomain(linkUrl.hostname)) {
        // 如果是 GitHub 链接，添加代理前缀
        return `${ghproxy}/${match}`;
      } else {
        // 如果不是，保持原样
        return match;
      }
    } catch (e) {
      // 如果 URL 解析失败 (例如，它可能只是看起来像 URL 的文本)，保持原样
      return match;
    }
  });

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

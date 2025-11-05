const ASSET_URL = 'https://crazypeace.github.io/ghproxy/'

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * 处理所有传入的请求
 * @param {Request} request
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  const workerUrl = url.origin; // 获取 worker 自己的域名, e.g., https://my-worker.example.com

  // 1. 本代理 接受的 path 部分 应该是一个 http:// 或者 https://
  // 我们从 path 中提取目标 URL
  let path = url.pathname.substring(1); // 移除开头的 '/'

  // 如果path为空，返回主页
  if (!path) {
    return fetch(ASSET_URL)
  }
  if (path === 'styles.css') {
    return fetch(ASSET_URL + path)
  }
  if (path === 'main.js') {
    return fetch(ASSET_URL + path)
  }

  // 2. 如果 path 部分 不是 http:// 或者 https:// 开头, 那么加上 https://
  if (!path.startsWith('http://') && !path.startsWith('https://')) {
    path = 'https://' + path;
  }

  let targetUrl;
  try {
    targetUrl = new URL(path);
  } catch (e) {
    return new Response('路径中包含无效的 URL', { status: 400 });
  }

  // 3. 判断 本代理 接受的 链接 是否 github
  if (!isGitHubDomain(targetUrl.hostname)) {
    return new Response('访问被拒绝：此代理仅支持 GitHub 相关域名。', { status: 403 });
  }

  // 准备转发请求
  // GET 或 HEAD 方法不能有 body
  const hasBody = request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH';

  const response = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: hasBody ? request.body : null,
    redirect: 'follow',
  });

  // 复制响应头，并设置 CORS
  const newHeaders = new Headers(response.headers);
  newHeaders.set('access-control-allow-origin', '*');
  newHeaders.set('access-control-allow-headers', '*');
  newHeaders.set('access-control-allow-methods', '*');

  // 4. 检查 path 是否以 .sh 结尾
  const finalUrl = new URL(response.url);
  const isScript = finalUrl.pathname.endsWith('.sh');

  // 5. 对于 .sh 结尾的脚本文件 (并且请求成功)
  if (isScript && response.status === 200) {
    let bodyText = await response.text();

    // ********** git.io 短链 ************
    // 修复 git.io 链接：[空格]git.io 替换为 [空格]https://git.io
    bodyText = bodyText.replace(/(\s)(git\.io)/g, '$1https://$2');
    // **********************************

    // 对所有 GitHub 链接进行查找替换 (嵌套代理)
    // 匹配所有 https?://... 链接
    const urlRegex = /(https?:\/\/[^\s"'`()<>]+)/g;
    
    bodyText = bodyText.replace(urlRegex, (match) => {
      try {
        // 'match' 是一个完整的 URL, e.g., "https://github.com/foo"
        const linkUrl = new URL(match);

        // 使用 isGitHubDomain 函数来判断
        if (isGitHubDomain(linkUrl.hostname)) {
          // 如果是 GitHub 链接，添加代理前缀
          return `${workerUrl}/${match}`;
        } else {
          // 如果不是，保持原样
          return match;
        }
      } catch (e) {
        // 如果 URL 解析失败 (例如，它可能只是看起来像 URL 的文本)，保持原样
        return match;
      }
    });

    // 因为修改了内容，所以 content-length 头部失效了，删除它
    newHeaders.delete('content-length');

    return new Response(bodyText, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  // 对于非 .sh 文件或非 200 状态码，直接返回（已修改 CORS 和 Location 头部）
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

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
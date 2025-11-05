'use strict'

/**
 * static files (404.html, sw.js, conf.js)
 */
const ASSET_URL = 'https://crazypeace.github.io/gh-proxy/'
// 前缀，如果自定义路由为example.com/gh/*，将PREFIX改为 '/gh/'，注意，少一个杠都会错！
const PREFIX = '/'
// 分支文件使用jsDelivr镜像的开关，0为关闭，默认关闭
const Config = {
    jsdelivr: 0
}

const whiteList = [] // 白名单，路径里面有包含字符的才会通过，e.g. ['/username/']

/** @type {RequestInit} */
const PREFLIGHT_INIT = {
    status: 204,
    headers: new Headers({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS',
        'access-control-max-age': '1728000',
    }),
}

const exp1 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:releases|archive)\/.*$/i
const exp2 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:blob|raw)\/.*$/i
const exp3 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:info|git-).*$/i
const exp4 = /^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+?\/.+$/i
const exp5 = /^(?:https?:\/\/)?gist\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+$/i
const exp6 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/tags.*$/i
const exp7 = /^(?:https?:\/\/)?api\.github\.com\/.*$/i
const exp8 = /^(?:https?:\/\/)?git\.io\/.*$/i
const exp9 = /^(?:https?:\/\/)?gitlab\.com\/.*$/i

/**
 * @param {any} body
 * @param {number} status
 * @param {Object<string, string>} headers
 */
function makeRes(body, status = 200, headers = {}) {
    headers['access-control-allow-origin'] = '*'
    return new Response(body, {status, headers})
}


/**
 * @param {string} urlStr
 */
function newUrl(urlStr) {
    try {
        return new URL(urlStr)
    } catch (err) {
        return null
    }
}


addEventListener('fetch', e => {
    const ret = fetchHandler(e)
        .catch(err => makeRes('cfworker error:\n' + err.stack, 502))
    e.respondWith(ret)
})


function checkUrl(u) {
    for (let i of [exp1, exp2, exp3, exp4, exp5, exp6, exp7, exp8, exp9]) {
        if (u.search(i) === 0) {
            return true
        }
    }
    return false
}

/*
*2025-11 V2 如果请求 .sh 路径, 说明是请求的脚本. 在文本中查找 github 相关的 URL, 并在前面添加本身的代理前缀
* 这样用户执行脚本时, 也会通过本代理获取脚本中引用的其他脚本或资源
*/
async function handleShellScript(req, path, urlObj) {
    // 首先获取原始脚本内容
    const response = await httpHandler(req, path);

    // 如果不是成功响应，直接返回
    if (!response.ok) {
        return response;
    }

    // 获取脚本内容
    let scriptContent = await response.text();

    // 定义所有需要匹配的 URL 模式（不包含协议前缀部分）
    const urlPatterns = [
        'github\\.com/.+?/.+?/(?:releases|archive)/[^\\s\'"]+',
        'github\\.com/.+?/.+?/(?:blob|raw)/[^\\s\'"]+',
        'github\\.com/.+?/.+?/(?:info|git-)[^\\s\'"]+',
        'raw\\.(?:githubusercontent|github)\\.com/.+?/.+?/.+?/.+',
        'gist\\.(?:githubusercontent|github)\\.com/.+?/.+?/.+',
        'github\\.com/.+?/.+?/tags[^\\s\'"]*',
        'api\\.github\\.com/[^\\s\'"]+',
        'git\\.io/[^\\s\'"]+',
        'gitlab\\.com/[^\\s\'"]+',
    ];

    // 构建完整的正则表达式：匹配可选的 http:// 或 https:// 加上 URL 模式
    const fullPattern = '(https?://)?(' + urlPatterns.join('|') + ')';
    const urlRegex = new RegExp(fullPattern, 'gi');

    // 替换所有匹配的 URL
    scriptContent = scriptContent.replace(urlRegex, (match, protocol, url) => {
        // 如果 URL 已经包含我们的代理前缀，跳过
        if (match.includes(urlObj.origin)) {
            return match;
        }

        // 确保 URL 有协议
        let fullUrl = match;
        if (!protocol) {
            fullUrl = 'https://' + match;
        }

        // 添加代理前缀
        return urlObj.origin + '/' + fullUrl;
    });

    // 复制响应头
    const newHeaders = new Headers(response.headers);
    
    // 返回修改后的脚本
    return new Response(scriptContent, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
}

/**
 * @param {FetchEvent} e
 */
async function fetchHandler(e) {
    const req = e.request
    const urlStr = req.url
    const urlObj = new URL(urlStr)
    
    console.log("in:" +urlStr)

    let path = urlObj.searchParams.get('q')
    if (path) {
        return Response.redirect('https://' + urlObj.host + PREFIX + path, 301)
    }

    path = urlObj.href.substr(urlObj.origin.length + PREFIX.length)
    console.log ("path:" + path)

    // 判断有没有嵌套自己调用自己
    const exp0 = 'https:/' + urlObj.host + '/'
    console.log ("exp0:" + exp0)
    while (path.startsWith(exp0)) {
        console.log ("in while")
        path = path.replace(exp0, '')
    }
    console.log ("path:" + path)

    // cfworker 会把路径中的 `//` 合并成 `/`
    path = path.replace(/^https?:\/+/, 'https://')
    console.log ("path:" + path)

    if (path.search(exp1) === 0 || path.search(exp3) === 0 || path.search(exp4) === 0 || path.search(exp5) === 0 || path.search(exp6) === 0 || path.search(exp7) === 0 || path.search(exp8) === 0 || path.search(exp9) === 0) {
        
        console.log("exp 1,3,4,5,6,7,8,9")
        if (path.endsWith('.sh')) {
            return await handleShellScript(req, path, urlObj)
        }
        else {
            return httpHandler(req, path)
        }
    } else if (path.search(exp2) === 0) {
        if (Config.jsdelivr) {
            const newUrl = path.replace('/blob/', '@').replace(/^(?:https?:\/\/)?github\.com/, 'https://cdn.jsdelivr.net/gh')
            return Response.redirect(newUrl, 302)
        } else {
            path = path.replace('/blob/', '/raw/')
            return httpHandler(req, path)
        }
    } else if (path.search(exp4) === 0) {
        const newUrl = path.replace(/(?<=com\/.+?\/.+?)\/(.+?\/)/, '@$1').replace(/^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com/, 'https://cdn.jsdelivr.net/gh')
        return Response.redirect(newUrl, 302)
    } else if (path==='perl-pe-para') {
    //  2025-11 V2 不再需要了, 返回空
    //   let perlstr = 'perl -pe'
    //   let responseText = 's#(bash.*?\\.sh)([^/\\w\\d])#\\1 | ' + perlstr + ' "\\$(curl -L ' + urlObj.origin + '/perl-pe-para)" \\2#g; ' +
    //                's# (git)# https://\\1#g; ' +
    //                's#(http.*?git[^/]*?/)#' + urlObj.origin + '/\\1#g';
      return new Response( "", { status: 200, 
            headers: {
              'Content-Type': 'text/plain',
              'Cache-Control': 'max-age=300'
            }
          });
    } else {
        
        console.log("fetch " + ASSET_URL + path)

        return fetch(ASSET_URL + path)
    }
}


/**
 * @param {Request} req
 * @param {string} pathname
 */
function httpHandler(req, pathname) {
    const reqHdrRaw = req.headers

    // preflight
    if (req.method === 'OPTIONS' &&
        reqHdrRaw.has('access-control-request-headers')
    ) {
        return new Response(null, PREFLIGHT_INIT)
    }

    const reqHdrNew = new Headers(reqHdrRaw)

    let urlStr = pathname
    let flag = !Boolean(whiteList.length)
    for (let i of whiteList) {
        if (urlStr.includes(i)) {
            flag = true
            break
        }
    }
    if (!flag) {
        return new Response("blocked", {status: 403})
    }
    if (urlStr.startsWith('git')) {
        urlStr = 'https://' + urlStr
    }

    console.log("urlStr "+urlStr)

    const urlObj = newUrl(urlStr)

    /** @type {RequestInit} */
    const reqInit = {
        method: req.method,
        headers: reqHdrNew,
        redirect: 'manual',
        body: req.body
    }
    return proxy(urlObj, reqInit)
}


/**
 *
 * @param {URL} urlObj
 * @param {RequestInit} reqInit
 */
async function proxy(urlObj, reqInit) {
    const res = await fetch(urlObj.href, reqInit)
    const resHdrOld = res.headers
    const resHdrNew = new Headers(resHdrOld)

    const status = res.status

    if (resHdrNew.has('location')) {
        let _location = resHdrNew.get('location')
        if (checkUrl(_location))
            resHdrNew.set('location', PREFIX + _location)
        else {
            reqInit.redirect = 'follow'
            return proxy(newUrl(_location), reqInit)
        }
    }
    resHdrNew.set('access-control-expose-headers', '*')
    resHdrNew.set('access-control-allow-origin', '*')

    resHdrNew.delete('content-security-policy')
    resHdrNew.delete('content-security-policy-report-only')
    resHdrNew.delete('clear-site-data')

    return new Response(res.body, {
        status,
        headers: resHdrNew,
    })
}

